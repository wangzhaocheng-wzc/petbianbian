import { Page } from '@playwright/test';

/**
 * 性能测试工具类
 * 提供性能监控、测量和分析功能
 */

export interface PerformanceMetrics {
  responseTime: number;
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  resourceLoadTime: number;
  interactionDelay: number;
}

export interface NetworkMetrics {
  requestCount: number;
  totalSize: number;
  averageResponseTime: number;
  slowestRequest: {
    url: string;
    responseTime: number;
  };
  failedRequests: number;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsagePercent: number;
}

export class PerformanceUtils {
  private page: Page;
  private networkRequests: any[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkMonitoring();
  }

  /**
   * 设置网络监控
   */
  private setupNetworkMonitoring(): void {
    this.page.on('request', (request) => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        startTime: Date.now(),
        size: 0,
        responseTime: 0,
        status: 0,
        failed: false
      });
    });

    this.page.on('response', (response) => {
      const request = this.networkRequests.find(req => 
        req.url === response.url() && req.responseTime === 0
      );
      if (request) {
        request.responseTime = Date.now() - request.startTime;
        request.status = response.status();
        request.failed = response.status() >= 400;
      }
    });

    this.page.on('requestfailed', (request) => {
      const req = this.networkRequests.find(r => r.url === request.url());
      if (req) {
        req.failed = true;
        req.responseTime = Date.now() - req.startTime;
      }
    });
  }

  /**
   * 开始性能标记
   */
  startMark(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }

  /**
   * 结束性能标记并返回耗时
   */
  endMark(name: string): number {
    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      throw new Error(`Performance mark '${name}' not found`);
    }
    
    const duration = Date.now() - startTime;
    this.performanceMarks.delete(name);
    return duration;
  }

  /**
   * 测量操作执行时间
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.startMark(operationName);
    
    try {
      const result = await operation();
      const duration = this.endMark(operationName);
      
      return { result, duration };
    } catch (error) {
      this.endMark(operationName);
      throw error;
    }
  }

  /**
   * 获取内存使用情况
   */
  async getMemoryMetrics(): Promise<MemoryMetrics> {
    const memoryInfo = await this.page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
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

    return {
      ...memoryInfo,
      memoryUsagePercent: memoryInfo.jsHeapSizeLimit > 0 
        ? (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100 
        : 0
    };
  }

  /**
   * 获取网络性能指标
   */
  getNetworkMetrics(): NetworkMetrics {
    const completedRequests = this.networkRequests.filter(req => req.responseTime > 0);
    const failedRequests = this.networkRequests.filter(req => req.failed);
    
    const totalResponseTime = completedRequests.reduce((sum, req) => sum + req.responseTime, 0);
    const averageResponseTime = completedRequests.length > 0 
      ? totalResponseTime / completedRequests.length 
      : 0;
    
    const slowestRequest = completedRequests.reduce((slowest, current) => {
      return current.responseTime > slowest.responseTime ? current : slowest;
    }, { url: '', responseTime: 0 });

    return {
      requestCount: this.networkRequests.length,
      totalSize: completedRequests.reduce((sum, req) => sum + req.size, 0),
      averageResponseTime,
      slowestRequest,
      failedRequests: failedRequests.length
    };
  }

  /**
   * 获取页面性能指标
   */
  async getPagePerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
      const lcp = paint.find(entry => entry.name === 'largest-contentful-paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: fcp ? fcp.startTime : 0,
        largestContentfulPaint: lcp ? lcp.startTime : 0,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        domComplete: navigation.domComplete - navigation.fetchStart
      };
    });
  }

  /**
   * 等待页面稳定（网络空闲）
   */
  async waitForNetworkIdle(timeout: number = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 测量首次交互延迟
   */
  async measureFirstInputDelay(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let firstInputDelay = 0;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'first-input') {
              firstInputDelay = (entry as any).processingStart - entry.startTime;
              observer.disconnect();
              resolve(firstInputDelay);
              return;
            }
          }
        });
        
        observer.observe({ entryTypes: ['first-input'] });
        
        // 如果5秒内没有交互，返回0
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 5000);
      });
    });
  }

  /**
   * 监控累积布局偏移
   */
  async measureCumulativeLayoutShift(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // 监控5秒后返回结果
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 5000);
      });
    });
  }

  /**
   * 清理网络请求记录
   */
  clearNetworkRequests(): void {
    this.networkRequests = [];
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(): Promise<any> {
    const memoryMetrics = await this.getMemoryMetrics();
    const networkMetrics = this.getNetworkMetrics();
    const pageMetrics = await this.getPagePerformanceMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      memory: memoryMetrics,
      network: networkMetrics,
      page: pageMetrics,
      summary: {
        totalRequests: networkMetrics.requestCount,
        failedRequests: networkMetrics.failedRequests,
        averageResponseTime: networkMetrics.averageResponseTime,
        memoryUsage: `${(memoryMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        memoryUsagePercent: `${memoryMetrics.memoryUsagePercent.toFixed(2)}%`
      }
    };
  }
}

/**
 * 性能阈值配置
 */
export const PERFORMANCE_THRESHOLDS = {
  // 响应时间阈值 (毫秒)
  clickResponse: 500,
  formSubmission: 2000,
  imageUpload: 5000,
  pageNavigation: 1000,
  searchResponse: 800,
  dataLoad: 1500,
  complexOperation: 3000,
  
  // 内存使用阈值
  memoryUsagePercent: 80,
  memoryLeakThreshold: 50, // MB
  
  // 网络性能阈值
  maxNetworkRequests: 50,
  averageResponseTime: 1000,
  maxFailedRequests: 5,
  
  // Core Web Vitals 阈值
  firstContentfulPaint: 1800,
  largestContentfulPaint: 2500,
  firstInputDelay: 100,
  cumulativeLayoutShift: 0.1
};

/**
 * 性能测试辅助函数
 */
export class PerformanceTestHelper {
  /**
   * 验证性能指标是否符合阈值
   */
  static validatePerformanceMetrics(metrics: any, thresholds: any): {
    passed: boolean;
    failures: string[];
  } {
    const failures: string[] = [];
    
    // 检查各项指标
    Object.keys(thresholds).forEach(key => {
      if (metrics[key] !== undefined && metrics[key] > thresholds[key]) {
        failures.push(`${key}: ${metrics[key]} > ${thresholds[key]}`);
      }
    });
    
    return {
      passed: failures.length === 0,
      failures
    };
  }

  /**
   * 格式化性能报告
   */
  static formatPerformanceReport(report: any): string {
    return `
性能测试报告
============
时间: ${report.timestamp}

内存使用:
- 已使用: ${report.summary.memoryUsage}
- 使用率: ${report.summary.memoryUsagePercent}

网络性能:
- 总请求数: ${report.summary.totalRequests}
- 失败请求: ${report.summary.failedRequests}
- 平均响应时间: ${report.summary.averageResponseTime}ms

页面性能:
- DOM加载完成: ${report.page.domContentLoaded}ms
- 首次内容绘制: ${report.page.firstContentfulPaint}ms
- 最大内容绘制: ${report.page.largestContentfulPaint}ms
`;
  }
}