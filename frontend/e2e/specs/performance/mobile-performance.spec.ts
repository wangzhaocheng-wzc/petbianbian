import { test, expect, devices } from '@playwright/test';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';

// 移动端性能测试套件
test.describe('移动端性能测试', () => {
  let testDataManager: TestDataManager;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    testDataManager = new TestDataManager();
    authPage = new AuthPage(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  // iOS设备性能测试
  test.describe('iOS设备性能', () => {

    test('iOS - 页面加载性能测试', async ({ page }) => {
      // 开始性能监控
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // 获取详细性能指标
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          totalLoadTime: navigation.loadEventEnd - navigation.navigationStart,
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart
        };
      });

      console.log('iOS页面加载性能指标:', performanceMetrics);
      
      // iOS设备性能要求
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000); // 3秒内首次内容绘制
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2秒内DOM加载完成
      expect(performanceMetrics.totalLoadTime).toBeLessThan(5000); // 5秒内完全加载
      
      // 检查资源加载效率
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return {
          totalResources: resources.length,
          slowResources: resources.filter(r => r.duration > 1000).length,
          averageResourceTime: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length
        };
      });

      console.log('iOS资源加载指标:', resourceMetrics);
      expect(resourceMetrics.slowResources).toBeLessThan(resourceMetrics.totalResources * 0.1); // 慢资源不超过10%
    });

    test('iOS - 交互响应性能测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      
      await authPage.goToLogin();
      
      // 测试表单输入响应时间
      const emailInput = page.locator('input[type="email"]');
      
      const inputStartTime = Date.now();
      await emailInput.tap();
      await emailInput.fill(testUser.email);
      const inputEndTime = Date.now();
      
      const inputResponseTime = inputEndTime - inputStartTime;
      console.log(`iOS表单输入响应时间: ${inputResponseTime}ms`);
      
      expect(inputResponseTime).toBeLessThan(500); // 输入响应应在500ms内
      
      // 测试按钮点击响应时间
      const loginButton = page.locator('button[type="submit"]');
      
      const clickStartTime = Date.now();
      await loginButton.tap();
      
      // 等待页面响应
      await page.waitForLoadState('networkidle');
      const clickEndTime = Date.now();
      
      const clickResponseTime = clickEndTime - clickStartTime;
      console.log(`iOS按钮点击响应时间: ${clickResponseTime}ms`);
      
      expect(clickResponseTime).toBeLessThan(3000); // 点击响应应在3秒内
    });

    test('iOS - 滚动性能测试', async ({ page }) => {
      await page.goto('/community');
      await page.waitForTimeout(2000);
      
      // 测试滚动流畅度
      const scrollContainer = page.locator('main').first();
      
      if (await scrollContainer.isVisible()) {
        const box = await scrollContainer.boundingBox();
        
        if (box) {
          const startTime = Date.now();
          
          // 执行多次滚动操作
          for (let i = 0; i < 5; i++) {
            await page.touchscreen.tap(
              box.x + box.width / 2,
              box.y + box.height * 0.8
            );
            await page.mouse.move(
              box.x + box.width / 2,
              box.y + box.height * 0.2
            );
            await page.waitForTimeout(100);
          }
          
          const endTime = Date.now();
          const scrollTime = endTime - startTime;
          
          console.log(`iOS滚动操作总时间: ${scrollTime}ms`);
          
          // 检查滚动性能
          expect(scrollTime).toBeLessThan(2000); // 5次滚动应在2秒内完成
          
          // 检查滚动后的渲染性能
          const renderMetrics = await page.evaluate(() => {
            return {
              scrollTop: document.documentElement.scrollTop,
              visibleElements: document.querySelectorAll('*').length
            };
          });
          
          console.log('iOS滚动后渲染指标:', renderMetrics);
        }
      }
    });

    test('iOS - 内存使用测试', async ({ page }) => {
      await page.goto('/');
      
      // 获取初始内存使用情况
      const initialMemory = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
          jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
        };
      });

      console.log('iOS初始内存使用:', initialMemory);
      
      // 执行一系列操作
      await page.goto('/pets');
      await page.waitForTimeout(1000);
      await page.goto('/analysis');
      await page.waitForTimeout(1000);
      await page.goto('/community');
      await page.waitForTimeout(1000);
      
      // 获取操作后内存使用情况
      const finalMemory = await page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
          jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0
        };
      });

      console.log('iOS操作后内存使用:', finalMemory);
      
      // 检查内存增长
      if (initialMemory.usedJSHeapSize > 0 && finalMemory.usedJSHeapSize > 0) {
        const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const growthPercentage = (memoryGrowth / initialMemory.usedJSHeapSize) * 100;
        
        console.log(`iOS内存增长: ${memoryGrowth} bytes (${growthPercentage.toFixed(2)}%)`);
        
        // 内存增长不应过大
        expect(growthPercentage).toBeLessThan(200); // 内存增长不超过200%
      }
    });
  });

  // Android设备性能测试
  test.describe('Android设备性能', () => {

    test('Android - 页面加载性能测试', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // 获取Android特定性能指标
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          totalLoadTime: navigation.loadEventEnd - navigation.navigationStart,
          // Android特有的网络信息
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink || 0,
          rtt: (navigator as any).connection?.rtt || 0
        };
      });

      console.log('Android页面加载性能指标:', performanceMetrics);
      
      // Android设备性能要求
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3500); // Android可能稍慢
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2500);
      expect(performanceMetrics.totalLoadTime).toBeLessThan(6000);
      
      // 检查网络连接质量影响
      if (performanceMetrics.connectionType !== 'unknown') {
        console.log(`Android网络连接类型: ${performanceMetrics.connectionType}`);
        console.log(`Android网络下行速度: ${performanceMetrics.downlink}Mbps`);
        console.log(`Android网络RTT: ${performanceMetrics.rtt}ms`);
      }
    });

    test('Android - 触摸响应性能测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试触摸响应延迟
      const touchButton = page.locator('button').first();
      
      if (await touchButton.isVisible()) {
        const touchTests = [];
        
        // 执行多次触摸测试
        for (let i = 0; i < 5; i++) {
          const startTime = performance.now();
          
          await touchButton.tap();
          await page.waitForTimeout(100);
          
          const endTime = performance.now();
          touchTests.push(endTime - startTime);
        }
        
        const averageTouchTime = touchTests.reduce((sum, time) => sum + time, 0) / touchTests.length;
        const maxTouchTime = Math.max(...touchTests);
        
        console.log(`Android平均触摸响应时间: ${averageTouchTime.toFixed(2)}ms`);
        console.log(`Android最大触摸响应时间: ${maxTouchTime.toFixed(2)}ms`);
        
        expect(averageTouchTime).toBeLessThan(200); // 平均响应时间应在200ms内
        expect(maxTouchTime).toBeLessThan(500); // 最大响应时间应在500ms内
      }
    });

    test('Android - 动画性能测试', async ({ page }) => {
      await page.goto('/');
      
      // 查找有动画的元素
      const animatedElements = page.locator('[class*="animate"], [class*="transition"], .fade, .slide');
      const elementCount = await animatedElements.count();
      
      if (elementCount > 0) {
        const animationElement = animatedElements.first();
        
        // 触发动画
        if (await animationElement.isVisible()) {
          const startTime = Date.now();
          
          await animationElement.hover();
          await page.waitForTimeout(1000); // 等待动画完成
          
          const endTime = Date.now();
          const animationTime = endTime - startTime;
          
          console.log(`Android动画执行时间: ${animationTime}ms`);
          
          // 检查动画流畅度
          const frameRate = await page.evaluate(() => {
            return new Promise((resolve) => {
              let frames = 0;
              const startTime = performance.now();
              
              function countFrames() {
                frames++;
                if (performance.now() - startTime < 1000) {
                  requestAnimationFrame(countFrames);
                } else {
                  resolve(frames);
                }
              }
              
              requestAnimationFrame(countFrames);
            });
          });
          
          console.log(`Android动画帧率: ${frameRate} FPS`);
          expect(frameRate as number).toBeGreaterThan(30); // 至少30FPS
        }
      }
    });

    test('Android - 电池和CPU优化测试', async ({ page }) => {
      await page.goto('/');
      
      // 模拟长时间使用场景
      const operations = [
        () => page.goto('/pets'),
        () => page.goto('/analysis'),
        () => page.goto('/community'),
        () => page.goto('/'),
        () => page.reload()
      ];
      
      const startTime = Date.now();
      let operationTimes = [];
      
      for (const operation of operations) {
        const opStartTime = Date.now();
        await operation();
        await page.waitForLoadState('networkidle');
        const opEndTime = Date.now();
        
        operationTimes.push(opEndTime - opStartTime);
        await page.waitForTimeout(500); // 模拟用户思考时间
      }
      
      const totalTime = Date.now() - startTime;
      const averageOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length;
      
      console.log(`Android操作序列总时间: ${totalTime}ms`);
      console.log(`Android平均操作时间: ${averageOperationTime.toFixed(2)}ms`);
      console.log('Android各操作时间:', operationTimes);
      
      // 检查性能一致性
      const maxOperationTime = Math.max(...operationTimes);
      const minOperationTime = Math.min(...operationTimes);
      const performanceVariance = maxOperationTime - minOperationTime;
      
      console.log(`Android性能方差: ${performanceVariance}ms`);
      
      // 性能应该相对稳定
      expect(performanceVariance).toBeLessThan(averageOperationTime * 2); // 方差不超过平均值的2倍
      expect(averageOperationTime).toBeLessThan(3000); // 平均操作时间不超过3秒
    });
  });

  // 跨设备性能对比测试
  test.describe('跨设备性能对比', () => {
    const testDevices = [
      { name: 'iPhone 12', device: devices['iPhone 12'] },
      { name: 'iPhone SE', device: devices['iPhone SE'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] },
      { name: 'Galaxy S21', device: devices['Galaxy S21'] }
    ];

    testDevices.forEach(({ name, device }) => {
      test(`${name} - 基准性能测试`, async ({ page, browser }) => {
        const context = await browser.newContext(device);
        const devicePage = await context.newPage();
        
        try {
          const startTime = Date.now();
          await devicePage.goto('/', { waitUntil: 'networkidle' });
          const loadTime = Date.now() - startTime;
          
          // 获取设备特定指标
          const deviceMetrics = await devicePage.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            return {
              devicePixelRatio: window.devicePixelRatio,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              userAgent: navigator.userAgent,
              loadTime: nav.loadEventEnd - nav.navigationStart,
              domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
              firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
            };
          });

          console.log(`${name} 性能指标:`, deviceMetrics);
          
          // 基本性能要求
          expect(deviceMetrics.loadTime).toBeLessThan(8000); // 8秒内加载完成
          expect(deviceMetrics.domContentLoaded).toBeLessThan(3000); // 3秒内DOM加载
          
          // 记录设备性能数据用于对比
          const performanceData = {
            device: name,
            loadTime: deviceMetrics.loadTime,
            domContentLoaded: deviceMetrics.domContentLoaded,
            firstContentfulPaint: deviceMetrics.firstContentfulPaint,
            devicePixelRatio: deviceMetrics.devicePixelRatio,
            viewport: `${deviceMetrics.viewportWidth}x${deviceMetrics.viewportHeight}`
          };
          
          console.log(`${name} 性能摘要:`, performanceData);
          
        } finally {
          await devicePage.close();
          await context.close();
        }
      });
    });
  });

  // 网络条件下的性能测试
  test.describe('不同网络条件性能', () => {

    const networkConditions = [
      { name: '4G', downloadThroughput: 4 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8, latency: 20 },
      { name: '3G', downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
      { name: 'Slow 3G', downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 }
    ];

    networkConditions.forEach(({ name, downloadThroughput, uploadThroughput, latency }) => {
      test(`${name}网络条件下的性能`, async ({ page, context }) => {
        // 设置网络条件
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, latency));
          await route.continue();
        });

        const startTime = Date.now();
        await page.goto('/', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        console.log(`${name}网络下页面加载时间: ${loadTime}ms`);

        // 根据网络条件调整性能期望
        let expectedLoadTime;
        switch (name) {
          case '4G':
            expectedLoadTime = 5000;
            break;
          case '3G':
            expectedLoadTime = 10000;
            break;
          case 'Slow 3G':
            expectedLoadTime = 20000;
            break;
          default:
            expectedLoadTime = 8000;
        }

        expect(loadTime).toBeLessThan(expectedLoadTime);

        // 测试关键功能在该网络条件下的可用性
        const navigationTest = async () => {
          const navStartTime = Date.now();
          await page.goto('/pets');
          await page.waitForLoadState('networkidle');
          const navEndTime = Date.now();
          return navEndTime - navStartTime;
        };

        const navigationTime = await navigationTest();
        console.log(`${name}网络下页面导航时间: ${navigationTime}ms`);

        // 导航时间应该在合理范围内
        expect(navigationTime).toBeLessThan(expectedLoadTime * 0.8);
      });
    });
  });
});