import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { ClientErrorUtils } from '../../utils/client-error-utils';

test.describe('客户端错误处理测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let testDataManager: TestDataManager;
  let clientErrorUtils: ClientErrorUtils;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    testDataManager = new TestDataManager(page);
    clientErrorUtils = new ClientErrorUtils(page);

    // 清理测试数据和错误日志
    await testDataManager.cleanup();
    await clientErrorUtils.clearErrorLogs();
    
    // 导航到首页
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await testDataManager.cleanup();
    
    // 清理可能的内存泄漏
    await clientErrorUtils.cleanupMemoryLeak();
  });

  test.describe('JavaScript错误处理', () => {
    test('应该正确处理JavaScript运行时错误', async ({ page }) => {
      // 触发JavaScript错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证错误边界组件显示
      await clientErrorUtils.verifyErrorBoundary();
      
      // 验证错误日志记录
      await clientErrorUtils.verifyErrorLogging();
      
      // 验证错误恢复功能
      await clientErrorUtils.verifyErrorRecovery();
    });

    test('应该正确处理Promise rejection错误', async ({ page }) => {
      // 触发Promise rejection
      await clientErrorUtils.triggerPromiseRejection();
      
      // 等待错误处理
      await page.waitForTimeout(1000);
      
      // 验证错误日志记录
      await clientErrorUtils.verifyErrorLogging();
      
      // 验证Promise错误被正确分类
      const errors = await clientErrorUtils.getClientErrors();
      const promiseError = errors.find(e => e.type === 'promise');
      expect(promiseError).toBeTruthy();
      expect(promiseError.message).toContain('测试Promise rejection');
    });

    test('应该正确处理资源加载错误', async ({ page }) => {
      // 触发资源加载错误
      await clientErrorUtils.triggerResourceLoadError();
      
      // 等待错误处理
      await page.waitForTimeout(1000);
      
      // 验证错误日志记录
      await clientErrorUtils.verifyErrorLogging();
      
      // 验证资源错误被正确分类
      const errors = await clientErrorUtils.getClientErrors();
      const resourceError = errors.find(e => e.type === 'resource');
      expect(resourceError).toBeTruthy();
      expect(resourceError.message).toContain('Failed to load resource');
    });

    test('应该在组件级别处理错误', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 导航到宠物页面
      await page.click('[data-testid="pets-nav"]');
      
      // 注入会导致组件错误的代码
      await page.evaluate(() => {
        // 模拟组件渲染错误
        const event = new CustomEvent('component-error', {
          detail: { message: '组件渲染失败' }
        });
        window.dispatchEvent(event);
      });
      
      // 验证组件级错误边界
      await expect(page.locator('[data-testid="component-error-boundary"]')).toBeVisible();
      await expect(page.locator('[data-testid="component-error-message"]')).toContainText('组件加载失败');
      
      // 验证其他组件仍然正常工作
      await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
    });
  });

  test.describe('错误报告和用户反馈', () => {
    test('应该支持错误报告功能', async ({ page }) => {
      // 触发错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证错误报告功能
      await clientErrorUtils.verifyErrorReporting();
      
      // 验证用户反馈收集
      await clientErrorUtils.verifyUserFeedbackCollection();
    });

    test('应该收集详细的错误上下文信息', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 在特定页面触发错误
      await page.click('[data-testid="analysis-nav"]');
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证错误上下文信息
      await clientErrorUtils.verifyErrorContext();
      
      // 验证错误包含页面信息
      const errors = await clientErrorUtils.getClientErrors();
      const lastError = errors[errors.length - 1];
      expect(lastError).toBeTruthy();
      
      // 验证错误报告包含用户信息（脱敏后）
      await page.click('[data-testid="report-error"]');
      const userInfo = page.locator('[data-testid="user-context"]');
      await expect(userInfo).toContainText('已登录用户');
      await expect(userInfo).not.toContainText(testUser.email); // 确保敏感信息被脱敏
    });

    test('应该支持批量错误报告', async ({ page }) => {
      // 触发多个错误
      await clientErrorUtils.triggerJavaScriptError();
      await page.waitForTimeout(500);
      await clientErrorUtils.triggerPromiseRejection();
      await page.waitForTimeout(500);
      await clientErrorUtils.triggerResourceLoadError();
      
      // 等待错误收集
      await page.waitForTimeout(1000);
      
      // 验证批量错误报告
      await page.click('[data-testid="report-all-errors"]');
      
      const errorCount = page.locator('[data-testid="error-report-count"]');
      await expect(errorCount).toContainText('3');
      
      // 提交批量报告
      await page.click('[data-testid="submit-batch-report"]');
      await expect(page.locator('[data-testid="batch-report-submitted"]')).toBeVisible();
    });
  });

  test.describe('内存泄漏和性能问题检测', () => {
    test('应该检测内存泄漏', async ({ page }) => {
      // 跳过不支持memory API的浏览器
      const hasMemoryAPI = await page.evaluate(() => {
        return 'memory' in performance;
      });
      
      if (!hasMemoryAPI) {
        test.skip('浏览器不支持memory API');
      }
      
      // 验证内存泄漏检测
      await clientErrorUtils.verifyMemoryLeakDetection();
    });

    test('应该监控内存使用情况', async ({ page }) => {
      // 跳过不支持memory API的浏览器
      const hasMemoryAPI = await page.evaluate(() => {
        return 'memory' in performance;
      });
      
      if (!hasMemoryAPI) {
        test.skip('浏览器不支持memory API');
      }
      
      // 等待内存监控数据收集
      await page.waitForTimeout(6000);
      
      // 验证内存监控
      await clientErrorUtils.verifyMemoryMonitoring();
      
      // 验证内存使用警告（如果内存使用过高）
      const memoryStats = await page.evaluate(() => {
        return (window as any).memoryStats;
      });
      
      if (memoryStats && memoryStats.usedJSHeapSize > memoryStats.jsHeapSizeLimit * 0.8) {
        await expect(page.locator('[data-testid="high-memory-warning"]')).toBeVisible();
      }
    });

    test('应该检测性能问题', async ({ page }) => {
      // 验证性能问题检测
      await clientErrorUtils.verifyPerformanceIssueDetection();
      
      // 验证性能建议
      await expect(page.locator('[data-testid="performance-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-suggestions"]')).toContainText('优化建议');
    });

    test('应该监控长时间运行的任务', async ({ page }) => {
      // 模拟长时间运行的任务
      await page.evaluate(() => {
        setTimeout(() => {
          const start = Date.now();
          while (Date.now() - start < 3000) {
            // 长时间运行的同步任务
          }
        }, 100);
      });
      
      // 等待任务完成和检测
      await page.waitForTimeout(4000);
      
      // 验证长任务警告
      await expect(page.locator('[data-testid="long-task-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="long-task-warning"]')).toContainText('检测到长时间运行的任务');
    });
  });

  test.describe('错误恢复和降级策略', () => {
    test('应该实现自动错误恢复', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 导航到宠物页面
      await page.click('[data-testid="pets-nav"]');
      
      // 触发可恢复的错误
      await page.evaluate(() => {
        // 模拟临时网络错误
        const event = new CustomEvent('recoverable-error', {
          detail: { type: 'network', recoverable: true }
        });
        window.dispatchEvent(event);
      });
      
      // 验证自动恢复机制
      await expect(page.locator('[data-testid="auto-recovery-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="recovery-countdown"]')).toBeVisible();
      
      // 等待自动恢复
      await expect(page.locator('[data-testid="recovery-success"]')).toBeVisible({ timeout: 10000 });
    });

    test('应该提供降级功能', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      // 导航到分析页面
      await page.click('[data-testid="analysis-nav"]');
      
      // 模拟分析功能错误
      await page.evaluate(() => {
        const event = new CustomEvent('analysis-error', {
          detail: { message: '分析服务不可用' }
        });
        window.dispatchEvent(event);
      });
      
      // 验证降级功能
      await expect(page.locator('[data-testid="fallback-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-message"]')).toContainText('使用基础分析功能');
      
      // 验证基础功能仍然可用
      await expect(page.locator('[data-testid="basic-upload"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-analysis"]')).toBeVisible();
    });

    test('应该提供用户引导和帮助', async ({ page }) => {
      // 触发错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证用户引导
      await expect(page.locator('[data-testid="error-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="help-suggestions"]')).toBeVisible();
      
      // 验证帮助链接
      await expect(page.locator('[data-testid="help-center-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-support-link"]')).toBeVisible();
      
      // 验证常见问题解答
      await page.click('[data-testid="show-faq"]');
      await expect(page.locator('[data-testid="error-faq"]')).toBeVisible();
    });
  });

  test.describe('错误分析和统计', () => {
    test('应该提供错误统计信息', async ({ page }) => {
      // 触发多种类型的错误
      await clientErrorUtils.triggerJavaScriptError();
      await page.waitForTimeout(500);
      await clientErrorUtils.triggerPromiseRejection();
      await page.waitForTimeout(500);
      await clientErrorUtils.triggerResourceLoadError();
      
      // 等待错误收集
      await page.waitForTimeout(1000);
      
      // 验证错误统计
      await clientErrorUtils.verifyErrorAnalytics();
      
      // 获取详细统计信息
      const stats = await clientErrorUtils.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(Object.keys(stats.errorsByType).length).toBeGreaterThan(0);
    });

    test('应该分析错误趋势', async ({ page }) => {
      // 在不同时间点触发错误
      await clientErrorUtils.triggerJavaScriptError();
      await page.waitForTimeout(1000);
      await clientErrorUtils.triggerPromiseRejection();
      await page.waitForTimeout(1000);
      await clientErrorUtils.triggerResourceLoadError();
      
      // 验证错误趋势分析
      const stats = await clientErrorUtils.getErrorStats();
      expect(stats.recentErrors.length).toBeGreaterThan(0);
      
      // 验证时间戳记录
      stats.recentErrors.forEach(error => {
        expect(error.timestamp).toBeTruthy();
        expect(typeof error.timestamp).toBe('number');
      });
    });

    test('应该识别错误模式', async ({ page }) => {
      // 重复触发相同类型的错误
      for (let i = 0; i < 3; i++) {
        await clientErrorUtils.triggerJavaScriptError();
        await page.waitForTimeout(500);
      }
      
      // 验证错误模式识别
      const errors = await clientErrorUtils.getClientErrors();
      const jsErrors = errors.filter(e => e.type === 'javascript');
      expect(jsErrors.length).toBe(3);
      
      // 验证重复错误检测
      if (jsErrors.length >= 3) {
        await expect(page.locator('[data-testid="repeated-error-warning"]')).toBeVisible();
        await expect(page.locator('[data-testid="repeated-error-warning"]')).toContainText('检测到重复错误');
      }
    });
  });

  test.describe('开发者工具集成', () => {
    test('应该与开发者工具集成', async ({ page }) => {
      // 触发错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证开发者工具集成
      await clientErrorUtils.verifyDevToolsIntegration();
      
      // 在开发模式下验证额外信息
      const isDev = await page.evaluate(() => {
        return process.env.NODE_ENV === 'development';
      });
      
      if (isDev) {
        await expect(page.locator('[data-testid="dev-error-details"]')).toBeVisible();
        await expect(page.locator('[data-testid="source-map-info"]')).toBeVisible();
      }
    });

    test('应该提供调试信息', async ({ page }) => {
      // 触发错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证调试信息
      const errors = await clientErrorUtils.getClientErrors();
      const lastError = errors[errors.length - 1];
      
      if (lastError.stack) {
        expect(lastError.stack).toContain('at ');
        
        // 在开发模式下验证源码位置
        const isDev = await page.evaluate(() => {
          return process.env.NODE_ENV === 'development';
        });
        
        if (isDev) {
          await expect(page.locator('[data-testid="source-location"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('可访问性和多语言支持', () => {
    test('应该支持错误处理的可访问性', async ({ page }) => {
      // 触发错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证可访问性
      await clientErrorUtils.verifyErrorHandlingAccessibility();
      
      // 验证键盘导航
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBe('error-boundary-reset');
    });

    test('应该支持多语言错误消息', async ({ page }) => {
      // 设置中文环境
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'language', {
          get: () => 'zh-CN'
        });
      });
      
      // 触发错误
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证中文错误消息
      await clientErrorUtils.verifyMultiLanguageErrorMessages('zh-CN');
      
      // 切换到英文环境
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'language', {
          get: () => 'en-US'
        });
      });
      
      await page.reload();
      await clientErrorUtils.triggerJavaScriptError();
      
      // 验证英文错误消息
      await clientErrorUtils.verifyMultiLanguageErrorMessages('en-US');
    });
  });

  test.describe('综合错误处理测试', () => {
    test('应该处理多种错误场景', async ({ page }) => {
      const scenarios = clientErrorUtils.createClientErrorScenarios();
      
      for (const scenario of scenarios) {
        console.log(`测试场景: ${scenario.name}`);
        
        // 清理之前的错误
        await clientErrorUtils.clearErrorLogs();
        
        // 触发错误
        await scenario.trigger();
        
        // 验证错误处理
        await scenario.verify();
        
        // 清理（如果需要）
        if (scenario.cleanup) {
          await scenario.cleanup();
        }
        
        // 等待状态重置
        await page.waitForTimeout(1000);
      }
    });

    test('应该在复杂用户流程中保持错误处理稳定性', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      const testPet = await testDataManager.createTestPet(testUser.id);
      
      // 登录
      await authPage.login(testUser.email, testUser.password);
      
      // 在用户流程中的各个点触发错误
      
      // 1. 在宠物页面触发错误
      await page.click('[data-testid="pets-nav"]');
      await clientErrorUtils.triggerJavaScriptError();
      await clientErrorUtils.verifyErrorRecovery();
      
      // 2. 在分析页面触发错误
      await page.click('[data-testid="analysis-nav"]');
      await clientErrorUtils.triggerPromiseRejection();
      await page.waitForTimeout(1000);
      
      // 3. 在社区页面触发错误
      await page.click('[data-testid="community-nav"]');
      await clientErrorUtils.triggerResourceLoadError();
      await page.waitForTimeout(1000);
      
      // 验证应用仍然可用
      await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // 验证错误统计
      const stats = await clientErrorUtils.getErrorStats();
      expect(stats.totalErrors).toBe(3);
      expect(Object.keys(stats.errorsByType)).toContain('javascript');
      expect(Object.keys(stats.errorsByType)).toContain('promise');
      expect(Object.keys(stats.errorsByType)).toContain('resource');
    });
  });
});