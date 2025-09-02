import { Browser, Page, BrowserContext } from '@playwright/test';

export interface LoadTestConfig {
  concurrentUsers: number;
  testDuration: number; // in milliseconds
  rampUpTime: number; // in milliseconds
  thinkTime: number; // in milliseconds between actions
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    timestamp: number;
    error: string;
    url?: string;
  }>;
}

export interface SystemMetrics {
  timestamp: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  performanceMetrics: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
  };
  networkMetrics: {
    requestCount: number;
    responseCount: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

export class LoadTestingUtils {
  private browser: Browser;
  private contexts: BrowserContext[] = [];
  private pages: Page[] = [];
  private metrics: LoadTestResult;
  private systemMetrics: SystemMetrics[] = [];

  constructor(browser: Browser) {
    this.browser = browser;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      requestsPerSecond: 0,
      errors: []
    };
  }

  /**
   * 创建并发用户会话
   */
  async createConcurrentSessions(userCount: number): Promise<Page[]> {
    const pages: Page[] = [];
    
    for (let i = 0; i < userCount; i++) {
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: `LoadTest-User-${i}`
      });
      
      const page = await context.newPage();
      
      // 监听网络请求
      this.setupNetworkMonitoring(page);
      
      this.contexts.push(context);
      pages.push(page);
    }
    
    this.pages = pages;
    return pages;
  }

  /**
   * 设置网络监控
   */
  private setupNetworkMonitoring(page: Page): void {
    page.on('request', request => {
      this.metrics.totalRequests++;
    });

    page.on('response', response => {
      const timing = response.timing();
      const responseTime = timing.responseEnd;
      
      if (response.status() >= 200 && response.status() < 400) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
        this.metrics.errors.push({
          timestamp: Date.now(),
          error: `HTTP ${response.status()}`,
          url: response.url()
        });
      }
      
      // 更新响应时间统计
      if (responseTime > this.metrics.maxResponseTime) {
        this.metrics.maxResponseTime = responseTime;
      }
      if (responseTime < this.metrics.minResponseTime) {
        this.metrics.minResponseTime = responseTime;
      }
    });

    page.on('requestfailed', request => {
      this.metrics.failedRequests++;
      this.metrics.errors.push({
        timestamp: Date.now(),
        error: request.failure()?.errorText || 'Request failed',
        url: request.url()
      });
    });
  }

  /**
   * 执行负载测试
   */
  async runLoadTest(
    config: LoadTestConfig,
    testScenario: (page: Page, userIndex: number) => Promise<void>
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    const pages = await this.createConcurrentSessions(config.concurrentUsers);
    
    // 启动系统监控
    const monitoringInterval = setInterval(() => {
      this.collectSystemMetrics(pages[0]);
    }, 5000);

    // 创建用户负载
    const userPromises = pages.map(async (page, index) => {
      // 渐进式启动用户（ramp-up）
      const delay = (config.rampUpTime / config.concurrentUsers) * index;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const userStartTime = Date.now();
      const userEndTime = userStartTime + config.testDuration;
      
      try {
        while (Date.now() < userEndTime) {
          await testScenario(page, index);
          
          // 思考时间
          if (config.thinkTime > 0) {
            await new Promise(resolve => setTimeout(resolve, config.thinkTime));
          }
        }
      } catch (error) {
        this.metrics.errors.push({
          timestamp: Date.now(),
          error: error.message,
          url: page.url()
        });
      }
    });

    // 等待所有用户完成
    await Promise.all(userPromises);
    
    // 停止监控
    clearInterval(monitoringInterval);
    
    // 计算最终指标
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // 转换为秒
    
    this.metrics.averageResponseTime = this.calculateAverageResponseTime();
    this.metrics.requestsPerSecond = this.metrics.totalRequests / totalTime;
    
    // 清理资源
    await this.cleanup();
    
    return this.metrics;
  }

  /**
   * 收集系统指标
   */
  private async collectSystemMetrics(page: Page): Promise<void> {
    try {
      const metrics = await page.evaluate(() => {
        const memory = (performance as any).memory;
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          timestamp: Date.now(),
          memoryUsage: {
            usedJSHeapSize: memory?.usedJSHeapSize || 0,
            totalJSHeapSize: memory?.totalJSHeapSize || 0,
            jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0
          },
          performanceMetrics: {
            domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
            loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
          }
        };
      });
      
      const networkMetrics = {
        requestCount: this.metrics.totalRequests,
        responseCount: this.metrics.successfulRequests + this.metrics.failedRequests,
        failedRequests: this.metrics.failedRequests,
        averageResponseTime: this.calculateAverageResponseTime()
      };
      
      this.systemMetrics.push({
        ...metrics,
        networkMetrics
      });
    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
    }
  }

  /**
   * 计算平均响应时间
   */
  private calculateAverageResponseTime(): number {
    if (this.metrics.successfulRequests === 0) return 0;
    
    // 这里简化计算，实际应该基于实际响应时间数据
    return (this.metrics.maxResponseTime + this.metrics.minResponseTime) / 2;
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics(): SystemMetrics[] {
    return this.systemMetrics;
  }

  /**
   * 生成负载测试报告
   */
  generateLoadTestReport(result: LoadTestResult): string {
    const successRate = (result.successfulRequests / result.totalRequests) * 100;
    const errorRate = (result.failedRequests / result.totalRequests) * 100;
    
    let report = `
=== 负载测试报告 ===

基本指标:
- 总请求数: ${result.totalRequests}
- 成功请求数: ${result.successfulRequests}
- 失败请求数: ${result.failedRequests}
- 成功率: ${successRate.toFixed(2)}%
- 错误率: ${errorRate.toFixed(2)}%

性能指标:
- 平均响应时间: ${result.averageResponseTime.toFixed(2)}ms
- 最大响应时间: ${result.maxResponseTime.toFixed(2)}ms
- 最小响应时间: ${result.minResponseTime === Infinity ? 0 : result.minResponseTime.toFixed(2)}ms
- 每秒请求数: ${result.requestsPerSecond.toFixed(2)} RPS

`;

    if (result.errors.length > 0) {
      report += `错误详情:\n`;
      result.errors.slice(0, 10).forEach((error, index) => {
        report += `${index + 1}. ${new Date(error.timestamp).toISOString()}: ${error.error}\n`;
        if (error.url) {
          report += `   URL: ${error.url}\n`;
        }
      });
      
      if (result.errors.length > 10) {
        report += `... 还有 ${result.errors.length - 10} 个错误\n`;
      }
    }

    return report;
  }

  /**
   * 生成性能优化建议
   */
  generateOptimizationSuggestions(result: LoadTestResult): string[] {
    const suggestions: string[] = [];
    
    const successRate = (result.successfulRequests / result.totalRequests) * 100;
    const avgResponseTime = result.averageResponseTime;
    
    if (successRate < 95) {
      suggestions.push('系统成功率低于95%，需要检查错误处理和系统稳定性');
    }
    
    if (avgResponseTime > 2000) {
      suggestions.push('平均响应时间超过2秒，建议优化数据库查询和API性能');
    }
    
    if (result.maxResponseTime > 10000) {
      suggestions.push('存在超过10秒的慢请求，需要识别和优化性能瓶颈');
    }
    
    if (result.requestsPerSecond < 10) {
      suggestions.push('系统吞吐量较低，考虑增加服务器资源或优化架构');
    }
    
    // 分析错误模式
    const errorTypes = new Map<string, number>();
    result.errors.forEach(error => {
      const errorType = error.error.split(' ')[0];
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });
    
    if (errorTypes.has('HTTP')) {
      suggestions.push('存在HTTP错误，检查API端点和服务器配置');
    }
    
    if (errorTypes.has('timeout') || errorTypes.has('TIMEOUT')) {
      suggestions.push('存在超时错误，考虑增加超时时间或优化响应速度');
    }
    
    return suggestions;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    for (const context of this.contexts) {
      await context.close();
    }
    this.contexts = [];
    this.pages = [];
  }
}

