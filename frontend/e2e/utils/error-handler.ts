import { Page, TestInfo } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  testName: string;
  url: string;
  timestamp: Date;
  error: Error;
  screenshot?: Buffer;
  consoleLogs?: string[];
  networkLogs?: any[];
  pageSource?: string;
  browserInfo?: BrowserInfo;
  performanceMetrics?: PerformanceMetrics;
  memoryUsage?: MemoryUsage;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: Error) => boolean;
  exponentialBackoff?: boolean;
  maxRetryDelay?: number;
}

/**
 * 浏览器信息
 */
export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  userAgent: string;
  viewport: { width: number; height: number };
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

/**
 * 内存使用情况
 */
export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * 错误分类
 */
export enum ErrorCategory {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  ELEMENT_NOT_FOUND = 'element_not_found',
  JAVASCRIPT = 'javascript',
  ASSERTION = 'assertion',
  UNKNOWN = 'unknown'
}

/**
 * 恢复策略
 */
export enum RecoveryStrategy {
  REFRESH_PAGE = 'refresh_page',
  CLEAR_STORAGE = 'clear_storage',
  RESET_COOKIES = 'reset_cookies',
  NAVIGATE_HOME = 'navigate_home',
  WAIT_AND_RETRY = 'wait_and_retry'
}

/**
 * 错误处理器
 * 提供自动重试、错误恢复、截图捕获等功能
 */
export class ErrorHandler {
  private page: Page;
  private testInfo?: TestInfo;
  private consoleLogs: string[] = [];
  private networkLogs: any[] = [];
  private errorHistory: ErrorContext[] = [];
  private recoveryStrategies: Map<ErrorCategory, RecoveryStrategy[]> = new Map();
  private pageStateSnapshots: any[] = [];

  constructor(page: Page, testInfo?: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.setupLogging();
    this.initializeRecoveryStrategies();
  }

  /**
   * 初始化恢复策略
   */
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set(ErrorCategory.NETWORK, [
      RecoveryStrategy.WAIT_AND_RETRY,
      RecoveryStrategy.REFRESH_PAGE
    ]);
    
    this.recoveryStrategies.set(ErrorCategory.TIMEOUT, [
      RecoveryStrategy.WAIT_AND_RETRY,
      RecoveryStrategy.REFRESH_PAGE
    ]);
    
    this.recoveryStrategies.set(ErrorCategory.ELEMENT_NOT_FOUND, [
      RecoveryStrategy.WAIT_AND_RETRY,
      RecoveryStrategy.REFRESH_PAGE
    ]);
    
    this.recoveryStrategies.set(ErrorCategory.JAVASCRIPT, [
      RecoveryStrategy.REFRESH_PAGE,
      RecoveryStrategy.CLEAR_STORAGE
    ]);
    
    this.recoveryStrategies.set(ErrorCategory.ASSERTION, [
      RecoveryStrategy.WAIT_AND_RETRY
    ]);
    
