import { Page, Locator, expect } from '@playwright/test';

/**
 * 页面对象基类
 * 提供通用的页面操作方法和错误处理
 */
export class BasePage {
  protected page: Page;
  protected baseURL: string;
  protected timeout: number;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
    this.timeout = 30000; // 默认超时时间
  }

  /**
   * 导航到指定路径
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
    await this.waitForPageLoad();
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * 等待元素可见
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * 等待元素可点击
   */
  async waitForClickable(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await expect(element).toBeEnabled();
    return element;
  }

  /**
   * 安全点击元素（带重试机制）
   */
  async safeClick(selector: string, retries: number = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const element = await this.waitForClickable(selector);
        await element.click();
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * 安全填写表单字段
   */
  async safeFill(selector: string, value: string, retries: number = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const element = await this.waitForElement(selector);
        await element.clear();
        await element.fill(value);
        
        // 验证输入是否成功
        const inputValue = await element.inputValue();
        if (inputValue === value) return;
        
        throw new Error(`Failed to fill field with value: ${value}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * 获取元素文本内容
   */
  async getElementText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return await element.textContent() || '';
  }

  /**
   * 检查元素是否存在
   */
  async isElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 截图（用于调试和错误记录）
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * 等待网络请求完成
   */
  async waitForNetworkIdle(timeout: number = 30000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 等待特定API响应
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 30000): Promise<any> {
    const response = await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
    return await response.json();
  }

  /**
   * 模拟移动端触摸操作
   */
  async touchTap(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.tap();
  }

  /**
   * 滚动到元素位置
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * 获取当前页面URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * 获取页面标题
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * 检查页面是否包含文本
   */
  async hasText(text: string): Promise<boolean> {
    try {
      await expect(this.page).toContainText(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待页面导航完成
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForURL('**', { waitUntil: 'networkidle' });
  }

  /**
   * 处理弹窗对话框
   */
  async handleDialog(accept: boolean = true, promptText?: string): Promise<void> {
    this.page.on('dialog', async dialog => {
      if (promptText && dialog.type() === 'prompt') {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * 清除所有cookies
   */
  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  /**
   * 设置视口大小
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * 模拟网络条件
   */
  async simulateNetworkConditions(offline: boolean = false, downloadThroughput?: number): Promise<void> {
    await this.page.route('**/*', route => {
      if (offline) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  /**
   * 验证页面状态
   */
  async verifyPageState(expectedUrl?: string, expectedTitle?: string): Promise<void> {
    if (expectedUrl) {
      await expect(this.page).toHaveURL(new RegExp(expectedUrl));
    }
    if (expectedTitle) {
      await expect(this.page).toHaveTitle(expectedTitle);
    }
  }

  /**
   * 等待加载指示器消失
   */
  async waitForLoadingComplete(loadingSelector: string = '[data-testid="loading"]'): Promise<void> {
    try {
      await this.page.locator(loadingSelector).waitFor({ state: 'hidden', timeout: this.timeout });
    } catch {
      // 如果没有找到加载指示器，继续执行
    }
  }

  /**
   * 错误恢复 - 刷新页面并重试操作
   */
  async retryWithRefresh<T>(operation: () => Promise<T>, maxRetries: number = 2): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        console.log(`操作失败，刷新页面重试 (${i + 1}/${maxRetries})`);
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.waitForPageLoad();
      }
    }
    throw new Error('重试次数已用完');
  }

  /**
   * 捕获页面错误信息
   */
  async capturePageErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('pageerror', error => {
      errors.push(`页面错误: ${error.message}`);
    });
    
    this.page.on('requestfailed', request => {
      errors.push(`请求失败: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    return errors;
  }

  /**
   * 验证表单验证错误
   */
  async getFormErrors(errorSelector: string = '.error-message, .text-red-500'): Promise<string[]> {
    const errorElements = this.page.locator(errorSelector);
    const count = await errorElements.count();
    const errors: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const errorText = await errorElements.nth(i).textContent();
      if (errorText) {
        errors.push(errorText.trim());
      }
    }
    
    return errors;
  }

  /**
   * 等待并验证成功消息
   */
  async waitForSuccessMessage(messageSelector: string = '[data-testid="success-message"]', timeout: number = 10000): Promise<string> {
    const element = await this.waitForElement(messageSelector, timeout);
    return await element.textContent() || '';
  }

  /**
   * 等待并验证错误消息
   */
  async waitForErrorMessage(messageSelector: string = '[data-testid="error-message"]', timeout: number = 10000): Promise<string> {
    const element = await this.waitForElement(messageSelector, timeout);
    return await element.textContent() || '';
  }

  /**
   * 检查页面是否已加载完成
   */
  async isPageLoaded(): Promise<boolean> {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取页面性能指标
   */
  async getPerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
  }

  /**
   * 设置默认超时时间
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * 获取当前超时时间
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * 获取页面对象（用于需要直接访问page的场景）
   */
  getPage(): Page {
    return this.page;
  }
}