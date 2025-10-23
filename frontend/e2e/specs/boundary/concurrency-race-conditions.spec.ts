import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { DataBoundaryUtils } from '../../utils/data-boundary-utils';

test.describe('并发和竞态条件测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let communityPage: CommunityPage;
  let testDataManager: TestDataManager;
  let dataBoundaryUtils: DataBoundaryUtils;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    communityPage = new CommunityPage(page);
    testDataManager = new TestDataManager();
    dataBoundaryUtils = new DataBoundaryUtils(page);
    
    await page.goto('/');
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.describe('多用户同时操作测试', () => {
    test('多用户同时注册测试', async ({ context }) => {
      const registrationPromises = [];
      const users = [];
      
      // 创建5个并发注册操作
      for (let i = 1; i <= 5; i++) {
        const userData = {
          username: `concurrent_user_${i}`,
          email: `concurrent${i}@test.com`,
          password: 'Password123!'
        };
        users.push(userData);
        
        registrationPromises.push(async () => {
          const page = await context.newPage();
          const auth = new AuthPage(page);
          
          await page.goto('/');
          await auth.goToRegister();
          await auth.fillRegistrationForm(userData);
          await auth.submitRegistration();
          
          // 验证注册成功
          await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
          
          await page.close();
          return userData;
        });
      }
      
      // 并发执行所有注册操作
      const results = await dataBoundaryUtils.testConcurrentOperations(registrationPromises, 5);
      
      expect(results.success).toBe(true);
      expect(results.errors).toHaveLength(0);
    });

    test('多用户同时登录测试', async ({ context }) => {
      // 先创建测试用户
      const testUsers = [];
      for (let i = 1; i <= 3; i++) {
        const user = await testDataManager.createTestUser({
          username: `login_user_${i}`,
          email: `login${i}@test.com`
        });
        testUsers.push(user);
      }
      
      const loginPromises = testUsers.map(user => async () => {
        const page = await context.newPage();
        const auth = new AuthPage(page);
        
        await page.goto('/');
        await auth.login(user.email, user.password);
        
        // 验证登录成功
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
        
        // 验证用户信息正确
        const username = await page.locator('[data-testid="username-display"]').textContent();
        expect(username).toBe(user.username);
        
        await page.close();
      });
      
      const results = await dataBoundaryUtils.testConcurrentOperations(loginPromises, 3);
      
      expect(results.success).toBe(true);
      expect(results.errors).toHaveLength(0);
    });

    test('多用户同时创建宠物测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      
      const petCreationPromises = [];
      for (let i = 1; i <= 10; i++) {
        petCreationPromises.push(async () => {
          const page = await context.newPage();
          const auth = new AuthPage(page);
          const pets = new PetsPage(page);
          
          await page.goto('/');
          await auth.login(testUser.email, testUser.password);
          
          await pets.goToPetManagement();
          await pets.clickAddPet();
          
          await pets.fillPetForm({
            name: `并发宠物${i}`,
            type: i % 2 === 0 ? 'dog' : 'cat',
            breed: i % 2 === 0 ? '金毛' : '英短',
            age: Math.floor(Math.random() * 10) + 1,
            weight: Math.floor(Math.random() * 30) + 5
          });
          
          await pets.submitPetForm();
          
          // 验证创建成功
          await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
          
          await page.close();
        });
      }
      
      const results = await dataBoundaryUtils.testConcurrentOperations(petCreationPromises, 5);
      
      expect(results.success).toBe(true);
      
      // 验证所有宠物都被正确创建
      await authPage.login(testUser.email, testUser.password);
      await petsPage.goToPetManagement();
      
      const petCount = await petsPage.getPetCount();
      expect(petCount).toBe(10);
    });

    test('多用户同时进行分析测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPets = [];
      
      // 创建多个测试宠物
      for (let i = 1; i <= 3; i++) {
        const pet = await testDataManager.createTestPet(testUser.id, {
          name: `分析宠物${i}`
        });
        testPets.push(pet);
      }
      
      const analysisPromises = testPets.map((pet, index) => async () => {
        const page = await context.newPage();
        const auth = new AuthPage(page);
        const analysis = new AnalysisPage(page);
        
        await page.goto('/');
        await auth.login(testUser.email, testUser.password);
        
        await analysis.goToAnalysis();
        await analysis.selectPet(pet.id);
        
        // 模拟上传图片
        const testImageBuffer = Buffer.alloc(1024 * 1024); // 1MB测试图片
        await page.setInputFiles('[data-testid="image-upload"]', {
          name: `test-image-${index}.jpg`,
          mimeType: 'image/jpeg',
          buffer: testImageBuffer
        });
        
        await analysis.startAnalysis();
        
        // 等待分析完成
        await page.waitForSelector('[data-testid="analysis-result"]', { timeout: 30000 });
        
        // 保存分析结果
        await analysis.saveRecord();
        await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
        
        await page.close();
      });
      
      const results = await dataBoundaryUtils.testConcurrentOperations(analysisPromises, 3);
      
      expect(results.success).toBe(true);
      
      // 验证所有分析记录都被保存
      await authPage.login(testUser.email, testUser.password);
      await analysisPage.goToRecords();
      
      const recordCount = await analysisPage.getRecordCount();
      expect(recordCount).toBe(3);
    });
  });

  test.describe('资源锁定和死锁检测测试', () => {
    test('同一宠物信息并发编辑测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      // 创建两个页面同时编辑同一只宠物
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      const auth1 = new AuthPage(page1);
      const auth2 = new AuthPage(page2);
      const pets1 = new PetsPage(page1);
      const pets2 = new PetsPage(page2);
      
      // 两个页面都登录
      await page1.goto('/');
      await auth1.login(testUser.email, testUser.password);
      
      await page2.goto('/');
      await auth2.login(testUser.email, testUser.password);
      
      // 两个页面都进入编辑模式
      await pets1.goToPetManagement();
      await pets1.clickEditPet(testPet.id);
      
      await pets2.goToPetManagement();
      await pets2.clickEditPet(testPet.id);
      
      // 第一个页面先提交修改
      await pets1.fillPetForm({
        name: '第一次修改',
        type: 'dog',
        breed: '金毛',
        age: 3,
        weight: 25
      });
      
      const submitPromise1 = pets1.submitPetForm();
      
      // 第二个页面几乎同时提交修改
      await pets2.fillPetForm({
        name: '第二次修改',
        type: 'dog',
        breed: '金毛',
        age: 4,
        weight: 28
      });
      
      const submitPromise2 = pets2.submitPetForm();
      
      // 等待两个提交完成
      await Promise.allSettled([submitPromise1, submitPromise2]);
      
      // 验证冲突处理
      const success1 = await page1.locator('[data-testid="success-message"]').isVisible();
      const success2 = await page2.locator('[data-testid="success-message"]').isVisible();
      const conflict2 = await page2.locator('[data-testid="conflict-error"]').isVisible();
      
      // 应该只有一个成功，另一个显示冲突错误
      expect(success1 || success2).toBe(true);
      expect(success1 && success2).toBe(false);
      
      if (!success2) {
        expect(conflict2).toBe(true);
      }
      
      await page1.close();
      await page2.close();
    });

    test('文件上传资源竞争测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      const uploadPromises = [];
      
      // 创建多个并发文件上传
      for (let i = 1; i <= 5; i++) {
        uploadPromises.push(async () => {
          const page = await context.newPage();
          const auth = new AuthPage(page);
          const analysis = new AnalysisPage(page);
          
          await page.goto('/');
          await auth.login(testUser.email, testUser.password);
          
          await analysis.goToAnalysis();
          await analysis.selectPet(testPet.id);
          
          // 创建大文件模拟上传竞争
          const largeImageBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
          
          await page.setInputFiles('[data-testid="image-upload"]', {
            name: `concurrent-upload-${i}.jpg`,
            mimeType: 'image/jpeg',
            buffer: largeImageBuffer
          });
          
          // 验证上传状态
          await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
          
          // 等待上传完成
          await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });
          
          await page.close();
        });
      }
      
      const results = await dataBoundaryUtils.testConcurrentOperations(uploadPromises, 3);
      
      // 验证所有上传都成功或有适当的错误处理
      expect(results.errors.length).toBeLessThanOrEqual(2); // 允许少量失败
    });

    test('数据库连接池耗尽测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      
      // 创建大量并发数据库操作
      const dbOperationPromises = [];
      
      for (let i = 1; i <= 20; i++) {
        dbOperationPromises.push(async () => {
          const page = await context.newPage();
          const auth = new AuthPage(page);
          const pets = new PetsPage(page);
          
          await page.goto('/');
          await auth.login(testUser.email, testUser.password);
          
          // 执行多个数据库操作
          await pets.goToPetManagement();
          
          // 创建宠物
          await pets.clickAddPet();
          await pets.fillPetForm({
            name: `DB测试宠物${i}`,
            type: 'dog',
            breed: '金毛',
            age: 2,
            weight: 25
          });
          await pets.submitPetForm();
          
          // 立即查询宠物列表
          await pets.goToPetManagement();
          await pets.searchPets(`DB测试宠物${i}`);
          
          // 编辑刚创建的宠物
          const petId = await pets.getFirstPetId();
          await pets.editPet(petId, {
            name: `修改后的DB测试宠物${i}`,
            type: 'dog',
            breed: '金毛',
            age: 3,
            weight: 26
          });
          
          await page.close();
        });
      }
      
      const results = await dataBoundaryUtils.testConcurrentOperations(dbOperationPromises, 10);
      
      // 验证系统能够处理连接池压力
      expect(results.errors.length).toBeLessThan(5); // 允许少量连接失败
    });
  });

  test.describe('数据一致性和事务隔离测试', () => {
    test('并发修改数据一致性测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id, {
        name: '原始宠物名称',
        age: 2,
        weight: 25
      });
      
      // 创建多个页面同时读取和修改数据
      const pages = [];
      for (let i = 0; i < 3; i++) {
        const page = await context.newPage();
        const auth = new AuthPage(page);
        await page.goto('/');
        await auth.login(testUser.email, testUser.password);
        pages.push(page);
      }
      
      // 所有页面同时读取初始数据
      const initialDataPromises = pages.map(async (page) => {
        const pets = new PetsPage(page);
        await pets.goToPetManagement();
        return await pets.getPetInfo(testPet.id);
      });
      
      const initialData = await Promise.all(initialDataPromises);
      
      // 验证所有页面读取的初始数据一致
      for (let i = 1; i < initialData.length; i++) {
        expect(initialData[i]).toEqual(initialData[0]);
      }
      
      // 第一个页面修改数据
      const pets1 = new PetsPage(pages[0]);
      await pets1.editPet(testPet.id, {
        name: '第一次修改',
        type: 'dog',
        breed: '金毛',
        age: 3,
        weight: 26
      });
      
      // 等待修改完成
      await expect(pages[0].locator('[data-testid="success-message"]')).toBeVisible();
      
      // 其他页面刷新并验证数据一致性
      const updatedDataPromises = pages.slice(1).map(async (page) => {
        await page.reload();
        const pets = new PetsPage(page);
        await pets.goToPetManagement();
        return await pets.getPetInfo(testPet.id);
      });
      
      const updatedData = await Promise.all(updatedDataPromises);
      
      // 验证所有页面看到的更新后数据一致
      for (let i = 1; i < updatedData.length; i++) {
        expect(updatedData[i]).toEqual(updatedData[0]);
      }
      
      // 验证数据确实被修改
      expect(updatedData[0].name).toBe('第一次修改');
      expect(updatedData[0].age).toBe(3);
      
      // 清理页面
      for (const page of pages) {
        await page.close();
      }
    });

    test('事务回滚一致性测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 获取初始宠物数量
      await petsPage.goToPetManagement();
      const initialPetCount = await petsPage.getPetCount();
      
      // 模拟事务失败的场景
      await page.route('**/api/pets', async route => {
        if (route.request().method() === 'POST') {
          // 模拟服务器错误导致事务回滚
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Database transaction failed' })
          });
        } else {
          await route.continue();
        }
      });
      
      // 尝试创建宠物（应该失败）
      await petsPage.clickAddPet();
      await petsPage.fillPetForm({
        name: '事务测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 25
      });
      
      await petsPage.submitPetForm();
      
      // 验证错误处理
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // 移除路由拦截
      await page.unroute('**/api/pets');
      
      // 刷新页面验证数据一致性
      await page.reload();
      await petsPage.goToPetManagement();
      
      const finalPetCount = await petsPage.getPetCount();
      
      // 验证宠物数量没有变化（事务回滚成功）
      expect(finalPetCount).toBe(initialPetCount);
    });

    test('读写隔离级别测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      // 创建两个页面：一个读取，一个写入
      const readerPage = await context.newPage();
      const writerPage = await context.newPage();
      
      const readerAuth = new AuthPage(readerPage);
      const writerAuth = new AuthPage(writerPage);
      const readerPets = new PetsPage(readerPage);
      const writerPets = new PetsPage(writerPage);
      
      // 两个页面都登录
      await readerPage.goto('/');
      await readerAuth.login(testUser.email, testUser.password);
      
      await writerPage.goto('/');
      await writerAuth.login(testUser.email, testUser.password);
      
      // 读取页面开始长时间读取操作
      await readerPets.goToPetManagement();
      const readStartTime = Date.now();
      
      // 写入页面开始修改数据
      await writerPets.goToPetManagement();
      await writerPets.editPet(testPet.id, {
        name: '隔离测试修改',
        type: 'dog',
        breed: '金毛',
        age: 5,
        weight: 30
      });
      
      // 验证写入完成
      await expect(writerPage.locator('[data-testid="success-message"]')).toBeVisible();
      
      // 读取页面继续读取（模拟长事务）
      await readerPage.waitForTimeout(2000);
      const petInfo = await readerPets.getPetInfo(testPet.id);
      
      const readEndTime = Date.now();
      const readDuration = readEndTime - readStartTime;
      
      // 验证读取操作没有被写入操作阻塞太久
      expect(readDuration).toBeLessThan(10000); // 不超过10秒
      
      // 刷新读取页面验证最终一致性
      await readerPage.reload();
      await readerPets.goToPetManagement();
      const updatedPetInfo = await readerPets.getPetInfo(testPet.id);
      
      expect(updatedPetInfo.name).toBe('隔离测试修改');
      
      await readerPage.close();
      await writerPage.close();
    });

    test('分布式事务一致性测试', async ({ context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      // 模拟跨服务的分布式事务（宠物信息更新 + 分析记录创建）
      await authPage.login(testUser.email, testUser.password);
      
      // 开始分布式事务
      await analysisPage.goToAnalysis();
      await analysisPage.selectPet(testPet.id);
      
      // 上传图片并开始分析
      const testImageBuffer = Buffer.alloc(1024 * 1024);
      await analysisPage.page.setInputFiles('[data-testid="image-upload"]', {
        name: 'distributed-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer
      });
      
      await analysisPage.startAnalysis();
      
      // 等待分析完成
      await analysisPage.page.waitForSelector('[data-testid="analysis-result"]', { timeout: 30000 });
      
      // 同时更新宠物信息和保存分析记录
      const updatePromises = [
        // 更新宠物最后分析时间
        (async () => {
          const pets = new PetsPage(analysisPage.page);
          await pets.updateLastAnalysisTime(testPet.id);
        })(),
        
        // 保存分析记录
        (async () => {
          await analysisPage.saveRecord();
        })()
      ];
      
      await Promise.all(updatePromises);
      
      // 验证分布式事务的一致性
      await analysisPage.goToRecords();
      const recordCount = await analysisPage.getRecordCount();
      expect(recordCount).toBeGreaterThan(0);
      
      await petsPage.goToPetManagement();
      const petInfo = await petsPage.getPetInfo(testPet.id);
      expect(petInfo.lastAnalysisTime).toBeDefined();
    });
  });

  test.describe('竞态条件边界测试', () => {
    test('快速连续操作竞态测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      
      // 快速连续点击添加宠物按钮
      const clickPromises = [];
      for (let i = 0; i < 10; i++) {
        clickPromises.push(
          page.locator('[data-testid="add-pet-button"]').click()
        );
      }
      
      await Promise.all(clickPromises);
      
      // 验证只打开了一个添加宠物对话框
      const dialogCount = await page.locator('[data-testid="add-pet-dialog"]').count();
      expect(dialogCount).toBe(1);
    });

    test('表单提交竞态条件测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      await petsPage.clickAddPet();
      
      // 填写表单
      await petsPage.fillPetForm({
        name: '竞态测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 25
      });
      
      // 快速连续提交表单
      const submitPromises = [];
      for (let i = 0; i < 5; i++) {
        submitPromises.push(
          page.locator('[data-testid="submit-pet-form"]').click()
        );
      }
      
      await Promise.allSettled(submitPromises);
      
      // 验证只创建了一只宠物
      await page.waitForTimeout(2000);
      const petCount = await petsPage.getPetCount();
      expect(petCount).toBe(1);
      
      // 验证没有重复的成功消息
      const successMessages = await page.locator('[data-testid="success-message"]').count();
      expect(successMessages).toBeLessThanOrEqual(1);
    });

    test('异步操作竞态条件测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      await authPage.login(testUser.email, testUser.password);
      
      await analysisPage.goToAnalysis();
      await analysisPage.selectPet(testPet.id);
      
      // 上传图片
      const testImageBuffer = Buffer.alloc(1024 * 1024);
      await page.setInputFiles('[data-testid="image-upload"]', {
        name: 'race-test.jpg',
        mimeType: 'image/jpeg',
        buffer: testImageBuffer
      });
      
      // 快速连续开始分析
      const analysisPromises = [];
      for (let i = 0; i < 3; i++) {
        analysisPromises.push(
          page.locator('[data-testid="start-analysis"]').click()
        );
      }
      
      await Promise.allSettled(analysisPromises);
      
      // 验证只有一个分析在进行
      const progressIndicators = await page.locator('[data-testid="analysis-progress"]').count();
      expect(progressIndicators).toBeLessThanOrEqual(1);
      
      // 等待分析完成
      await page.waitForSelector('[data-testid="analysis-result"]', { timeout: 30000 });
      
      // 验证只生成了一个分析结果
      const resultCount = await page.locator('[data-testid="analysis-result"]').count();
      expect(resultCount).toBe(1);
    });
  });
});