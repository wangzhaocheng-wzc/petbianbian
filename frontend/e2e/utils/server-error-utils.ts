import { Page, expect } from '@playwright/test';
import { APIMocker } from './api-mocker';

/**
 * 服务器错误处理测试工具类
 * 提供专门用于测试服务器错误处理的辅助方法
 */
export class ServerErrorUtils {
  private page: Page;
  private apiMocker: APIMocker;

  constructor(page: Page, apiMocker: APIMocker) {
    this.page = page;
    this.apiMocker = apiMocker;
  }

  /**
   * 验证错误页面基本元素
   */
  async verifyErrorPageElements(errorType: string): Promise<void> {
    // 验证错误页面容器
    await expect(this.page.locator('[data-testid="error-page"]')).toBeVisible();
    
    // 验证错误标题
    await expect(this.page.locator('[data-testid="error-title"]')).toBeVisible();
    
    // 验证错误描述
    await expect(this.page.locator('[data-testid="error-description"]')).toBeVisible();
    
    // 验证错误图标
    await expect(this.page.locator('[data-testid="error-icon"]')).toBeVisible();
    
    // 验证操作按钮区域
    await expect(this.page.locator('[data-testid="error-actions"]')).toBeVisible();
    
    // 根据错误类型验证特定元素
    switch (errorType) {
      case 'server-error':
        await expect(this.page.locator('[data-testid="server-error"]')).toBeVisible();
        break;
      case 'not-found':
        await expect(this.page.locator('[data-testid="not-found-error"]')).toBeVisible();
        break;
      case 'permission-error':
        await expect(this.page.locator('[data-testid="permission-error"]')).toBeVisible();
        break;
      case 'rate-limit':
        await expect(this.page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
        break;
    }
  }

  /**
   * 验证错误消息内容
   */
  async verifyErrorMessage(expectedMessage: string): Promise<void> {
    const errorMessage = this.page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(expectedMessage);
  }

  /**
   * 验证重试按钮功能
   */
  async verifyRetryButton(): Promise<void> {
    const retryButton = this.page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
    
    // 点击重试按钮
    await retryButton.click();
    
    // 验证重试指示器
    await expect(this.page.locator('[data-testid="retry-indicator"]')).toBeVisible();
  }

  /**
   * 验证导航按钮
   */
  async verifyNavigationButtons(): Promise<void> {
    const actions = this.page.locator('[data-testid="error-actions"]');
    
    // 验证返回按钮
    await expect(actions.locator('[data-testid="back-button"]')).toBeVisible();
    
    // 验证首页按钮
    await expect(actions.locator('[data-testid="home-button"]')).toBeVisible();
    
    // 验证重新加载按钮
    await expect(actions.locator('[data-testid="reload-button"]')).toBeVisible();
  }

  /**
   * 验证联系支持按钮
   */
  async verifyContactSupportButton(): Promise<void> {
    const contactButton = this.page.locator('[data-testid="contact-support"]');
    await expect(contactButton).toBeVisible();
    await expect(contactButton).toBeEnabled();
  }

  /**
   * 验证倒计时功能（用于限流等场景）
   */
  async verifyCountdown(initialSeconds: number): Promise<void> {
    const countdown = this.page.locator('[data-testid="retry-countdown"]');
    await expect(countdown).toBeVisible();
    
    // 验证初始倒计时值
    await expect(countdown).toContainText(initialSeconds.toString());
    
    // 等待1秒，验证倒计时递减
    await this.page.waitForTimeout(1100);
    await expect(countdown).toContainText((initialSeconds - 1).toString());
  }

  /**
   * 验证表单状态保持
   */
  async verifyFormStatePreservation(formData: Record<string, string>): Promise<void> {
    for (const [fieldName, expectedValue] of Object.entries(formData)) {
      const field = this.page.locator(`[data-testid="${fieldName}-input"]`);
      await expect(field).toHaveValue(expectedValue);
    }
  }

  /**
   * 验证字段级错误消息
   */
  async verifyFieldErrors(fieldErrors: Record<string, string>): Promise<void> {
    for (const [fieldName, expectedError] of Object.entries(fieldErrors)) {
      const errorElement = this.page.locator(`[data-testid="${fieldName}-error"]`);
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText(expectedError);
    }
  }

  /**
   * 验证自动重试指示器
   */
  async verifyAutoRetryIndicator(): Promise<void> {
    const indicator = this.page.locator('[data-testid="auto-retry-indicator"]');
    await expect(indicator).toBeVisible();
    
    // 验证重试进度或动画
    await expect(indicator).toHaveClass(/loading|spinning|progress/);
  }

  /**
   * 验证熔断器状态
   */
  async verifyCircuitBreakerState(): Promise<void> {
    const circuitBreaker = this.page.locator('[data-testid="circuit-breaker-open"]');
    await expect(circuitBreaker).toBeVisible();
    await expect(circuitBreaker).toContainText('服务暂时不可用');
  }

  /**
   * 验证网络状态指示器
   */
  async verifyNetworkStatusIndicator(isOnline: boolean): Promise<void> {
    if (isOnline) {
      await expect(this.page.locator('[data-testid="online-indicator"]')).toBeVisible();
      await expect(this.page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    } else {
      await expect(this.page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(this.page.locator('[data-testid="online-indicator"]')).not.toBeVisible();
    }
  }

  /**
   * 验证错误页面响应式设计
   */
  async verifyResponsiveErrorPage(): Promise<void> {
    // 获取当前视口大小
    const viewport = this.page.viewportSize();
    
    if (viewport && viewport.width < 768) {
      // 移动端验证
      const actions = this.page.locator('[data-testid="error-actions"]');
      await expect(actions).toHaveCSS('flex-direction', 'column');
      
      // 验证按钮全宽
      const buttons = actions.locator('button');
      const buttonCount = await buttons.count();
      for (let i = 0; i < buttonCount; i++) {
        await expect(buttons.nth(i)).toHaveCSS('width', /100%|full/);
      }
    } else {
      // 桌面端验证
      const actions = this.page.locator('[data-testid="error-actions"]');
      await expect(actions).toHaveCSS('flex-direction', 'row');
    }
  }

  /**
   * 模拟并验证网络恢复
   */
  async simulateNetworkRecovery(): Promise<void> {
    // 触发网络恢复事件
    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    // 验证网络恢复指示器
    await expect(this.page.locator('[data-testid="network-recovered"]')).toBeVisible();
  }

  /**
   * 验证错误日志记录
   */
  async verifyErrorLogging(): Promise<void> {
    // 检查控制台是否有错误日志
    const consoleLogs = await this.page.evaluate(() => {
      return (window as any).testErrorLogs || [];
    });
    
    expect(consoleLogs.length).toBeGreaterThan(0);
  }

  /**
   * 验证用户友好的错误消息
   */
  async verifyUserFriendlyErrorMessage(statusCode: number): Promise<void> {
    const friendlyMessages: Record<number, string> = {
      400: '输入信息有误',
      401: '请先登录',
      403: '没有权限',
      404: '页面不存在',
      409: '信息冲突',
      422: '信息不完整',
      429: '操作太频繁',
      500: '服务器错误',
      502: '服务不可用',
      503: '服务维护中',
      504: '请求超时'
    };
    
    const expectedMessage = friendlyMessages[statusCode];
    if (expectedMessage) {
      await this.verifyErrorMessage(expectedMessage);
    }
  }

  /**
   * 测试错误恢复流程
   */
  async testErrorRecoveryFlow(
    triggerError: () => Promise<void>,
    verifyError: () => Promise<void>,
    triggerRecovery: () => Promise<void>,
    verifyRecovery: () => Promise<void>
  ): Promise<void> {
    // 1. 触发错误
    await triggerError();
    
    // 2. 验证错误状态
    await verifyError();
    
    // 3. 触发恢复
    await triggerRecovery();
    
    // 4. 验证恢复成功
    await verifyRecovery();
  }

  /**
   * 验证错误边界组件
   */
  async verifyErrorBoundary(): Promise<void> {
    // 验证错误边界捕获了JavaScript错误
    await expect(this.page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="error-boundary-message"]')).toContainText('出现了意外错误');
    
    // 验证重置按钮
    await expect(this.page.locator('[data-testid="error-boundary-reset"]')).toBeVisible();
  }

  /**
   * 验证错误统计和监控
   */
  async verifyErrorMonitoring(): Promise<void> {
    // 检查是否有错误监控数据
    const monitoringData = await this.page.evaluate(() => {
      return (window as any).errorMonitoring || {};
    });
    
    expect(monitoringData.errorCount).toBeGreaterThan(0);
    expect(monitoringData.lastError).toBeDefined();
  }

  /**
   * 验证多语言错误消息
   */
  async verifyMultiLanguageErrorMessages(language: string = 'zh-CN'): Promise<void> {
    // 设置语言
    await this.page.addInitScript((lang) => {
      Object.defineProperty(navigator, 'language', {
        get: () => lang
      });
    }, language);
    
    // 验证错误消息使用正确的语言
    const errorMessage = this.page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    
    if (language === 'zh-CN') {
      await expect(errorMessage).toContainText(/错误|失败|不可用/);
    } else if (language === 'en-US') {
      await expect(errorMessage).toContainText(/error|failed|unavailable/i);
    }
  }

  /**
   * 验证错误页面可访问性
   */
  async verifyErrorPageAccessibility(): Promise<void> {
    // 验证焦点管理
    const firstFocusableElement = this.page.locator('[data-testid="error-actions"] button').first();
    await expect(firstFocusableElement).toBeFocused();
    
    // 验证ARIA标签
    await expect(this.page.locator('[data-testid="error-page"]')).toHaveAttribute('role', 'alert');
    await expect(this.page.locator('[data-testid="error-title"]')).toHaveAttribute('aria-level', '1');
    
    // 验证键盘导航
    await this.page.keyboard.press('Tab');
    const nextButton = this.page.locator('[data-testid="error-actions"] button').nth(1);
    await expect(nextButton).toBeFocused();
  }

  /**
   * 创建错误场景测试数据
   */
  createErrorScenarios(): Array<{
    name: string;
    statusCode: number;
    urlPattern: string | RegExp;
    expectedMessage: string;
    hasRetry: boolean;
    hasCountdown: boolean;
  }> {
    return [
      {
        name: '400 Bad Request',
        statusCode: 400,
        urlPattern: '/api/auth/login',
        expectedMessage: '请求格式不正确',
        hasRetry: true,
        hasCountdown: false
      },
      {
        name: '401 Unauthorized',
        statusCode: 401,
        urlPattern: '/api/pets',
        expectedMessage: '请先登录',
        hasRetry: false,
        hasCountdown: false
      },
      {
        name: '403 Forbidden',
        statusCode: 403,
        urlPattern: '/api/admin/**',
        expectedMessage: '没有权限',
        hasRetry: false,
        hasCountdown: false
      },
      {
        name: '404 Not Found',
        statusCode: 404,
        urlPattern: '/api/pets/nonexistent',
        expectedMessage: '资源不存在',
        hasRetry: false,
        hasCountdown: false
      },
      {
        name: '409 Conflict',
        statusCode: 409,
        urlPattern: '/api/pets',
        expectedMessage: '数据冲突',
        hasRetry: true,
        hasCountdown: false
      },
      {
        name: '422 Validation Error',
        statusCode: 422,
        urlPattern: '/api/pets',
        expectedMessage: '数据验证失败',
        hasRetry: true,
        hasCountdown: false
      },
      {
        name: '429 Rate Limited',
        statusCode: 429,
        urlPattern: '/api/analysis/upload',
        expectedMessage: '请求过于频繁',
        hasRetry: true,
        hasCountdown: true
      },
      {
        name: '500 Internal Server Error',
        statusCode: 500,
        urlPattern: '/api/**',
        expectedMessage: '服务器内部错误',
        hasRetry: true,
        hasCountdown: false
      },
      {
        name: '502 Bad Gateway',
        statusCode: 502,
        urlPattern: '/api/**',
        expectedMessage: '网关错误',
        hasRetry: true,
        hasCountdown: false
      },
      {
        name: '503 Service Unavailable',
        statusCode: 503,
        urlPattern: '/api/analysis/**',
        expectedMessage: '服务暂时不可用',
        hasRetry: true,
        hasCountdown: true
      },
      {
        name: '504 Gateway Timeout',
        statusCode: 504,
        urlPattern: '/api/analysis/process',
        expectedMessage: '请求处理超时',
        hasRetry: true,
        hasCountdown: false
      }
    ];
  }
}