import { Page, expect, BrowserContext } from '@playwright/test';
import { APIMocker } from './api-mocker';

/**
 * 网络错误处理测试工具类
 * 提供专门用于测试网络错误处理的辅助方法
 */
export class NetworkErrorUtils {
  private page: Page;
  private context: BrowserContext;
  private apiMocker: APIMocker;

  constructor(page: Page, context: BrowserContext, apiMocker: APIMocker) {
    this.page = page;
    this.context = context;
    this.apiMocker = apiMocker;
  }

  /**
   * 模拟网络中断
   */
  async simulateNetworkDisconnection(): Promise<void> {
    // 设置离线状态
    await this.context.setOffline(true);
    
    // 触发离线事件
    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
  }

  /**
   * 模拟网络恢复
   */
  async simulateNetworkReconnection(): Promise<void> {
    // 恢复在线状态
    await this.context.setOffline(false);
    
    // 触发在线事件
    await this.page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  }

  /**
   * 模拟连接超时
   */
  async simulateConnectionTimeout(url: string | RegExp, timeout: number = 30000): Promise<void> {
    await this.page.route(url, async (route) => {
      // 延迟响应超过超时时间
      await new Promise(resolve => setTimeout(resolve, timeout + 1000));
      await route.abort('timedout');
    });
  }

  /**
   * 模拟DNS解析失败
   */
  async simulateDNSFailure(url: string | RegExp): Promise<void> {
    await this.page.route(url, async (route) => {
      await route.abort('namenotresolved');
    });
  }

