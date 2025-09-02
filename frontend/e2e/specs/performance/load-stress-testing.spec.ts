import { test, expect, Page, Browser } from '@playwright/test';
import { TestDataManager } from '../../utils/test-data-manager';
import { PerformanceUtils } from '../../utils/performance-utils';

test.describe('负载和压力测试', () => {
  let testDataManager: TestDataManager;
  let performanceUtils: PerformanceUtils;

  test.beforeAll(async () => {
    testDataManager = new TestDataManager();
    performanceUtils = new PerformanceUtils();
  });

  test.afterAll(async () => {
    await testDataManager.cleanup();
  });

  test.describe('并发用户访问测试', () => {
    test('多用户同时登录测试', async ({ browser }) => {
      const concurrentUsers = 5;
      const loginPromises: Promise<void>[] = [];
      const performanceMetrics: any[] = [];

      // 创建多个测试用户
      const testUsers = await Promise.all(
        Array.from({ length: concurrentUsers }, () => testDataManager.createTestUser())
      );

      // 并发登录测试
      for (let i = 0; i < concurrentUsers; i++) {
        const promise = (async () => {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          const startTime = Date.now();
          
          try {
            // 导航到登录页面
            await page.goto('/login');
            
            // 填写登录表单
            await page.fill('[data-testid="email-input"]', testUsers[i].email);
            await page.fill('[data-testid="password-input"]', testUsers[i].password);
            
            // 点击登录按钮
            await page.click('[data-testid="login-button"]');
            
            // 等待登录成功
            await page.waitForURL('/dashboard', { timeout: 10000 });
            
            const endTime = Date.now();
            const loginTime = endTime - startTime;
            
            performanceMetrics.push({
              userId: i,
              loginTime,
              success: true
            });
            
            console.log(`用户 ${i} 登录成功，耗时: ${loginTime}ms`);
            
          } catch (error) {
            const endTime = Date.now();
            const loginTime = endTime - startTime;
            
            performanceMetrics.push({
              userId: i,
              loginTime,
              success: false,
              error: error.message
            });
            
            console.error(`用户 ${i} 登录失败:`, error.message);
          } finally {
            await context.close();
          }
        })();
        
        loginPromises.push(promise);
      }

      // 等待所有登录完成
      await Promise.all(loginPromises);

      // 验证性能指标
      const successfulLogins = performanceMetrics.filter(m => m.success);
      const averageLoginTime = successfulLogins.reduce((sum, m) => sum + m.loginTime, 0) / successfulLogins.length;
      const maxLoginTime = Math.max(...successfulLogins.map(m => m.loginTime));
      
      console.log(`并发登录测试结果:`);
      console.log(`- 成功登录: ${successfulLogins.length}/${concurrentUsers}`);
      console.log(`- 平均登录时间: ${averageLoginTime.toFixed(2)}ms`);
      console.log(`- 最大登录时间: ${maxLoginTime}ms`);

      // 断言性能要求
      expect(successfulLogins.length).toBeGreaterThanOrEqual(concurrentUsers * 0.8); // 至少80%成功
      expect(averageLoginTime).toBeLessThan(5000); // 平均登录时间小于5秒
      expect(maxLoginTime).toBeLessThan(10000); // 最大登录时间小于10秒
    });

    test('多用户同时上传分析测试', async ({ browser }) => {
      const concurrentUsers = 3;
      const uploadPromises: Promise<void>[] = [];
      const performanceMetrics: any[] = [];

      // 创建测试用户和宠物
      const testUsers = await Promise.all(
        Array.from({ length: concurrentUsers }, async () => {
          const user = await testDataManager.createTestUser();
          const pet = await testDataManager.createTestPet(user.id);
          return { user, pet };
        })
      );

      // 并发上传分析测试
      for (let i = 0; i < concurrentUsers; i++) {
        const promise = (async () => {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          const startTime = Date.now();
          
          try {
            // 登录用户
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', testUsers[i].user.email);
            await page.fill('[data-testid="password-input"]', testUsers[i].user.password);
            await page.click('[data-testid="login-button"]');
            await page.waitForURL('/dashboard');

            // 导航到分析页面
            await page.goto('/analysis');
            
            // 上传图片
            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles('frontend/e2e/fixtures/images/test-poop.jpg');
            
            // 选择宠物
            await page.selectOption('[data-testid="pet-select"]', testUsers[i].pet.id);
            
            // 开始分析
            await page.click('[data-testid="analyze-button"]');
            
            // 等待分析完成
            await page.waitForSelector('[data-testid="analysis-result"]', { timeout: 30000 });
            
            const endTime = Date.now();
            const analysisTime = endTime - startTime;
            
            performanceMetrics.push({
              userId: i,
              analysisTime,
              success: true
            });
            
            console.log(`用户 ${i} 分析完成，耗时: ${analysisTime}ms`);
            
          } catch (error) {
            const endTime = Date.now();
            const analysisTime = endTime - startTime;
            
            performanceMetrics.push({
              userId: i,
              analysisTime,
              success: false,
              error: error.message
            });
            
            console.error(`用户 ${i} 分析失败:`, error.message);
          } finally {
            await context.close();
          }
        })();
        
        uploadPromises.push(promise);
      }

      // 等待所有分析完成
      await Promise.all(uploadPromises);

      // 验证性能指标
      const successfulAnalyses = performanceMetrics.filter(m => m.success);
      const averageAnalysisTime = successfulAnalyses.reduce((sum, m) => sum + m.analysisTime, 0) / successfulAnalyses.length;
      
      console.log(`并发分析测试结果:`);
      console.log(`- 成功分析: ${successfulAnalyses.length}/${concurrentUsers}`);
      console.log(`- 平均分析时间: ${averageAnalysisTime.toFixed(2)}ms`);

      // 断言性能要求
      expect(successfulAnalyses.length).toBeGreaterThanOrEqual(concurrentUsers * 0.7); // 至少70%成功
      expect(averageAnalysisTime).toBeLessThan(30000); // 平均分析时间小于30秒
    });

    test('多用户同时浏览社区测试', async ({ browser }) => {
      const concurrentUsers = 8;
      const browsingPromises: Promise<void>[] = [];
      const performanceMetrics: any[] = [];

      // 创建测试用户
      const testUsers = await Promise.all(
        Array.from({ length: concurrentUsers }, () => testDataManager.createTestUser())
      );

      // 并发浏览测试
      for (let i = 0; i < concurrentUsers; i++) {
        const promise = (async () => {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          const startTime = Date.now();
          
          try {
            // 登录用户
            await page.goto('/login');
            await page.fill('[data-testid="email-input"]', testUsers[i].email);
            await page.fill('[data-testid="password-input"]', testUsers[i].password);
            await page.click('[data-testid="login-button"]');
            await page.waitForURL('/dashboard');

            // 浏览社区页面
            await page.goto('/community');
            await page.waitForSelector('[data-testid="post-list"]');
            
            // 模拟用户浏览行为
            await page.scroll({ x: 0, y: 500 });
            await page.waitForTimeout(1000);
            
            // 点击第一个帖子
            const firstPost = page.locator('[data-testid="post-item"]').first();
            if (await firstPost.count() > 0) {
              await firstPost.click();
              await page.waitForSelector('[data-testid="post-detail"]');
              await page.waitForTimeout(2000);
              await page.goBack();
            }
            
            const endTime = Date.now();
            const browsingTime = endTime - startTime;
            
            performanceMetrics.push({
              userId: i,
              browsingTime,
              success: true
            });
            
            console.log(`用户 ${i} 浏览完成，耗时: ${browsingTime}ms`);
            
          } catch (error) {
            const endTime = Date.now();
            const browsingTime = endTime - startTime;
            
            performanceMetrics.push({
              userId: i,
              browsingTime,
              success: false,
              error: error.message
            });
            
            console.error(`用户 ${i} 浏览失败:`, error.message);
          } finally {
            await context.close();
          }
        })();
        
        browsingPromises.push(promise);
      }

      // 等待所有浏览完成
      await Promise.all(browsingPromises);

      // 验证性能指标
      const successfulBrowsing = performanceMetrics.filter(m => m.success);
      const averageBrowsingTime = successfulBrowsing.reduce((sum, m) => sum + m.browsingTime, 0) / successfulBrowsing.length;
      
      console.log(`并发浏览测试结果:`);
      console.log(`- 成功浏览: ${successfulBrowsing.length}/${concurrentUsers}`);
      console.log(`- 平均浏览时间: ${averageBrowsingTime.toFixed(2)}ms`);

      // 断言性能要求
      expect(successfulBrowsing.length).toBeGreaterThanOrEqual(concurrentUsers * 0.9); // 至少90%成功
      expect(averageBrowsingTime).toBeLessThan(15000); // 平均浏览时间小于15秒
    });
  });

  test.describe('系统资源使用监控测试', () => {
    test('内存使用监控测试', async ({ page }) => {
      const memoryMetrics: any[] = [];
      
      // 监控内存使用
      const monitorMemory = async () => {
        const metrics = await page.evaluate(() => {
          return {
            usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
            totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
            jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0,
            timestamp: Date.now()
          };
        });
        memoryMetrics.push(metrics);
      };

      // 登录并导航到各个页面
      await page.goto('/login');
      await monitorMemory();
      
      // 模拟用户操作
      const testUser = await testDataManager.createTestUser();
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      await monitorMemory();

      // 访问不同页面并监控内存
      const pages = ['/analysis', '/records', '/community', '/profile'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // 等待页面稳定
        await monitorMemory();
      }

      // 分析内存使用趋势
      const initialMemory = memoryMetrics[0].usedJSHeapSize;
      const finalMemory = memoryMetrics[memoryMetrics.length - 1].usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      console.log('内存使用监控结果:');
      console.log(`- 初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- 最终内存: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- 内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);

      // 断言内存使用合理
      expect(memoryIncreasePercent).toBeLessThan(200); // 内存增长不超过200%
      expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // 最终内存不超过100MB
    });

    test('网络请求监控测试', async ({ page }) => {
      const networkRequests: any[] = [];
      
      // 监听网络请求
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now(),
          type: 'request'
        });
      });

      page.on('response', response => {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now(),
          type: 'response'
        });
      });

      // 执行用户操作
      const testUser = await testDataManager.createTestUser();
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // 访问各个页面
      await page.goto('/analysis');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/community');
      await page.waitForLoadState('networkidle');

      // 分析网络请求
      const requests = networkRequests.filter(r => r.type === 'request');
      const responses = networkRequests.filter(r => r.type === 'response');
      const apiRequests = requests.filter(r => r.url.includes('/api/'));
      const failedResponses = responses.filter(r => r.status >= 400);

      console.log('网络请求监控结果:');
      console.log(`- 总请求数: ${requests.length}`);
      console.log(`- API请求数: ${apiRequests.length}`);
      console.log(`- 失败响应数: ${failedResponses.length}`);

      // 断言网络请求合理
      expect(failedResponses.length).toBeLessThan(requests.length * 0.1); // 失败率小于10%
      expect(apiRequests.length).toBeGreaterThan(0); // 至少有API请求
    });

    test('页面性能指标监控测试', async ({ page }) => {
      const performanceMetrics: any[] = [];
      
      // 监控页面性能
      const monitorPerformance = async (pageName: string) => {
        const metrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByType('paint');
          
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            timestamp: Date.now()
          };
        });
        
        performanceMetrics.push({
          page: pageName,
          ...metrics
        });
      };

      // 测试各个页面的性能
      const testUser = await testDataManager.createTestUser();
      
      // 登录页面
      await page.goto('/login');
      await monitorPerformance('login');
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      await monitorPerformance('dashboard');

      // 其他页面
      const pages = [
        { path: '/analysis', name: 'analysis' },
        { path: '/records', name: 'records' },
        { path: '/community', name: 'community' }
      ];

      for (const { path, name } of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await monitorPerformance(name);
      }

      // 分析性能指标
      console.log('页面性能监控结果:');
      performanceMetrics.forEach(metric => {
        console.log(`${metric.page}页面:`);
        console.log(`  - DOM加载时间: ${metric.domContentLoaded.toFixed(2)}ms`);
        console.log(`  - 完全加载时间: ${metric.loadComplete.toFixed(2)}ms`);
        console.log(`  - 首次绘制: ${metric.firstPaint.toFixed(2)}ms`);
        console.log(`  - 首次内容绘制: ${metric.firstContentfulPaint.toFixed(2)}ms`);
      });

      // 断言性能要求
      performanceMetrics.forEach(metric => {
        expect(metric.firstContentfulPaint).toBeLessThan(3000); // FCP小于3秒
        expect(metric.domContentLoaded).toBeLessThan(2000); // DOM加载小于2秒
      });
    });
  });

  test.describe('性能瓶颈识别和优化建议测试', () => {
    test('慢查询识别测试', async ({ page }) => {
      const slowRequests: any[] = [];
      
      // 监听网络请求并记录响应时间
      page.on('response', async response => {
        const request = response.request();
        const timing = response.timing();
        
        if (request.url().includes('/api/') && timing.responseEnd > 2000) {
          slowRequests.push({
            url: request.url(),
            method: request.method(),
            responseTime: timing.responseEnd,
            status: response.status()
          });
        }
      });

      // 执行可能产生慢查询的操作
      const testUser = await testDataManager.createTestUser();
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      // 访问数据密集型页面
      await page.goto('/records');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/community');
      await page.waitForLoadState('networkidle');

      // 分析慢查询
      if (slowRequests.length > 0) {
        console.log('发现慢查询:');
        slowRequests.forEach(req => {
          console.log(`- ${req.method} ${req.url}: ${req.responseTime}ms`);
        });
        
        // 生成优化建议
        const suggestions = generateOptimizationSuggestions(slowRequests);
        console.log('优化建议:');
        suggestions.forEach(suggestion => {
          console.log(`- ${suggestion}`);
        });
      } else {
        console.log('未发现明显的慢查询');
      }

      // 断言性能要求
      expect(slowRequests.length).toBeLessThan(3); // 慢查询数量应该很少
    });

    test('资源加载瓶颈识别测试', async ({ page }) => {
      const resourceMetrics: any[] = [];
      
      // 监听资源加载
      page.on('response', async response => {
        const request = response.request();
        const timing = response.timing();
        
        if (request.resourceType() === 'image' || 
            request.resourceType() === 'script' || 
            request.resourceType() === 'stylesheet') {
          
          resourceMetrics.push({
            url: request.url(),
            type: request.resourceType(),
            size: parseInt(response.headers()['content-length'] || '0'),
            loadTime: timing.responseEnd,
            status: response.status()
          });
        }
      });

      // 访问资源密集型页面
      const testUser = await testDataManager.createTestUser();
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');

      await page.goto('/community');
      await page.waitForLoadState('networkidle');

      // 分析资源加载性能
      const largeResources = resourceMetrics.filter(r => r.size > 500000); // 大于500KB
      const slowResources = resourceMetrics.filter(r => r.loadTime > 3000); // 加载时间大于3秒
      
      console.log('资源加载分析:');
      console.log(`- 总资源数: ${resourceMetrics.length}`);
      console.log(`- 大文件数: ${largeResources.length}`);
      console.log(`- 慢加载资源数: ${slowResources.length}`);

      if (largeResources.length > 0) {
        console.log('大文件资源:');
        largeResources.forEach(resource => {
          console.log(`- ${resource.type}: ${resource.url} (${(resource.size / 1024).toFixed(2)}KB)`);
        });
      }

      if (slowResources.length > 0) {
        console.log('慢加载资源:');
        slowResources.forEach(resource => {
          console.log(`- ${resource.type}: ${resource.url} (${resource.loadTime}ms)`);
        });
      }

      // 生成优化建议
      const suggestions = generateResourceOptimizationSuggestions(largeResources, slowResources);
      if (suggestions.length > 0) {
        console.log('资源优化建议:');
        suggestions.forEach(suggestion => {
          console.log(`- ${suggestion}`);
        });
      }

      // 断言资源加载合理
      expect(largeResources.length).toBeLessThan(5); // 大文件数量应该控制
      expect(slowResources.length).toBeLessThan(3); // 慢加载资源应该很少
    });

    test('用户体验瓶颈识别测试', async ({ page }) => {
      const interactionMetrics: any[] = [];
      
      // 监控用户交互响应时间
      const measureInteraction = async (action: string, operation: () => Promise<void>) => {
        const startTime = Date.now();
        await operation();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        interactionMetrics.push({
          action,
          responseTime,
          timestamp: Date.now()
        });
        
        console.log(`${action}: ${responseTime}ms`);
      };

      // 执行各种用户交互
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      await page.goto('/login');
      
      await measureInteraction('登录操作', async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/dashboard');
      });

      await measureInteraction('页面导航', async () => {
        await page.goto('/analysis');
        await page.waitForLoadState('networkidle');
      });

      await measureInteraction('表单提交', async () => {
        // 模拟表单提交操作
        await page.goto('/pets');
        await page.waitForLoadState('networkidle');
        
        if (await page.locator('[data-testid="add-pet-button"]').count() > 0) {
          await page.click('[data-testid="add-pet-button"]');
          await page.waitForSelector('[data-testid="pet-form"]');
        }
      });

      // 分析交互性能
      const slowInteractions = interactionMetrics.filter(m => m.responseTime > 2000);
      const averageResponseTime = interactionMetrics.reduce((sum, m) => sum + m.responseTime, 0) / interactionMetrics.length;

      console.log('用户交互性能分析:');
      console.log(`- 平均响应时间: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`- 慢交互数量: ${slowInteractions.length}`);

      if (slowInteractions.length > 0) {
        console.log('慢交互操作:');
        slowInteractions.forEach(interaction => {
          console.log(`- ${interaction.action}: ${interaction.responseTime}ms`);
        });
      }

      // 生成用户体验优化建议
      const uxSuggestions = generateUXOptimizationSuggestions(interactionMetrics);
      if (uxSuggestions.length > 0) {
        console.log('用户体验优化建议:');
        uxSuggestions.forEach(suggestion => {
          console.log(`- ${suggestion}`);
        });
      }

      // 断言用户体验要求
      expect(averageResponseTime).toBeLessThan(1500); // 平均响应时间小于1.5秒
      expect(slowInteractions.length).toBeLessThan(2); // 慢交互应该很少
    });
  });
});

