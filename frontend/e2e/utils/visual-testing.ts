/**
 * 视觉回归测试工具类
 * 提供截图捕获、对比和管理功能
 */

import { Page, Locator, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

export interface VisualTestOptions {
  /** 截图名称 */
  name: string;
  /** 是否全页面截图 */
  fullPage?: boolean;
  /** 截图区域选择器 */
  clip?: { x: number; y: number; width: number; height: number };
  /** 对比阈值 (0-1) */
  threshold?: number;
  /** 是否禁用动画 */
  animations?: 'disabled' | 'allow';
  /** 遮罩区域选择器 */
  mask?: string[];
  /** 截图质量 (0-100) */
  quality?: number;
}

export interface ComparisonResult {
  /** 是否匹配 */
  matches: boolean;
  /** 差异百分比 */
  diffPercentage: number;
  /** 差异图片路径 */
  diffImagePath?: string;
  /** 错误信息 */
  error?: string;
}

export class VisualTesting {
  private page: Page;
  private baselineDir: string;
  private actualDir: string;
  private diffDir: string;

  constructor(page: Page, testName: string = 'default') {
    this.page = page;
    this.baselineDir = path.join('test-results', 'visual-baselines', testName);
    this.actualDir = path.join('test-results', 'visual-actual', testName);
    this.diffDir = path.join('test-results', 'visual-diff', testName);
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.actualDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  /**
   * 捕获全页面截图
   */
  async captureFullPage(options: VisualTestOptions): Promise<Buffer> {
    await this.ensureDirectories();
    
    // 等待页面稳定
    await this.page.waitForLoadState('networkidle');
    
    // 禁用动画（如果需要）
    if (options.animations === 'disabled') {
      await this.page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
      });
    }

    // 添加遮罩
    if (options.mask && options.mask.length > 0) {
      for (const selector of options.mask) {
        await this.page.locator(selector).evaluateAll(elements => {
          elements.forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
      }
    }

    const screenshotOptions: any = {
      fullPage: options.fullPage ?? true,
      quality: options.quality ?? 90,
      type: 'png'
    };

    if (options.clip) {
      screenshotOptions.clip = options.clip;
    }

    const screenshot = await this.page.screenshot(screenshotOptions);
    
    // 保存实际截图
    const actualPath = path.join(this.actualDir, `${options.name}.png`);
    await fs.writeFile(actualPath, screenshot);
    
    return screenshot;
  }

  /**
   * 捕获组件截图
   */
  async captureComponent(selector: string, options: VisualTestOptions): Promise<Buffer> {
    await this.ensureDirectories();
    
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    
    // 滚动到元素位置
    await element.scrollIntoViewIfNeeded();
    
    // 等待元素稳定
    await this.page.waitForTimeout(500);
    
    const screenshot = await element.screenshot({
      quality: options.quality ?? 90,
      type: 'png'
    });
    
    // 保存实际截图
    const actualPath = path.join(this.actualDir, `${options.name}.png`);
    await fs.writeFile(actualPath, screenshot);
    
    return screenshot;
  }

  /**
   * 对比截图
   */
  async compareScreenshots(options: VisualTestOptions): Promise<ComparisonResult> {
    const baselinePath = path.join(this.baselineDir, `${options.name}.png`);
    const actualPath = path.join(this.actualDir, `${options.name}.png`);
    
    try {
      // 检查基准图片是否存在
      await fs.access(baselinePath);
    } catch {
      // 基准图片不存在，复制当前截图作为基准
      await fs.copyFile(actualPath, baselinePath);
      return {
        matches: true,
        diffPercentage: 0,
        error: 'Baseline created'
      };
    }

    try {
      // 使用 Playwright 的内置对比功能
      await expect(this.page).toHaveScreenshot(`${options.name}.png`, {
        threshold: options.threshold ?? 0.2,
        animations: options.animations ?? 'disabled',
        fullPage: options.fullPage ?? true,
        mask: options.mask ? options.mask.map(s => this.page.locator(s)) : undefined
      });

      return {
        matches: true,
        diffPercentage: 0
      };
    } catch (error: any) {
      return {
        matches: false,
        diffPercentage: this.extractDiffPercentage(error.message),
        error: error.message
      };
    }
  }

  /**
   * 从错误信息中提取差异百分比
   */
  private extractDiffPercentage(errorMessage: string): number {
    const match = errorMessage.match(/(\d+\.?\d*)% diff/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * 更新基准图片
   */
  async updateBaseline(name: string): Promise<void> {
    const actualPath = path.join(this.actualDir, `${name}.png`);
    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    
    try {
      await fs.copyFile(actualPath, baselinePath);
      console.log(`✅ Updated baseline for: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to update baseline for ${name}:`, error);
      throw error;
    }
  }

  /**
   * 批量更新基准图片
   */
  async updateAllBaselines(): Promise<void> {
    try {
      const actualFiles = await fs.readdir(this.actualDir);
      const pngFiles = actualFiles.filter(file => file.endsWith('.png'));
      
      for (const file of pngFiles) {
        const name = file.replace('.png', '');
        await this.updateBaseline(name);
      }
      
      console.log(`✅ Updated ${pngFiles.length} baselines`);
    } catch (error) {
      console.error('❌ Failed to update baselines:', error);
      throw error;
    }
  }

  /**
   * 清理测试截图
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.actualDir, { recursive: true, force: true });
      await fs.rm(this.diffDir, { recursive: true, force: true });
      console.log('✅ Cleaned up visual test artifacts');
    } catch (error) {
      console.error('❌ Failed to cleanup visual test artifacts:', error);
    }
  }

  /**
   * 获取所有基准图片列表
   */
  async getBaselineList(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.baselineDir);
      return files.filter(file => file.endsWith('.png')).map(file => file.replace('.png', ''));
    } catch {
      return [];
    }
  }

  /**
   * 生成视觉测试报告
   */
  async generateReport(): Promise<void> {
    const baselines = await this.getBaselineList();
    const reportPath = path.join('test-results', 'visual-report.html');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-case { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        .images { display: flex; gap: 20px; }
        .image-container { text-align: center; }
        img { max-width: 300px; border: 1px solid #ccc; }
        .pass { border-color: green; }
        .fail { border-color: red; }
    </style>
</head>
<body>
    <h1>Visual Regression Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Total Tests: ${baselines.length}</p>
    
    ${baselines.map(name => `
    <div class="test-case">
        <h3>${name}</h3>
        <div class="images">
            <div class="image-container">
                <h4>Baseline</h4>
                <img src="visual-baselines/${name}.png" alt="Baseline">
            </div>
            <div class="image-container">
                <h4>Actual</h4>
                <img src="visual-actual/${name}.png" alt="Actual">
            </div>
            <div class="image-container">
                <h4>Diff</h4>
                <img src="visual-diff/${name}.png" alt="Diff">
            </div>
        </div>
    </div>
    `).join('')}
</body>
</html>
    `;
    
    await fs.writeFile(reportPath, html);
    console.log(`✅ Visual test report generated: ${reportPath}`);
  }
}

/**
 * 视觉测试辅助函数
 */
export class VisualTestHelper {
  /**
   * 等待页面稳定（无网络请求和动画）
   */
  static async waitForPageStable(page: Page, timeout: number = 5000): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // 等待动画完成
    
    // 等待所有图片加载完成
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });
  }

  /**
   * 隐藏动态内容（时间戳、随机数等）
   */
  static async hideDynamicContent(page: Page, selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      await page.locator(selector).evaluateAll(elements => {
        elements.forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });
    }
  }

  /**
   * 设置固定的时间和随机数种子
   */
  static async mockDynamicValues(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // 固定时间
      const fixedDate = new Date('2024-01-01T00:00:00Z');
      Date.now = () => fixedDate.getTime();
      
      // 固定随机数
      let seed = 1;
      Math.random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };
    });
  }

  /**
   * 等待字体加载完成
   */
  static async waitForFonts(page: Page): Promise<void> {
    await page.evaluate(() => {
      return (document as any).fonts?.ready || Promise.resolve();
    });
  }
}