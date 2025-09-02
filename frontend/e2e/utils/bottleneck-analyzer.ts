import { Page } from '@playwright/test';

export interface BottleneckAnalysis {
  type: 'memory' | 'network' | 'rendering' | 'javascript' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendations: string[];
  metrics: any;
}

export interface PerformanceProfile {
  timestamp: number;
  url: string;
  loadTime: number;
  renderTime: number;
  interactiveTime: number;
  resources: {
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
    other: number;
  };
  networkRequests: {
    total: number;
    slow: number;
    failed: number;
    cached: number;
  };
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

export class BottleneckAnalyzer {
  private page: Page;
  private profiles: PerformanceProfile[] = [];
  private networkTimings: Map<string, any> = new Map();

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkTracking();
  }

  /**
   * 设置网络追踪
   */
  private setupNetworkTracking(): void {
    this.page.on('request', request => {
      this.networkTimings.set(request.url(), {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        startTime: Date.now(),
        size: 0,
        cached: false
      });
    });

    this.page.on('response', response => {
      const timing = this.networkTimings.get(response.url());
      if (timing) {
        timing.endTime = Date.now();
        timing.responseTime = timing.endTime - timing.startTime;
        timing.status = response.status();
        timing.size = parseInt(response.headers()['content-length'] || '0');
        // Note: fromCache() is not available in all Playwright versions
        timing.cached = response.status() === 304 || response.headers()['cache-control']?.includes('max-age');
      }
    });
  }