    this.recoveryStrategies.set(ErrorCategory.UNKNOWN, [
      RecoveryStrategy.REFRESH_PAGE,
      RecoveryStrategy.NAVIGATE_HOME
    ]);
  }

  /**
   * 设置日志收集（增强版）
   */
  private setupLogging(): void {
    // 收集控制台日志
    this.page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date(),
        location: msg.location()
      };
      this.consoleLogs.push(`[${logEntry.type.toUpperCase()}] ${logEntry.text} (${logEntry.location.url}:${logEntry.location.lineNumber})`);
      
      // 保留最近200条日志
      if (this.consoleLogs.length > 200) {
        this.consoleLogs.shift();
      }
    });

    // 收集网络请求日志
    this.page.on('request', request => {
      this.networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: new Date(),
        headers: request.headers(),
        postData: request.postData(),
        resourceType: request.resourceType()
      });
    });

    this.page.on('response', response => {
      this.networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date(),
        headers: response.headers(),
        size: response.headers()['content-length'] || 0
      });
      
      // 保留最近100条网络日志
      if (this.networkLogs.length > 100) {
        this.networkLogs.shift();
      }
    });

    // 收集页面错误
    this.page.on('pageerror', error => {
      console.error('Page error:', error);
      this.consoleLogs.push(`[ERROR] ${error.message}\nStack: ${error.stack}`);
    });

    // 收集请求失败
    this.page.on('requestfailed', request => {
      const failure = request.failure();
      this.networkLogs.push({
        type: 'request_failed',
        url: request.url(),
        method: request.method(),
        timestamp: new Date(),
        errorText: failure?.errorText || 'Unknown error'
      });
    });
  }

  /**
   * 自动重试机制（增强版）
   */
  async retryOnFailure<T>(
    operation: () => Promise<T>,
    config: RetryConfig = { maxRetries: 3, retryDelay: 1000 }
  ): Promise<T> {
    const { 
      maxRetries, 
      retryDelay, 
      retryCondition, 
      exponentialBackoff = false,
      maxRetryDelay = 30000 
    } = config;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 在重试前保存页面状态快照
        if (attempt > 1) {
          await this.savePageStateSnapshot(`before_retry_${attempt}`);
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const errorCategory = this.categorizeError(lastError);
        
        console.log(`Attempt ${attempt} failed (${errorCategory}): ${lastError.message}`);
        
        // 检查是否应该重试
        if (retryCondition && !retryCondition(lastError)) {
          await this.captureFailureContext(lastError, `non_retryable_error`);
          throw lastError;
        }

        if (attempt === maxRetries) {
          // 最后一次尝试失败，捕获完整错误上下文
          await this.captureFailureContext(lastError, `final_retry_attempt_${attempt}`);
          throw lastError;
        }

        // 计算延迟时间
        let currentDelay = retryDelay;
        if (exponentialBackoff) {
          currentDelay = Math.min(retryDelay * Math.pow(2, attempt - 1), maxRetryDelay);
        }

        console.log(`Waiting ${currentDelay}ms before retry ${attempt + 1}...`);
        await this.page.waitForTimeout(currentDelay);
        
        // 根据错误类型执行恢复策略
        await this.executeRecoveryStrategy(errorCategory, attempt);
      }
    }

    throw lastError!;
  }

  /**
   * 错误分类
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('waiting for')) {
      return ErrorCategory.TIMEOUT;
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    
    if (message.includes('element') || message.includes('selector') || message.includes('locator')) {
      return ErrorCategory.ELEMENT_NOT_FOUND;
    }
    
    if (message.includes('javascript') || message.includes('script') || error.name === 'EvalError') {
      return ErrorCategory.JAVASCRIPT;
    }
    
    if (message.includes('expect') || message.includes('assertion') || message.includes('toBe')) {
      return ErrorCategory.ASSERTION;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * 执行恢复策略
   */
  private async executeRecoveryStrategy(errorCategory: ErrorCategory, attempt: number): Promise<void> {
    const strategies = this.recoveryStrategies.get(errorCategory) || [RecoveryStrategy.WAIT_AND_RETRY];
    const strategyIndex = Math.min(attempt - 1, strategies.length - 1);
    const strategy = strategies[strategyIndex];

    console.log(`Executing recovery strategy: ${strategy}`);

    try {
      switch (strategy) {
        case RecoveryStrategy.REFRESH_PAGE:
          await this.refreshPage();
          break;
        case RecoveryStrategy.CLEAR_STORAGE:
          await this.clearBrowserStorage();
          break;
        case RecoveryStrategy.RESET_COOKIES:
          await this.resetCookies();
          break;
        case RecoveryStrategy.NAVIGATE_HOME:
          await this.navigateToHome();
          break;
        case RecoveryStrategy.WAIT_AND_RETRY:
        default:
          await this.waitForPageStable();
          break;
      }
    } catch (recoveryError) {
      console.warn(`Recovery strategy ${strategy} failed:`, recoveryError);
    }
  }

  /**
   * 捕获失败上下文（增强版）
   */
  async captureFailureContext(error: Error, suffix: string = ''): Promise<ErrorContext> {
    const timestamp = new Date();
    const testName = this.testInfo?.title || 'unknown_test';
    const url = this.page.url();

    console.log(`Capturing enhanced failure context for: ${testName}`);

    try {
      // 创建截图目录
      const screenshotDir = path.join('test-results', 'screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });

      // 捕获多种截图
      const screenshotName = `${testName}_${suffix}_${timestamp.getTime()}`;
      const fullPageScreenshot = await this.page.screenshot({ 
        path: path.join(screenshotDir, `${screenshotName}_full.png`),
        fullPage: true 
      });

      // 捕获视口截图
      await this.page.screenshot({ 
        path: path.join(screenshotDir, `${screenshotName}_viewport.png`),
        fullPage: false 
      });

      // 获取页面源码
      const pageSource = await this.page.content();

      // 获取浏览器信息
      const browserInfo = await this.getBrowserInfo();

      // 获取性能指标
      const performanceMetrics = await this.getPerformanceMetrics();

      // 获取内存使用情况
      const memoryUsage = await this.getMemoryUsage();

      // 创建增强的错误上下文
      const context: ErrorContext = {
        testName,
        url,
        timestamp,
        error,
        screenshot: fullPageScreenshot,
        consoleLogs: [...this.consoleLogs],
        networkLogs: [...this.networkLogs],
        pageSource,
        browserInfo,
        performanceMetrics,
        memoryUsage
      };

      // 保存错误上下文到文件
      await this.saveErrorContext(context, suffix);

      // 添加到错误历史
      this.errorHistory.push(context);
      
      // 保留最近10个错误上下文
      if (this.errorHistory.length > 10) {
        this.errorHistory.shift();
      }

      return context;
    } catch (captureError) {
      console.error('Error capturing failure context:', captureError);
      
      // 返回基本错误上下文
      const basicContext: ErrorContext = {
        testName,
        url,
        timestamp,
        error,
        consoleLogs: [...this.consoleLogs],
        networkLogs: [...this.networkLogs]
      };
      
      this.errorHistory.push(basicContext);
      return basicContext;
    }
  }

  /**
   * 获取浏览器信息
   */
  private async getBrowserInfo(): Promise<BrowserInfo> {
    try {
      const browserInfo = await this.page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        };
      });

      const viewport = this.page.viewportSize() || { width: 0, height: 0 };
      const browser = this.page.context().browser();

      return {
        name: browser?.browserType().name() || 'unknown',
        version: browser?.version() || 'unknown',
        platform: browserInfo.platform,
        userAgent: browserInfo.userAgent,
        viewport
      };
    } catch (error) {
      console.warn('Failed to get browser info:', error);
      return {
        name: 'unknown',
        version: 'unknown',
        platform: 'unknown',
        userAgent: 'unknown',
        viewport: { width: 0, height: 0 }
      };
    }
  }

  /**
   * 获取性能指标
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      return await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        const lcp = paint.find(entry => entry.name === 'largest-contentful-paint');

        return {
          navigationStart: navigation.navigationStart,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          loadComplete: navigation.loadEventEnd,
          firstContentfulPaint: fcp?.startTime,
          largestContentfulPaint: lcp?.startTime
        };
      });
    } catch (error) {
      console.warn('Failed to get performance metrics:', error);
      return {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0
      };
    }
  }

  /**
   * 获取内存使用情况
   */
  private async getMemoryUsage(): Promise<MemoryUsage> {
    try {
      return await this.page.evaluate(() => {
        const memory = (performance as any).memory;
        if (memory) {
          return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          };
        }
        return {
          usedJSHeapSize: 0,
          totalJSHeapSize: 0,
          jsHeapSizeLimit: 0
        };
      });
    } catch (error) {
      console.warn('Failed to get memory usage:', error);
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      };
    }
  }

  /**
   * 保存错误上下文到文件
   */
  private async saveErrorContext(context: ErrorContext, suffix: string): Promise<void> {
    try {
      const errorDir = path.join('test-results', 'error-contexts');
      await fs.mkdir(errorDir, { recursive: true });

      const filename = `${context.testName}_${suffix}_${context.timestamp.getTime()}.json`;
      const filepath = path.join(errorDir, filename);

      const contextData = {
        testName: context.testName,
        url: context.url,
        timestamp: context.timestamp.toISOString(),
        error: {
          message: context.error.message,
          stack: context.error.stack,
          name: context.error.name
        },
        consoleLogs: context.consoleLogs,
        networkLogs: context.networkLogs,
        pageSource: context.pageSource?.substring(0, 10000) // 限制页面源码长度
      };

      await fs.writeFile(filepath, JSON.stringify(contextData, null, 2));
      console.log(`Error context saved to: ${filepath}`);
    } catch (saveError) {
      console.error('Error saving context:', saveError);
    }
  }

  /**
   * 保存页面状态快照
   */
  private async savePageStateSnapshot(label: string): Promise<void> {
    try {
      const snapshot = {
        label,
        timestamp: new Date(),
        url: this.page.url(),
        title: await this.page.title(),
        cookies: await this.page.context().cookies(),
        localStorage: await this.page.evaluate(() => {
          const storage: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) storage[key] = localStorage.getItem(key) || '';
          }
          return storage;
        }),
        sessionStorage: await this.page.evaluate(() => {
          const storage: Record<string, string> = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) storage[key] = sessionStorage.getItem(key) || '';
          }
          return storage;
        })
      };

      this.pageStateSnapshots.push(snapshot);
      
      // 保留最近5个快照
      if (this.pageStateSnapshots.length > 5) {
        this.pageStateSnapshots.shift();
      }
    } catch (error) {
      console.warn('Failed to save page state snapshot:', error);
    }
  }

  /**
   * 刷新页面
   */
  private async refreshPage(): Promise<void> {
    console.log('Refreshing page...');
    await this.page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await this.waitForPageStable();
  }

  /**
   * 清除浏览器存储
   */
  private async clearBrowserStorage(): Promise<void> {
    console.log('Clearing browser storage...');
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * 重置Cookies
   */
  private async resetCookies(): Promise<void> {
    console.log('Resetting cookies...');
    await this.page.context().clearCookies();
  }

  /**
   * 导航到首页
   */
  private async navigateToHome(): Promise<void> {
    console.log('Navigating to home page...');
    await this.page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await this.waitForPageStable();
  }

  /**
   * 尝试恢复页面状态（增强版）
   */
  async attemptRecovery(): Promise<void> {
    try {
      console.log('Attempting enhanced page recovery...');

      // 检查页面是否响应
      const isResponsive = await this.page.evaluate(() => {
        try {
          return document.readyState !== undefined;
        } catch {
          return false;
        }
      }).catch(() => false);

      if (!isResponsive) {
        console.log('Page is not responsive, attempting navigation...');
        await this.page.goto(this.page.url(), { waitUntil: 'domcontentloaded' });
      }

      // 等待网络空闲
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('Network idle timeout, continuing...');
      });

      // 检查是否有JavaScript错误
      const hasJSErrors = await this.hasJavaScriptErrors();
      if (hasJSErrors) {
        console.log('JavaScript errors detected, attempting page refresh...');
        await this.refreshPage();
      }

      // 检查是否有网络错误
      const hasNetErrors = await this.hasNetworkErrors();
      if (hasNetErrors) {
        console.log('Network errors detected, waiting before retry...');
        await this.page.waitForTimeout(2000);
      }

      console.log('Enhanced page recovery completed');
    } catch (recoveryError) {
      console.log('Enhanced page recovery failed:', recoveryError);
      // 恢复失败不抛出错误，让重试机制继续
    }
  }

  /**
   * 重置测试环境
   */
  async resetTestEnvironment(): Promise<void> {
    try {
      console.log('Resetting test environment...');

      // 清除所有cookies
      await this.page.context().clearCookies();

      // 清除本地存储
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 清除所有路由拦截
      await this.page.unroute('**/*');

      // 导航到首页
      await this.page.goto('/', { waitUntil: 'networkidle' });

      console.log('Test environment reset completed');
    } catch (resetError) {
      console.error('Error resetting test environment:', resetError);
      throw resetError;
    }
  }

  /**
   * 检查常见错误条件
   */
  isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /element not found/i,
      /element is not attached/i,
      /waiting for selector/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * 等待页面稳定
   */
  async waitForPageStable(timeout: number = 10000): Promise<void> {
    try {
      // 等待DOM加载完成
      await this.page.waitForLoadState('domcontentloaded', { timeout });
      
      // 等待网络空闲
      await this.page.waitForLoadState('networkidle', { timeout });
      
      // 等待所有图片加载完成
      await this.page.waitForFunction(() => {
        const images = Array.from(document.images);
        return images.every(img => img.complete);
      }, { timeout });

      console.log('Page is stable');
    } catch (error) {
      console.log('Page stability check failed:', error);
      // 不抛出错误，让测试继续
    }
  }

  /**
   * 智能等待元素
   */
  async smartWaitForElement(
    selector: string,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<void> {
    const { timeout = 10000, retries = 3 } = options;

    await this.retryOnFailure(async () => {
      await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout 
      });
    }, {
      maxRetries: retries,
      retryDelay: 1000,
      retryCondition: this.isRetryableError
    });
  }

  /**
   * 安全执行操作
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config: RetryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: this.isRetryableError,
      ...retryConfig
    };

    try {
      return await this.retryOnFailure(operation, config);
    } catch (error) {
      console.error(`Operation '${operationName}' failed:`, error);
      await this.captureFailureContext(error as Error, operationName);
      throw error;
    }
  }

  /**
   * 获取收集的日志
   */
  getCollectedLogs(): { console: string[]; network: any[] } {
    return {
      console: [...this.consoleLogs],
      network: [...this.networkLogs]
    };
  }

  /**
   * 清除收集的日志
   */
  clearLogs(): void {
    this.consoleLogs = [];
    this.networkLogs = [];
  }

  /**
   * 检查页面是否有JavaScript错误
   */
  async hasJavaScriptErrors(): Promise<boolean> {
    return this.consoleLogs.some(log => log.includes('[ERROR]'));
  }

  /**
   * 检查是否有网络错误
   */
  async hasNetworkErrors(): Promise<boolean> {
    return this.networkLogs.some(log => 
      log.type === 'response' && log.status >= 400
    );
  }

  /**
   * 智能错误分析
   */
  async analyzeErrors(): Promise<{
    errorPatterns: string[];
    recommendations: string[];
    severity: 'low' | 'medium' | 'high';
  }> {
    const jsErrors = this.consoleLogs.filter(log => log.includes('[ERROR]'));
    const networkErrors = this.networkLogs.filter(log => 
      log.type === 'response' && log.status >= 400
    );
    const failedRequests = this.networkLogs.filter(log => 
      log.type === 'request_failed'
    );

    const errorPatterns: string[] = [];
    const recommendations: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // 分析JavaScript错误模式
    if (jsErrors.length > 0) {
      errorPatterns.push(`发现 ${jsErrors.length} 个JavaScript错误`);
      recommendations.push('检查控制台错误日志，修复JavaScript问题');
      severity = jsErrors.length > 5 ? 'high' : 'medium';
    }

    // 分析网络错误模式
    if (networkErrors.length > 0) {
      const statusCodes = networkErrors.map(log => log.status);
      const uniqueStatusCodes = [...new Set(statusCodes)];
      errorPatterns.push(`网络错误状态码: ${uniqueStatusCodes.join(', ')}`);
      
      if (uniqueStatusCodes.includes(500)) {
        recommendations.push('服务器内部错误，检查后端服务');
        severity = 'high';
      }
      if (uniqueStatusCodes.includes(404)) {
        recommendations.push('资源未找到，检查API端点或静态资源');
      }
      if (uniqueStatusCodes.includes(401) || uniqueStatusCodes.includes(403)) {
        recommendations.push('认证或授权问题，检查用户权限');
      }
    }

    // 分析请求失败模式
    if (failedRequests.length > 0) {
      errorPatterns.push(`${failedRequests.length} 个请求失败`);
      recommendations.push('检查网络连接和服务可用性');
      severity = failedRequests.length > 3 ? 'high' : 'medium';
    }

    return { errorPatterns, recommendations, severity };
  }

  /**
   * 生成详细错误报告
   */
  async generateDetailedErrorReport(): Promise<string> {
    const jsErrors = this.consoleLogs.filter(log => log.includes('[ERROR]'));
    const networkErrors = this.networkLogs.filter(log => 
      log.type === 'response' && log.status >= 400
    );
    const failedRequests = this.networkLogs.filter(log => 
      log.type === 'request_failed'
    );

    const errorAnalysis = await this.analyzeErrors();
    const browserInfo = await this.getBrowserInfo();
    const performanceMetrics = await this.getPerformanceMetrics();

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        testName: this.testInfo?.title || 'unknown',
        url: this.page.url(),
        browserInfo,
        performanceMetrics
      },
      errorSummary: {
        totalErrors: jsErrors.length + networkErrors.length + failedRequests.length,
        javascriptErrors: jsErrors.length,
        networkErrors: networkErrors.length,
        failedRequests: failedRequests.length,
        severity: errorAnalysis.severity
      },
      errorAnalysis,
      errorHistory: this.errorHistory.map(ctx => ({
        timestamp: ctx.timestamp,
        error: ctx.error.message,
        url: ctx.url,
        category: this.categorizeError(ctx.error)
      })),
      logs: {
        console: this.consoleLogs.slice(-20), // 最近20条控制台日志
        network: this.networkLogs.slice(-20)  // 最近20条网络日志
      },
      pageStateSnapshots: this.pageStateSnapshots.map(snapshot => ({
        label: snapshot.label,
        timestamp: snapshot.timestamp,
        url: snapshot.url,
        title: snapshot.title
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 监控页面健康状态
   */
  async monitorPageHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    metrics: any;
  }> {
    const issues: string[] = [];
    
    try {
      // 检查页面响应性
      const isResponsive = await this.page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      if (!isResponsive) {
        issues.push('页面未完全加载');
      }

      // 检查JavaScript错误
      if (await this.hasJavaScriptErrors()) {
        issues.push('存在JavaScript错误');
      }

      // 检查网络错误
      if (await this.hasNetworkErrors()) {
        issues.push('存在网络请求错误');
      }

      // 检查性能指标
      const performanceMetrics = await this.getPerformanceMetrics();
      if (performanceMetrics.loadComplete > 10000) {
        issues.push('页面加载时间过长');
      }

      // 检查内存使用
      const memoryUsage = await this.getMemoryUsage();
      if (memoryUsage.usedJSHeapSize > memoryUsage.jsHeapSizeLimit * 0.8) {
        issues.push('内存使用率过高');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        metrics: {
          performance: performanceMetrics,
          memory: memoryUsage,
          errorCounts: {
            javascript: this.consoleLogs.filter(log => log.includes('[ERROR]')).length,
            network: this.networkLogs.filter(log => log.type === 'response' && log.status >= 400).length
          }
        }
      };
    } catch (error) {
      issues.push(`健康检查失败: ${error}`);
      return {
        isHealthy: false,
        issues,
        metrics: {}
      };
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  /**
   * 获取页面状态快照
   */
  getPageStateSnapshots(): any[] {
    return [...this.pageStateSnapshots];
  }

  /**
   * 清理所有数据
   */
  cleanup(): void {
    this.clearLogs();
    this.errorHistory = [];
    this.pageStateSnapshots = [];
  }
}