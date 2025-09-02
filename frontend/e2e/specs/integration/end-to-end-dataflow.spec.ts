import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { ErrorHandler } from '../../utils/error-handler';

test.describe('端到端数据流测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let testDataManager: TestDataManager;
  let errorHandler: ErrorHandler;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    testDataManager = new TestDataManager();
    errorHandler = new ErrorHandler();
    
    // 清理测试环境
    await testDataManager.cleanup();
  });

  test.afterEach(async ({ page }) => {
    // 测试结束后清理数据
    await testDataManager.cleanup();
  });

  test('完整用户注册到分析完成流程', async ({ page }) => {
    // 1. 用户注册
    const userData = await testDataManager.createTestUser();
    await authPage.goToRegister();
    await authPage.register(userData);
    
    // 验证注册成功并自动登录
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // 2. 创建宠物档案
    const petData = await testDataManager.createTestPet(userData.id);
    await petsPage.navigate();
    await petsPage.addPet(petData);
    
    // 验证宠物创建成功
    const petList = await petsPage.getPetList();
    expect(petList).toContainEqual(expect.objectContaining({
      name: petData.name,
      type: petData.type
    }));
    
    // 3. 进行便便分析
    await analysisPage.navigate();
    await analysisPage.selectPet(petData.id);
    await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
    
    // 验证图片上传成功
    await expect(page.locator('[data-testid="uploaded-image"]')).toBeVisible();
    
    // 4. 启动分析流程
    await analysisPage.startAnalysis();
    
    // 验证分析进度显示
    await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
    
    // 5. 等待分析完成
    const analysisResult = await analysisPage.waitForAnalysisComplete();
    
    // 验证分析结果
    expect(analysisResult).toHaveProperty('healthStatus');
    expect(analysisResult).toHaveProperty('recommendations');
    expect(analysisResult.healthStatus).toMatch(/健康|警告|关注/);
    
    // 6. 保存分析记录
    await analysisPage.saveRecord();
    
    // 验证记录保存成功
    await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();
    
    // 7. 验证数据一致性
    await page.goto('/records');
    const records = await page.locator('[data-testid="analysis-record"]').all();
    expect(records.length).toBeGreaterThan(0);
    
    // 验证记录包含正确的宠物信息和分析结果
    const firstRecord = records[0];
    await expect(firstRecord.locator('[data-testid="pet-name"]')).toContainText(petData.name);
    await expect(firstRecord.locator('[data-testid="health-status"]')).toContainText(analysisResult.healthStatus);
  });

  test('数据在前后端传输验证', async ({ page }) => {
    // 监听网络请求
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // 执行完整流程
    const userData = await testDataManager.createTestUser();
    await authPage.goToRegister();
    await authPage.register(userData);
    
    // 验证注册API调用
    const registerRequest = requests.find(req => req.url.includes('/api/auth/register'));
    expect(registerRequest).toBeDefined();
    expect(registerRequest.method).toBe('POST');
    
    const registerResponse = responses.find(res => res.url.includes('/api/auth/register'));
    expect(registerResponse).toBeDefined();
    expect(registerResponse.status).toBe(201);
    
    // 创建宠物并验证API调用
    const petData = await testDataManager.createTestPet(userData.id);
    await petsPage.navigate();
    await petsPage.addPet(petData);
    
    const createPetRequest = requests.find(req => req.url.includes('/api/pets') && req.method === 'POST');
    expect(createPetRequest).toBeDefined();
    
    const createPetResponse = responses.find(res => res.url.includes('/api/pets') && res.status === 201);
    expect(createPetResponse).toBeDefined();
    
    // 进行分析并验证API调用
    await analysisPage.navigate();
    await analysisPage.selectPet(petData.id);
    await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
    await analysisPage.startAnalysis();
    
    // 验证图片上传API
    const uploadRequest = requests.find(req => req.url.includes('/api/analysis/upload'));
    expect(uploadRequest).toBeDefined();
    expect(uploadRequest.method).toBe('POST');
    
    // 验证分析API
    const analysisRequest = requests.find(req => req.url.includes('/api/analysis/analyze'));
    expect(analysisRequest).toBeDefined();
    
    // 等待分析完成并验证结果API
    await analysisPage.waitForAnalysisComplete();
    await analysisPage.saveRecord();
    
    const saveRequest = requests.find(req => req.url.includes('/api/records') && req.method === 'POST');
    expect(saveRequest).toBeDefined();
  });

  test('数据一致性和完整性检查', async ({ page }) => {
    // 创建测试数据
    const userData = await testDataManager.createTestUser();
    const petData = await testDataManager.createTestPet(userData.id);
    
    // 注册并登录
    await authPage.goToRegister();
    await authPage.register(userData);
    
    // 创建宠物
    await petsPage.navigate();
    await petsPage.addPet(petData);
    
    // 进行多次分析以测试数据一致性
    const analysisResults = [];
    
    for (let i = 0; i < 3; i++) {
      await analysisPage.navigate();
      await analysisPage.selectPet(petData.id);
      await analysisPage.uploadImage(`frontend/e2e/fixtures/images/test-poop-${i + 1}.jpg`);
      await analysisPage.startAnalysis();
      
      const result = await analysisPage.waitForAnalysisComplete();
      analysisResults.push(result);
      
      await analysisPage.saveRecord();
      
      // 验证每次保存后的数据完整性
      await page.goto('/records');
      const recordCount = await page.locator('[data-testid="analysis-record"]').count();
      expect(recordCount).toBe(i + 1);
    }
    
    // 验证所有记录的数据完整性
    await page.goto('/records');
    const records = await page.locator('[data-testid="analysis-record"]').all();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // 验证必要字段存在
      await expect(record.locator('[data-testid="pet-name"]')).toBeVisible();
      await expect(record.locator('[data-testid="analysis-date"]')).toBeVisible();
      await expect(record.locator('[data-testid="health-status"]')).toBeVisible();
      await expect(record.locator('[data-testid="analysis-image"]')).toBeVisible();
      
      // 验证数据内容正确
      await expect(record.locator('[data-testid="pet-name"]')).toContainText(petData.name);
      
      const healthStatus = await record.locator('[data-testid="health-status"]').textContent();
      expect(healthStatus).toMatch(/健康|警告|关注/);
    }
    
    // 验证数据统计的一致性
    await page.goto('/profile');
    const totalAnalyses = await page.locator('[data-testid="total-analyses"]').textContent();
    expect(parseInt(totalAnalyses || '0')).toBe(3);
    
    // 验证宠物页面的数据一致性
    await petsPage.navigate();
    const petInfo = await petsPage.getPetById(petData.id);
    expect(petInfo.analysisCount).toBe(3);
  });

  test('跨页面数据状态一致性', async ({ page }) => {
    const userData = await testDataManager.createTestUser();
    const petData = await testDataManager.createTestPet(userData.id);
    
    // 注册登录
    await authPage.goToRegister();
    await authPage.register(userData);
    
    // 在宠物页面创建宠物
    await petsPage.navigate();
    await petsPage.addPet(petData);
    
    // 验证宠物在分析页面可见
    await analysisPage.navigate();
    const availablePets = await analysisPage.getAvailablePets();
    expect(availablePets).toContainEqual(expect.objectContaining({
      id: petData.id,
      name: petData.name
    }));
    
    // 进行分析
    await analysisPage.selectPet(petData.id);
    await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
    await analysisPage.startAnalysis();
    await analysisPage.waitForAnalysisComplete();
    await analysisPage.saveRecord();
    
    // 验证记录在记录页面显示
    await page.goto('/records');
    const records = await page.locator('[data-testid="analysis-record"]').count();
    expect(records).toBe(1);
    
    // 验证宠物页面显示分析次数更新
    await petsPage.navigate();
    const updatedPetInfo = await petsPage.getPetById(petData.id);
    expect(updatedPetInfo.analysisCount).toBe(1);
    
    // 验证用户资料页面统计数据更新
    await page.goto('/profile');
    const userStats = await page.locator('[data-testid="user-stats"]');
    await expect(userStats.locator('[data-testid="total-pets"]')).toContainText('1');
    await expect(userStats.locator('[data-testid="total-analyses"]')).toContainText('1');
  });

  test('并发操作数据一致性', async ({ page, context }) => {
    const userData = await testDataManager.createTestUser();
    const petData = await testDataManager.createTestPet(userData.id);
    
    // 在第一个页面注册登录
    await authPage.goToRegister();
    await authPage.register(userData);
    await petsPage.navigate();
    await petsPage.addPet(petData);
    
    // 创建第二个页面模拟并发操作
    const page2 = await context.newPage();
    const authPage2 = new AuthPage(page2);
    const analysisPage2 = new AnalysisPage(page2);
    
    // 在第二个页面登录同一用户
    await authPage2.goToLogin();
    await authPage2.login(userData.email, userData.password);
    
    // 并发进行分析操作
    const analysisPromise1 = (async () => {
      await analysisPage.navigate();
      await analysisPage.selectPet(petData.id);
      await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop-1.jpg');
      await analysisPage.startAnalysis();
      return await analysisPage.waitForAnalysisComplete();
    })();
    
    const analysisPromise2 = (async () => {
      await analysisPage2.navigate();
      await analysisPage2.selectPet(petData.id);
      await analysisPage2.uploadImage('frontend/e2e/fixtures/images/test-poop-2.jpg');
      await analysisPage2.startAnalysis();
      return await analysisPage2.waitForAnalysisComplete();
    })();
    
    // 等待两个分析完成
    const [result1, result2] = await Promise.all([analysisPromise1, analysisPromise2]);
    
    // 保存两个分析结果
    await analysisPage.saveRecord();
    await analysisPage2.saveRecord();
    
    // 验证两个分析都成功保存
    await page.goto('/records');
    await page.waitForTimeout(1000); // 等待数据同步
    
    const recordCount = await page.locator('[data-testid="analysis-record"]').count();
    expect(recordCount).toBe(2);
    
    // 验证数据完整性
    const records = await page.locator('[data-testid="analysis-record"]').all();
    for (const record of records) {
      await expect(record.locator('[data-testid="pet-name"]')).toContainText(petData.name);
      await expect(record.locator('[data-testid="health-status"]')).toBeVisible();
    }
    
    await page2.close();
  });
});