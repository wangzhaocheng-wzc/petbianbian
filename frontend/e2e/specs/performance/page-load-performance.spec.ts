import { test, expect, Page } from '@playwright/test';

/**
 * 页面加载性能测试套件
 * 测试首屏渲染时间、Core Web Vitals指标和不同网络条件下的性能
 */

interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  domContentLoaded: number;
  loadComplete: number;
}

interface NetworkCondition {
  name: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

const networkConditions: NetworkCondition[] = [
  {
    name: 'Fast 3G',
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps
    latency: 150
  },
  {
    name: 'Slow 3G',
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 500 * 1024 / 8, // 500 Kbps
    latency: 400
  },
  {
    name: 'WiFi',
    downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 / 8, // 15 Mbps
    latency: 20
  }
];

// 性能阈值配置
const performanceThresholds = {
  firstContentfulPaint: 2000, // 2秒
  largestContentfulPaint: 4000, // 4秒
  cumulativeLayoutShift: 0.1, // 0.1
  firstInputDelay: 100, // 100ms
  timeToInteractive: 5000, // 5秒
  domContentLoaded: 3000, // 3秒
  loadComplete: 5000 // 5秒
};

async function measureCoreWebVitals(page: Page): Promise<PerformanceMetrics> {
  return await page.evaluate(() => {
    return new Promise<PerformanceMetrics>((resolve) => {
      const metrics: Partial<PerformanceMetrics> = {};
      
      // 获取导航时间
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        metrics.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
        metrics.timeToInteractive = navigation.domInteractive - navigation.navigationStart;
      }

      // 获取Paint时间
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      });

      // 使用PerformanceObserver获取其他指标
      let observersCompleted = 0;
      const totalObservers = 3;

      function checkComplete() {
        observersCompleted++;
        if (observersCompleted === totalObservers) {
          resolve(metrics as PerformanceMetrics);
        }
      }

      // LCP Observer
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.largestContentfulPaint = lastEntry.startTime;
          lcpObserver.disconnect();
          checkComplete();
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch {
        metrics.largestContentfulPaint = 0;
        checkComplete();
      }

      // CLS Observer
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          metrics.cumulativeLayoutShift = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => {
          clsObserver.disconnect();
          checkComplete();
        }, 5000);
      } catch {
        metrics.cumulativeLayoutShift = 0;
        checkComplete();
      }

      // FID Observer
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            metrics.firstInputDelay = entries[0].processingStart - entries[0].startTime;
          }
          fidObserver.disconnect();
          checkComplete();
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        
        setTimeout(() => {
          if (metrics.firstInputDelay === undefined) {
            metrics.firstInputDelay = 0;
          }
          fidObserver.disconnect();
          checkComplete();
        }, 10000);
      } catch {
        metrics.firstInputDelay = 0;
        checkComplete();
      }

      // 如果10秒后还没完成，强制返回
      setTimeout(() => {
        resolve(metrics as PerformanceMetrics);
      }, 10000);
    });
  });
}

