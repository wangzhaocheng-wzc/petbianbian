import { test, expect, Page } from '@playwright/test';
import { ErrorHandler } from '../../utils/error-handler';
import { TestDataManager } from '../../utils/test-data-manager';
import { APIMocker } from '../../utils/api-mocker';
import { ServerErrorUtils } from '../../utils/server-error-utils';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';

/**
 * 服务器错误处理测试套件
 * 测试4xx和5xx HTTP错误响应的处理
 */
test.describe('服务器错误处理测试', () => {
  let errorHandler: ErrorHandler;
  let testDataManager: TestDataManager;
  let apiMocker: APIMocker;
  let serverErrorUtils: ServerErrorUtils;
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    errorHandler = new ErrorHandler(page);
    testDataManager = new TestDataManager();
    apiMocker = new APIMocker(page);
    serverErrorUtils = new ServerErrorUtils(page, apiMocker);
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);

    // 导航到首页
    await page.goto('/');
  });

  test.afterEach(async () => {
    // 清理测试数据
    await testDataManager.cleanup();
    await apiMocker.reset();
    errorHandler.cleanup();
  });

  test.describe('4xx客户端错误处理', () => {
    test('400 Bad Request - 显示友好错误消息', async ({ page }) => {
      // 模拟400错误响应
      await apiMocker.mockAPIResponse('/api/auth/login', {
        status: 400,
        body: { 
          error: 'Invalid request format',
          message: '请求格式不正确，请检查输入数据'
        }
      });

      await authPage.goToLogin();
      
      // 尝试登录触发400错误
      await authPage.fillLoginForm('invalid-email', 'password');
      await authPage.clickLoginButton();

      // 验证错误消息显示
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('请求格式不正确');
      
      // 验证用户可以重试
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeEnabled();
    });

    test('401 Unauthorized - 重定向到登录页面', async ({ page }) => {
      // 模拟401错误响应
      await apiMocker.mockAPIResponse('/api/pets', {
        status: 401,
        body: { 
          error: 'Unauthorized',
          message: '请先登录后再访问此页面'
        }
      });

      // 直接访问需要认证的页面
      await page.goto('/pets');

      // 验证重定向到登录页面
      await expect(page).toHaveURL(/.*\/login/);
      
      // 验证显示认证错误消息
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error"]')).toContainText('请先登录');
    });

    test('403 Forbidden - 显示权限不足提示', async ({ page }) => {
      // 创建测试用户并登录
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      // 模拟403错误响应
      await apiMocker.mockAPIResponse('/api/admin/**', {
        status: 403,
        body: { 
          error: 'Forbidden',
          message: '您没有权限访问此资源'
        }
      });

      // 尝试访问管理员页面
      await page.goto('/admin');

      // 验证权限错误页面
      await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-error"]')).toContainText('没有权限');
      
      // 验证返回首页按钮
      await expect(page.locator('[data-testid="back-home-button"]')).toBeVisible();
      
      // 点击返回首页
      await page.click('[data-testid="back-home-button"]');
      await expect(page).toHaveURL('/');
    });

    test('404 Not Found - 显示页面未找到', async ({ page }) => {
      // 模拟404错误响应
      await apiMocker.mockAPIResponse('/api/pets/nonexistent-id', {
        status: 404,
        body: { 
          error: 'Not Found',
          message: '请求的资源不存在'
        }
      });

      // 访问不存在的宠物页面
      await page.goto('/pets/nonexistent-id');

      // 验证404错误页面
      await expect(page.locator('[data-testid="not-found-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="not-found-error"]')).toContainText('资源不存在');
      
      // 验证导航选项
      await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="home-button"]')).toBeVisible();
    });

    test('409 Conflict - 处理数据冲突', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      // 模拟409冲突错误
      await apiMocker.mockAPIResponse('/api/pets', {
        status: 409,
        body: { 
          error: 'Conflict',
          message: '宠物名称已存在，请选择其他名称'
        }
      });

      await petsPage.goToPetsPage();
      await petsPage.clickAddPetButton();
      
      // 填写宠物信息
      await petsPage.fillPetForm({
        name: '重复名称',
        type: 'dog',
        breed: '金毛',
        age: 2
      });
      
      await petsPage.submitPetForm();

      // 验证冲突错误处理
      await expect(page.locator('[data-testid="conflict-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-error"]')).toContainText('名称已存在');
      
      // 验证表单仍然可编辑
      await expect(page.locator('[data-testid="pet-name-input"]')).toBeEnabled();
      await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled();
    });

    test('422 Unprocessable Entity - 验证错误处理', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      // 模拟422验证错误
      await apiMocker.mockAPIResponse('/api/pets', {
        status: 422,
        body: { 
          error: 'Validation Error',
          message: '数据验证失败',
          details: {
            name: '宠物名称不能为空',
            age: '年龄必须是正整数'
          }
        }
      });

      await petsPage.goToPetsPage();
      await petsPage.clickAddPetButton();
      
      // 提交空表单
      await petsPage.submitPetForm();

      // 验证字段级错误消息
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="name-error"]')).toContainText('不能为空');
      
      await expect(page.locator('[data-testid="age-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="age-error"]')).toContainText('正整数');
    });

    test('429 Too Many Requests - 限流处理', async ({ page }) => {
      // 模拟429限流错误
      await apiMocker.mockAPIResponse('/api/analysis/upload', {
        status: 429,
        body: { 
          error: 'Too Many Requests',
          message: '请求过于频繁，请稍后再试',
          retryAfter: 60
        }
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await analysisPage.goToAnalysisPage();
      
      // 尝试上传图片
      await analysisPage.uploadTestImage();

      // 验证限流错误处理
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText('请求过于频繁');
      
      // 验证重试倒计时
      await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-countdown"]')).toContainText('60');
      
      // 验证上传按钮被禁用
      await expect(page.locator('[data-testid="upload-button"]')).toBeDisabled();
    });
  });

  test.describe('5xx服务器错误处理', () => {
    test('500 Internal Server Error - 显示服务器错误页面', async ({ page }) => {
      // 模拟500服务器错误
      await apiMocker.mockAPIResponse('/api/auth/login', {
        status: 500,
        body: { 
          error: 'Internal Server Error',
          message: '服务器内部错误，请稍后重试'
        }
      });

      await authPage.goToLogin();
      await authPage.fillLoginForm('test@example.com', 'password123');
      await authPage.clickLoginButton();

      // 验证服务器错误页面
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="server-error"]')).toContainText('服务器内部错误');
      
      // 验证重试按钮
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // 验证联系支持按钮
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
    });

    test('502 Bad Gateway - 网关错误处理', async ({ page }) => {
      // 模拟502网关错误
      await apiMocker.mockAPIResponse('/api/**', {
        status: 502,
        body: { 
          error: 'Bad Gateway',
          message: '网关错误，服务暂时不可用'
        }
      });

      await page.goto('/pets');

      // 验证网关错误页面
      await expect(page.locator('[data-testid="gateway-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="gateway-error"]')).toContainText('服务暂时不可用');
      
      // 验证自动重试机制
      await expect(page.locator('[data-testid="auto-retry-indicator"]')).toBeVisible();
    });

    test('503 Service Unavailable - 服务不可用处理', async ({ page }) => {
      // 模拟503服务不可用
      await apiMocker.mockAPIResponse('/api/analysis/**', {
        status: 503,
        body: { 
          error: 'Service Unavailable',
          message: '分析服务暂时不可用，请稍后重试',
          retryAfter: 300
        }
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await analysisPage.goToAnalysisPage();
      await analysisPage.uploadTestImage();

      // 验证服务不可用错误
      await expect(page.locator('[data-testid="service-unavailable"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-unavailable"]')).toContainText('分析服务暂时不可用');
      
      // 验证预计恢复时间
      await expect(page.locator('[data-testid="estimated-recovery"]')).toBeVisible();
      await expect(page.locator('[data-testid="estimated-recovery"]')).toContainText('5分钟');
    });

    test('504 Gateway Timeout - 网关超时处理', async ({ page }) => {
      // 模拟504网关超时
      await apiMocker.mockAPIResponse('/api/analysis/process', {
        status: 504,
        body: { 
          error: 'Gateway Timeout',
          message: '请求处理超时，请重试'
        }
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await analysisPage.goToAnalysisPage();
      await analysisPage.uploadTestImage();
      await analysisPage.startAnalysis();

      // 验证超时错误处理
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeout-error"]')).toContainText('请求处理超时');
      
      // 验证重新分析按钮
      await expect(page.locator('[data-testid="retry-analysis"]')).toBeVisible();
    });
  });

  test.describe('错误页面显示和用户引导', () => {
    test('通用错误页面组件测试', async ({ page }) => {
      // 模拟500错误触发通用错误页面
      await apiMocker.mockAPIResponse('/api/**', {
        status: 500,
        body: { error: 'Server Error' }
      });

      await page.goto('/pets');

      // 验证错误页面基本元素
      await expect(page.locator('[data-testid="error-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-actions"]')).toBeVisible();
      
      // 验证错误图标
      await expect(page.locator('[data-testid="error-icon"]')).toBeVisible();
      
      // 验证面包屑导航
      await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
    });

    test('错误页面用户引导功能', async ({ page }) => {
      await apiMocker.mockAPIResponse('/api/pets/123', {
        status: 404,
        body: { error: 'Not Found' }
      });

      await page.goto('/pets/123');

      // 验证用户引导选项
      const actions = page.locator('[data-testid="error-actions"]');
      
      // 返回上一页
      await expect(actions.locator('[data-testid="back-button"]')).toBeVisible();
      
      // 返回首页
      await expect(actions.locator('[data-testid="home-button"]')).toBeVisible();
      
      // 重新加载
      await expect(actions.locator('[data-testid="reload-button"]')).toBeVisible();
      
      // 联系支持
      await expect(actions.locator('[data-testid="contact-support"]')).toBeVisible();

      // 测试返回首页功能
      await actions.locator('[data-testid="home-button"]').click();
      await expect(page).toHaveURL('/');
    });

    test('错误页面响应式设计', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });

      await apiMocker.mockAPIResponse('/api/**', {
        status: 500,
        body: { error: 'Server Error' }
      });

      await page.goto('/pets');

      // 验证移动端错误页面布局
      await expect(page.locator('[data-testid="error-page"]')).toBeVisible();
      
      // 验证按钮堆叠布局
      const actions = page.locator('[data-testid="error-actions"]');
      await expect(actions).toHaveCSS('flex-direction', 'column');
      
      // 验证文字大小适配
      const title = page.locator('[data-testid="error-title"]');
      const titleFontSize = await title.evaluate(el => getComputedStyle(el).fontSize);
      expect(parseInt(titleFontSize)).toBeLessThan(32); // 移动端字体应该较小
    });

    test('错误页面多语言支持', async ({ page }) => {
      // 设置中文语言环境
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'language', {
          get: () => 'zh-CN'
        });
      });

      await apiMocker.mockAPIResponse('/api/**', {
        status: 500,
        body: { error: 'Server Error' }
      });

      await page.goto('/pets');

      // 验证中文错误消息
      await expect(page.locator('[data-testid="error-title"]')).toContainText('服务器错误');
      await expect(page.locator('[data-testid="back-button"]')).toContainText('返回');
      await expect(page.locator('[data-testid="home-button"]')).toContainText('首页');
    });
  });

  test.describe('错误恢复和重试机制', () => {
    test('自动重试机制测试', async ({ page }) => {
      let requestCount = 0;
      
      // 模拟前两次请求失败，第三次成功
      await page.route('/api/pets', async (route) => {
        requestCount++;
        if (requestCount <= 2) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server Error' })
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ pets: [] })
          });
        }
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await petsPage.goToPetsPage();

      // 验证自动重试成功
      await expect(page.locator('[data-testid="pets-list"]')).toBeVisible();
      expect(requestCount).toBe(3); // 确认进行了3次请求
    });

    test('手动重试功能测试', async ({ page }) => {
      let retryCount = 0;
      
      await page.route('/api/pets', async (route) => {
        retryCount++;
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ 
            error: 'Server Error',
            message: '服务器暂时不可用'
          })
        });
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await page.goto('/pets');

      // 验证错误页面显示
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
      
      // 点击重试按钮
      await page.click('[data-testid="retry-button"]');
      
      // 验证重试指示器
      await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible();
      
      // 验证重试计数
      expect(retryCount).toBeGreaterThan(1);
    });

    test('指数退避重试策略', async ({ page }) => {
      const retryTimes: number[] = [];
      let requestCount = 0;

      await page.route('/api/analysis/upload', async (route) => {
        requestCount++;
        retryTimes.push(Date.now());
        
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ 
            error: 'Service Unavailable',
            retryAfter: 1
          })
        });
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await analysisPage.goToAnalysisPage();
      
      // 启用自动重试
      await page.evaluate(() => {
        (window as any).enableAutoRetry = true;
      });
      
      await analysisPage.uploadTestImage();

      // 等待多次重试
      await page.waitForTimeout(10000);

      // 验证指数退避：每次重试间隔应该递增
      if (retryTimes.length >= 3) {
        const interval1 = retryTimes[1] - retryTimes[0];
        const interval2 = retryTimes[2] - retryTimes[1];
        expect(interval2).toBeGreaterThan(interval1);
      }
    });

    test('重试限制和熔断机制', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('/api/**', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' })
        });
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await page.goto('/pets');

      // 等待重试完成
      await page.waitForTimeout(15000);

      // 验证重试次数限制（假设最大重试3次）
      expect(requestCount).toBeLessThanOrEqual(4); // 初始请求 + 3次重试
      
      // 验证熔断状态显示
      await expect(page.locator('[data-testid="circuit-breaker-open"]')).toBeVisible();
      await expect(page.locator('[data-testid="circuit-breaker-open"]')).toContainText('服务暂时不可用');
    });

    test('网络恢复后自动重连', async ({ page }) => {
      let networkAvailable = false;
      
      await page.route('/api/**', async (route) => {
        if (!networkAvailable) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true })
          });
        }
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await page.goto('/pets');

      // 验证网络错误状态
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

      // 模拟网络恢复
      networkAvailable = true;
      
      // 触发网络状态检查
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      // 验证自动重连成功
      await expect(page.locator('[data-testid="pets-list"]')).toBeVisible({ timeout: 10000 });
    });

    test('用户操作恢复测试', async ({ page }) => {
      // 模拟表单提交失败
      await apiMocker.mockAPIResponse('/api/pets', {
        status: 500,
        body: { error: 'Server Error' }
      });

      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await petsPage.goToPetsPage();
      await petsPage.clickAddPetButton();
      
      // 填写表单
      const petData = {
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2
      };
      
      await petsPage.fillPetForm(petData);
      await petsPage.submitPetForm();

      // 验证错误处理
      await expect(page.locator('[data-testid="submit-error"]')).toBeVisible();
      
      // 验证表单数据保持
      await expect(page.locator('[data-testid="pet-name-input"]')).toHaveValue(petData.name);
      await expect(page.locator('[data-testid="pet-breed-input"]')).toHaveValue(petData.breed);
      
      // 修复API响应
      await apiMocker.mockAPIResponse('/api/pets', {
        status: 201,
        body: { id: '123', ...petData }
      });
      
      // 重新提交
      await petsPage.submitPetForm();
      
      // 验证成功
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('页面状态恢复测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await petsPage.goToPetsPage();
      
      // 设置页面状态（搜索、筛选等）
      await petsPage.searchPets('金毛');
      await petsPage.selectPetType('dog');
      
      // 模拟服务器错误
      await apiMocker.mockAPIResponse('/api/pets/search', {
        status: 500,
        body: { error: 'Server Error' }
      });
      
      // 触发搜索
      await petsPage.clickSearchButton();
      
      // 验证错误处理
      await expect(page.locator('[data-testid="search-error"]')).toBeVisible();
      
      // 验证搜索状态保持
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('金毛');
      await expect(page.locator('[data-testid="pet-type-select"]')).toHaveValue('dog');
      
      // 修复API
      await apiMocker.mockAPIResponse('/api/pets/search', {
        status: 200,
        body: { pets: [{ id: '1', name: '金毛犬', type: 'dog' }] }
      });
      
      // 重试搜索
      await petsPage.clickSearchButton();
      
      // 验证搜索结果
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  test.describe('错误监控和分析', () => {
    test('错误日志收集测试', async ({ page }) => {
      await apiMocker.mockAPIResponse('/api/**', {
        status: 500,
        body: { error: 'Server Error' }
      });

      await page.goto('/pets');

      // 获取错误处理器的日志
      const logs = errorHandler.getCollectedLogs();
      
      // 验证网络错误日志
      const networkErrors = logs.network.filter(log => 
        log.type === 'response' && log.status >= 400
      );
      expect(networkErrors.length).toBeGreaterThan(0);
      
      // 验证错误分析
      const errorAnalysis = await errorHandler.analyzeErrors();
      expect(errorAnalysis.severity).toBe('high');
      expect(errorAnalysis.errorPatterns.length).toBeGreaterThan(0);
    });

    test('错误报告生成测试', async ({ page }) => {
      // 触发多种错误
      await apiMocker.mockAPIResponse('/api/pets', { status: 500 });
      await apiMocker.mockAPIResponse('/api/analysis', { status: 404 });
      
      await page.goto('/pets');
      await page.goto('/analysis');

      // 生成错误报告
      const report = await errorHandler.generateDetailedErrorReport();
      const reportData = JSON.parse(report);
      
      // 验证报告内容
      expect(reportData.errorSummary.totalErrors).toBeGreaterThan(0);
      expect(reportData.errorAnalysis.errorPatterns.length).toBeGreaterThan(0);
      expect(reportData.logs.network.length).toBeGreaterThan(0);
    });

    test('页面健康监控测试', async ({ page }) => {
      // 正常页面健康检查
      await page.goto('/');
      
      let healthStatus = await errorHandler.monitorPageHealth();
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.issues.length).toBe(0);
      
      // 有错误的页面健康检查
      await apiMocker.mockAPIResponse('/api/**', { status: 500 });
      await page.goto('/pets');
      
      healthStatus = await errorHandler.monitorPageHealth();
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.issues.length).toBeGreaterThan(0);
    });
  });

  test.describe('综合错误场景测试', () => {
    test('所有HTTP错误状态码测试', async ({ page }) => {
      const errorScenarios = serverErrorUtils.createErrorScenarios();
      
      for (const scenario of errorScenarios) {
        console.log(`Testing ${scenario.name}...`);
        
        // 模拟错误响应
        await apiMocker.mockHTTPError(
          scenario.urlPattern,
          scenario.statusCode,
          scenario.expectedMessage
        );
        
        // 根据场景触发相应的操作
        if (scenario.urlPattern.toString().includes('auth/login')) {
          await authPage.goToLogin();
          await authPage.fillLoginForm('test@example.com', 'password');
          await authPage.clickLoginButton();
        } else if (scenario.urlPattern.toString().includes('pets')) {
          const testUser = await testDataManager.createTestUser();
          await authPage.login(testUser.email, testUser.password);
          await page.goto('/pets');
        } else if (scenario.urlPattern.toString().includes('analysis')) {
          const testUser = await testDataManager.createTestUser();
          await authPage.login(testUser.email, testUser.password);
          await page.goto('/analysis');
        }
        
        // 验证错误处理
        await serverErrorUtils.verifyUserFriendlyErrorMessage(scenario.statusCode);
        
        if (scenario.hasRetry) {
          await serverErrorUtils.verifyRetryButton();
        }
        
        if (scenario.hasCountdown) {
          await serverErrorUtils.verifyCountdown(60);
        }
        
        // 清理模拟
        await apiMocker.reset();
      }
    });

    test('错误恢复完整流程测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      await serverErrorUtils.testErrorRecoveryFlow(
        // 触发错误
        async () => {
          await apiMocker.mockProgressiveRecovery('/api/pets', 2, 500);
          await page.goto('/pets');
        },
        // 验证错误
        async () => {
          await serverErrorUtils.verifyErrorPageElements('server-error');
          await serverErrorUtils.verifyRetryButton();
        },
        // 触发恢复（自动重试）
        async () => {
          await page.waitForTimeout(3000); // 等待自动重试
        },
        // 验证恢复
        async () => {
          await expect(page.locator('[data-testid="pets-list"]')).toBeVisible();
        }
      );
    });

    test('熔断器模式测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      // 启用熔断器模式
      await apiMocker.mockCircuitBreaker('/api/pets', 3, 10000);

      // 多次访问触发熔断器
      for (let i = 0; i < 5; i++) {
        await page.goto('/pets');
        await page.waitForTimeout(1000);
      }

      // 验证熔断器开启状态
      await serverErrorUtils.verifyCircuitBreakerState();
    });

    test('级联故障测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);

      // 模拟级联故障
      await apiMocker.mockCascadingFailure([
        { pattern: '/api/auth/**' },
        { pattern: '/api/pets', dependsOn: ['/api/auth/**'], failureDelay: 1000 },
        { pattern: '/api/analysis/**', dependsOn: ['/api/pets'], failureDelay: 2000 }
      ]);

      // 触发级联故障
      await page.goto('/analysis');

      // 验证级联故障处理
      await serverErrorUtils.verifyErrorPageElements('server-error');
      await serverErrorUtils.verifyErrorMessage('依赖服务不可用');
    });
  });

  test.describe('可访问性和用户体验', () => {
    test('错误页面可访问性测试', async ({ page }) => {
      await apiMocker.mockHTTPError('/api/**', 500);
      await page.goto('/pets');

      await serverErrorUtils.verifyErrorPageAccessibility();
    });

    test('多语言错误消息测试', async ({ page }) => {
      // 测试中文
      await serverErrorUtils.verifyMultiLanguageErrorMessages('zh-CN');
      await apiMocker.mockHTTPError('/api/**', 500);
      await page.goto('/pets');
      await serverErrorUtils.verifyErrorMessage('服务器错误');

      // 重置并测试英文
      await apiMocker.reset();
      await serverErrorUtils.verifyMultiLanguageErrorMessages('en-US');
      await apiMocker.mockHTTPError('/api/**', 500);
      await page.goto('/pets');
      // 注意：这里假设应用支持英文，实际需要根据应用实现调整
    });

    test('响应式错误页面测试', async ({ page }) => {
      // 测试桌面端
      await page.setViewportSize({ width: 1920, height: 1080 });
      await apiMocker.mockHTTPError('/api/**', 500);
      await page.goto('/pets');
      await serverErrorUtils.verifyResponsiveErrorPage();

      // 测试移动端
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await serverErrorUtils.verifyResponsiveErrorPage();
    });

    test('错误边界组件测试', async ({ page }) => {
      // 触发JavaScript错误
      await page.evaluate(() => {
        throw new Error('Test JavaScript Error');
      });

      await serverErrorUtils.verifyErrorBoundary();
    });
  });
});