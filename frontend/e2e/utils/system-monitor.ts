import { Page } from '@playwright/test';

export interface ResourceMetrics {
  timestamp: number;
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usedPercent: number;
  };
  performance: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint?: number;
  };
  network: {
    requestCount: number;
    responseCount: number;
    failedRequests: number;
    totalTransferSize: number;
    averageResponseTime: number;
  };
  cpu: {
    // 客户端无法直接获取CPU使用率，但可以通过任务执行时间推断
    taskDuration: number;
    longTaskCount: number;
  };
}

export interface PerformanceThresholds {
  memory: {
    maxUsagePercent: number;
    maxHeapSize: number; // in bytes
  };
  performance: {
    maxFirstContentfulPaint: number; // in ms
    maxDomContentLoaded: number; // in ms
  };
  network: {
    maxFailureRate: number; // percentage
    maxAverageResponseTime: number; // in ms
  };
}

export class SystemMonitor {
  private page: Page;
  private metrics: ResourceMetrics[] = [];
  private networkRequests: Map<string, any> = new Map();

  private monitoringInterval?: any;
  private isMonitoring = false;

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkMonitoring();
    this.setupPerformanceMonitoring();
  }

  /**
   * 设置网络监控
   */
  private setupNetworkMonitoring(): void {
    this.page.on('request', request => {
      this.networkRequests.set(request.url(), {
        url: request.url(),
        method: request.method(),
        startTime: Date.now(),
        resourceType: request.resourceType()
      });
    });

    this.page.on('response', response => {
      const request = this.networkRequests.get(response.url());
      if (request) {
        request.endTime = Date.now();
        request.status = response.status();
        request.responseTime = request.endTime - request.startTime;
        request.transferSize = parseInt(response.headers()['content-length'] || '0');
      }
    });

    this.page.on('requestfailed', request => {
      const requestData = this.networkRequests.get(request.url());
      if (requestData) {
        requestData.failed = true;
        requestData.error = request.failure()?.errorText;
      }
    });
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    // 监听长任务
    this.page.addInitScript(() => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // 长任务阈值50ms
              (window as any).__longTasks = (window as any).__longTasks || [];
              (window as any).__longTasks.push({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
        });
        
        try {
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // 某些浏览器可能不支持longtask
          console.warn('Long task monitoring not supported');
        }
      }
    });
  }

  /**
   * 开始监控
   */
  async startMonitoring(intervalMs: number = 5000): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.metrics = [];
    
    // 立即收集一次指标
    await this.collectMetrics();
    
    // 定期收集指标
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
  }

  /**
   * 收集系统指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.page.evaluate(() => {
        const memory = (performance as any).memory;
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        const lcp = performance.getEntriesByType('largest-contentful-paint');
        const longTasks = (window as any).__longTasks || [];

        return {
          timestamp: Date.now(),
          memory: {
            usedJSHeapSize: memory?.usedJSHeapSize || 0,
            totalJSHeapSize: memory?.totalJSHeapSize || 0,
            jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
            usedPercent: memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0
          },
          performance: {
            domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
            loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            largestContentfulPaint: lcp[lcp.length - 1]?.startTime || 0
          },
          longTasks: longTasks
        };
      });

      // 计算网络指标
      const networkMetrics = this.calculateNetworkMetrics();
      
      // 计算CPU指标
      const cpuMetrics = this.calculateCPUMetrics(metrics.longTasks);

      const resourceMetrics: ResourceMetrics = {
        timestamp: metrics.timestamp,
        memory: metrics.memory,
        performance: metrics.performance,
        network: networkMetrics,
        cpu: cpuMetrics
      };

      this.metrics.push(resourceMetrics);
    } catch (error) {
      console.warn('Failed to collect metrics:', error);
    }
  }

  /**
   * 计算网络指标
   */
  private calculateNetworkMetrics(): ResourceMetrics['network'] {
    const requests = Array.from(this.networkRequests.values());
    const completedRequests = requests.filter(r => r.endTime);
    const failedRequests = requests.filter(r => r.failed);
    
    const totalTransferSize = completedRequests.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalResponseTime = completedRequests.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    const averageResponseTime = completedRequests.length > 0 ? totalResponseTime / completedRequests.length : 0;

    return {
      requestCount: requests.length,
      responseCount: completedRequests.length,
      failedRequests: failedRequests.length,
      totalTransferSize,
      averageResponseTime
    };
  }

  /**
   * 计算CPU指标
   */
  private calculateCPUMetrics(longTasks: any[]): ResourceMetrics['cpu'] {
    const totalTaskDuration = longTasks.reduce((sum: number, task: any) => sum + task.duration, 0);
    
    return {
      taskDuration: totalTaskDuration,
      longTaskCount: longTasks.length
    };
  }

  /**
   * 获取当前指标
   */
  getCurrentMetrics(): ResourceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取最新指标
   */
  getLatestMetrics(): ResourceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 分析性能趋势
   */
  analyzePerformanceTrends(): {
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
    networkTrend: 'improving' | 'degrading' | 'stable';
  } {
    if (this.metrics.length < 3) {
      return {
        memoryTrend: 'stable',
        performanceTrend: 'stable',
        networkTrend: 'stable'
      };
    }

    const recent = this.metrics.slice(-3);
    
    // 分析内存趋势
    const memoryUsages = recent.map(m => m.memory.usedPercent);
    const memoryTrend = this.analyzeTrend(memoryUsages);
    
    // 分析性能趋势（FCP为例）
    const fcpTimes = recent.map(m => m.performance.firstContentfulPaint);
    const performanceTrend = this.analyzeTrend(fcpTimes, true); // 时间越短越好
    
    // 分析网络趋势
    const responseTimes = recent.map(m => m.network.averageResponseTime);
    const networkTrend = this.analyzeTrend(responseTimes, true); // 时间越短越好

    return {
      memoryTrend: memoryTrend === 'increasing' ? 'increasing' : memoryTrend === 'decreasing' ? 'decreasing' : 'stable',
      performanceTrend: performanceTrend === 'increasing' ? 'degrading' : performanceTrend === 'decreasing' ? 'improving' : 'stable',
      networkTrend: networkTrend === 'increasing' ? 'degrading' : networkTrend === 'decreasing' ? 'improving' : 'stable'
    };
  }

  /**
   * 分析数值趋势
   */
  private analyzeTrend(values: number[], _lowerIsBetter: boolean = false): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const threshold = Math.abs(first) * 0.1; // 10%的变化阈值
    
    if (Math.abs(last - first) < threshold) {
      return 'stable';
    }
    
    return last > first ? 'increasing' : 'decreasing';
  }

  /**
   * 检查性能阈值
   */
  checkThresholds(thresholds: PerformanceThresholds): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const latest = this.getLatestMetrics();
    
    if (!latest) {
      return { passed: false, violations: ['No metrics available'] };
    }

    // 检查内存阈值
    if (latest.memory.usedPercent > thresholds.memory.maxUsagePercent) {
      violations.push(`Memory usage ${latest.memory.usedPercent.toFixed(2)}% exceeds threshold ${thresholds.memory.maxUsagePercent}%`);
    }
    
    if (latest.memory.usedJSHeapSize > thresholds.memory.maxHeapSize) {
      violations.push(`Heap size ${(latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(thresholds.memory.maxHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // 检查性能阈值
    if (latest.performance.firstContentfulPaint > thresholds.performance.maxFirstContentfulPaint) {
      violations.push(`First Contentful Paint ${latest.performance.firstContentfulPaint.toFixed(2)}ms exceeds threshold ${thresholds.performance.maxFirstContentfulPaint}ms`);
    }
    
    if (latest.performance.domContentLoaded > thresholds.performance.maxDomContentLoaded) {
      violations.push(`DOM Content Loaded ${latest.performance.domContentLoaded.toFixed(2)}ms exceeds threshold ${thresholds.performance.maxDomContentLoaded}ms`);
    }

    // 检查网络阈值
    const failureRate = (latest.network.failedRequests / latest.network.requestCount) * 100;
    if (failureRate > thresholds.network.maxFailureRate) {
      violations.push(`Network failure rate ${failureRate.toFixed(2)}% exceeds threshold ${thresholds.network.maxFailureRate}%`);
    }
    
    if (latest.network.averageResponseTime > thresholds.network.maxAverageResponseTime) {
      violations.push(`Average response time ${latest.network.averageResponseTime.toFixed(2)}ms exceeds threshold ${thresholds.network.maxAverageResponseTime}ms`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * 生成监控报告
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No monitoring data available';
    }

    const latest = this.getLatestMetrics()!;
    const trends = this.analyzePerformanceTrends();
    
    let report = `
=== 系统资源监控报告 ===

当前指标 (${new Date(latest.timestamp).toISOString()}):

内存使用:
- 已用堆内存: ${(latest.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
- 总堆内存: ${(latest.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
- 内存使用率: ${latest.memory.usedPercent.toFixed(2)}%
- 趋势: ${trends.memoryTrend}

性能指标:
- DOM加载时间: ${latest.performance.domContentLoaded.toFixed(2)} ms
- 完全加载时间: ${latest.performance.loadComplete.toFixed(2)} ms
- 首次绘制: ${latest.performance.firstPaint.toFixed(2)} ms
- 首次内容绘制: ${latest.performance.firstContentfulPaint.toFixed(2)} ms
- 趋势: ${trends.performanceTrend}

网络指标:
- 总请求数: ${latest.network.requestCount}
- 失败请求数: ${latest.network.failedRequests}
- 失败率: ${((latest.network.failedRequests / latest.network.requestCount) * 100).toFixed(2)}%
- 平均响应时间: ${latest.network.averageResponseTime.toFixed(2)} ms
- 总传输大小: ${(latest.network.totalTransferSize / 1024).toFixed(2)} KB
- 趋势: ${trends.networkTrend}

CPU指标:
- 长任务数量: ${latest.cpu.longTaskCount}
- 长任务总时长: ${latest.cpu.taskDuration.toFixed(2)} ms

监控时长: ${this.metrics.length} 个采样点
`;

    return report;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopMonitoring();
    this.metrics = [];
    this.networkRequests.clear();
  }
}