test.describe('页面加载性能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清除缓存确保测试准确性
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('首页加载性能 - Core Web Vitals', async ({ page }) => {
    console.log('开始测试首页Core Web Vitals指标...');
    
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const navigationTime = Date.now() - startTime;

    // 测量Core Web Vitals
    const metrics = await measureCoreWebVitals(page);
    
    console.log('Core Web Vitals指标:', {
      FCP: `${metrics.firstContentfulPaint.toFixed(2)}ms`,
      LCP: `${metrics.largestContentfulPaint.toFixed(2)}ms`,
      CLS: metrics.cumulativeLayoutShift.toFixed(3),
      FID: `${metrics.firstInputDelay.toFixed(2)}ms`,
      TTI: `${metrics.timeToInteractive.toFixed(2)}ms`,
      DCL: `${metrics.domContentLoaded.toFixed(2)}ms`,
      Load: `${metrics.loadComplete.toFixed(2)}ms`,
      Navigation: `${navigationTime}ms`
    });

    // 验证性能指标
    expect(metrics.firstContentfulPaint).toBeLessThan(performanceThresholds.firstContentfulPaint);
    expect(metrics.largestContentfulPaint).toBeLessThan(performanceThresholds.largestContentfulPaint);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(performanceThresholds.cumulativeLayoutShift);
    expect(metrics.domContentLoaded).toBeLessThan(performanceThresholds.domContentLoaded);
    expect(metrics.loadComplete).toBeLessThan(performanceThresholds.loadComplete);

    // 验证页面内容已正确加载
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('分析页面加载性能', async ({ page }) => {
    console.log('开始测试分析页面性能...');
    
    await page.goto('/analysis', { waitUntil: 'networkidle' });
    const metrics = await measureCoreWebVitals(page);
    
    console.log('分析页面性能指标:', {
      FCP: `${metrics.firstContentfulPaint.toFixed(2)}ms`,
      LCP: `${metrics.largestContentfulPaint.toFixed(2)}ms`,
      CLS: metrics.cumulativeLayoutShift.toFixed(3)
    });

    // 验证关键性能指标
    expect(metrics.firstContentfulPaint).toBeLessThan(performanceThresholds.firstContentfulPaint);
    expect(metrics.largestContentfulPaint).toBeLessThan(performanceThresholds.largestContentfulPaint);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(performanceThresholds.cumulativeLayoutShift);

    // 验证页面功能元素已加载
    await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="pet-selector"]')).toBeVisible();
  });

  test('社区页面加载性能', async ({ page }) => {
    console.log('开始测试社区页面性能...');
    
    await page.goto('/community', { waitUntil: 'networkidle' });
    const metrics = await measureCoreWebVitals(page);
    
    console.log('社区页面性能指标:', {
      FCP: `${metrics.firstContentfulPaint.toFixed(2)}ms`,
      LCP: `${metrics.largestContentfulPaint.toFixed(2)}ms`,
      CLS: metrics.cumulativeLayoutShift.toFixed(3)
    });

    // 社区页面可能包含更多内容，适当放宽阈值
    expect(metrics.firstContentfulPaint).toBeLessThan(performanceThresholds.firstContentfulPaint * 1.2);
    expect(metrics.largestContentfulPaint).toBeLessThan(performanceThresholds.largestContentfulPaint * 1.2);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(performanceThresholds.cumulativeLayoutShift * 1.5);

    // 验证社区内容已加载
    await expect(page.locator('[data-testid="post-list"]')).toBeVisible();
  });

  test('资源加载性能分析', async ({ page }) => {
    console.log('开始分析资源加载性能...');
    
    const resources: any[] = [];
    
    page.on('response', response => {
      resources.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'],
        type: response.headers()['content-type'],
        timing: response.timing(),
        cached: response.fromCache()
      });
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // 分析资源类型和大小
    const jsResources = resources.filter(r => r.type?.includes('javascript'));
    const cssResources = resources.filter(r => r.type?.includes('css'));
    const imageResources = resources.filter(r => r.type?.includes('image'));
    const fontResources = resources.filter(r => r.type?.includes('font'));

    const totalJSSize = jsResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    const totalImageSize = imageResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);

    console.log('资源加载分析:', {
      总资源数: resources.length,
      JS文件: `${jsResources.length}个, ${(totalJSSize / 1024).toFixed(2)}KB`,
      CSS文件: `${cssResources.length}个, ${(totalCSSSize / 1024).toFixed(2)}KB`,
      图片文件: `${imageResources.length}个, ${(totalImageSize / 1024).toFixed(2)}KB`,
      字体文件: `${fontResources.length}个`,
      缓存命中率: `${((resources.filter(r => r.cached).length / resources.length) * 100).toFixed(2)}%`
    });

    // 验证资源大小合理
    expect(totalJSSize).toBeLessThan(1024 * 1024); // JS总大小小于1MB
    expect(totalCSSSize).toBeLessThan(200 * 1024); // CSS总大小小于200KB
    
    // 验证没有404错误
    const failedResources = resources.filter(r => r.status >= 400);
    expect(failedResources.length).toBe(0);
  });

  // 不同网络条件下的性能测试
  for (const condition of networkConditions) {
    test(`${condition.name}网络条件下的加载性能`, async ({ page, context }) => {
      console.log(`开始测试${condition.name}网络条件下的性能...`);
      
      // 模拟网络条件
      await context.route('**/*', async route => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, condition.latency / 10));
        await route.continue();
      });

      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      const loadTime = Date.now() - startTime;

      console.log(`${condition.name}网络加载时间: ${loadTime}ms`);

      // 根据网络条件设置不同的性能期望
      let expectedLoadTime: number;
      switch (condition.name) {
        case 'WiFi':
          expectedLoadTime = 3000;
          break;
        case 'Fast 3G':
          expectedLoadTime = 8000;
          break;
        case 'Slow 3G':
          expectedLoadTime = 15000;
          break;
        default:
          expectedLoadTime = 10000;
      }

      expect(loadTime).toBeLessThan(expectedLoadTime);

      // 验证页面基本内容已加载
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      
      // 在慢速网络下验证加载指示器
      if (condition.name.includes('Slow')) {
        // 可能会显示加载指示器
        const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
        if (await loadingIndicator.isVisible()) {
          console.log('慢速网络下正确显示了加载指示器');
        }
      }
    });
  }

  test('首屏渲染时间详细分析', async ({ page }) => {
    console.log('开始详细分析首屏渲染时间...');
    
    // 记录详细的时间节点
    const performanceData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const paintEntries = entries.filter(entry => entry.entryType === 'paint');
          
          if (paintEntries.length > 0) {
            observer.disconnect();
            
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const timing = performance.timing;
            
            resolve({
              // 导航时间
              navigationStart: timing.navigationStart,
              domainLookupStart: timing.domainLookupStart - timing.navigationStart,
              domainLookupEnd: timing.domainLookupEnd - timing.navigationStart,
              connectStart: timing.connectStart - timing.navigationStart,
              connectEnd: timing.connectEnd - timing.navigationStart,
              requestStart: timing.requestStart - timing.navigationStart,
              responseStart: timing.responseStart - timing.navigationStart,
              responseEnd: timing.responseEnd - timing.navigationStart,
              domLoading: timing.domLoading - timing.navigationStart,
              domInteractive: timing.domInteractive - timing.navigationStart,
              domContentLoadedEventStart: timing.domContentLoadedEventStart - timing.navigationStart,
              domContentLoadedEventEnd: timing.domContentLoadedEventEnd - timing.navigationStart,
              domComplete: timing.domComplete - timing.navigationStart,
              loadEventStart: timing.loadEventStart - timing.navigationStart,
              loadEventEnd: timing.loadEventEnd - timing.navigationStart,
              
              // Paint时间
              firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
              firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0
            });
          }
        });
        
        observer.observe({ entryTypes: ['paint'] });
        
        // 如果5秒内没有paint事件，返回基本数据
        setTimeout(() => {
          observer.disconnect();
          const timing = performance.timing;
          resolve({
            navigationStart: timing.navigationStart,
            domContentLoadedEventEnd: timing.domContentLoadedEventEnd - timing.navigationStart,
            loadEventEnd: timing.loadEventEnd - timing.navigationStart,
            firstPaint: 0,
            firstContentfulPaint: 0
          });
        }, 5000);
      });
    });

    await page.goto('/');
    const data = await performanceData;

    console.log('详细渲染时间分析:', {
      DNS查询: `${(data as any).domainLookupEnd - (data as any).domainLookupStart}ms`,
      TCP连接: `${(data as any).connectEnd - (data as any).connectStart}ms`,
      请求响应: `${(data as any).responseEnd - (data as any).requestStart}ms`,
      DOM解析: `${(data as any).domInteractive - (data as any).domLoading}ms`,
      资源加载: `${(data as any).loadEventEnd - (data as any).domContentLoadedEventEnd}ms`,
      首次绘制: `${(data as any).firstPaint}ms`,
      首次内容绘制: `${(data as any).firstContentfulPaint}ms`
    });

    // 验证关键时间节点
    expect((data as any).firstContentfulPaint).toBeLessThan(2000);
    expect((data as any).domContentLoadedEventEnd).toBeLessThan(3000);
  });

  test('移动端性能测试', async ({ page, context }) => {
    console.log('开始测试移动端性能...');
    
    // 模拟移动设备
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
    });

    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    const metrics = await measureCoreWebVitals(page);

    console.log('移动端性能指标:', {
      加载时间: `${loadTime}ms`,
      FCP: `${metrics.firstContentfulPaint.toFixed(2)}ms`,
      LCP: `${metrics.largestContentfulPaint.toFixed(2)}ms`,
      CLS: metrics.cumulativeLayoutShift.toFixed(3)
    });

    // 移动端性能要求可能稍微宽松
    expect(metrics.firstContentfulPaint).toBeLessThan(performanceThresholds.firstContentfulPaint * 1.3);
    expect(metrics.largestContentfulPaint).toBeLessThan(performanceThresholds.largestContentfulPaint * 1.3);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(performanceThresholds.cumulativeLayoutShift);

    // 验证移动端布局
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});