/**
 * 压力测试场景生成器
 */
export class StressTestScenarios {
  /**
   * 用户登录场景
   */
  static async loginScenario(page: Page, userIndex: number): Promise<void> {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', `testuser${userIndex}@example.com`);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * 浏览社区场景
   */
  static async browseCommunityScenario(page: Page, userIndex: number): Promise<void> {
    await page.goto('/community');
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // 滚动浏览
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    
    // 点击第一个帖子
    const firstPost = page.locator('[data-testid="post-item"]').first();
    if (await firstPost.count() > 0) {
      await firstPost.click();
      await page.waitForSelector('[data-testid="post-detail"]', { timeout: 5000 });
      await page.goBack();
    }
  }

  /**
   * 图片分析场景
   */
  static async imageAnalysisScenario(page: Page, userIndex: number): Promise<void> {
    await page.goto('/analysis');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // 上传图片
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('frontend/e2e/fixtures/images/test-poop.jpg');
    
    // 开始分析
    await page.click('[data-testid="analyze-button"]');
    await page.waitForSelector('[data-testid="analysis-result"]', { timeout: 30000 });
  }

  /**
   * 混合用户行为场景
   */
  static async mixedUserScenario(page: Page, userIndex: number): Promise<void> {
    const scenarios = [
      StressTestScenarios.loginScenario,
      StressTestScenarios.browseCommunityScenario,
      StressTestScenarios.imageAnalysisScenario
    ];
    
    // 随机选择场景
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    await randomScenario(page, userIndex);
  }
}