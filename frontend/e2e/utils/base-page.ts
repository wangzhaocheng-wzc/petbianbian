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
    await this.page.goto(path);
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
    return await response.json().catch(() => response.text());
  }

  /**
   * 等待导航完成
   */
  async waitForNavigation(timeout: number = this.timeout): Promise<void> {
    await this.page.waitForLoadState('load', { timeout });
  }

  /**
   * 等待认证状态变化（用于登录/登出后验证）
   */
  async waitForAuthStateChange(targetState: 'logged-in' | 'logged-out', timeout: number = 15000): Promise<void> {
    if (targetState === 'logged-in') {
      await this.page.locator('[data-testid="user-menu"]').waitFor({ state: 'visible', timeout });
    } else {
      await this.page.locator('[data-testid="login-form"]').waitFor({ state: 'visible', timeout });
    }
  }

  /**
   * 等待加载完成标志消失
   */
  async waitForLoadingComplete(loadingSelector: string, timeout: number = 15000): Promise<void> {
    const loading = this.page.locator(loadingSelector);
    try {
      await loading.waitFor({ state: 'hidden', timeout });
    } catch {
      // 如果一直显示，尝试读取相关错误信息
      const errorElement = this.page.locator('[data-testid="auth-error"]');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        throw new Error(`加载未完成，错误提示: ${errorText}`);
      }
    }
  }
}