import { test, expect, Page } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';
import { TestDataManager } from '../../utils/test-data-manager';

/**
 * 交互性能测试套件
 * 测试用户交互响应时间、复杂操作性能基准和性能回归检测
 */

interface InteractionMetrics {
  responseTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
}

interface PerformanceBenchmark {
  operation: string;
  expectedTime: number;
  actualTime: number;
  passed: boolean;
  details?: any;
}

// 性能基准阈值
const PERFORMANCE_THRESHOLDS = {
  clickResponse: 500, // 点击响应时间 (ms)
  formSubmission: 2000, // 表单提交时间 (ms)
  imageUpload: 5000, // 图片上传时间 (ms)
  pageNavigation: 1000, // 页面导航时间 (ms)
  searchResponse: 800, // 搜索响应时间 (ms)
  dataLoad: 1500, // 数据加载时间 (ms)
  complexOperation: 3000, // 复杂操作时间 (ms)
};
clas
s InteractionPerformanceMonitor {
  private page: Page;
  private metrics: InteractionMetrics[] = [];
  private benchmarks: PerformanceBenchmark[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 测量交互响应时间
   */
  async measureInteractionTime(
    action: () => Promise<void>,
    expectedSelector?: string
  ): Promise<number> {
    const startTime = Date.now();
    
    await action();
    
    if (expectedSelector) {
      await this.page.waitForSelector(expectedSelector, { timeout: 10000 });
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return responseTime;
  }

  /**
   * 测量复杂操作性能
   */
  async measureComplexOperation(
    operationName: string,
    operation: () => Promise<void>,
    threshold: number
  ): Promise<PerformanceBenchmark> {
    const startTime = Date.now();
    
    // 记录内存使用情况
    const initialMemory = await this.getMemoryUsage();
    
    try {
      await operation();
      
      const endTime = Date.now();
      const actualTime = endTime - startTime;
      const finalMemory = await this.getMemoryUsage();
      
      const benchmark: PerformanceBenchmark = {
        operation: operationName,
        expectedTime: threshold,
        actualTime,
        passed: actualTime <= threshold,
        details: {
          memoryDelta: finalMemory - initialMemory,
          timestamp: new Date().toISOString()
        }
      };
      
      this.benchmarks.push(benchmark);
      return benchmark;
      
    } catch (error) {
      const endTime = Date.now();
      const actualTime = endTime - startTime;
      
      const benchmark: PerformanceBenchmark = {
        operation: operationName,
        expectedTime: threshold,
        actualTime,
        passed: false,
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
      
      this.benchmarks.push(benchmark);
      throw error;
    }
  }

  /**
   * 获取内存使用情况
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const metrics = await this.page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      return metrics;
    } catch {
      return 0;
    }
  }

  /**
   * 监控网络请求性能
   */
  async monitorNetworkRequests(): Promise<void> {
    const requests: any[] = [];
    
    this.page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
    
    this.page.on('response', (response) => {
      const request = requests.find(req => req.url === response.url());
      if (request) {
        request.responseTime = Date.now() - request.timestamp;
        request.status = response.status();
      }
    });
  }

  /**
   * 生成性能报告
   */
  generateReport(): any {
    const passedBenchmarks = this.benchmarks.filter(b => b.passed);
    const failedBenchmarks = this.benchmarks.filter(b => !b.passed);
    
    return {
      summary: {
        total: this.benchmarks.length,
        passed: passedBenchmarks.length,
        failed: failedBenchmarks.length,
        successRate: (passedBenchmarks.length / this.benchmarks.length) * 100
      },
      benchmarks: this.benchmarks,
      failedOperations: failedBenchmarks.map(b => ({
        operation: b.operation,
        expectedTime: b.expectedTime,
        actualTime: b.actualTime,
        overrun: b.actualTime - b.expectedTime
      }))
    };
  }
}

test.describe('交互性能测试套件', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let communityPage: CommunityPage;
  let testDataManager: TestDataManager;
  let performanceMonitor: InteractionPerformanceMonitor;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    communityPage = new CommunityPage(page);
    testDataManager = new TestDataManager();
    performanceMonitor = new InteractionPerformanceMonitor(page);

    // 启用网络监控
    await performanceMonitor.monitorNetworkRequests();
  });

  test.afterEach(async () => {
    // 清理测试数据
    await testDataManager.cleanup();
    
    // 输出性能报告
    const report = performanceMonitor.generateReport();
    console.log('Performance Report:', JSON.stringify(report, null, 2));
  });

  test.describe('基础交互响应时间测试', () => {
    test('按钮点击响应时间测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试导航按钮点击响应时间
      const navigationTime = await performanceMonitor.measureInteractionTime(
        async () => {
          await page.click('[data-testid="analysis-nav"]');
        },
        '[data-testid="analysis-page"]'
      );
      
      expect(navigationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.clickResponse);
      
      // 测试返回按钮响应时间
      const backTime = await performanceMonitor.measureInteractionTime(
        async () => {
          await page.click('[data-testid="back-button"]');
        },
        '[data-testid="home-page"]'
      );
      
      expect(backTime).toBeLessThan(PERFORMANCE_THRESHOLDS.clickResponse);
    });

    test('表单交互响应时间测试', async ({ page }) => {
      await page.goto('/');
      await authPage.goToRegister();
      
      // 测试表单字段输入响应时间
      const inputTime = await performanceMonitor.measureInteractionTime(
        async () => {
          await page.fill('[data-testid="username-input"]', 'testuser');
          await page.fill('[data-testid="email-input"]', 'test@example.com');
          await page.fill('[data-testid="password-input"]', 'password123');
        }
      );
      
      expect(inputTime).toBeLessThan(PERFORMANCE_THRESHOLDS.clickResponse);
      
      // 测试表单验证响应时间
      const validationTime = await performanceMonitor.measureInteractionTime(
        async () => {
          await page.fill('[data-testid="email-input"]', 'invalid-email');
          await page.blur('[data-testid="email-input"]');
        },
        '[data-testid="email-error"]'
      );
      
      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.clickResponse);
    });

    test('搜索功能响应时间测试', async ({ page }) => {
      // 创建测试用户和宠物
      const userData = await testDataManager.createTestUser();
      await authPage.login(userData.email, userData.password);
      
      const petData = await testDataManager.createTestPet(userData.id);
      await petsPage.goToPetsPage();
      
      // 测试搜索响应时间
      const searchTime = await performanceMonitor.measureInteractionTime(
        async () => {
          await page.fill('[data-testid="search-input"]', petData.name);
          await page.press('[data-testid="search-input"]', 'Enter');
        },
        '[data-testid="search-results"]'
      );
      
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponse);
    });
  });

  test.describe('复杂操作性能基准测试', () => {
    test('用户注册完整流程性能测试', async ({ page }) => {
      await page.goto('/');
      
      const benchmark = await performanceMonitor.measureComplexOperation(
        '用户注册流程',
        async () => {
          await authPage.goToRegister();
          
          const userData = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'password123'
          };
          
          await authPage.register(userData);
          await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
        },
        PERFORMANCE_THRESHOLDS.complexOperation
      );
      
      expect(benchmark.passed).toBe(true);
      expect(benchmark.actualTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexOperation);
    });

    test('宠物管理操作性能测试', async ({ page }) => {
      // 准备测试环境
      const userData = await testDataManager.createTestUser();
      await authPage.login(userData.email, userData.password);
      await petsPage.goToPetsPage();
      
      const benchmark = await performanceMonitor.measureComplexOperation(
        '宠物添加和编辑流程',
        async () => {
          // 添加宠物
          const petData = {
            name: `测试宠物_${Date.now()}`,
            type: 'dog' as const,
            breed: '金毛',
            age: 2,
            weight: 25
          };
          
          await petsPage.addPet(petData);
          await page.waitForSelector(`[data-testid="pet-${petData.name}"]`);
          
          // 编辑宠物信息
          await petsPage.editPet(petData.name, {
            ...petData,
            age: 3,
            weight: 27
          });
          
          await page.waitForSelector('[data-testid="pet-updated-message"]');
        },
        PERFORMANCE_THRESHOLDS.complexOperation
      );
      
      expect(benchmark.passed).toBe(true);
    });

    test('图片上传和分析性能测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      const petData = await testDataManager.createTestPet(userData.id);
      
      await authPage.login(userData.email, userData.password);
      await analysisPage.goToAnalysisPage();
      
      const benchmark = await performanceMonitor.measureComplexOperation(
        '图片上传和分析流程',
        async () => {
          // 上传图片
          await analysisPage.uploadImage('frontend/e2e/fixtures/images/test-poop.jpg');
          
          // 选择宠物
          await analysisPage.selectPet(petData.id);
          
          // 开始分析
          await analysisPage.startAnalysis();
          
          // 等待分析完成
          await analysisPage.waitForAnalysisComplete();
        },
        PERFORMANCE_THRESHOLDS.imageUpload
      );
      
      expect(benchmark.passed).toBe(true);
    });

    test('社区帖子发布性能测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.login(userData.email, userData.password);
      await communityPage.goToCommunityPage();
      
      const benchmark = await performanceMonitor.measureComplexOperation(
        '社区帖子发布流程',
        async () => {
          const postData = {
            title: `测试帖子_${Date.now()}`,
            content: '这是一个测试帖子的内容，用于测试发布性能。',
            image: 'frontend/e2e/fixtures/images/test-pet.jpg'
          };
          
          await communityPage.createPost(postData);
          await page.waitForSelector(`[data-testid="post-${postData.title}"]`);
        },
        PERFORMANCE_THRESHOLDS.complexOperation
      );
      
      expect(benchmark.passed).toBe(true);
    });
  });

  test.describe('性能回归检测测试', () => {
    test('页面加载时间回归测试', async ({ page }) => {
      const pages = [
        { name: '首页', url: '/', selector: '[data-testid="home-page"]' },
        { name: '分析页', url: '/analysis', selector: '[data-testid="analysis-page"]' },
        { name: '社区页', url: '/community', selector: '[data-testid="community-page"]' }
      ];
      
      for (const pageInfo of pages) {
        const benchmark = await performanceMonitor.measureComplexOperation(
          `${pageInfo.name}加载时间`,
          async () => {
            await page.goto(pageInfo.url);
            await page.waitForSelector(pageInfo.selector);
          },
          PERFORMANCE_THRESHOLDS.pageNavigation
        );
        
        expect(benchmark.passed).toBe(true);
        
        // 记录性能指标用于回归分析
        console.log(`${pageInfo.name}加载时间: ${benchmark.actualTime}ms`);
      }
    });

    test('数据加载性能回归测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.login(userData.email, userData.password);
      
      // 创建多个测试宠物
      const pets = [];
      for (let i = 0; i < 5; i++) {
        const pet = await testDataManager.createTestPet(userData.id);
        pets.push(pet);
      }
      
      const benchmark = await performanceMonitor.measureComplexOperation(
        '宠物列表数据加载',
        async () => {
          await petsPage.goToPetsPage();
          await page.waitForSelector('[data-testid="pets-list"]');
          
          // 验证所有宠物都已加载
          for (const pet of pets) {
            await page.waitForSelector(`[data-testid="pet-${pet.id}"]`);
          }
        },
        PERFORMANCE_THRESHOLDS.dataLoad
      );
      
      expect(benchmark.passed).toBe(true);
    });

    test('交互响应时间回归测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.login(userData.email, userData.password);
      
      // 测试多个交互操作的响应时间
      const interactions = [
        {
          name: '导航到分析页',
          action: async () => {
            await page.click('[data-testid="analysis-nav"]');
            await page.waitForSelector('[data-testid="analysis-page"]');
          }
        },
        {
          name: '导航到宠物页',
          action: async () => {
            await page.click('[data-testid="pets-nav"]');
            await page.waitForSelector('[data-testid="pets-page"]');
          }
        },
        {
          name: '导航到社区页',
          action: async () => {
            await page.click('[data-testid="community-nav"]');
            await page.waitForSelector('[data-testid="community-page"]');
          }
        }
      ];
      
      for (const interaction of interactions) {
        const responseTime = await performanceMonitor.measureInteractionTime(
          interaction.action
        );
        
        expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.clickResponse);
        console.log(`${interaction.name}响应时间: ${responseTime}ms`);
      }
    });

    test('内存使用回归测试', async ({ page }) => {
      const userData = await testDataManager.createTestUser();
      await authPage.login(userData.email, userData.password);
      
      // 记录初始内存使用
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // 执行一系列操作
      await petsPage.goToPetsPage();
      await analysisPage.goToAnalysisPage();
      await communityPage.goToCommunityPage();
      
      // 创建和删除一些数据
      const petData = await testDataManager.createTestPet(userData.id);
      await petsPage.goToPetsPage();
      await petsPage.addPet(petData);
      await petsPage.deletePet(petData.id);
      
      // 记录最终内存使用
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      console.log(`内存使用变化: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);
      
      // 内存增长不应超过50%
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });

  test.describe('并发操作性能测试', () => {
    test('多用户同时操作性能测试', async ({ browser }) => {
      const contexts = [];
      const pages = [];
      
      try {
        // 创建多个浏览器上下文模拟并发用户
        for (let i = 0; i < 3; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          contexts.push(context);
          pages.push(page);
        }
        
        // 并发执行用户操作
        const operations = pages.map(async (page, index) => {
          const userData = await testDataManager.createTestUser();
          const authPageInstance = new AuthPage(page);
          const petsPageInstance = new PetsPage(page);
          
          const startTime = Date.now();
          
          await authPageInstance.login(userData.email, userData.password);
          await petsPageInstance.goToPetsPage();
          
          const petData = await testDataManager.createTestPet(userData.id);
          await petsPageInstance.addPet(petData);
          
          const endTime = Date.now();
          return {
            user: index + 1,
            operationTime: endTime - startTime
          };
        });
        
        const results = await Promise.all(operations);
        
        // 验证所有操作都在合理时间内完成
        results.forEach(result => {
          console.log(`用户${result.user}操作时间: ${result.operationTime}ms`);
          expect(result.operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexOperation * 2);
        });
        
        // 验证平均响应时间
        const averageTime = results.reduce((sum, r) => sum + r.operationTime, 0) / results.length;
        expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.complexOperation * 1.5);
        
      } finally {
        // 清理浏览器上下文
        for (const context of contexts) {
          await context.close();
        }
      }
    });
  });
});