  /**
   * 模拟网络不稳定（间歇性连接）
   */
  async simulateUnstableNetwork(url: string | RegExp, failureRate: number = 0.5): Promise<void> {
    await this.page.route(url, async (route) => {
      if (Math.random() < failureRate) {
        await route.abort('connectionfailed');
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 模拟慢网络连接
   */
  async simulateSlowNetwork(url: string | RegExp, delay: number = 5000): Promise<void> {
    await this.page.route(url, async (route) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });
  }

  /**
   * 验证离线模式指示器
   */
  async verifyOfflineIndicator(): Promise<void> {
    const offlineIndicator = this.page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
    await expect(offlineIndicator).toContainText(/离线|offline/i);
  }

  /**
   * 验证在线模式指示器
   */
  async verifyOnlineIndicator(): Promise<void> {
    const onlineIndicator = this.page.locator('[data-testid="online-indicator"]');
    await expect(onlineIndicator).toBeVisible();
    await expect(onlineIndicator).toContainText(/在线|online/i);
  }

  /**
   * 验证离线数据缓存
   */
  async verifyOfflineDataCache(): Promise<void> {
    // 检查本地存储中的缓存数据
    const cachedData = await this.page.evaluate(() => {
      return localStorage.getItem('offline-cache') || sessionStorage.getItem('offline-cache');
    });
    
    expect(cachedData).toBeTruthy();
    
    // 验证缓存数据可以正常显示
    const cachedContent = this.page.locator('[data-testid="cached-content"]');
    await expect(cachedContent).toBeVisible();
  }

  /**
   * 验证数据同步功能
   */
  async verifyDataSynchronization(): Promise<void> {
    // 验证同步指示器
    const syncIndicator = this.page.locator('[data-testid="sync-indicator"]');
    await expect(syncIndicator).toBeVisible();
    
    // 验证同步进度
    const syncProgress = this.page.locator('[data-testid="sync-progress"]');
    await expect(syncProgress).toBeVisible();
    
    // 等待同步完成
    await expect(this.page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 });
  }

  /**
   * 验证离线表单数据保存
   */
  async verifyOfflineFormSave(formData: Record<string, string>): Promise<void> {
    // 填写表单
    for (const [fieldName, value] of Object.entries(formData)) {
      await this.page.fill(`[data-testid="${fieldName}-input"]`, value);
    }
    
    // 提交表单（在离线状态下）
    await this.page.click('[data-testid="submit-button"]');
    
    // 验证离线保存提示
    await expect(this.page.locator('[data-testid="offline-save-notice"]')).toBeVisible();
    
    // 验证数据保存到本地存储
    const savedData = await this.page.evaluate(() => {
      return localStorage.getItem('pending-submissions');
    });
    
    expect(savedData).toBeTruthy();
    const parsedData = JSON.parse(savedData!);
    expect(parsedData).toHaveLength(1);
  }

  /**
   * 验证网络重连后的数据同步
   */
  async verifyReconnectionSync(): Promise<void> {
    // 模拟网络恢复
    await this.simulateNetworkReconnection();
    
    // 验证自动同步开始
    await expect(this.page.locator('[data-testid="auto-sync-started"]')).toBeVisible();
    
    // 验证同步成功
    await expect(this.page.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 15000 });
    
    // 验证本地待同步数据被清除
    const pendingData = await this.page.evaluate(() => {
      return localStorage.getItem('pending-submissions');
    });
    
    expect(pendingData).toBeFalsy();
  }

  /**
   * 验证重连机制
   */
  async verifyReconnectionMechanism(): Promise<void> {
    // 验证重连尝试指示器
    const reconnectIndicator = this.page.locator('[data-testid="reconnect-indicator"]');
    await expect(reconnectIndicator).toBeVisible();
    
    // 验证重连次数显示
    const reconnectCount = this.page.locator('[data-testid="reconnect-count"]');
    await expect(reconnectCount).toBeVisible();
    
    // 验证重连间隔递增
    const reconnectInterval = this.page.locator('[data-testid="reconnect-interval"]');
    await expect(reconnectInterval).toBeVisible();
  }

  /**
   * 验证连接超时处理
   */
  async verifyConnectionTimeoutHandling(): Promise<void> {
    // 验证超时错误消息
    const timeoutMessage = this.page.locator('[data-testid="timeout-error"]');
    await expect(timeoutMessage).toBeVisible();
    await expect(timeoutMessage).toContainText(/超时|timeout/i);
    
    // 验证重试按钮
    const retryButton = this.page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
  }

  /**
   * 验证网络质量指示器
   */
  async verifyNetworkQualityIndicator(): Promise<void> {
    const qualityIndicator = this.page.locator('[data-testid="network-quality"]');
    await expect(qualityIndicator).toBeVisible();
    
    // 验证网络质量等级（优秀、良好、一般、差）
    const qualityText = await qualityIndicator.textContent();
    expect(qualityText).toMatch(/优秀|良好|一般|差|excellent|good|fair|poor/i);
  }

  /**
   * 验证离线功能可用性
   */
  async verifyOfflineFunctionality(): Promise<void> {
    // 验证离线模式下可用的功能
    const offlineFeatures = this.page.locator('[data-testid="offline-features"]');
    await expect(offlineFeatures).toBeVisible();
    
    // 验证查看缓存数据功能
    const viewCachedData = this.page.locator('[data-testid="view-cached-data"]');
    await expect(viewCachedData).toBeVisible();
    await expect(viewCachedData).toBeEnabled();
    
    // 验证离线表单填写功能
    const offlineForm = this.page.locator('[data-testid="offline-form"]');
    await expect(offlineForm).toBeVisible();
  }

  /**
   * 验证网络错误恢复策略
   */
  async verifyNetworkErrorRecovery(): Promise<void> {
    // 验证指数退避重试
    const retryStrategy = this.page.locator('[data-testid="retry-strategy"]');
    await expect(retryStrategy).toBeVisible();
    
    // 验证最大重试次数限制
    const maxRetries = this.page.locator('[data-testid="max-retries"]');
    await expect(maxRetries).toBeVisible();
    
    // 验证熔断器机制
    const circuitBreaker = this.page.locator('[data-testid="circuit-breaker"]');
    await expect(circuitBreaker).toBeVisible();
  }

  /**
   * 测试网络中断恢复流程
   */
  async testNetworkInterruptionRecovery(): Promise<void> {
    // 1. 模拟网络中断
    await this.simulateNetworkDisconnection();
    
    // 2. 验证离线状态
    await this.verifyOfflineIndicator();
    
    // 3. 验证离线功能
    await this.verifyOfflineFunctionality();
    
    // 4. 模拟网络恢复
    await this.simulateNetworkReconnection();
    
    // 5. 验证在线状态
    await this.verifyOnlineIndicator();
    
    // 6. 验证数据同步
    await this.verifyDataSynchronization();
  }

  /**
   * 创建网络错误场景
   */
  createNetworkErrorScenarios(): Array<{
    name: string;
    description: string;
    setup: () => Promise<void>;
    verify: () => Promise<void>;
    cleanup: () => Promise<void>;
  }> {
    return [
      {
        name: '网络完全中断',
        description: '模拟网络完全断开的情况',
        setup: async () => {
          await this.simulateNetworkDisconnection();
        },
        verify: async () => {
          await this.verifyOfflineIndicator();
          await this.verifyOfflineFunctionality();
        },
        cleanup: async () => {
          await this.simulateNetworkReconnection();
        }
      },
      {
        name: '连接超时',
        description: '模拟网络连接超时的情况',
        setup: async () => {
          await this.simulateConnectionTimeout('/api/**', 5000);
        },
        verify: async () => {
          await this.verifyConnectionTimeoutHandling();
        },
        cleanup: async () => {
          await this.page.unroute('/api/**');
        }
      },
      {
        name: 'DNS解析失败',
        description: '模拟DNS解析失败的情况',
        setup: async () => {
          await this.simulateDNSFailure('/api/**');
        },
        verify: async () => {
          await expect(this.page.locator('[data-testid="dns-error"]')).toBeVisible();
        },
        cleanup: async () => {
          await this.page.unroute('/api/**');
        }
      },
      {
        name: '网络不稳定',
        description: '模拟网络连接不稳定的情况',
        setup: async () => {
          await this.simulateUnstableNetwork('/api/**', 0.7);
        },
        verify: async () => {
          await this.verifyReconnectionMechanism();
        },
        cleanup: async () => {
          await this.page.unroute('/api/**');
        }
      },
      {
        name: '慢网络连接',
        description: '模拟网络连接缓慢的情况',
        setup: async () => {
          await this.simulateSlowNetwork('/api/**', 3000);
        },
        verify: async () => {
          await this.verifyNetworkQualityIndicator();
        },
        cleanup: async () => {
          await this.page.unroute('/api/**');
        }
      }
    ];
  }

  /**
   * 验证Service Worker缓存策略
   */
  async verifyServiceWorkerCache(): Promise<void> {
    // 检查Service Worker是否注册
    const swRegistration = await this.page.evaluate(() => {
      return navigator.serviceWorker.getRegistration();
    });
    
    expect(swRegistration).toBeTruthy();
    
    // 验证缓存策略
    const cacheNames = await this.page.evaluate(async () => {
      return await caches.keys();
    });
    
    expect(cacheNames.length).toBeGreaterThan(0);
  }

  /**
   * 验证离线页面显示
   */
  async verifyOfflinePage(): Promise<void> {
    // 在离线状态下访问新页面
    await this.simulateNetworkDisconnection();
    await this.page.goto('/offline-test-page');
    
    // 验证离线页面显示
    await expect(this.page.locator('[data-testid="offline-page"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="offline-message"]')).toContainText('当前处于离线状态');
  }

  /**
   * 验证网络状态变化监听
   */
  async verifyNetworkStatusListener(): Promise<void> {
    // 验证网络状态监听器已注册
    const hasListener = await this.page.evaluate(() => {
      return (window as any).networkStatusListenerRegistered === true;
    });
    
    expect(hasListener).toBe(true);
    
    // 测试状态变化响应
    await this.simulateNetworkDisconnection();
    await expect(this.page.locator('[data-testid="network-status-changed"]')).toBeVisible();
  }

  /**
   * 验证请求队列管理
   */
  async verifyRequestQueueManagement(): Promise<void> {
    // 在离线状态下发起多个请求
    await this.simulateNetworkDisconnection();
    
    // 发起请求
    await this.page.click('[data-testid="api-request-1"]');
    await this.page.click('[data-testid="api-request-2"]');
    await this.page.click('[data-testid="api-request-3"]');
    
    // 验证请求队列
    const queueLength = await this.page.evaluate(() => {
      return (window as any).requestQueue?.length || 0;
    });
    
    expect(queueLength).toBe(3);
    
    // 恢复网络并验证队列处理
    await this.simulateNetworkReconnection();
    
    // 等待队列处理完成
    await expect(this.page.locator('[data-testid="queue-processed"]')).toBeVisible({ timeout: 10000 });
  }
}