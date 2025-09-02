import { test, expect } from '@playwright/test';

test.describe('性能测试', () => {
  test('页面加载性能', async ({ page }) => {
    // 开始性能监控
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 测量首页加载时间
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });
    
    // 验证性能指标
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // DOM加载时间小于2秒
    expect(performanceMetrics.loadComplete).toBeLessThan(3000); // 完整加载时间小于3秒
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500); // FCP小于1.5秒
    
    console.log('性能指标:', performanceMetrics);
  });

  test('图片加载性能', async ({ page }) => {
    // 导航到包含大量图片的页面
    await page.goto('/community');
    
    // 等待图片加载
    await page.waitForLoadState('networkidle');
    
    // 检查图片加载时间
    const imageMetrics = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const imageLoadTimes = images.map(img => {
        const src = img.src;
        const resourceTiming = performance.getEntriesByName(src)[0] as PerformanceResourceTiming;
        return resourceTiming ? resourceTiming.responseEnd - resourceTiming.requestStart : 0;
      }).filter(time => time > 0);
      
      return {
        totalImages: images.length,
        averageLoadTime: imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length,
        maxLoadTime: Math.max(...imageLoadTimes),
      };
    });
    
    // 验证图片加载性能
    expect(imageMetrics.averageLoadTime).toBeLessThan(1000); // 平均加载时间小于1秒
    expect(imageMetrics.maxLoadTime).toBeLessThan(3000); // 最大加载时间小于3秒
    
    console.log('图片加载指标:', imageMetrics);
  });

  test('API响应性能', async ({ page }) => {
    // 监控API请求
    const apiRequests: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing(),
        });
      }
    });
    
    // 登录并导航到数据密集页面
    await page.goto('/');
    await page.click('text=登录');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(/.*dashboard/);
    await page.click('[data-testid="records-nav"]');
    await page.waitForLoadState('networkidle');
    
    // 分析API性能
    const apiPerformance = apiRequests.map(req => ({
      url: req.url,
      responseTime: req.timing?.responseEnd - req.timing?.requestStart || 0,
      status: req.status,
    }));
    
    // 验证API响应时间
    const averageResponseTime = apiPerformance.reduce((sum, req) => sum + req.responseTime, 0) / apiPerformance.length;
    expect(averageResponseTime).toBeLessThan(1000); // 平均响应时间小于1秒
    
    // 验证所有API请求都成功
    const failedRequests = apiPerformance.filter(req => req.status >= 400);
    expect(failedRequests.length).toBe(0);
    
    console.log('API性能指标:', { averageResponseTime, totalRequests: apiPerformance.length });
  });

  test('内存使用监控', async ({ page }) => {
    // 导航到应用
    await page.goto('/');
    
    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null;
    });
    
    if (initialMemory) {
      // 执行一些操作
      await page.click('text=登录');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      
      // 导航到不同页面
      await page.click('[data-testid="community-nav"]');
      await page.waitForLoadState('networkidle');
      
      await page.click('[data-testid="analysis-nav"]');
      await page.waitForLoadState('networkidle');
      
      // 获取操作后内存使用
      const finalMemory = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      });
      
      // 计算内存增长
      const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      // 验证内存使用合理
      expect(memoryGrowthMB).toBeLessThan(50); // 内存增长小于50MB
      expect(finalMemory.usedJSHeapSize / finalMemory.jsHeapSizeLimit).toBeLessThan(0.8); // 使用内存小于限制的80%
      
      console.log('内存使用:', {
        initial: `${(initialMemory.usedJSHeapSize / (1024 * 1024)).toFixed(2)}MB`,
        final: `${(finalMemory.usedJSHeapSize / (1024 * 1024)).toFixed(2)}MB`,
        growth: `${memoryGrowthMB.toFixed(2)}MB`,
      });
    }
  });

  test('大数据量处理性能', async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.click('text=登录');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // 导航到记录页面
    await page.click('[data-testid="records-nav"]');
    
    // 测量大量数据加载时间
    const startTime = Date.now();
    
    // 加载大量记录
    await page.selectOption('[data-testid="records-per-page"]', '100');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 验证加载时间合理
    expect(loadTime).toBeLessThan(5000); // 大数据量加载时间小于5秒
    
    // 测试滚动性能
    const scrollStartTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(100);
    }
    
    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(2000); // 滚动响应时间合理
    
    console.log('大数据量性能:', { loadTime, scrollTime });
  });

  test('网络条件模拟', async ({ page, context }) => {
    // 模拟慢速网络
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 添加100ms延迟
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // 验证在慢速网络下的表现
    expect(loadTime).toBeLessThan(10000); // 慢速网络下10秒内加载完成
    
    // 验证加载状态显示
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
  });

  test('并发用户模拟', async ({ browser }) => {
    // 创建多个页面模拟并发用户
    const pages = await Promise.all(
      Array.from({ length: 5 }, () => browser.newPage())
    );
    
    const startTime = Date.now();
    
    // 所有页面同时访问应用
    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto('/');
        await page.click('text=登录');
        await page.fill('[data-testid="email-input"]', `test${index}@example.com`);
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-submit"]');
        return page.waitForURL(/.*dashboard/);
      })
    );
    
    const totalTime = Date.now() - startTime;
    
    // 验证并发性能
    expect(totalTime).toBeLessThan(15000); // 5个并发用户15秒内完成登录
    
    // 清理
    await Promise.all(pages.map(page => page.close()));
    
    console.log('并发测试:', { users: 5, totalTime });
  });

  test('资源加载优化验证', async ({ page }) => {
    // 监控资源加载
    const resources: any[] = [];
    
    page.on('response', response => {
      resources.push({
        url: response.url(),
        size: response.headers()['content-length'],
        type: response.headers()['content-type'],
        cached: response.fromCache(),
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 分析资源加载
    const jsResources = resources.filter(r => r.type?.includes('javascript'));
    const cssResources = resources.filter(r => r.type?.includes('css'));
    const imageResources = resources.filter(r => r.type?.includes('image'));
    
    // 验证资源优化
    const totalJSSize = jsResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    
    expect(totalJSSize).toBeLessThan(1024 * 1024); // JS总大小小于1MB
    expect(totalCSSSize).toBeLessThan(200 * 1024); // CSS总大小小于200KB
    
    // 验证缓存策略
    const cachedResources = resources.filter(r => r.cached);
    const cacheHitRate = cachedResources.length / resources.length;
    
    console.log('资源加载分析:', {
      totalResources: resources.length,
      jsSize: `${(totalJSSize / 1024).toFixed(2)}KB`,
      cssSize: `${(totalCSSSize / 1024).toFixed(2)}KB`,
      cacheHitRate: `${(cacheHitRate * 100).toFixed(2)}%`,
    });
  });
});