// 辅助函数：生成优化建议
function generateOptimizationSuggestions(slowRequests: any[]): string[] {
  const suggestions: string[] = [];
  
  slowRequests.forEach(req => {
    if (req.url.includes('/api/records')) {
      suggestions.push('考虑为记录查询添加分页和索引优化');
    }
    if (req.url.includes('/api/community')) {
      suggestions.push('考虑为社区帖子添加缓存机制');
    }
    if (req.url.includes('/api/analysis')) {
      suggestions.push('考虑优化图片分析算法或使用异步处理');
    }
  });
  
  return [...new Set(suggestions)]; // 去重
}

function generateResourceOptimizationSuggestions(largeResources: any[], slowResources: any[]): string[] {
  const suggestions: string[] = [];
  
  if (largeResources.some(r => r.type === 'image')) {
    suggestions.push('考虑压缩图片或使用WebP格式');
    suggestions.push('实现图片懒加载');
  }
  
  if (largeResources.some(r => r.type === 'script')) {
    suggestions.push('考虑代码分割和按需加载');
    suggestions.push('启用JavaScript压缩和混淆');
  }
  
  if (slowResources.length > 0) {
    suggestions.push('考虑使用CDN加速资源加载');
    suggestions.push('启用HTTP/2和资源预加载');
  }
  
  return suggestions;
}

function generateUXOptimizationSuggestions(interactionMetrics: any[]): string[] {
  const suggestions: string[] = [];
  
  const slowLogin = interactionMetrics.find(m => m.action === '登录操作' && m.responseTime > 2000);
  if (slowLogin) {
    suggestions.push('优化登录流程，考虑添加加载指示器');
  }
  
  const slowNavigation = interactionMetrics.find(m => m.action === '页面导航' && m.responseTime > 1500);
  if (slowNavigation) {
    suggestions.push('优化页面加载速度，考虑预加载关键资源');
  }
  
  const slowForm = interactionMetrics.find(m => m.action === '表单提交' && m.responseTime > 1000);
  if (slowForm) {
    suggestions.push('优化表单处理，考虑客户端验证和异步提交');
  }
  
  return suggestions;
}