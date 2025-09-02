/**
 * 测试执行录制和回放工具
 * 记录测试执行过程，支持回放和调试
 */

import { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface TestAction {
  id: string;
  timestamp: number;
  type: 'click' | 'fill' | 'select' | 'navigate' | 'wait' | 'screenshot' | 'assertion';
  selector?: string;
  value?: any;
  url?: string;
  screenshot?: string;
  metadata?: Record<string, any>;
}

export interface TestRecording {
  id: string;
  testName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'recording' | 'completed' | 'failed';
  actions: TestAction[];
  screenshots: string[];
  errors: TestError[];
  metadata: {
    browser: string;
    viewport: { width: number; height: number };
    userAgent: string;
    url: string;
  };
}

export interface TestError {
  timestamp: number;
  message: string;
  stack?: string;
  screenshot?: string;
  actionId?: string;
}

export interface PlaybackOptions {
  speed: number; // 播放速度倍数
  pauseOnError: boolean;
  skipScreenshots: boolean;
  stepMode: boolean; // 步进模式
  breakpoints: string[]; // 断点（action IDs）
}

export class TestRecorder {
  private recordings: Map<string, TestRecording> = new Map();
  private activeRecording: TestRecording | null = null;
  private actionCounter = 0;
  private recordingDir: string;

  constructor(recordingDir: string = 'frontend/e2e/recordings') {
    this.recordingDir = recordingDir;
    this.ensureRecordingDir();
  }

  /**
   * 开始录制测试
   */
  async startRecording(
    page: Page, 
    testName: string, 
    options: { captureScreenshots?: boolean } = {}
  ): Promise<string> {
    const recordingId = this.generateRecordingId();
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    
    this.activeRecording = {
      id: recordingId,
      testName,
      startTime: Date.now(),
      status: 'recording',
      actions: [],
      screenshots: [],
      errors: [],
      metadata: {
        browser: page.context().browser()?.browserType().name() || 'unknown',
        viewport,
        userAgent: await page.evaluate(() => navigator.userAgent),
        url: page.url()
      }
    };

    this.recordings.set(recordingId, this.activeRecording);

    // 设置页面事件监听
    await this.setupPageListeners(page, options.captureScreenshots);

    return recordingId;
  }

  /**
   * 停止录制
   */
  async stopRecording(): Promise<TestRecording | null> {
    if (!this.activeRecording) {
      return null;
    }

    this.activeRecording.endTime = Date.now();
    this.activeRecording.duration = this.activeRecording.endTime - this.activeRecording.startTime;
    this.activeRecording.status = 'completed';

    // 保存录制文件
    await this.saveRecording(this.activeRecording);

    const recording = this.activeRecording;
    this.activeRecording = null;
    this.actionCounter = 0;

    return recording;
  }

  /**
   * 记录动作
   */
  recordAction(action: Omit<TestAction, 'id' | 'timestamp'>): void {
    if (!this.activeRecording) {
      return;
    }

    const testAction: TestAction = {
      id: `action_${++this.actionCounter}`,
      timestamp: Date.now(),
      ...action
    };

    this.activeRecording.actions.push(testAction);
  }

  /**
   * 记录错误
   */
  recordError(error: Omit<TestError, 'timestamp'>): void {
    if (!this.activeRecording) {
      return;
    }

    const testError: TestError = {
      timestamp: Date.now(),
      ...error
    };

    this.activeRecording.errors.push(testError);
  }

  /**
   * 回放录制
   */
  async playback(
    page: Page, 
    recordingId: string, 
    options: Partial<PlaybackOptions> = {}
  ): Promise<void> {
    const recording = await this.loadRecording(recordingId);
    if (!recording) {
      throw new Error(`录制文件不存在: ${recordingId}`);
    }

    const playbackOptions: PlaybackOptions = {
      speed: 1,
      pauseOnError: false,
      skipScreenshots: false,
      stepMode: false,
      breakpoints: [],
      ...options
    };

    console.log(`开始回放录制: ${recording.testName}`);

    for (let i = 0; i < recording.actions.length; i++) {
      const action = recording.actions[i];
      
      // 检查断点
      if (playbackOptions.breakpoints.includes(action.id)) {
        console.log(`断点暂停: ${action.id}`);
        if (playbackOptions.stepMode) {
          await this.waitForUserInput();
        }
      }

      try {
        await this.executeAction(page, action, playbackOptions);
        
        // 步进模式暂停
        if (playbackOptions.stepMode) {
          console.log(`执行动作: ${action.type} - ${action.selector || action.url}`);
          await this.waitForUserInput();
        }
        
        // 控制播放速度
        if (playbackOptions.speed < 1) {
          const delay = (1 / playbackOptions.speed - 1) * 1000;
          await page.waitForTimeout(delay);
        }
        
      } catch (error) {
        console.error(`回放动作失败: ${action.id}`, error);
        
        if (playbackOptions.pauseOnError) {
          console.log('错误暂停，等待用户输入...');
          await this.waitForUserInput();
        }
      }
    }

    console.log('录制回放完成');
  }

  /**
   * 获取录制列表
   */
  async getRecordings(): Promise<TestRecording[]> {
    const recordingFiles = await this.getRecordingFiles();
    const recordings: TestRecording[] = [];

    for (const file of recordingFiles) {
      try {
        const recording = await this.loadRecording(path.basename(file, '.json'));
        if (recording) {
          recordings.push(recording);
        }
      } catch (error) {
        console.warn(`加载录制文件失败: ${file}`, error);
      }
    }

    return recordings.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * 删除录制
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    const filePath = path.join(this.recordingDir, `${recordingId}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.recordings.delete(recordingId);
        return true;
      }
    } catch (error) {
      console.error(`删除录制文件失败: ${recordingId}`, error);
    }
    
    return false;
  }

  /**
   * 导出录制为代码
   */
  async exportToCode(recordingId: string, format: 'playwright' | 'puppeteer' = 'playwright'): Promise<string> {
    const recording = await this.loadRecording(recordingId);
    if (!recording) {
      throw new Error(`录制文件不存在: ${recordingId}`);
    }

    switch (format) {
      case 'playwright':
        return this.generatePlaywrightCode(recording);
      case 'puppeteer':
        return this.generatePuppeteerCode(recording);
      default:
        throw new Error(`不支持的代码格式: ${format}`);
    }
  }

  // 私有方法
  private async setupPageListeners(page: Page, captureScreenshots: boolean = false): Promise<void> {
    // 监听页面导航
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        this.recordAction({
          type: 'navigate',
          url: frame.url()
        });
      }
    });

    // 监听点击事件
    await page.addInitScript(() => {
      document.addEventListener('click', (event) => {
        const target = event.target as Element;
        const selector = target.tagName.toLowerCase() + 
          (target.id ? `#${target.id}` : '') +
          (target.className ? `.${target.className.split(' ').join('.')}` : '');
        
        (window as any).__recordClick = { selector, timestamp: Date.now() };
      });
    });

    // 监听输入事件
    await page.addInitScript(() => {
      document.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        const selector = target.tagName.toLowerCase() + 
          (target.id ? `#${target.id}` : '') +
          (target.className ? `.${target.className.split(' ').join('.')}` : '');
        
        (window as any).__recordInput = { 
          selector, 
          value: target.value, 
          timestamp: Date.now() 
        };
      });
    });

    // 定期检查录制的事件
    const checkInterval = setInterval(async () => {
      if (!this.activeRecording) {
        clearInterval(checkInterval);
        return;
      }

      try {
        // 检查点击事件
        const clickData = await page.evaluate(() => {
          const data = (window as any).__recordClick;
          (window as any).__recordClick = null;
          return data;
        });

        if (clickData) {
          this.recordAction({
            type: 'click',
            selector: clickData.selector
          });

          if (captureScreenshots) {
            const screenshot = await this.captureScreenshot(page);
            this.recordAction({
              type: 'screenshot',
              screenshot
            });
          }
        }

        // 检查输入事件
        const inputData = await page.evaluate(() => {
          const data = (window as any).__recordInput;
          (window as any).__recordInput = null;
          return data;
        });

        if (inputData) {
          this.recordAction({
            type: 'fill',
            selector: inputData.selector,
            value: inputData.value
          });
        }

      } catch (error) {
        // 页面可能已关闭，停止监听
        clearInterval(checkInterval);
      }
    }, 100);
  }

  private async executeAction(page: Page, action: TestAction, options: PlaybackOptions): Promise<void> {
    switch (action.type) {
      case 'navigate':
        if (action.url) {
          await page.goto(action.url);
        }
        break;
        
      case 'click':
        if (action.selector) {
          await page.click(action.selector);
        }
        break;
        
      case 'fill':
        if (action.selector && action.value !== undefined) {
          await page.fill(action.selector, String(action.value));
        }
        break;
        
      case 'select':
        if (action.selector && action.value !== undefined) {
          await page.selectOption(action.selector, action.value);
        }
        break;
        
      case 'wait':
        if (action.value) {
          await page.waitForTimeout(action.value);
        }
        break;
        
      case 'screenshot':
        if (!options.skipScreenshots && action.screenshot) {
          // 显示截图或进行对比
          console.log(`截图: ${action.screenshot}`);
        }
        break;
        
      case 'assertion':
        // 执行断言
        if (action.selector && action.value) {
          const element = await page.locator(action.selector);
          // 根据断言类型执行相应检查
        }
        break;
    }
  }

  private async captureScreenshot(page: Page): Promise<string> {
    const timestamp = Date.now();
    const filename = `screenshot_${timestamp}.png`;
    const screenshotPath = path.join(this.recordingDir, 'screenshots', filename);
    
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await page.screenshot({ path: screenshotPath });
    
    if (this.activeRecording) {
      this.activeRecording.screenshots.push(filename);
    }
    
    return filename;
  }

  private async saveRecording(recording: TestRecording): Promise<void> {
    const filePath = path.join(this.recordingDir, `${recording.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(recording, null, 2), 'utf-8');
  }

  private async loadRecording(recordingId: string): Promise<TestRecording | null> {
    const filePath = path.join(this.recordingDir, `${recordingId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as TestRecording;
    } catch (error) {
      console.error(`加载录制文件失败: ${recordingId}`, error);
      return null;
    }
  }

  private async getRecordingFiles(): Promise<string[]> {
    if (!fs.existsSync(this.recordingDir)) {
      return [];
    }
    
    const files = await fs.promises.readdir(this.recordingDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(this.recordingDir, file));
  }

  private generateRecordingId(): string {
    return `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async waitForUserInput(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  private ensureRecordingDir(): void {
    if (!fs.existsSync(this.recordingDir)) {
      fs.mkdirSync(this.recordingDir, { recursive: true });
    }
  }

  private generatePlaywrightCode(recording: TestRecording): string {
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('${recording.testName}', async ({ page }) => {\n`;
    
    recording.actions.forEach(action => {
      switch (action.type) {
        case 'navigate':
          code += `  await page.goto('${action.url}');\n`;
          break;
        case 'click':
          code += `  await page.click('${action.selector}');\n`;
          break;
        case 'fill':
          code += `  await page.fill('${action.selector}', '${action.value}');\n`;
          break;
        case 'wait':
          code += `  await page.waitForTimeout(${action.value});\n`;
          break;
      }
    });
    
    code += `});\n`;
    return code;
  }

  private generatePuppeteerCode(recording: TestRecording): string {
    let code = `const puppeteer = require('puppeteer');\n\n`;
    code += `(async () => {\n`;
    code += `  const browser = await puppeteer.launch();\n`;
    code += `  const page = await browser.newPage();\n`;
    
    recording.actions.forEach(action => {
      switch (action.type) {
        case 'navigate':
          code += `  await page.goto('${action.url}');\n`;
          break;
        case 'click':
          code += `  await page.click('${action.selector}');\n`;
          break;
        case 'fill':
          code += `  await page.type('${action.selector}', '${action.value}');\n`;
          break;
        case 'wait':
          code += `  await page.waitForTimeout(${action.value});\n`;
          break;
      }
    });
    
    code += `  await browser.close();\n`;
    code += `})();\n`;
    return code;
  }
}

// 导出单例实例
export const testRecorder = new TestRecorder();