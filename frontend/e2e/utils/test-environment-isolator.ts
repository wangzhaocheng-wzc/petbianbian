/**
 * 测试环境隔离器
 * 确保测试之间的环境隔离和状态管理
 */

import { Page, BrowserContext } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

export interface IsolationConfig {
  clearCookies: boolean;
  clearLocalStorage: boolean;
  clearSessionStorage: boolean;
  clearIndexedDB: boolean;
  resetViewport: boolean;
  clearNetworkCache: boolean;
  resetPermissions: boolean;
  enableLogging: boolean;
}

export interface TestState {
  testName: string;
  startTime: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  viewport: { width: number; height: number };
  url: string;
}

export class TestEnvironmentIsolator {
  private config: IsolationConfig;
  private stateHistory: TestState[] = [];
  private currentState: TestState | null = null;

  constructor(config: Partial<IsolationConfig> = {}) {
    this.config = {
      clearCookies: true,
      clearLocalStorage: true,
      clearSessionStorage: true,
      clearIndexedDB: true,
      resetViewport: true,
      clearNetworkCache: true,
      resetPermissions: true,
      enableLogging: false,
      ...config
    };
  }

  /**
   * 测试开始前的环境准备
   */
  async prepareTestEnvironment(
    page: Page,
    context: BrowserContext,
    testName: string
  ): Promise<void> {
    if (this.config.enableLogging) {
      console.log(`🔧 准备测试环境: ${testName}`);
    }

    // 保存当前状态
    await this.captureCurrentState(page, testName);

    // 清理环境
    await this.cleanupEnvironment(page, context);

    // 重置基础设置
    await this.resetBasicSettings(page, context);

    if (this.config.enableLogging) {
      console.log(`✅ 测试环境准备完成: ${testName}`);
    }
  }

  /**
   * 测试结束后的环境清理
   */
  async cleanupTestEnvironment(
    page: Page,
    context: BrowserContext,
    testName: string
  ): Promise<void> {
    if (this.config.enableLogging) {
      console.log(`🧹 清理测试环境: ${testName}`);
    }

    try {
      // 清理测试产生的数据
      await this.cleanupTestData(page);

      // 清理环境状态
      await this.cleanupEnvironment(page, context);

      // 保存清理后的状态
      await this.captureCurrentState(page, `${testName}_cleanup`);

    } catch (error) {
      console.warn(`清理测试环境时出现错误: ${error}`);
    }

    if (this.config.enableLogging) {
      console.log(`✅ 测试环境清理完成: ${testName}`);
    }
  }

  /**
   * 捕获当前状态
   */
  private async captureCurrentState(page: Page, testName: string): Promise<void> {
    try {
      const state: TestState = {
        testName,
        startTime: new Date().toISOString(),
        cookies: await page.context().cookies(),
        localStorage: await this.getLocalStorage(page),
        sessionStorage: await this.getSessionStorage(page),
        viewport: page.viewportSize() || { width: 1280, height: 720 },
        url: page.url()
      };

      this.currentState = state;
      this.stateHistory.push(state);

      // 保留最近50个状态记录
      if (this.stateHistory.length > 50) {
        this.stateHistory = this.stateHistory.slice(-50);
      }
    } catch (error) {
      console.warn(`捕获状态失败: ${error}`);
    }
  }

