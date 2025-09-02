import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { APIMocker } from '../../utils/api-mocker';
import { NetworkErrorUtils } from '../../utils/network-error-utils';

test.describe('网络错误处理测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let testDataManager: TestDataManager;
  let apiMocker: APIMocker;
  let networkErrorUtils: NetworkErrorUtils;

  test.beforeEach(async ({ page, context }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    testDataManager = new TestDataManager(page);
    apiMocker = new APIMocker(page);
    networkErrorUtils = new NetworkErrorUtils(page, context, apiMocker);

    // 清理测试数据
    await testDataManager.cleanup();
    
    // 导航到首页
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await testDataManager.cleanup();
    
    // 清理路由拦截
    await page.unrouteAll();
  });

  test.describe('网络中断处理', () => {
    test('应该正确处理网络完全中断', async ({ page }) => {
      // 先登录用户
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      
      // 验证离线指示器显示
      await networkErrorUtils.verifyOfflineIndicator();
      
      // 验证离线功能可用
      await networkErrorUtils.verifyOfflineFunctionality();
      
      // 尝试访问需要网络的功能
      await page.click('[data-testid="pets-nav"]');
      
      // 验证离线提示
      await expect(page.locator('[data-testid="offline-notice"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-notice"]')).toContainText('当前处于离线状态');
    });

    test('应该正确处理网络恢复', async ({ page }) => {
      // 先模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      await networkErrorUtils.verifyOfflineIndicator();
      
      // 模拟网络恢复
      await networkErrorUtils.simulateNetworkReconnection();
      
      // 验证在线指示器显示
      await networkErrorUtils.verifyOnlineIndicator();
      
      // 验证网络恢复通知
      await expect(page.locator('[data-testid="network-recovered"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-recovered"]')).toContainText('网络已恢复');
    });

    test('应该支持离线数据缓存', async ({ page }) => {
      // 先在线状态下加载数据
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      await authPage.login(testUser.email, testUser.password);
      await page.click('[data-testid="pets-nav"]');
      
      // 等待数据加载
      await expect(page.locator(`[data-testid="pet-${testPet.id}"]`)).toBeVisible();
      
      // 模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      
      // 刷新页面，验证缓存数据仍然可用
      await page.reload();
      await networkErrorUtils.verifyOfflineDataCache();
      
      // 验证缓存的宠物数据仍然显示
      await expect(page.locator(`[data-testid="pet-${testPet.id}"]`)).toBeVisible();
      await expect(page.locator('[data-testid="cached-data-notice"]')).toBeVisible();
    });
  });

  test.describe('连接超时处理', () => {
    test('应该正确处理API请求超时', async ({ page }) => {
      // 模拟API超时
      await networkErrorUtils.simulateConnectionTimeout('/api/pets', 5000);
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 尝试访问宠物页面
      await page.click('[data-testid="pets-nav"]');
      
      // 验证超时处理
      await networkErrorUtils.verifyConnectionTimeoutHandling();
      
      // 验证重试机制
      const retryButton = page.locator('[data-testid="retry-button"]');
      await retryButton.click();
      
      // 验证重试指示器
      await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible();
    });

    test('应该正确处理图片上传超时', async ({ page }) => {
      // 模拟上传超时
      await networkErrorUtils.simulateConnectionTimeout('/api/analysis/upload', 3000);
      
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      await authPage.login(testUser.email, testUser.password);
      await page.click('[data-testid="analysis-nav"]');
      
      // 选择宠物
      await analysisPage.selectPet(testPet.id);
      
      // 尝试上传图片
      await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
      
      // 验证上传超时处理
      await expect(page.locator('[data-testid="upload-timeout"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-timeout"]')).toContainText('上传超时');
      
      // 验证重试选项
      await expect(page.locator('[data-testid="retry-upload"]')).toBeVisible();
    });
  });

  test.describe('DNS解析失败处理', () => {
    test('应该正确处理DNS解析失败', async ({ page }) => {
      // 模拟DNS解析失败
      await networkErrorUtils.simulateDNSFailure('/api/**');
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 尝试访问API
      await page.click('[data-testid="pets-nav"]');
      
      // 验证DNS错误处理
      await expect(page.locator('[data-testid="dns-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="dns-error"]')).toContainText('网络连接失败');
      
      // 验证错误恢复选项
      await expect(page.locator('[data-testid="check-connection"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-connection"]')).toBeVisible();
    });
  });

  test.describe('网络不稳定处理', () => {
    test('应该正确处理网络连接不稳定', async ({ page }) => {
      // 模拟不稳定网络（70%失败率）
      await networkErrorUtils.simulateUnstableNetwork('/api/**', 0.7);
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 尝试多次访问API
      await page.click('[data-testid="pets-nav"]');
      
      // 验证重连机制
      await networkErrorUtils.verifyReconnectionMechanism();
      
      // 验证重连尝试次数
      const reconnectCount = page.locator('[data-testid="reconnect-count"]');
      await expect(reconnectCount).toBeVisible();
      
      // 验证指数退避策略
      const reconnectInterval = page.locator('[data-testid="reconnect-interval"]');
      await expect(reconnectInterval).toBeVisible();
    });

    test('应该限制最大重连次数', async ({ page }) => {
      // 模拟持续网络失败
      await networkErrorUtils.simulateUnstableNetwork('/api/**', 1.0);
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await page.click('[data-testid="pets-nav"]');
      
      // 等待达到最大重试次数
      await expect(page.locator('[data-testid="max-retries-reached"]')).toBeVisible({ timeout: 30000 });
      
      // 验证停止重试
      await expect(page.locator('[data-testid="retry-stopped"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-retry-only"]')).toBeVisible();
    });
  });

  test.describe('慢网络处理', () => {
    test('应该正确处理慢网络连接', async ({ page }) => {
      // 模拟慢网络（3秒延迟）
      await networkErrorUtils.simulateSlowNetwork('/api/**', 3000);
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 访问需要API的页面
      await page.click('[data-testid="pets-nav"]');
      
      // 验证加载指示器
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // 验证网络质量指示器
      await networkErrorUtils.verifyNetworkQualityIndicator();
      
      // 验证慢网络提示
      await expect(page.locator('[data-testid="slow-network-notice"]')).toBeVisible();
    });

    test('应该提供网络优化建议', async ({ page }) => {
      // 模拟非常慢的网络
      await networkErrorUtils.simulateSlowNetwork('/api/**', 8000);
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await page.click('[data-testid="analysis-nav"]');
      
      // 验证网络优化建议
      await expect(page.locator('[data-testid="network-optimization-tips"]')).toBeVisible();
      await expect(page.locator('[data-testid="reduce-image-quality"]')).toBeVisible();
      await expect(page.locator('[data-testid="enable-data-saver"]')).toBeVisible();
    });
  });

  test.describe('离线模式和数据同步', () => {
    test('应该支持离线表单数据保存', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 进入宠物添加页面
      await page.click('[data-testid="pets-nav"]');
      await page.click('[data-testid="add-pet-button"]');
      
      // 模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      
      // 填写并提交表单
      const formData = {
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: '2',
        weight: '25'
      };
      
      await networkErrorUtils.verifyOfflineFormSave(formData);
    });

    test('应该在网络恢复后自动同步数据', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 进入宠物添加页面
      await page.click('[data-testid="pets-nav"]');
      await page.click('[data-testid="add-pet-button"]');
      
      // 模拟网络中断并保存离线数据
      await networkErrorUtils.simulateNetworkDisconnection();
      
      const formData = {
        name: '离线宠物',
        type: 'cat',
        breed: '英短',
        age: '1',
        weight: '4'
      };
      
      await networkErrorUtils.verifyOfflineFormSave(formData);
      
      // 验证网络恢复后的自动同步
      await networkErrorUtils.verifyReconnectionSync();
      
      // 验证数据已同步到服务器
      await page.reload();
      await expect(page.locator('[data-testid="pet-离线宠物"]')).toBeVisible();
    });

    test('应该处理同步冲突', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      await authPage.login(testUser.email, testUser.password);
      await page.click('[data-testid="pets-nav"]');
      
      // 编辑宠物信息
      await page.click(`[data-testid="edit-pet-${testPet.id}"]`);
      
      // 模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      
      // 修改宠物信息
      await page.fill('[data-testid="pet-name-input"]', '离线修改的名字');
      await page.click('[data-testid="save-pet-button"]');
      
      // 验证离线保存
      await expect(page.locator('[data-testid="offline-save-notice"]')).toBeVisible();
      
      // 模拟服务器端数据也被修改（通过API模拟）
      await apiMocker.mockPetUpdate(testPet.id, { name: '服务器修改的名字' });
      
      // 恢复网络
      await networkErrorUtils.simulateNetworkReconnection();
      
      // 验证冲突检测和解决
      await expect(page.locator('[data-testid="sync-conflict"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
      
      // 选择解决方案
      await page.click('[data-testid="use-local-version"]');
      
      // 验证冲突解决
      await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible();
    });
  });

  test.describe('Service Worker和缓存策略', () => {
    test('应该正确注册和使用Service Worker', async ({ page }) => {
      // 验证Service Worker注册
      await networkErrorUtils.verifyServiceWorkerCache();
      
      // 验证缓存策略生效
      await page.goto('/pets');
      
      // 模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      
      // 刷新页面，验证缓存内容可用
      await page.reload();
      await expect(page.locator('[data-testid="cached-page"]')).toBeVisible();
    });

    test('应该显示离线页面', async ({ page }) => {
      // 验证离线页面功能
      await networkErrorUtils.verifyOfflinePage();
      
      // 验证离线页面内容
      await expect(page.locator('[data-testid="offline-features-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="cached-data-access"]')).toBeVisible();
    });
  });

  test.describe('网络状态监听和队列管理', () => {
    test('应该正确监听网络状态变化', async ({ page }) => {
      // 验证网络状态监听器
      await networkErrorUtils.verifyNetworkStatusListener();
      
      // 测试状态变化响应
      await networkErrorUtils.simulateNetworkDisconnection();
      await expect(page.locator('[data-testid="status-changed-to-offline"]')).toBeVisible();
      
      await networkErrorUtils.simulateNetworkReconnection();
      await expect(page.locator('[data-testid="status-changed-to-online"]')).toBeVisible();
    });

    test('应该正确管理请求队列', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 验证请求队列管理
      await networkErrorUtils.verifyRequestQueueManagement();
    });
  });

  test.describe('综合网络错误恢复测试', () => {
    test('应该完整处理网络中断到恢复的流程', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 执行完整的网络中断恢复测试
      await networkErrorUtils.testNetworkInterruptionRecovery();
    });

    test('应该在多种网络错误场景下保持稳定', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      const scenarios = networkErrorUtils.createNetworkErrorScenarios();
      
      for (const scenario of scenarios) {
        console.log(`测试场景: ${scenario.name}`);
        
        // 设置场景
        await scenario.setup();
        
        // 验证场景
        await scenario.verify();
        
        // 清理场景
        await scenario.cleanup();
        
        // 等待状态重置
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('移动端网络错误处理', () => {
    test('应该在移动设备上正确处理网络错误', async ({ page }) => {
      // 设置移动视口
      await page.setViewportSize({ width: 375, height: 667 });
      
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 模拟网络中断
      await networkErrorUtils.simulateNetworkDisconnection();
      
      // 验证移动端离线指示器
      await expect(page.locator('[data-testid="mobile-offline-indicator"]')).toBeVisible();
      
      // 验证移动端离线功能
      await expect(page.locator('[data-testid="mobile-offline-menu"]')).toBeVisible();
      
      // 验证触摸友好的重试按钮
      const retryButton = page.locator('[data-testid="mobile-retry-button"]');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toHaveCSS('min-height', '44px'); // 符合触摸目标大小
    });
  });
});