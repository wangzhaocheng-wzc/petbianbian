/**
 * 增强的等待策略
 * 提供更可靠的元素等待和交互方法
 */

import { Page, Locator, expect } from '@playwright/test';

export interface WaitOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  condition?: () => Promise<boolean>;
  errorMessage?: string;
}

export interface SmartWaitConfig {
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
}

export class EnhancedWaitStrategies {
  private config: SmartWaitConfig;
  private page: Page;

  constructor(page: Page, config: Partial<SmartWaitConfig> = {}) {
    this.page = page;
    this.config = {
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      enableLogging: false,
      ...config
    };
  }

  /**
   * 智能等待元素可见并可交互
   */
  async waitForElementReady(
    selector: string | Locator,
    options: WaitOptions = {}
  ): Promise<Locator> {
    const {
      timeout = this.config.defaultTimeout,
      retries = this.config.maxRetries,
      retryDelay = this.config.retryDelay,
      errorMessage = `Element ${selector} not ready`
    } = options;

    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 等待元素存在
        await locator.waitFor({ state: 'attached', timeout: timeout / 3 });
        
        // 等待元素可见
        await locator.waitFor({ state: 'visible', timeout: timeout / 3 });
        
        // 等待元素稳定（没有动画）
        await this.waitForElementStable(locator, { timeout: timeout / 3 });
        
        // 验证元素确实可交互
        await expect(locator).toBeEnabled({ timeout: 5000 });
        
        if (this.config.enableLogging) {
          console.log(`✅ Element ready: ${selector} (attempt ${attempt})`);
        }
        
        return locator;
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`${errorMessage}: ${error}`);
        }
        
        if (this.config.enableLogging) {
          console.log(`⚠️ Retry ${attempt}/${retries} for element: ${selector}`);
        }
        
        await this.page.waitForTimeout(retryDelay);
      }
    }

    throw new Error(`${errorMessage} after ${retries} attempts`);
  }

  /**
   * 等待元素稳定（位置和大小不再变化）
   */
  async waitForElementStable(
    locator: Locator,
    options: { timeout?: number; stabilityDuration?: number } = {}
  ): Promise<void> {
    const { timeout = 10000, stabilityDuration = 500 } = options;
    const startTime = Date.now();
    let lastBoundingBox: any = null;
    let stableStartTime: number | null = null;

    while (Date.now() - startTime < timeout) {
      try {
        const currentBoundingBox = await locator.boundingBox();
        
        if (currentBoundingBox) {
          if (lastBoundingBox && this.boundingBoxesEqual(lastBoundingBox, currentBoundingBox)) {
            if (stableStartTime === null) {
              stableStartTime = Date.now();
            } else if (Date.now() - stableStartTime >= stabilityDuration) {
              return; // 元素已稳定
            }
          } else {
            stableStartTime = null;
          }
          
          lastBoundingBox = currentBoundingBox;
        }
        
        await this.page.waitForTimeout(50);
      } catch (error) {
        // 元素可能暂时不可见，继续等待
        await this.page.waitForTimeout(100);
      }
    }

    throw new Error(`Element did not stabilize within ${timeout}ms`);
  }

  /**
   * 比较两个边界框是否相等
   */
  private boundingBoxesEqual(box1: any, box2: any): boolean {
    const tolerance = 1; // 1像素的容差
    return Math.abs(box1.x - box2.x) <= tolerance &&
           Math.abs(box1.y - box2.y) <= tolerance &&
           Math.abs(box1.width - box2.width) <= tolerance &&
           Math.abs(box1.height - box2.height) <= tolerance;
  }

  /**
   * 智能点击（处理各种点击问题）
   */
  async smartClick(
    selector: string | Locator,
    options: WaitOptions & { force?: boolean; position?: { x: number; y: number } } = {}
  ): Promise<void> {
    const locator = await this.waitForElementReady(selector, options);
    const { force = false, position, retries = this.config.maxRetries } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 滚动到元素位置
        await locator.scrollIntoViewIfNeeded();
        
        // 等待一小段时间确保滚动完成
        await this.page.waitForTimeout(200);
        
        // 尝试点击
        if (position) {
          await locator.click({ position, force });
        } else {
          await locator.click({ force });
        }
        
        if (this.config.enableLogging) {
          console.log(`✅ Smart click successful: ${selector} (attempt ${attempt})`);
        }
        
        return;
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`Smart click failed for ${selector}: ${error}`);
        }
        
        if (this.config.enableLogging) {
          console.log(`⚠️ Click retry ${attempt}/${retries} for: ${selector}`);
        }
        
        // 尝试不同的点击策略
        if (attempt === 2) {
          // 第二次尝试使用JavaScript点击
          try {
            await locator.evaluate(el => (el as HTMLElement).click());
            return;
          } catch (jsError) {
            // JavaScript点击也失败，继续重试
          }
        }
        
        await this.page.waitForTimeout(this.config.retryDelay);
      }
    }
  }

  /**
   * 智能输入文本
   */
  async smartFill(
    selector: string | Locator,
    text: string,
    options: WaitOptions & { clear?: boolean } = {}
  ): Promise<void> {
    const locator = await this.waitForElementReady(selector, options);
    const { clear = true, retries = this.config.maxRetries } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (clear) {
          await locator.clear();
        }
        
        await locator.fill(text);
        
        // 验证文本是否正确输入
        const inputValue = await locator.inputValue();
        if (inputValue === text) {
          if (this.config.enableLogging) {
            console.log(`✅ Smart fill successful: ${selector} (attempt ${attempt})`);
          }
          return;
        } else {
          throw new Error(`Text not filled correctly. Expected: ${text}, Got: ${inputValue}`);
        }
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`Smart fill failed for ${selector}: ${error}`);
        }
        
        if (this.config.enableLogging) {
          console.log(`⚠️ Fill retry ${attempt}/${retries} for: ${selector}`);
        }
        
        await this.page.waitForTimeout(this.config.retryDelay);
      }
    }
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(options: { timeout?: number; idleTime?: number } = {}): Promise<void> {
    const { timeout = 30000, idleTime = 500 } = options;
    
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      // 如果networkidle失败，使用自定义等待逻辑
      await this.waitForCustomNetworkIdle(timeout, idleTime);
    }
  }

  /**
   * 自定义网络空闲等待
   */
  private async waitForCustomNetworkIdle(timeout: number, idleTime: number): Promise<void> {
    const startTime = Date.now();
    let lastRequestTime = Date.now();
    let requestCount = 0;

    const requestHandler = () => {
      lastRequestTime = Date.now();
      requestCount++;
    };

    this.page.on('request', requestHandler);

    try {
      while (Date.now() - startTime < timeout) {
        if (Date.now() - lastRequestTime >= idleTime) {
          return; // 网络已空闲
        }
        await this.page.waitForTimeout(100);
      }
      
      throw new Error(`Network did not become idle within ${timeout}ms`);
    } finally {
      this.page.off('request', requestHandler);
    }
  }

  /**
   * 等待条件满足
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number; errorMessage?: string } = {}
  ): Promise<void> {
    const {
      timeout = this.config.defaultTimeout,
      interval = 500,
      errorMessage = 'Condition not met'
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return;
        }
      } catch (error) {
        // 条件检查失败，继续等待
      }
      
      await this.page.waitForTimeout(interval);
    }

    throw new Error(`${errorMessage} within ${timeout}ms`);
  }

  /**
   * 等待元素数量稳定
   */
  async waitForElementCountStable(
    selector: string,
    options: { timeout?: number; stabilityDuration?: number; expectedCount?: number } = {}
  ): Promise<number> {
    const { timeout = 10000, stabilityDuration = 1000, expectedCount } = options;
    const startTime = Date.now();
    let lastCount: number | null = null;
    let stableStartTime: number | null = null;

    while (Date.now() - startTime < timeout) {
      const currentCount = await this.page.locator(selector).count();
      
      if (expectedCount !== undefined && currentCount === expectedCount) {
        return currentCount;
      }
      
      if (lastCount === currentCount) {
        if (stableStartTime === null) {
          stableStartTime = Date.now();
        } else if (Date.now() - stableStartTime >= stabilityDuration) {
          return currentCount;
        }
      } else {
        stableStartTime = null;
      }
      
      lastCount = currentCount;
      await this.page.waitForTimeout(100);
    }

    throw new Error(`Element count did not stabilize within ${timeout}ms`);
  }

  /**
   * 智能等待页面加载完成
   */
  async waitForPageReady(options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 30000 } = options;
    
    try {
      // 等待DOM内容加载
      await this.page.waitForLoadState('domcontentloaded', { timeout: timeout / 3 });
      
      // 等待所有资源加载
      await this.page.waitForLoadState('load', { timeout: timeout / 3 });
      
      // 等待网络空闲
      await this.waitForNetworkIdle({ timeout: timeout / 3 });
      
      // 等待JavaScript执行完成
      await this.page.evaluate(() => {
        return new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(true);
          } else {
            window.addEventListener('load', () => resolve(true));
          }
        });
      });
      
      if (this.config.enableLogging) {
        console.log('✅ Page ready');
      }
    } catch (error) {
      throw new Error(`Page not ready within ${timeout}ms: ${error}`);
    }
  }
}