import { Page, expect } from '@playwright/test';

/**
 * 客户端错误处理测试工具类
 * 提供专门用于测试客户端JavaScript错误处理的辅助方法
 */
export class ClientErrorUtils {
  private page: Page;
  private errorLogs: Array<{ message: string; stack?: string; timestamp: number }> = [];

  constructor(page: Page) {
    this.page = page;
    this.setupErrorListeners();
  }

  /**
   * 设置错误监听器
   */
  private async setupErrorListeners(): Promise<void> {
    // 监听页面错误
    this.page.on('pageerror', (error) => {
      this.errorLogs.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // 监听控制台错误
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.errorLogs.push({
          message: msg.text(),
          timestamp: Date.now()
        });
      }
    });

    // 注入客户端错误收集器
    await this.page.addInitScript(() => {
      // 全局错误处理器
      window.addEventListener('error', (event) => {
        (window as any).clientErrors = (window as any).clientErrors || [];
        (window as any).clientErrors.push({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: Date.now()
        });
      });

      // Promise rejection处理器
      window.addEventListener('unhandledrejection', (event) => {
        (window as any).clientErrors = (window as any).clientErrors || [];
        (window as any).clientErrors.push({
          type: 'promise',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          timestamp: Date.now()
        });
      });

      // 资源加载错误处理器
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          (window as any).clientErrors = (window as any).clientErrors || [];
          (window as any).clientErrors.push({
            type: 'resource',
            message: `Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href}`,
            element: (event.target as any)?.tagName,
            timestamp: Date.now()
          });
        }
      }, true);

      // 内存使用监控
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          (window as any).memoryStats = {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            timestamp: Date.now()
          };
        }, 5000);
      }
    });
  }

  /**
   * 触发JavaScript错误
   */
  async triggerJavaScriptError(): Promise<void> {
    await this.page.evaluate(() => {
      // 故意触发一个JavaScript错误
      (window as any).nonExistentFunction();
    });
  }

  /**
   * 触发Promise rejection错误
   */
  async triggerPromiseRejection(): Promise<void> {
    await this.page.evaluate(() => {
      // 创建一个未处理的Promise rejection
      Promise.reject(new Error('测试Promise rejection'));
    });
  }

  /**
   * 触发资源加载错误
   */
  async triggerResourceLoadError(): Promise<void> {
    await this.page.evaluate(() => {
      // 尝试加载不存在的图片
      const img = document.createElement('img');
      img.src = '/nonexistent-image.jpg';
      document.body.appendChild(img);
    });
  }

  /**
   * 触发内存泄漏
   */
  async triggerMemoryLeak(): Promise<void> {
    await this.page.evaluate(() => {
      // 创建内存泄漏
      const leakyArray: any[] = [];
      const interval = setInterval(() => {
        leakyArray.push(new Array(1000000).fill('memory leak'));
      }, 100);
      
      // 存储interval引用以便后续清理
      (window as any).memoryLeakInterval = interval;
    });
  }

  /**
   * 清理内存泄漏
   */
  async cleanupMemoryLeak(): Promise<void> {
    await this.page.evaluate(() => {
      if ((window as any).memoryLeakInterval) {
        clearInterval((window as any).memoryLeakInterval);
        delete (window as any).memoryLeakInterval;
      }
    });
  }

  /**
   * 验证错误边界组件
   */
  async verifyErrorBoundary(): Promise<void> {
    // 验证错误边界组件显示
    await expect(this.page.locator('[data-testid="error-boundary"]')).toBeVisible();
    
    // 验证错误消息
    await expect(this.page.locator('[data-testid="error-boundary-message"]')).toContainText('出现了意外错误');
    
    // 验证错误详情（开发模式下）
    const isDev = await this.page.evaluate(() => {
      return process.env.NODE_ENV === 'development';
    });
    
    if (isDev) {
      await expect(this.page.locator('[data-testid="error-details"]')).toBeVisible();
      await expect(this.page.locator('[data-testid="error-stack"]')).toBeVisible();
    }
    
    // 验证重置按钮
    await expect(this.page.locator('[data-testid="error-boundary-reset"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="error-boundary-reset"]')).toBeEnabled();
  }

  /**
   * 验证错误恢复功能
   */
  async verifyErrorRecovery(): Promise<void> {
    // 点击重置按钮
    await this.page.click('[data-testid="error-boundary-reset"]');
    
    // 验证错误边界被重置
    await expect(this.page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    
    // 验证应用恢复正常
    await expect(this.page.locator('[data-testid="app-content"]')).toBeVisible();
  }

  /**
   * 验证错误报告功能
   */
  async verifyErrorReporting(): Promise<void> {
    // 验证错误报告按钮
    await expect(this.page.locator('[data-testid="report-error"]')).toBeVisible();
    
    // 点击报告错误
    await this.page.click('[data-testid="report-error"]');
    
    // 验证错误报告对话框
    await expect(this.page.locator('[data-testid="error-report-dialog"]')).toBeVisible();
    
    // 验证错误信息预填充
    const errorMessage = this.page.locator('[data-testid="error-message-field"]');
    await expect(errorMessage).not.toBeEmpty();
    
    // 验证用户反馈字段
    await expect(this.page.locator('[data-testid="user-feedback-field"]')).toBeVisible();
    
    // 验证提交按钮
    await expect(this.page.locator('[data-testid="submit-error-report"]')).toBeVisible();
  }

  /**
   * 验证用户反馈收集
   */
  async verifyUserFeedbackCollection(): Promise<void> {
    // 填写用户反馈
    await this.page.fill('[data-testid="user-feedback-field"]', '这个错误发生在我点击保存按钮时');
    
    // 提交错误报告
    await this.page.click('[data-testid="submit-error-report"]');
    
    // 验证提交成功
    await expect(this.page.locator('[data-testid="report-submitted"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="report-submitted"]')).toContainText('错误报告已提交');
    
    // 验证感谢消息
    await expect(this.page.locator('[data-testid="thank-you-message"]')).toBeVisible();
  }

  /**
   * 获取客户端错误日志
   */
  async getClientErrors(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return (window as any).clientErrors || [];
    });
  }

  /**
   * 验证错误日志记录
   */
  async verifyErrorLogging(): Promise<void> {
    const clientErrors = await this.getClientErrors();
    expect(clientErrors.length).toBeGreaterThan(0);
    
    // 验证错误日志包含必要信息
    const lastError = clientErrors[clientErrors.length - 1];
    expect(lastError).toHaveProperty('message');
    expect(lastError).toHaveProperty('timestamp');
    expect(lastError).toHaveProperty('type');
  }

  /**
   * 验证内存使用监控
   */
  async verifyMemoryMonitoring(): Promise<void> {
    const memoryStats = await this.page.evaluate(() => {
      return (window as any).memoryStats;
    });
    
    if (memoryStats) {
      expect(memoryStats).toHaveProperty('usedJSHeapSize');
      expect(memoryStats).toHaveProperty('totalJSHeapSize');
      expect(memoryStats).toHaveProperty('jsHeapSizeLimit');
      expect(memoryStats.usedJSHeapSize).toBeGreaterThan(0);
    }
  }

  /**
   * 验证内存泄漏检测
   */
  async verifyMemoryLeakDetection(): Promise<void> {
    // 获取初始内存使用
    const initialMemory = await this.page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // 触发内存泄漏
    await this.triggerMemoryLeak();
    
    // 等待内存使用增长
    await this.page.waitForTimeout(2000);
    
    // 获取当前内存使用
    const currentMemory = await this.page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // 验证内存使用增长
    expect(currentMemory).toBeGreaterThan(initialMemory);
    
    // 验证内存泄漏警告
    await expect(this.page.locator('[data-testid="memory-leak-warning"]')).toBeVisible();
    
    // 清理内存泄漏
    await this.cleanupMemoryLeak();
  }

  /**
   * 验证性能问题检测
   */
  async verifyPerformanceIssueDetection(): Promise<void> {
    // 触发性能问题（长时间运行的脚本）
    await this.page.evaluate(() => {
      const start = Date.now();
      while (Date.now() - start < 2000) {
        // 模拟长时间运行的脚本
      }
    });
    
    // 验证性能警告
    await expect(this.page.locator('[data-testid="performance-warning"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="performance-warning"]')).toContainText('检测到性能问题');
  }

  /**
   * 验证错误统计和分析
   */
  async verifyErrorAnalytics(): Promise<void> {
    const clientErrors = await this.getClientErrors();
    
    // 按类型分组错误
    const errorsByType = clientErrors.reduce((acc: any, error: any) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {});
    
    // 验证错误统计
    expect(Object.keys(errorsByType).length).toBeGreaterThan(0);
    
    // 验证错误分析界面（如果存在）
    const analyticsPanel = this.page.locator('[data-testid="error-analytics"]');
    if (await analyticsPanel.isVisible()) {
      await expect(analyticsPanel.locator('[data-testid="error-count"]')).toContainText(clientErrors.length.toString());
      await expect(analyticsPanel.locator('[data-testid="error-types"]')).toBeVisible();
    }
  }

  /**
   * 验证错误恢复策略
   */
  async verifyErrorRecoveryStrategies(): Promise<void> {
    // 验证自动重试机制
    await expect(this.page.locator('[data-testid="auto-retry-enabled"]')).toBeVisible();
    
    // 验证降级功能
    await expect(this.page.locator('[data-testid="fallback-ui"]')).toBeVisible();
    
    // 验证用户引导
    await expect(this.page.locator('[data-testid="error-guidance"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="error-guidance"]')).toContainText('建议您');
  }

  /**
   * 验证开发者工具集成
   */
  async verifyDevToolsIntegration(): Promise<void> {
    // 检查是否有开发者工具相关的错误信息
    const devToolsErrors = await this.page.evaluate(() => {
      return (window as any).devToolsErrors || [];
    });
    
    if (devToolsErrors.length > 0) {
      expect(devToolsErrors[0]).toHaveProperty('source');
      expect(devToolsErrors[0]).toHaveProperty('level');
    }
  }

  /**
   * 验证错误上下文信息
   */
  async verifyErrorContext(): Promise<void> {
    const clientErrors = await this.getClientErrors();
    
    if (clientErrors.length > 0) {
      const lastError = clientErrors[clientErrors.length - 1];
      
      // 验证错误包含上下文信息
      expect(lastError).toHaveProperty('timestamp');
      
      // 验证用户代理信息
      const userAgent = await this.page.evaluate(() => navigator.userAgent);
      expect(userAgent).toBeTruthy();
      
      // 验证页面URL信息
      const currentUrl = this.page.url();
      expect(currentUrl).toBeTruthy();
    }
  }

  /**
   * 创建客户端错误测试场景
   */
  createClientErrorScenarios(): Array<{
    name: string;
    description: string;
    trigger: () => Promise<void>;
    verify: () => Promise<void>;
    cleanup?: () => Promise<void>;
  }> {
    return [
      {
        name: 'JavaScript运行时错误',
        description: '测试JavaScript运行时错误的处理',
        trigger: async () => {
          await this.triggerJavaScriptError();
        },
        verify: async () => {
          await this.verifyErrorBoundary();
          await this.verifyErrorLogging();
        }
      },
      {
        name: 'Promise rejection错误',
        description: '测试未处理的Promise rejection',
        trigger: async () => {
          await this.triggerPromiseRejection();
        },
        verify: async () => {
          await this.verifyErrorLogging();
          const errors = await this.getClientErrors();
          const promiseError = errors.find(e => e.type === 'promise');
          expect(promiseError).toBeTruthy();
        }
      },
      {
        name: '资源加载错误',
        description: '测试资源加载失败的处理',
        trigger: async () => {
          await this.triggerResourceLoadError();
        },
        verify: async () => {
          await this.verifyErrorLogging();
          const errors = await this.getClientErrors();
          const resourceError = errors.find(e => e.type === 'resource');
          expect(resourceError).toBeTruthy();
        }
      },
      {
        name: '内存泄漏检测',
        description: '测试内存泄漏的检测和处理',
        trigger: async () => {
          await this.triggerMemoryLeak();
        },
        verify: async () => {
          await this.verifyMemoryLeakDetection();
        },
        cleanup: async () => {
          await this.cleanupMemoryLeak();
        }
      }
    ];
  }

  /**
   * 验证错误处理的可访问性
   */
  async verifyErrorHandlingAccessibility(): Promise<void> {
    // 验证错误消息的ARIA标签
    const errorMessage = this.page.locator('[data-testid="error-message"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    }
    
    // 验证错误边界的焦点管理
    const errorBoundary = this.page.locator('[data-testid="error-boundary"]');
    if (await errorBoundary.isVisible()) {
      const resetButton = this.page.locator('[data-testid="error-boundary-reset"]');
      await expect(resetButton).toBeFocused();
    }
  }

  /**
   * 验证多语言错误消息
   */
  async verifyMultiLanguageErrorMessages(language: string = 'zh-CN'): Promise<void> {
    const errorMessages = await this.page.locator('[data-testid="error-message"]').allTextContents();
    
    if (errorMessages.length > 0) {
      const message = errorMessages[0];
      
      if (language === 'zh-CN') {
        expect(message).toMatch(/错误|失败|异常/);
      } else if (language === 'en-US') {
        expect(message).toMatch(/error|failed|exception/i);
      }
    }
  }

  /**
   * 清理错误日志
   */
  async clearErrorLogs(): Promise<void> {
    this.errorLogs = [];
    await this.page.evaluate(() => {
      (window as any).clientErrors = [];
    });
  }

  /**
   * 获取错误统计信息
   */
  async getErrorStats(): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: any[];
  }> {
    const clientErrors = await this.getClientErrors();
    
    const errorsByType = clientErrors.reduce((acc: any, error: any) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {});
    
    const recentErrors = clientErrors
      .filter(error => Date.now() - error.timestamp < 60000) // 最近1分钟的错误
      .slice(-10); // 最多10个
    
    return {
      totalErrors: clientErrors.length,
      errorsByType,
      recentErrors
    };
  }
}