  /**
   * 获取localStorage内容
   */
  private async getLocalStorage(page: Page): Promise<Record<string, string>> {
    try {
      return await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            storage[key] = localStorage.getItem(key) || '';
          }
        }
        return storage;
      });
    } catch (error) {
      return {};
    }
  }

  /**
   * 获取sessionStorage内容
   */
  private async getSessionStorage(page: Page): Promise<Record<string, string>> {
    try {
      return await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            storage[key] = sessionStorage.getItem(key) || '';
          }
        }
        return storage;
      });
    } catch (error) {
      return {};
    }
  }

  /**
   * 清理环境
   */
  private async cleanupEnvironment(page: Page, context: BrowserContext): Promise<void> {
    const cleanupTasks: Promise<void>[] = [];

    // 清理Cookies
    if (this.config.clearCookies) {
      cleanupTasks.push(this.clearCookies(context));
    }

    // 清理本地存储
    if (this.config.clearLocalStorage) {
      cleanupTasks.push(this.clearLocalStorage(page));
    }

    // 清理会话存储
    if (this.config.clearSessionStorage) {
      cleanupTasks.push(this.clearSessionStorage(page));
    }

    // 清理IndexedDB
    if (this.config.clearIndexedDB) {
      cleanupTasks.push(this.clearIndexedDB(page));
    }

    // 清理网络缓存
    if (this.config.clearNetworkCache) {
      cleanupTasks.push(this.clearNetworkCache(page));
    }

    await Promise.all(cleanupTasks);
  }

  /**
   * 清理Cookies
   */
  private async clearCookies(context: BrowserContext): Promise<void> {
    try {
      await context.clearCookies();
    } catch (error) {
      console.warn(`清理Cookies失败: ${error}`);
    }
  }

  /**
   * 清理localStorage
   */
  private async clearLocalStorage(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        localStorage.clear();
      });
    } catch (error) {
      console.warn(`清理localStorage失败: ${error}`);
    }
  }

  /**
   * 清理sessionStorage
   */
  private async clearSessionStorage(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        sessionStorage.clear();
      });
    } catch (error) {
      console.warn(`清理sessionStorage失败: ${error}`);
    }
  }

  /**
   * 清理IndexedDB
   */
  private async clearIndexedDB(page: Page): Promise<void> {
    try {
      await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            }
            return Promise.resolve();
          })
        );
      });
    } catch (error) {
      console.warn(`清理IndexedDB失败: ${error}`);
    }
  }

  /**
   * 清理网络缓存
   */
  private async clearNetworkCache(page: Page): Promise<void> {
    try {
      // 通过CDP清理缓存
      const client = await page.context().newCDPSession(page);
      await client.send('Network.clearBrowserCache');
      await client.detach();
    } catch (error) {
      console.warn(`清理网络缓存失败: ${error}`);
    }
  }

  /**
   * 重置基础设置
   */
  private async resetBasicSettings(page: Page, context: BrowserContext): Promise<void> {
    // 重置视口
    if (this.config.resetViewport) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // 重置权限
    if (this.config.resetPermissions) {
      try {
        await context.clearPermissions();
      } catch (error) {
        console.warn(`重置权限失败: ${error}`);
      }
    }

    // 设置默认超时
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  }

  /**
   * 清理测试数据
   */
  private async cleanupTestData(page: Page): Promise<void> {
    try {
      // 清理测试用户数据
      await page.evaluate(() => {
        // 清理可能的测试标记
        const testElements = document.querySelectorAll('[data-testid*="test-"]');
        testElements.forEach(el => el.remove());

        // 清理可能的测试类名
        document.body.classList.remove('test-mode', 'testing');
      });

      // 如果页面有清理API，调用它
      try {
        await page.evaluate(() => {
          // @ts-ignore
          if (window.cleanupTestData) {
            // @ts-ignore
            window.cleanupTestData();
          }
        });
      } catch (error) {
        // 清理API不存在，忽略
      }
    } catch (error) {
      console.warn(`清理测试数据失败: ${error}`);
    }
  }

  /**
   * 恢复到指定状态
   */
  async restoreState(page: Page, context: BrowserContext, stateName: string): Promise<void> {
    const state = this.stateHistory.find(s => s.testName === stateName);
    if (!state) {
      throw new Error(`未找到状态: ${stateName}`);
    }

    try {
      // 恢复Cookies
      await context.addCookies(state.cookies);

      // 恢复localStorage
      await page.evaluate((storage) => {
        Object.entries(storage).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      }, state.localStorage);

      // 恢复sessionStorage
      await page.evaluate((storage) => {
        Object.entries(storage).forEach(([key, value]) => {
          sessionStorage.setItem(key, value);
        });
      }, state.sessionStorage);

      // 恢复视口
      await page.setViewportSize(state.viewport);

      // 导航到原URL
      if (state.url && state.url !== 'about:blank') {
        await page.goto(state.url);
      }

      if (this.config.enableLogging) {
        console.log(`✅ 状态已恢复: ${stateName}`);
      }
    } catch (error) {
      throw new Error(`恢复状态失败: ${error}`);
    }
  }

  /**
   * 获取状态历史
   */
  getStateHistory(): TestState[] {
    return [...this.stateHistory];
  }

  /**
   * 保存状态历史到文件
   */
  async saveStateHistory(filePath: string): Promise<void> {
    try {
      await fs.writeFile(filePath, JSON.stringify(this.stateHistory, null, 2));
      if (this.config.enableLogging) {
        console.log(`状态历史已保存到: ${filePath}`);
      }
    } catch (error) {
      console.error(`保存状态历史失败: ${error}`);
    }
  }

  /**
   * 从文件加载状态历史
   */
  async loadStateHistory(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.stateHistory = JSON.parse(content);
      if (this.config.enableLogging) {
        console.log(`状态历史已从文件加载: ${filePath}`);
      }
    } catch (error) {
      console.warn(`加载状态历史失败: ${error}`);
    }
  }

  /**
   * 检查环境是否干净
   */
  async isEnvironmentClean(page: Page): Promise<boolean> {
    try {
      const cookies = await page.context().cookies();
      const localStorage = await this.getLocalStorage(page);
      const sessionStorage = await this.getSessionStorage(page);

      return cookies.length === 0 &&
             Object.keys(localStorage).length === 0 &&
             Object.keys(sessionStorage).length === 0;
    } catch (error) {
      return false;
    }
  }
}