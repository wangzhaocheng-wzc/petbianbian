import { test, expect } from '@playwright/test';

/**
 * 最小化交互性能测试
 * 用于验证测试框架和基础功能
 */

// 性能基准阈值
const PERFORMANCE_THRESHOLDS = {
  clickResponse: 500, // 点击响应时间 (ms)
  pageNavigation: 1000, // 页面导航时间 (ms)
};

class SimplePerformanceMonitor {
  /**
   * 测量操作执行时间
   */
  static async measureOperation(operation: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await operation();
    const endTime = Date.now();
    return endTime - startTime;
  }
}

test.describe('最小化交互性能测试', () => {
  test('页面导航性能测试', async ({ page }) => {
    // 测试页面导航时间
    const navigationTime = await SimplePerformanceMonitor.measureOperation(async () => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
    });
    
    console.log(`页面导航时间: ${navigationTime}ms`);
    expect(navigationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageNavigation);
  });

  test('基础交互响应时间测试', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 检查是否存在可见的按钮
    const visibleButtonCount = await page.locator('button:visible').count();
    if (visibleButtonCount === 0) {
      console.log('没有找到可点击的按钮，跳过点击测试');
      return; // 无按钮时跳过性能断言
    }
    const visibleButton = page.locator('button:visible').first();
    
    // 测试点击响应时间
    const clickTime = await SimplePerformanceMonitor.measureOperation(async () => {
      await visibleButton.click();
    });
    
    console.log(`点击响应时间: ${clickTime}ms`);
    
    // 有实际可点击按钮时，验证响应时间
    expect(clickTime).toBeLessThan(PERFORMANCE_THRESHOLDS.clickResponse);
  });

  test('内存使用基础测试', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // 获取内存使用情况
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (memoryUsage) {
      const usedMB = (memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2);
      
      console.log(`内存使用: ${usedMB}MB / ${totalMB}MB`);
      
      // 基础内存使用不应超过100MB
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    } else {
      console.log('浏览器不支持内存监控');
    }
  });

  test('网络请求监控测试', async ({ page }) => {
    const requests: any[] = [];
    
    // 监控网络请求
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
    
    page.on('response', (response) => {
      const request = requests.find(req => req.url === response.url());
      if (request) {
        request.responseTime = Date.now() - request.timestamp;
        request.status = response.status();
      }
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // 分析网络请求
    const completedRequests = requests.filter(req => req.responseTime);
    const totalRequests = requests.length;
    const averageResponseTime = completedRequests.length > 0 
      ? completedRequests.reduce((sum, req) => sum + req.responseTime, 0) / completedRequests.length 
      : 0;
    
    console.log(`网络请求统计:`);
    console.log(`- 总请求数: ${totalRequests}`);
    console.log(`- 完成请求数: ${completedRequests.length}`);
    console.log(`- 平均响应时间: ${averageResponseTime.toFixed(2)}ms`);
    
    // 基础验证
    expect(totalRequests).toBeGreaterThan(0);
    if (averageResponseTime > 0) {
      expect(averageResponseTime).toBeLessThan(2000); // 平均响应时间不超过2秒
    }
  });
});