  /**
   * 分析页面性能瓶颈
   */
  async analyzePageBottlenecks(url: string): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];
    
    // 收集性能数据
    const profile = await this.createPerformanceProfile(url);
    this.profiles.push(profile);

    // 分析各种瓶颈
    bottlenecks.push(...await this.analyzeNetworkBottlenecks(profile));
    bottlenecks.push(...await this.analyzeRenderingBottlenecks(profile));
    bottlenecks.push(...await this.analyzeMemoryBottlenecks(profile));
    bottlenecks.push(...await this.analyzeJavaScriptBottlenecks(profile));

    return bottlenecks;
  }

  /**
   * 创建性能档案
   */
  private async createPerformanceProfile(url: string): Promise<PerformanceProfile> {
    const startTime = Date.now();
    
    // 获取初始内存
    const initialMemory = await this.getMemoryUsage();
    
    // 导航到页面
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    
    // 获取最终内存
    const finalMemory = await this.getMemoryUsage();
    
    // 分析网络请求
    const networkAnalysis = this.analyzeNetworkRequests();
    
    // 获取性能指标
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    return {
      timestamp: startTime,
      url,
      loadTime: endTime - startTime,
      renderTime: performanceMetrics.firstContentfulPaint,
      interactiveTime: performanceMetrics.domContentLoaded,
      resources: this.analyzeResourceTypes(),
      networkRequests: networkAnalysis,
      memoryUsage: {
        initial: initialMemory,
        peak: Math.max(initialMemory, finalMemory),
        final: finalMemory
      }
    };
  }

  /**
   * 获取内存使用情况
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      return await this.page.evaluate(() => {
        const memory = (performance as any).memory;
        return memory ? memory.usedJSHeapSize : 0;
      });
    } catch {
      return 0;
    }
  }

  /**
   * 分析网络请求
   */
  private analyzeNetworkRequests(): PerformanceProfile['networkRequests'] {
    const requests = Array.from(this.networkTimings.values());
    
    return {
      total: requests.length,
      slow: requests.filter(r => r.responseTime > 2000).length,
      failed: requests.filter(r => r.status >= 400).length,
      cached: requests.filter(r => r.cached).length
    };
  }

  /**
   * 分析资源类型
   */
  private analyzeResourceTypes(): PerformanceProfile['resources'] {
    const requests = Array.from(this.networkTimings.values());
    
    return {
      scripts: requests.filter(r => r.resourceType === 'script').length,
      stylesheets: requests.filter(r => r.resourceType === 'stylesheet').length,
      images: requests.filter(r => r.resourceType === 'image').length,
      fonts: requests.filter(r => r.resourceType === 'font').length,
      other: requests.filter(r => !['script', 'stylesheet', 'image', 'font'].includes(r.resourceType)).length
    };
  }

  /**
   * 分析网络瓶颈
   */
  private async analyzeNetworkBottlenecks(profile: PerformanceProfile): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];
    const requests = Array.from(this.networkTimings.values());
    
    // 检查慢请求
    const slowRequests = requests.filter(r => r.responseTime > 3000);
    if (slowRequests.length > 0) {
      bottlenecks.push({
        type: 'network',
        severity: slowRequests.length > 5 ? 'critical' : 'high',
        description: `发现 ${slowRequests.length} 个慢网络请求`,
        impact: '页面加载时间延长，用户体验下降',
        recommendations: [
          '优化API响应时间',
          '启用HTTP/2',
          '使用CDN加速静态资源',
          '实现请求缓存策略'
        ],
        metrics: {
          slowRequestCount: slowRequests.length,
          averageSlowRequestTime: slowRequests.reduce((sum, r) => sum + r.responseTime, 0) / slowRequests.length,
          slowestRequest: Math.max(...slowRequests.map(r => r.responseTime))
        }
      });
    }

    // 检查失败请求
    const failedRequests = requests.filter(r => r.status >= 400);
    if (failedRequests.length > 0) {
      bottlenecks.push({
        type: 'network',
        severity: failedRequests.length > 3 ? 'critical' : 'medium',
        description: `发现 ${failedRequests.length} 个失败的网络请求`,
        impact: '功能异常，数据加载失败',
        recommendations: [
          '检查API端点可用性',
          '实现错误重试机制',
          '添加降级处理',
          '改善错误处理和用户提示'
        ],
        metrics: {
          failedRequestCount: failedRequests.length,
          errorCodes: [...new Set(failedRequests.map(r => r.status))]
        }
      });
    }

    // 检查大文件传输
    const largeRequests = requests.filter(r => r.size > 1024 * 1024); // 大于1MB
    if (largeRequests.length > 0) {
      bottlenecks.push({
        type: 'network',
        severity: 'medium',
        description: `发现 ${largeRequests.length} 个大文件传输`,
        impact: '带宽消耗大，加载时间长',
        recommendations: [
          '压缩大文件',
          '实现文件分块传输',
          '使用图片懒加载',
          '优化资源打包策略'
        ],
        metrics: {
          largeFileCount: largeRequests.length,
          totalSize: largeRequests.reduce((sum, r) => sum + r.size, 0),
          largestFile: Math.max(...largeRequests.map(r => r.size))
        }
      });
    }

    return bottlenecks;
  }

  /**
   * 分析渲染瓶颈
   */
  private async analyzeRenderingBottlenecks(profile: PerformanceProfile): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];

    // 检查首次内容绘制时间
    if (profile.renderTime > 3000) {
      bottlenecks.push({
        type: 'rendering',
        severity: profile.renderTime > 5000 ? 'critical' : 'high',
        description: `首次内容绘制时间过长: ${profile.renderTime.toFixed(2)}ms`,
        impact: '用户感知页面加载缓慢',
        recommendations: [
          '优化关键渲染路径',
          '减少阻塞渲染的资源',
          '使用服务端渲染或预渲染',
          '优化CSS和JavaScript加载顺序'
        ],
        metrics: {
          firstContentfulPaint: profile.renderTime,
          threshold: 3000
        }
      });
    }

    // 检查交互时间
    if (profile.interactiveTime > 5000) {
      bottlenecks.push({
        type: 'rendering',
        severity: profile.interactiveTime > 8000 ? 'critical' : 'high',
        description: `页面交互就绪时间过长: ${profile.interactiveTime.toFixed(2)}ms`,
        impact: '用户无法及时与页面交互',
        recommendations: [
          '优化JavaScript执行',
          '减少主线程阻塞',
          '实现代码分割',
          '延迟加载非关键功能'
        ],
        metrics: {
          timeToInteractive: profile.interactiveTime,
          threshold: 5000
        }
      });
    }

    return bottlenecks;
  }

  /**
   * 分析内存瓶颈
   */
  private async analyzeMemoryBottlenecks(profile: PerformanceProfile): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];
    
    const memoryIncrease = profile.memoryUsage.final - profile.memoryUsage.initial;
    const memoryIncreasePercent = (memoryIncrease / profile.memoryUsage.initial) * 100;

    // 检查内存增长
    if (memoryIncreasePercent > 100) {
      bottlenecks.push({
        type: 'memory',
        severity: memoryIncreasePercent > 200 ? 'critical' : 'high',
        description: `内存使用增长过多: ${memoryIncreasePercent.toFixed(2)}%`,
        impact: '可能导致内存泄漏和性能下降',
        recommendations: [
          '检查内存泄漏',
          '优化数据结构',
          '及时清理不用的对象',
          '使用对象池模式'
        ],
        metrics: {
          initialMemory: profile.memoryUsage.initial,
          finalMemory: profile.memoryUsage.final,
          increasePercent: memoryIncreasePercent
        }
      });
    }

    // 检查峰值内存使用
    if (profile.memoryUsage.peak > 100 * 1024 * 1024) { // 100MB
      bottlenecks.push({
        type: 'memory',
        severity: profile.memoryUsage.peak > 200 * 1024 * 1024 ? 'critical' : 'medium',
        description: `峰值内存使用过高: ${(profile.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`,
        impact: '在低内存设备上可能导致性能问题',
        recommendations: [
          '优化数据加载策略',
          '实现虚拟滚动',
          '减少同时加载的数据量',
          '使用更高效的数据结构'
        ],
        metrics: {
          peakMemory: profile.memoryUsage.peak,
          threshold: 100 * 1024 * 1024
        }
      });
    }

    return bottlenecks;
  }

  /**
   * 分析JavaScript瓶颈
   */
  private async analyzeJavaScriptBottlenecks(profile: PerformanceProfile): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];

    try {
      // 获取长任务信息
      const longTasks = await this.page.evaluate(() => {
        return (window as any).__longTasks || [];
      });

      if (longTasks.length > 0) {
        const totalLongTaskTime = longTasks.reduce((sum: number, task: any) => sum + task.duration, 0);
        
        bottlenecks.push({
          type: 'javascript',
          severity: longTasks.length > 10 ? 'critical' : 'medium',
          description: `发现 ${longTasks.length} 个长任务，总时长 ${totalLongTaskTime.toFixed(2)}ms`,
          impact: '主线程阻塞，影响用户交互响应',
          recommendations: [
            '拆分长任务为小任务',
            '使用Web Workers处理计算密集型任务',
            '实现任务调度和优先级管理',
            '优化算法复杂度'
          ],
          metrics: {
            longTaskCount: longTasks.length,
            totalDuration: totalLongTaskTime,
            averageDuration: totalLongTaskTime / longTasks.length,
            longestTask: Math.max(...longTasks.map((task: any) => task.duration))
          }
        });
      }

      // 检查脚本资源数量
      if (profile.resources.scripts > 20) {
        bottlenecks.push({
          type: 'javascript',
          severity: profile.resources.scripts > 50 ? 'high' : 'medium',
          description: `JavaScript文件数量过多: ${profile.resources.scripts}个`,
          impact: '增加网络请求数，延长加载时间',
          recommendations: [
            '合并JavaScript文件',
            '实现代码分割',
            '移除未使用的代码',
            '使用模块打包工具优化'
          ],
          metrics: {
            scriptCount: profile.resources.scripts,
            threshold: 20
          }
        });
      }
    } catch (error) {
      console.warn('Failed to analyze JavaScript bottlenecks:', error);
    }

    return bottlenecks;
  }

  /**
   * 获取所有性能档案
   */
  getPerformanceProfiles(): PerformanceProfile[] {
    return [...this.profiles];
  }

  /**
   * 生成瓶颈分析报告
   */
  generateBottleneckReport(bottlenecks: BottleneckAnalysis[]): string {
    if (bottlenecks.length === 0) {
      return '未发现明显的性能瓶颈';
    }

    let report = `
=== 性能瓶颈分析报告 ===

发现 ${bottlenecks.length} 个性能瓶颈:

`;

    // 按严重程度排序
    const sortedBottlenecks = bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    sortedBottlenecks.forEach((bottleneck, index) => {
      report += `${index + 1}. [${bottleneck.severity.toUpperCase()}] ${bottleneck.type.toUpperCase()}瓶颈
   描述: ${bottleneck.description}
   影响: ${bottleneck.impact}
   
   优化建议:
`;
      bottleneck.recommendations.forEach(rec => {
        report += `   - ${rec}\n`;
      });
      
      if (bottleneck.metrics) {
        report += `   
   相关指标: ${JSON.stringify(bottleneck.metrics, null, 2)}
`;
      }
      
      report += '\n';
    });

    return report;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.profiles = [];
    this.networkTimings.clear();
  }
}