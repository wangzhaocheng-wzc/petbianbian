/**
 * 前端性能监控工具
 */

export interface PerformanceMetrics {
  // 页面加载性能
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // 资源加载性能
  resourceLoadTimes: Array<{
    name: string;
    duration: number;
    size: number;
  }>;
  
  // 用户交互性能
  firstInputDelay: number;
  cumulativeLayoutShift: number;
}

/**
 * 获取页面加载性能指标
 */
export const getPageLoadMetrics = (): Partial<PerformanceMetrics> => {
  if (!window.performance) {
    console.warn('Performance API not supported');
    return {};
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  const metrics: Partial<PerformanceMetrics> = {
    pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
    domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,
  };

  // 获取绘制性能指标
  paint.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') {
      metrics.firstContentfulPaint = entry.startTime;
    }
  });

  return metrics;
};

/**
 * 获取资源加载性能
 */
export const getResourceMetrics = (): Array<{ name: string; duration: number; size: number }> => {
  if (!window.performance) return [];

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return resources.map((resource) => ({
    name: resource.name,
    duration: resource.responseEnd - resource.requestStart,
    size: resource.transferSize || 0,
  }));
};

/**
 * 监控最大内容绘制 (LCP)
 */
export const observeLCP = (callback: (value: number) => void): void => {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    callback(lastEntry.startTime);
  });

  observer.observe({ entryTypes: ['largest-contentful-paint'] });
};

/**
 * 监控首次输入延迟 (FID)
 */
export const observeFID = (callback: (value: number) => void): void => {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (entry.name === 'first-input') {
        const fid = entry.processingStart - entry.startTime;
        callback(fid);
      }
    });
  });

  observer.observe({ entryTypes: ['first-input'] });
};

/**
 * 监控累积布局偏移 (CLS)
 */
export const observeCLS = (callback: (value: number) => void): void => {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        callback(clsValue);
      }
    });
  });

  observer.observe({ entryTypes: ['layout-shift'] });
};

/**
 * 性能监控类
 */
export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // 页面加载完成后收集基础指标
    if (document.readyState === 'complete') {
      this.collectBasicMetrics();
    } else {
      window.addEventListener('load', () => {
        this.collectBasicMetrics();
      });
    }

    // 监控核心Web指标
    this.observeWebVitals();
  }

  private collectBasicMetrics(): void {
    this.metrics = {
      ...this.metrics,
      ...getPageLoadMetrics(),
      resourceLoadTimes: getResourceMetrics(),
    };
  }

  private observeWebVitals(): void {
    observeLCP((value) => {
      this.metrics.largestContentfulPaint = value;
    });

    observeFID((value) => {
      this.metrics.firstInputDelay = value;
    });

    observeCLS((value) => {
      this.metrics.cumulativeLayoutShift = value;
    });
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * 发送性能数据到服务器
   */
  async sendMetrics(endpoint: string): Promise<void> {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * 清理监控器
   */
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

/**
 * 测量函数执行时间
 */
export const measureExecutionTime = <T>(
  fn: () => T,
  label?: string
): T => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (label) {
    console.log(`${label} execution time: ${end - start}ms`);
  }
  
  return result;
};

/**
 * 测量异步函数执行时间
 */
export const measureAsyncExecutionTime = async <T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  if (label) {
    console.log(`${label} execution time: ${end - start}ms`);
  }
  
  return result;
};

/**
 * 内存使用监控
 */
export const getMemoryUsage = (): any => {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
};

/**
 * 网络连接信息
 */
export const getNetworkInfo = (): any => {
  if ('connection' in navigator) {
    return (navigator as any).connection;
  }
  return null;
};

/**
 * 设备信息
 */
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenResolution: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
  };
};

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();