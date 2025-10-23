import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { BoundaryTestingUtils } from '../../utils/boundary-testing-utils';

test.describe('数据边界测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let communityPage: CommunityPage;
  let testDataManager: TestDataManager;
  let boundaryUtils: BoundaryTestingUtils;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    communityPage = new CommunityPage(page);
    testDataManager = new TestDataManager();
    boundaryUtils = new BoundaryTestingUtils(page);
    
    await page.goto('/');
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.describe('大数据量处理测试', () => {
    test('宠物列表大数据量分页测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 创建大量测试宠物数据（模拟100只宠物）
      const petPromises = [];
      for (let i = 1; i <= 100; i++) {
        petPromises.push(testDataManager.createTestPet(testUser.id, {
          name: `测试宠物${i}`,
          type: i % 2 === 0 ? 'dog' : 'cat',
          breed: i % 2 === 0 ? '金毛' : '英短',
          age: Math.floor(Math.random() * 15) + 1,
          weight: Math.floor(Math.random() * 50) + 1
        }));
      }
      
      await Promise.all(petPromises);
      
      await petsPage.goToPetManagement();
      
      // 验证分页功能
      await expect(page.locator('[data-testid="pet-list-item"]')).toHaveCount(20); // 默认每页20条
      
      // 验证分页控件存在
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      await expect(page.locator('[data-testid="page-info"]')).toContainText('第 1 页，共 5 页');
      
      // 测试翻页功能
      await page.locator('[data-testid="next-page"]').click();
      await expect(page.locator('[data-testid="page-info"]')).toContainText('第 2 页，共 5 页');
      
      // 测试跳转到最后一页
      await page.locator('[data-testid="last-page"]').click();
      await expect(page.locator('[data-testid="page-info"]')).toContainText('第 5 页，共 5 页');
      
      // 验证最后一页的数据量
      const lastPageItems = await page.locator('[data-testid="pet-list-item"]').count();
      expect(lastPageItems).toBeLessThanOrEqual(20);
    });

    test('分析记录大数据量处理测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      await authPage.login(testUser.email, testUser.password);
      
      // 创建大量分析记录（模拟200条记录）
      const recordPromises = [];
      for (let i = 1; i <= 200; i++) {
        recordPromises.push(testDataManager.createAnalysisRecord(testPet.id, {
          result: {
            healthStatus: i % 3 === 0 ? 'healthy' : i % 3 === 1 ? 'warning' : 'concerning',
            confidence: Math.random() * 100,
            analysis: `分析结果${i}`,
            recommendations: [`建议${i}`]
          },
          notes: `记录${i}的备注`,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // 每天一条记录
        }));
      }
      
      await Promise.all(recordPromises);
      
      await page.goto('/records');
      
      // 验证记录列表分页
      await expect(page.locator('[data-testid="record-item"]')).toHaveCount(50); // 每页50条记录
      
      // 验证分页信息
      await expect(page.locator('[data-testid="records-pagination"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-records"]')).toContainText('共 200 条记录');
      
      // 测试筛选功能在大数据量下的性能
      await page.locator('[data-testid="filter-healthy"]').click();
      await page.waitForTimeout(2000); // 等待筛选完成
      
      const healthyRecords = await page.locator('[data-testid="record-item"][data-status="healthy"]').count();
      expect(healthyRecords).toBeGreaterThan(0);
      expect(healthyRecords).toBeLessThanOrEqual(50); // 不超过每页限制
    });

    test('社区帖子大数据量加载测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 创建大量社区帖子（模拟500个帖子）
      const postPromises = [];
      for (let i = 1; i <= 500; i++) {
        postPromises.push(testDataManager.createCommunityPost(testUser.id, {
          title: `社区帖子标题${i}`,
          content: `这是第${i}个测试帖子的内容，包含一些测试文字来模拟真实的帖子内容。`,
          tags: [`标签${i % 10}`, `分类${i % 5}`],
          images: i % 3 === 0 ? [`test-image-${i}.jpg`] : []
        }));
      }
      
      await Promise.all(postPromises);
      
      await communityPage.goToCommunity();
      
      // 验证无限滚动加载
      const initialPosts = await page.locator('[data-testid="community-post"]').count();
      expect(initialPosts).toBe(20); // 初始加载20个帖子
      
      // 滚动到底部触发加载更多
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      
      const afterScrollPosts = await page.locator('[data-testid="community-post"]').count();
      expect(afterScrollPosts).toBeGreaterThan(initialPosts);
      expect(afterScrollPosts).toBeLessThanOrEqual(40); // 加载更多但不超过40个
      
      // 验证加载指示器
      await expect(page.locator('[data-testid="loading-more"]')).toBeVisible();
    });
  });

  test.describe('数据库连接池和事务边界测试', () => {
    test('并发数据库操作测试', async ({ page, context }) => {
      const testUser = await testDataManager.createTestUser();
      
      // 创建多个浏览器标签页模拟并发操作
      const pages = [];
      for (let i = 0; i < 5; i++) {
        const newPage = await context.newPage();
        pages.push(newPage);
      }
      
      // 在所有标签页中同时登录
      const loginPromises = pages.map(async (p, index) => {
        const auth = new AuthPage(p);
        await p.goto('/');
        await auth.login(testUser.email, testUser.password);
        return p;
      });
      
      await Promise.all(loginPromises);
      
      // 在所有标签页中同时创建宠物
      const petCreationPromises = pages.map(async (p, index) => {
        const pets = new PetsPage(p);
        await pets.goToPetManagement();
        await pets.clickAddPet();
        await pets.fillPetForm({
          name: `并发宠物${index}`,
          type: 'dog',
          breed: '金毛',
          age: 2,
          weight: 25
        });
        await pets.submitPetForm();
        
        // 验证创建成功
        await expect(p.locator('[data-testid="success-message"]')).toBeVisible();
      });
      
      await Promise.all(petCreationPromises);
      
      // 验证所有宠物都被正确创建
      await petsPage.goToPetManagement();
      const petCount = await page.locator('[data-testid="pet-list-item"]').count();
      expect(petCount).toBe(5);
      
      // 清理页面
      for (const p of pages) {
        await p.close();
      }
    });

    test('长时间事务处理测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      await authPage.login(testUser.email, testUser.password);
      
      await analysisPage.goToAnalysis();
      
      // 模拟长时间的分析过程
      await analysisPage.selectPet(testPet.id);
      
      // 上传图片并开始分析
      const testImagePath = 'frontend/e2e/fixtures/images/test-poop.jpg';
      await analysisPage.uploadImage(testImagePath);
      await analysisPage.startAnalysis();
      
      // 验证分析进度指示器
      await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
      
      // 等待分析完成（模拟长时间处理）
      await page.waitForSelector('[data-testid="analysis-result"]', { timeout: 30000 });
      
      // 验证结果正确保存
      const result = await analysisPage.getAnalysisResult();
      expect(result).toBeDefined();
      expect(result.healthStatus).toMatch(/healthy|warning|concerning/);
      
      // 验证数据库事务完整性
      await analysisPage.saveRecord();
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
      
      // 验证记录确实保存到数据库
      await page.goto('/records');
      await expect(page.locator('[data-testid="record-item"]').first()).toBeVisible();
    });

    test('数据库连接超时处理测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 模拟网络延迟导致的数据库连接问题
      await page.route('**/api/**', async route => {
        // 随机延迟一些请求来模拟网络问题
        if (Math.random() < 0.3) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒延迟
        }
        await route.continue();
      });
      
      await petsPage.goToPetManagement();
      
      // 尝试加载宠物列表
      const startTime = Date.now();
      
      try {
        await page.waitForSelector('[data-testid="pet-list"]', { timeout: 15000 });
        const loadTime = Date.now() - startTime;
        
        // 验证在合理时间内加载完成或显示错误
        if (loadTime > 12000) {
          await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
        } else {
          await expect(page.locator('[data-testid="pet-list"]')).toBeVisible();
        }
      } catch (error) {
        // 验证超时错误处理
        await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      }
    });
  });

  test.describe('缓存溢出和内存管理测试', () => {
    test('图片缓存溢出测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      await authPage.login(testUser.email, testUser.password);
      
      await analysisPage.goToAnalysis();
      await analysisPage.selectPet(testPet.id);
      
      // 连续上传大量图片测试缓存处理
      const imageUploadPromises = [];
      for (let i = 0; i < 50; i++) {
        imageUploadPromises.push(async () => {
          // 创建不同大小的测试图片
          const imageSize = Math.floor(Math.random() * 5 * 1024 * 1024) + 1024 * 1024; // 1-5MB
          const imageBuffer = Buffer.alloc(imageSize);
          
          await page.setInputFiles('[data-testid="image-upload"]', {
            name: `test-image-${i}.jpg`,
            mimeType: 'image/jpeg',
            buffer: imageBuffer
          });
          
          await page.waitForTimeout(100); // 短暂等待
          
          // 验证图片预览正常显示
          await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
          
          // 清除当前图片为下一次上传做准备
          await page.locator('[data-testid="clear-image"]').click();
        });
      }
      
      // 顺序执行上传以避免并发问题
      for (const uploadFn of imageUploadPromises) {
        await uploadFn();
      }
      
      // 验证内存使用情况
      const memoryUsage = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (memoryUsage) {
        // 验证内存使用在合理范围内
        const memoryUsageRatio = memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit;
        expect(memoryUsageRatio).toBeLessThan(0.8); // 内存使用不超过80%
      }
    });

    test('数据缓存一致性测试', async ({ page, context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      // 在第一个标签页中登录并查看宠物信息
      await authPage.login(testUser.email, testUser.password);
      await petsPage.goToPetManagement();
      
      const originalPetName = await page.locator('[data-testid="pet-name"]').first().textContent();
      
      // 在第二个标签页中修改宠物信息
      const secondPage = await context.newPage();
      const secondAuth = new AuthPage(secondPage);
      const secondPets = new PetsPage(secondPage);
      
      await secondPage.goto('/');
      await secondAuth.login(testUser.email, testUser.password);
      await secondPets.goToPetManagement();
      
      // 编辑宠物信息
      await secondPets.editPet(testPet.id, {
        name: '修改后的宠物名称',
        type: 'dog',
        breed: '金毛',
        age: 3,
        weight: 30
      });
      
      // 回到第一个标签页刷新数据
      await page.reload();
      await page.waitForSelector('[data-testid="pet-list"]');
      
      // 验证缓存已更新
      const updatedPetName = await page.locator('[data-testid="pet-name"]').first().textContent();
      expect(updatedPetName).toBe('修改后的宠物名称');
      expect(updatedPetName).not.toBe(originalPetName);
      
      await secondPage.close();
    });

    test('会话缓存过期测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 验证登录状态
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // 模拟会话过期（清除本地存储）
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // 尝试访问需要认证的页面
      await petsPage.goToPetManagement();
      
      // 验证被重定向到登录页面
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 重新登录
      await authPage.login(testUser.email, testUser.password);
      
      // 验证可以正常访问
      await petsPage.goToPetManagement();
      await expect(page.locator('[data-testid="pet-list"]')).toBeVisible();
    });

    test('本地存储容量限制测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 尝试存储大量数据到本地存储
      const largeData = 'x'.repeat(1024 * 1024); // 1MB数据
      
      const storageResult = await page.evaluate((data) => {
        try {
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`large_data_${i}`, data);
          }
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, largeData);
      
      if (!storageResult.success) {
        // 验证存储限制错误被正确处理
        expect(storageResult.error).toContain('QuotaExceededError');
        
        // 验证应用程序仍然正常工作
        await petsPage.goToPetManagement();
        await expect(page.locator('[data-testid="pet-list"]')).toBeVisible();
      }
      
      // 清理本地存储
      await page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          localStorage.removeItem(`large_data_${i}`);
        }
      });
    });
  });

  test.describe('数据一致性验证测试', () => {
    test('跨页面数据一致性测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      await authPage.login(testUser.email, testUser.password);
      
      // 在宠物管理页面查看宠物信息
      await petsPage.goToPetManagement();
      const petInfoFromList = await page.locator('[data-testid="pet-info"]').first().textContent();
      
      // 进入分析页面选择同一只宠物
      await analysisPage.goToAnalysis();
      await analysisPage.selectPet(testPet.id);
      
      const petInfoFromAnalysis = await page.locator('[data-testid="selected-pet-info"]').textContent();
      
      // 验证两个页面显示的宠物信息一致
      expect(petInfoFromAnalysis).toContain(testPet.name);
      
      // 在记录页面查看同一只宠物的信息
      await page.goto('/records');
      await page.locator(`[data-testid="filter-pet-${testPet.id}"]`).click();
      
      const petInfoFromRecords = await page.locator('[data-testid="pet-filter-info"]').textContent();
      expect(petInfoFromRecords).toContain(testPet.name);
    });

    test('数据修改后的一致性验证', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      await authPage.login(testUser.email, testUser.password);
      
      // 创建分析记录
      const analysisRecord = await testDataManager.createAnalysisRecord(testPet.id, {
        result: {
          healthStatus: 'healthy',
          confidence: 95,
          analysis: '健康状态良好',
          recommendations: ['继续保持']
        }
      });
      
      // 在记录页面查看原始数据
      await page.goto('/records');
      const originalStatus = await page.locator('[data-testid="health-status"]').first().textContent();
      expect(originalStatus).toContain('健康');
      
      // 修改宠物信息
      await petsPage.goToPetManagement();
      await petsPage.editPet(testPet.id, {
        name: '更新后的宠物名称',
        type: 'dog',
        breed: '金毛',
        age: 4,
        weight: 28
      });
      
      // 返回记录页面验证关联数据已更新
      await page.goto('/records');
      const updatedPetName = await page.locator('[data-testid="record-pet-name"]').first().textContent();
      expect(updatedPetName).toBe('更新后的宠物名称');
      
      // 验证分析结果本身没有改变
      const statusAfterUpdate = await page.locator('[data-testid="health-status"]').first().textContent();
      expect(statusAfterUpdate).toContain('健康');
    });

    test('并发修改冲突检测测试', async ({ page, context }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      // 在两个标签页中同时打开编辑页面
      await authPage.login(testUser.email, testUser.password);
      await petsPage.goToPetManagement();
      await petsPage.clickEditPet(testPet.id);
      
      const secondPage = await context.newPage();
      const secondAuth = new AuthPage(secondPage);
      const secondPets = new PetsPage(secondPage);
      
      await secondPage.goto('/');
      await secondAuth.login(testUser.email, testUser.password);
      await secondPets.goToPetManagement();
      await secondPets.clickEditPet(testPet.id);
      
      // 在第一个标签页中修改并保存
      await petsPage.fillPetForm({
        name: '第一次修改',
        type: 'dog',
        breed: '金毛',
        age: 3,
        weight: 26
      });
      await petsPage.submitPetForm();
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // 在第二个标签页中修改并尝试保存
      await secondPets.fillPetForm({
        name: '第二次修改',
        type: 'dog',
        breed: '金毛',
        age: 4,
        weight: 28
      });
      await secondPets.submitPetForm();
      
      // 验证冲突检测
      await expect(secondPage.locator('[data-testid="conflict-error"]')).toBeVisible();
      await expect(secondPage.locator('[data-testid="conflict-error"]')).toContainText('数据已被其他用户修改');
      
      await secondPage.close();
    });
  });
});