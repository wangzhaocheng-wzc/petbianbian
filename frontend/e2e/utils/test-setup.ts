import { Page, BrowserContext, test as base } from '@playwright/test';
import { TestDataManager } from './test-data-manager';
import { APIMocker } from './api-mocker';
import { ErrorHandler } from './error-handler';
import { BasePage } from './base-page';
import { getCurrentEnvironmentConfig, getCurrentTestConfig } from '../config/test-environments';

/**
 * 扩展的测试上下文
 */
export interface TestFixtures {
  testDataManager: TestDataManager;
  apiMocker: APIMocker;
  errorHandler: ErrorHandler;
  basePage: BasePage;
  testContext: TestContext;
}

/**
 * 测试上下文信息
 */
export interface TestContext {
  environment: string;
  testName: string;
  startTime: Date;
  cleanup: (() => Promise<void>)[];
}

/**
 * 扩展Playwright测试，添加自定义fixtures
 */
export const test = base.extend<TestFixtures>({
  // 测试数据管理器fixture
  testDataManager: async ({ request }, use, testInfo) => {
    const dataManager = new TestDataManager(request);
    await dataManager.init();
    
    await use(dataManager);
    
    // 测试结束后清理数据
    const testConfig = getCurrentTestConfig();
    if (testConfig.testDataCleanup) {
      await dataManager.cleanup();
    }
    await dataManager.dispose();
  },

  // API模拟器fixture
  apiMocker: async ({ page }, use) => {
    const mocker = new APIMocker(page);
    await use(mocker);
    
    // 测试结束后清理所有模拟
    await mocker.clearAllMocks();
  },

  // 错误处理器fixture
  errorHandler: async ({ page }, use, testInfo) => {
    const handler = new ErrorHandler(page, testInfo);
    await use(handler);
  },

  // 基础页面对象fixture
  basePage: async ({ page }, use) => {
    const basePage = new BasePage(page);
    await use(basePage);
  },

  // 测试上下文fixture
  testContext: async ({}, use, testInfo) => {
    const context: TestContext = {
      environment: process.env.TEST_ENV || 'development',
      testName: testInfo.title,
      startTime: new Date(),
      cleanup: []
    };

    await use(context);

    // 执行清理函数
    for (const cleanupFn of context.cleanup) {
      try {
        await cleanupFn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }
});

/**
 * 测试环境设置类
 */
export class TestSetup {
  private page: Page;
  private context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  /**
   * 设置测试环境
   */
  async setupTestEnvironment(): Promise<void> {
    const envConfig = getCurrentEnvironmentConfig();
    
    // 设置基础URL
    if (envConfig.baseURL) {
      // 已在playwright.config.ts中配置
    }

    // 设置超时
    this.page.setDefaultTimeout(envConfig.timeout);
    this.page.setDefaultNavigationTimeout(envConfig.timeout);

    // 设置视口
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // 清除存储
    await this.clearBrowserStorage();

    // 设置权限
    await this.setupPermissions();

    // 设置拦截器
    await this.setupInterceptors();
  }

  /**
   * 清除浏览器存储
   */
  async clearBrowserStorage(): Promise<void> {
    await this.context.clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * 设置浏览器权限
   */
  async setupPermissions(): Promise<void> {
    await this.context.grantPermissions([
      'camera',
      'microphone',
      'geolocation',
      'notifications'
    ]);
  }

  /**
   * 设置请求拦截器
   */
  async setupInterceptors(): Promise<void> {
    // 拦截并记录所有网络请求
    await this.page.route('**/*', async (route) => {
      const request = route.request();
      console.log(`${request.method()} ${request.url()}`);
      await route.continue();
    });

    // 拦截外部资源（可选）
    const testConfig = getCurrentTestConfig();
    if (process.env.BLOCK_EXTERNAL_RESOURCES === 'true') {
      await this.page.route('**/*', async (route) => {
        const url = route.request().url();
        const isExternal = !url.includes('localhost') && 
                          !url.includes('127.0.0.1') && 
                          !url.includes(getCurrentEnvironmentConfig().baseURL);
        
        if (isExternal && (url.includes('google') || url.includes('facebook'))) {
          await route.abort();
        } else {
          await route.continue();
        }
      });
    }
  }

  /**
   * 等待应用就绪
   */
  async waitForApplicationReady(): Promise<void> {
    // 等待页面加载
    await this.page.waitForLoadState('networkidle');
    
    // 等待React应用挂载
    await this.page.waitForFunction(() => {
      return window.document.querySelector('#root') !== null;
    });

    // 等待主要组件加载
    await this.page.waitForSelector('[data-testid="app-ready"]', { 
      timeout: 10000 
    }).catch(() => {
      // 如果没有app-ready标识，等待导航组件
      return this.page.waitForSelector('nav', { timeout: 10000 });
    });
  }

  /**
   * 设置测试数据
   */
  async setupTestData(dataManager: TestDataManager): Promise<void> {
    const testConfig = getCurrentTestConfig();
    
    if (testConfig.seedData) {
      // 创建基础测试数据
      await this.createBasicTestData(dataManager);
    }
  }

  /**
   * 创建基础测试数据
   */
  private async createBasicTestData(dataManager: TestDataManager): Promise<void> {
    try {
      // 创建测试用户
      const testUser = await dataManager.createTestUser({
        username: 'e2e_test_user',
        email: 'e2e@test.com',
        password: 'TestPassword123!'
      });

      // 创建测试宠物
      if (testUser.id) {
        await dataManager.createTestPet(testUser.id, {
          name: 'E2E Test Pet',
          type: 'dog',
          breed: 'Golden Retriever',
          age: 3,
          weight: 25.0
        });
      }

      console.log('Basic test data created successfully');
    } catch (error) {
      console.error('Error creating basic test data:', error);
    }
  }

  /**
   * 模拟用户登录
   */
  async loginAsTestUser(
    credentials: { email: string; password: string } = {
      email: 'e2e@test.com',
      password: 'TestPassword123!'
    }
  ): Promise<void> {
    await this.page.goto('/login');
    
    await this.page.fill('[data-testid="email-input"]', credentials.email);
    await this.page.fill('[data-testid="password-input"]', credentials.password);
    await this.page.click('[data-testid="login-button"]');
    
    // 等待登录成功
    await this.page.waitForURL('/', { timeout: 10000 });
    await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 10000 });
  }

  /**
   * 设置移动端测试环境
   */
  async setupMobileEnvironment(): Promise<void> {
    // 设置移动端视口
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // 模拟触摸设备
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: false,
        value: 1,
      });
    });

    // 设置用户代理
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    });
  }

  /**
   * 设置性能监控
   */
  async setupPerformanceMonitoring(): Promise<void> {
    // 开始性能追踪
    await this.page.tracing.start({
      screenshots: true,
      snapshots: true
    });

    // 监听性能指标
    await this.page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: 0,
        domContentLoaded: 0
      };

      window.addEventListener('DOMContentLoaded', () => {
        window.performanceMetrics.domContentLoaded = performance.now();
      });

      window.addEventListener('load', () => {
        window.performanceMetrics.loadEventEnd = performance.now();
      });
    });
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        // @ts-ignore
        customMetrics: window.performanceMetrics || {}
      };
    });
  }

  /**
   * 停止性能追踪
   */
  async stopPerformanceMonitoring(): Promise<Buffer> {
    return await this.page.tracing.stop();
  }

  /**
   * 设置可访问性测试
   */
  async setupAccessibilityTesting(): Promise<void> {
    // 注入axe-core库
    await this.page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.4.3/axe.min.js'
    });

    // 等待axe加载完成
    await this.page.waitForFunction(() => typeof window.axe !== 'undefined');
  }

  /**
   * 运行可访问性检查
   */
  async runAccessibilityCheck(): Promise<any> {
    return await this.page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run();
    });
  }

  /**
   * 清理测试环境
   */
  async cleanup(): Promise<void> {
    // 清除存储
    await this.clearBrowserStorage();
    
    // 清除所有路由拦截
    await this.page.unroute('**/*');
    
    // 停止追踪（如果正在进行）
    try {
      await this.page.tracing.stop();
    } catch {
      // 忽略错误，可能没有开始追踪
    }
  }
}

/**
 * 创建测试设置实例
 */
export function createTestSetup(page: Page, context: BrowserContext): TestSetup {
  return new TestSetup(page, context);
}



export { expect } from '@playwright/test';