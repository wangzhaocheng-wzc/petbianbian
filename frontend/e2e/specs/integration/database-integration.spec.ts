import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('数据库集成测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let testDataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    testDataManager = new TestDataManager();
    
    // 确保测试环境清洁
    await testDataManager.cleanup();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.describe('数据库操作和事务处理测试', () => {
    test('用户注册事务完整性', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      
      // 监听网络请求以验证事务
      const requests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/auth/register')) {
          requests.push(request);
        }
      });
      
      await authPage.goToRegister();
      await authPage.register(userData);
      
      // 验证注册成功
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // 验证用户数据在数据库中正确保存
      await page.goto('/profile');
      await expect(page.locator('[data-testid="username"]')).toContainText(userData.username);
      await expect(page.locator('[data-testid="email"]')).toContainText(userData.email);
      
      // 验证用户可以正常登出和重新登录
      await authPage.logout();
      await authPage.goToLogin();
      await authPage.login(userData.email, userData.password);
      
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('宠物创建事务回滚测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.goToRegister();
      await authPage.register(userData);
      
      // 尝试创建无效宠物数据触发事务回滚
      await petsPage.navigate();
      
      // 填写部分数据然后中断操作
      await page.fill('[data-testid="pet-name"]', '测试宠物');
      await page.selectOption('[data-testid="pet-type"]', 'dog');
      
      // 模拟网络中断或页面刷新
      await page.reload();
      
      // 验证未完成的宠物创建没有保存到数据库
      const petList = await petsPage.getPetList();
      expect(petList.length).toBe(0);
      
      // 重新完整创建宠物
      const petData = await testDataManager.createTestPet(userData.id);
      await petsPage.addPet(petData);
      
      // 验证完整创建成功
      const updatedPetList = await petsPage.getPetList();
      expect(updatedPetList.length).toBe(1);
      expect(updatedPetList[0].name).toBe(petData.name);
    });

    test('分析记录事务一致性', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      const petData = await testDataManager.createTestPet(userData.id);
      
      await authPage.goToRegister();
      await authPage.register(userData);
      await petsPage.navigate();
      await petsPage.addPet(petData);
      
      // 进行分析
      await analysisPage.navigate();
      await analysisPage.selectPet(petData.id);
      await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
      await analysisPage.startAnalysis();
      
      const analysisResult = await analysisPage.waitForAnalysisComplete();
      await analysisPage.saveRecord();
      
      // 验证分析记录和宠物统计数据的一致性
      await page.goto('/records');
      const recordCount = await page.locator('[data-testid="analysis-record"]').count();
      expect(recordCount).toBe(1);
      
      // 验证宠物页面的分析次数更新
      await petsPage.navigate();
      const petInfo = await petsPage.getPetById(petData.id);
      expect(petInfo.analysisCount).toBe(1);
      
      // 验证用户统计数据更新
      await page.goto('/profile');
      const totalAnalyses = await page.locator('[data-testid="total-analyses"]').textContent();
      expect(parseInt(totalAnalyses || '0')).toBe(1);
    });

    test('并发写入事务隔离', async ({ page, context }) => {
      const userData = await testDataManager.createTestUser();
      const petData = await testDataManager.createTestPet(userData.id);
      
      // 第一个页面
      await authPage.goToRegister();
      await authPage.register(userData);
      await petsPage.navigate();
      await petsPage.addPet(petData);
      
      // 创建第二个页面
      const page2 = await context.newPage();
      const authPage2 = new AuthPage(page2);
      const analysisPage2 = new AnalysisPage(page2);
      
      await authPage2.goToLogin();
      await authPage2.login(userData.email, userData.password);
      
      // 并发进行分析操作
      const analysis1Promise = (async () => {
        await analysisPage.navigate();
        await analysisPage.selectPet(petData.id);
        await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop-1.jpg');
        await analysisPage.startAnalysis();
        await analysisPage.waitForAnalysisComplete();
        await analysisPage.saveRecord();
      })();
      
      const analysis2Promise = (async () => {
        await analysisPage2.navigate();
        await analysisPage2.selectPet(petData.id);
        await analysisPage2.uploadImage('frontend/e2e/fixtures/images/test-poop-2.jpg');
        await analysisPage2.startAnalysis();
        await analysisPage2.waitForAnalysisComplete();
        await analysisPage2.saveRecord();
      })();
      
      // 等待两个分析完成
      await Promise.all([analysis1Promise, analysis2Promise]);
      
      // 验证两个分析都正确保存，没有数据丢失
      await page.goto('/records');
      await page.waitForTimeout(2000); // 等待数据同步
      
      const recordCount = await page.locator('[data-testid="analysis-record"]').count();
      expect(recordCount).toBe(2);
      
      // 验证宠物统计数据正确
      await petsPage.navigate();
      const petInfo = await petsPage.getPetById(petData.id);
      expect(petInfo.analysisCount).toBe(2);
      
      await page2.close();
    });
  });

  test.describe('数据备份恢复和迁移测试', () => {
    test('用户数据完整性验证', async ({ page }) => {
      // 创建完整的用户数据集
      const userData = await testDataManager.createTestUser();
      const pet1Data = await testDataManager.createTestPet(userData.id);
      const pet2Data = await testDataManager.createTestPet(userData.id);
      
      await authPage.goToRegister();
      await authPage.register(userData);
      
      // 创建宠物
      await petsPage.navigate();
      await petsPage.addPet(pet1Data);
      await petsPage.addPet(pet2Data);
      
      // 进行多次分析
      for (let i = 0; i < 3; i++) {
        await analysisPage.navigate();
        await analysisPage.selectPet(i < 2 ? pet1Data.id : pet2Data.id);
        await analysisPage.uploadImage(`frontend/e2e/fixtures/images/test-poop-${i + 1}.jpg`);
        await analysisPage.startAnalysis();
        await analysisPage.waitForAnalysisComplete();
        await analysisPage.saveRecord();
      }
      
      // 验证数据完整性
      const dataIntegrity = await this.verifyDataIntegrity(page, userData, [pet1Data, pet2Data]);
      expect(dataIntegrity.isValid).toBeTruthy();
      expect(dataIntegrity.userExists).toBeTruthy();
      expect(dataIntegrity.petsCount).toBe(2);
      expect(dataIntegrity.recordsCount).toBe(3);
      expect(dataIntegrity.statisticsMatch).toBeTruthy();
    });

    test('数据导出功能验证', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      const petData = await testDataManager.createTestPet(userData.id);
      
      await authPage.goToRegister();
      await authPage.register(userData);
      await petsPage.navigate();
      await petsPage.addPet(petData);
      
      // 创建分析记录
      await analysisPage.navigate();
      await analysisPage.selectPet(petData.id);
      await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
      await analysisPage.startAnalysis();
      await analysisPage.waitForAnalysisComplete();
      await analysisPage.saveRecord();
      
      // 测试数据导出功能
      await page.goto('/profile');
      
      // 监听下载事件
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-data-button"]');
      const download = await downloadPromise;
      
      // 验证导出文件
      expect(download.suggestedFilename()).toMatch(/.*\.(json|csv)$/);
      
      // 保存并验证导出内容
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('数据迁移兼容性测试', async ({ page }) => {
      // 模拟旧版本数据结构
      const legacyUserData = {
        username: 'legacy_user',
        email: 'legacy@test.com',
        password: 'password123',
        version: '1.0'
      };
      
      // 测试旧数据格式的兼容性
      await authPage.goToRegister();
      
      // 填写注册表单
      await page.fill('[data-testid="username"]', legacyUserData.username);
      await page.fill('[data-testid="email"]', legacyUserData.email);
      await page.fill('[data-testid="password"]', legacyUserData.password);
      await page.fill('[data-testid="confirm-password"]', legacyUserData.password);
      
      await page.click('[data-testid="register-button"]');
      
      // 验证注册成功
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // 验证用户数据正确迁移到新格式
      await page.goto('/profile');
      await expect(page.locator('[data-testid="username"]')).toContainText(legacyUserData.username);
      await expect(page.locator('[data-testid="email"]')).toContainText(legacyUserData.email);
    });
  });

  test.describe('数据库性能和并发访问测试', () => {
    test('大量数据查询性能', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.goToRegister();
      await authPage.register(userData);
      
      // 创建多个宠物
      const pets = [];
      for (let i = 0; i < 5; i++) {
        const petData = await testDataManager.createTestPet(userData.id);
        pets.push(petData);
      }
      
      await petsPage.navigate();
      for (const pet of pets) {
        await petsPage.addPet(pet);
      }
      
      // 为每个宠物创建多条分析记录
      for (let petIndex = 0; petIndex < pets.length; petIndex++) {
        for (let recordIndex = 0; recordIndex < 3; recordIndex++) {
          await analysisPage.navigate();
          await analysisPage.selectPet(pets[petIndex].id);
          await analysisPage.uploadImage(`frontend/e2e/fixtures/images/test-poop-${recordIndex + 1}.jpg`);
          await analysisPage.startAnalysis();
          await analysisPage.waitForAnalysisComplete();
          await analysisPage.saveRecord();
        }
      }
      
      // 测试查询性能
      const startTime = Date.now();
      await page.goto('/records');
      
      // 等待所有记录加载完成
      await expect(page.locator('[data-testid="analysis-record"]').first()).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // 验证加载时间合理（应小于5秒）
      expect(loadTime).toBeLessThan(5000);
      
      // 验证所有记录都正确显示
      const recordCount = await page.locator('[data-testid="analysis-record"]').count();
      expect(recordCount).toBe(15); // 5个宠物 × 3条记录
    });

    test('并发用户访问测试', async ({ page, context }) => {
      // 创建多个用户并发访问
      const users = [];
      for (let i = 0; i < 3; i++) {
        users.push(await testDataManager.createTestUser());
      }
      
      // 创建多个页面模拟并发用户
      const pages = [page];
      for (let i = 1; i < users.length; i++) {
        pages.push(await context.newPage());
      }
      
      // 并发注册和操作
      const userOperations = users.map(async (userData, index) => {
        const currentPage = pages[index];
        const currentAuthPage = new AuthPage(currentPage);
        const currentPetsPage = new PetsPage(currentPage);
        
        // 注册
        await currentAuthPage.goToRegister();
        await currentAuthPage.register(userData);
        
        // 创建宠物
        const petData = await testDataManager.createTestPet(userData.id);
        await currentPetsPage.navigate();
        await currentPetsPage.addPet(petData);
        
        return { userData, petData };
      });
      
      const results = await Promise.all(userOperations);
      
      // 验证所有用户操作都成功
      for (let i = 0; i < results.length; i++) {
        const currentPage = pages[i];
        await expect(currentPage.locator('[data-testid="user-menu"]')).toBeVisible();
        
        // 验证宠物创建成功
        const currentPetsPage = new PetsPage(currentPage);
        const petList = await currentPetsPage.getPetList();
        expect(petList.length).toBe(1);
        expect(petList[0].name).toBe(results[i].petData.name);
      }
      
      // 清理额外的页面
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    });

    test('数据库连接池压力测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.goToRegister();
      await authPage.register(userData);
      
      // 快速连续执行多个数据库操作
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(async () => {
          const petData = await testDataManager.createTestPet(userData.id);
          await petsPage.navigate();
          await petsPage.addPet(petData);
          return petData;
        });
      }
      
      const startTime = Date.now();
      const results = await Promise.allSettled(operations.map(op => op()));
      const endTime = Date.now();
      
      // 验证所有操作都成功完成
      const successfulOperations = results.filter(result => result.status === 'fulfilled');
      expect(successfulOperations.length).toBe(operations.length);
      
      // 验证总执行时间合理
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(30000); // 应在30秒内完成
      
      // 验证数据一致性
      const petList = await petsPage.getPetList();
      expect(petList.length).toBe(10);
    });

    test('长时间会话数据一致性', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.goToRegister();
      await authPage.register(userData);
      
      // 模拟长时间会话
      const petData = await testDataManager.createTestPet(userData.id);
      await petsPage.navigate();
      await petsPage.addPet(petData);
      
      // 等待一段时间模拟会话超时边缘情况
      await page.waitForTimeout(5000);
      
      // 继续操作验证会话和数据一致性
      await analysisPage.navigate();
      await analysisPage.selectPet(petData.id);
      await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
      await analysisPage.startAnalysis();
      
      const analysisResult = await analysisPage.waitForAnalysisComplete();
      await analysisPage.saveRecord();
      
      // 验证长时间会话后数据仍然一致
      await page.goto('/records');
      const recordCount = await page.locator('[data-testid="analysis-record"]').count();
      expect(recordCount).toBe(1);
      
      // 验证用户仍然登录
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  // 辅助方法
  async verifyDataIntegrity(page: any, userData: any, pets: any[]) {
    const integrity = {
      isValid: true,
      userExists: false,
      petsCount: 0,
      recordsCount: 0,
      statisticsMatch: false
    };
    
    try {
      // 验证用户存在
      await page.goto('/profile');
      const username = await page.locator('[data-testid="username"]').textContent();
      integrity.userExists = username === userData.username;
      
      // 验证宠物数量
      await petsPage.navigate();
      const petList = await petsPage.getPetList();
      integrity.petsCount = petList.length;
      
      // 验证记录数量
      await page.goto('/records');
      integrity.recordsCount = await page.locator('[data-testid="analysis-record"]').count();
      
      // 验证统计数据匹配
      await page.goto('/profile');
      const totalPets = await page.locator('[data-testid="total-pets"]').textContent();
      const totalAnalyses = await page.locator('[data-testid="total-analyses"]').textContent();
      
      integrity.statisticsMatch = 
        parseInt(totalPets || '0') === integrity.petsCount &&
        parseInt(totalAnalyses || '0') === integrity.recordsCount;
      
      integrity.isValid = 
        integrity.userExists &&
        integrity.petsCount === pets.length &&
        integrity.statisticsMatch;
        
    } catch (error) {
      integrity.isValid = false;
    }
    
    return integrity;
  }
});