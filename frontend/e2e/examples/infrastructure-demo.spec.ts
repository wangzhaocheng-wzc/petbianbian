import { test, expect, TestDataManager, APIMocker, ErrorHandler, BasePage } from '../utils';

test.describe('测试基础架构演示', () => {
  test('基础页面对象使用示例', async ({ page, basePage }) => {
    // 使用基础页面对象
    await basePage.goto('/');
    
    // 等待页面加载
    await basePage.waitForPageLoad();
    
    // 检查页面标题
    const title = await basePage.getPageTitle();
    expect(title).toContain('宠物健康');
    
    // 安全点击操作
    const isLoginVisible = await basePage.isElementVisible('[data-testid="login-button"]');
    if (isLoginVisible) {
      await basePage.safeClick('[data-testid="login-button"]');
    }
  });

  test('测试数据管理器使用示例', async ({ page, testDataManager }) => {
    // 创建测试用户
    const testUser = await testDataManager.createTestUser({
      username: 'demo_user',
      email: 'demo@example.com',
      password: 'DemoPassword123!'
    });
    
    expect(testUser.username).toBe('demo_user');
    expect(testUser.email).toBe('demo@example.com');
    
    // 创建测试宠物
    if (testUser.id) {
      const testPet = await testDataManager.createTestPet(testUser.id, {
        name: 'Demo Pet',
        type: 'dog',
        breed: 'Labrador',
        age: 2,
        weight: 20.0
      });
      
      expect(testPet.name).toBe('Demo Pet');
      expect(testPet.type).toBe('dog');
    }
    
    // 数据会在测试结束后自动清理
  });

  test('API模拟器使用示例', async ({ page, apiMocker }) => {
    // 模拟登录成功响应
    await apiMocker.mockLoginSuccess({
      username: 'demo_user',
      email: 'demo@example.com'
    });
    
    // 导航到登录页面
    await page.goto('/login');
    
    // 填写登录表单
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 验证登录成功（由于使用了模拟响应）
    await expect(page).toHaveURL('/');
  });

  test('错误处理器使用示例', async ({ page, errorHandler }) => {
    // 使用错误处理器的安全执行
    await errorHandler.safeExecute(async () => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="main-content"]', { timeout: 5000 });
    }, 'navigate_to_home');
    
    // 使用重试机制
    const result = await errorHandler.retryOnFailure(async () => {
      const element = page.locator('[data-testid="dynamic-content"]');
      await element.waitFor({ state: 'visible', timeout: 2000 });
      return await element.textContent();
    }, {
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: (error) => error.message.includes('timeout')
    });
    
    // 检查是否有JavaScript错误
    const hasJSErrors = await errorHandler.hasJavaScriptErrors();
    expect(hasJSErrors).toBe(false);
  });

  test('网络条件模拟示例', async ({ page, apiMocker }) => {
    // 模拟慢网络
    await apiMocker.simulateNetworkConditions({
      downloadThroughput: 500 * 1024, // 500KB/s
      uploadThroughput: 250 * 1024,   // 250KB/s
      latency: 400                    // 400ms延迟
    });
    
    await page.goto('/');
    
    // 在慢网络条件下测试页面加载
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible({ timeout: 10000 });
  });

  test('移动端测试示例', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // 检查移动端导航
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenu).toBeVisible();
    
    // 测试触摸交互
    await mobileMenu.tap();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('性能监控示例', async ({ page }) => {
    // 开始性能追踪
    await page.tracing.start({
      screenshots: true,
      snapshots: true
    });
    
    // 导航到页面
    await page.goto('/');
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // 获取性能指标
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    
    // 验证性能指标
    expect(metrics.domContentLoaded).toBeLessThan(3000); // 3秒内DOM加载完成
    expect(metrics.loadComplete).toBeLessThan(5000);     // 5秒内完全加载
    
    // 停止追踪
    await page.tracing.stop({ path: 'test-results/performance-trace.zip' });
  });

  test('视觉回归测试示例', async ({ page }) => {
    await page.goto('/');
    
    // 等待页面稳定
    await page.waitForLoadState('networkidle');
    
    // 全页面截图对比
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // 组件级截图对比
    const header = page.locator('[data-testid="header"]');
    await expect(header).toHaveScreenshot('header-component.png');
  });

  test('可访问性测试示例', async ({ page }) => {
    // 注入axe-core
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.4.3/axe.min.js'
    });
    
    await page.goto('/');
    
    // 运行可访问性检查
    const accessibilityResults = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run();
    });
    
    // 验证没有可访问性违规
    expect(accessibilityResults.violations).toHaveLength(0);
  });
});

test.describe('测试环境配置验证', () => {
  test('验证测试环境配置', async ({ testContext }) => {
    console.log('当前测试环境:', testContext.environment);
    console.log('测试名称:', testContext.testName);
    console.log('测试开始时间:', testContext.startTime);
    
    expect(testContext.environment).toBeDefined();
    expect(testContext.testName).toBeDefined();
    expect(testContext.startTime).toBeInstanceOf(Date);
  });

  test('验证浏览器配置', async ({ browserName }) => {
    console.log('当前浏览器:', browserName);
    
    // 根据浏览器类型进行不同的测试
    if (browserName === 'chromium') {
      // Chrome特定的测试
      console.log('运行Chrome特定测试');
    } else if (browserName === 'firefox') {
      // Firefox特定的测试
      console.log('运行Firefox特定测试');
    } else if (browserName === 'webkit') {
      // Safari特定的测试
      console.log('运行Safari特定测试');
    }
  });
});