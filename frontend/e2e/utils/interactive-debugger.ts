/**
 * 交互式测试调试工具
 * 提供步进执行、断点、状态检查等调试功能
 */

import { Page, Locator } from '@playwright/test';
import * as readline from 'readline';

export interface DebugSession {
  id: string;
  testName: string;
  startTime: number;
  currentStep: number;
  totalSteps: number;
  breakpoints: Set<number>;
  variables: Map<string, any>;
  status: 'running' | 'paused' | 'stopped';
}

export interface DebugCommand {
  command: string;
  args: string[];
  description: string;
}

export interface StepInfo {
  stepNumber: number;
  description: string;
  action: () => Promise<void>;
  assertions?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

export class InteractiveDebugger {
  private session: DebugSession | null = null;
  private steps: StepInfo[] = [];
  private rl: readline.Interface;
  private page: Page | null = null;
  private isPaused = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.setupCommands();
  }

  /**
   * 开始调试会话
   */
  async startDebugSession(page: Page, testName: string, steps: StepInfo[]): Promise<void> {
    this.page = page;
    this.steps = steps;
    
    this.session = {
      id: this.generateSessionId(),
      testName,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps: steps.length,
      breakpoints: new Set(),
      variables: new Map(),
      status: 'running'
    };

    console.log(`\n🐛 开始调试会话: ${testName}`);
    console.log(`📝 总步骤数: ${steps.length}`);
    console.log(`💡 输入 'help' 查看可用命令\n`);

    await this.runDebugLoop();
  }

  /**
   * 添加断点
   */
  addBreakpoint(stepNumber: number): void {
    if (!this.session) return;
    
    this.session.breakpoints.add(stepNumber);
    console.log(`✅ 在步骤 ${stepNumber} 添加断点`);
  }

  /**
   * 移除断点
   */
  removeBreakpoint(stepNumber: number): void {
    if (!this.session) return;
    
    this.session.breakpoints.delete(stepNumber);
    console.log(`❌ 移除步骤 ${stepNumber} 的断点`);
  }

  /**
   * 设置变量
   */
  setVariable(name: string, value: any): void {
    if (!this.session) return;
    
    this.session.variables.set(name, value);
    console.log(`📝 设置变量 ${name} = ${JSON.stringify(value)}`);
  }

  /**
   * 获取变量
   */
  getVariable(name: string): any {
    if (!this.session) return undefined;
    
    return this.session.variables.get(name);
  }

  /**
   * 检查页面状态
   */
  async inspectPage(): Promise<void> {
    if (!this.page) {
      console.log('❌ 页面不可用');
      return;
    }

    console.log('\n📊 页面状态检查:');
    console.log(`🌐 URL: ${this.page.url()}`);
    console.log(`📏 视窗: ${JSON.stringify(this.page.viewportSize())}`);
    
    try {
      const title = await this.page.title();
      console.log(`📄 标题: ${title}`);
      
      const elementCount = await this.page.locator('*').count();
      console.log(`🔢 元素总数: ${elementCount}`);
      
      const visibleElements = await this.page.locator(':visible').count();
      console.log(`👁️ 可见元素: ${visibleElements}`);
      
    } catch (error) {
      console.log(`❌ 状态检查失败: ${error}`);
    }
  }

  /**
   * 查找元素
   */
  async findElement(selector: string): Promise<void> {
    if (!this.page) {
      console.log('❌ 页面不可用');
      return;
    }

    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();
      
      console.log(`\n🔍 查找元素: ${selector}`);
      console.log(`📊 找到 ${count} 个匹配元素`);
      
      if (count > 0) {
        const first = locator.first();
        const isVisible = await first.isVisible();
        const isEnabled = await first.isEnabled();
        
        console.log(`👁️ 第一个元素可见: ${isVisible}`);
        console.log(`✅ 第一个元素可用: ${isEnabled}`);
        
        try {
          const text = await first.textContent();
          if (text) {
            console.log(`📝 文本内容: "${text.trim()}"`);
          }
        } catch (error) {
          console.log('📝 无法获取文本内容');
        }
      }
      
    } catch (error) {
      console.log(`❌ 查找元素失败: ${error}`);
    }
  }

  /**
   * 执行JavaScript代码
   */
  async executeScript(script: string): Promise<void> {
    if (!this.page) {
      console.log('❌ 页面不可用');
      return;
    }

    try {
      const result = await this.page.evaluate(script);
      console.log(`\n🔧 执行脚本: ${script}`);
      console.log(`📤 返回结果: ${JSON.stringify(result)}`);
    } catch (error) {
      console.log(`❌ 脚本执行失败: ${error}`);
    }
  }

  /**
   * 截图
   */
  async takeScreenshot(filename?: string): Promise<void> {
    if (!this.page) {
      console.log('❌ 页面不可用');
      return;
    }

    const screenshotName = filename || `debug_${Date.now()}.png`;
    const screenshotPath = `frontend/e2e/debug-screenshots/${screenshotName}`;
    
    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 截图已保存: ${screenshotPath}`);
    } catch (error) {
      console.log(`❌ 截图失败: ${error}`);
    }
  }

  /**
   * 显示当前状态
   */
  showStatus(): void {
    if (!this.session) {
      console.log('❌ 没有活跃的调试会话');
      return;
    }

    console.log('\n📊 调试会话状态:');
    console.log(`🆔 会话ID: ${this.session.id}`);
    console.log(`📝 测试名称: ${this.session.testName}`);
    console.log(`📍 当前步骤: ${this.session.currentStep}/${this.session.totalSteps}`);
    console.log(`⏸️ 状态: ${this.session.status}`);
    console.log(`🔴 断点: [${Array.from(this.session.breakpoints).join(', ')}]`);
    console.log(`📝 变量数量: ${this.session.variables.size}`);
    
    if (this.session.variables.size > 0) {
      console.log('\n📝 变量列表:');
      this.session.variables.forEach((value, key) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp(): void {
    console.log('\n📚 可用命令:');
    console.log('  next (n)           - 执行下一步');
    console.log('  continue (c)       - 继续执行到下一个断点');
    console.log('  step (s)           - 步进执行当前步骤');
    console.log('  break <step>       - 在指定步骤添加断点');
    console.log('  unbreak <step>     - 移除指定步骤的断点');
    console.log('  inspect            - 检查页面状态');
    console.log('  find <selector>    - 查找页面元素');
    console.log('  eval <script>      - 执行JavaScript代码');
    console.log('  screenshot [name]  - 截图');
    console.log('  set <name> <value> - 设置变量');
    console.log('  get <name>         - 获取变量值');
    console.log('  status             - 显示当前状态');
    console.log('  help (h)           - 显示帮助信息');
    console.log('  quit (q)           - 退出调试会话');
  }

  // 私有方法
  private async runDebugLoop(): Promise<void> {
    if (!this.session) return;

    while (this.session.status !== 'stopped' && this.session.currentStep < this.session.totalSteps) {
      const currentStep = this.steps[this.session.currentStep];
      
      // 检查是否遇到断点
      if (this.session.breakpoints.has(this.session.currentStep)) {
        console.log(`\n🔴 断点: 步骤 ${this.session.currentStep}`);
        this.session.status = 'paused';
        this.isPaused = true;
      }

      // 显示当前步骤信息
      if (this.isPaused || this.session.status === 'paused') {
        console.log(`\n📍 当前步骤 ${this.session.currentStep}: ${currentStep.description}`);
        await this.waitForCommand();
      } else {
        // 自动执行步骤
        await this.executeStep(currentStep);
        this.session.currentStep++;
      }
    }

    console.log('\n✅ 调试会话完成');
    this.session.status = 'stopped';
  }

  private async waitForCommand(): Promise<void> {
    return new Promise((resolve) => {
      this.rl.question('🐛 debug> ', async (input) => {
        await this.processCommand(input.trim());
        resolve();
      });
    });
  }

  private async processCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(' ');

    switch (command.toLowerCase()) {
      case 'next':
      case 'n':
        await this.executeCurrentStep();
        this.session!.currentStep++;
        this.isPaused = false;
        break;

      case 'continue':
      case 'c':
        this.session!.status = 'running';
        this.isPaused = false;
        break;

      case 'step':
      case 's':
        await this.executeCurrentStep();
        break;

      case 'break':
        if (args[0]) {
          this.addBreakpoint(parseInt(args[0]));
        } else {
          console.log('❌ 请指定步骤号');
        }
        await this.waitForCommand();
        break;

      case 'unbreak':
        if (args[0]) {
          this.removeBreakpoint(parseInt(args[0]));
        } else {
          console.log('❌ 请指定步骤号');
        }
        await this.waitForCommand();
        break;

      case 'inspect':
        await this.inspectPage();
        await this.waitForCommand();
        break;

      case 'find':
        if (args[0]) {
          await this.findElement(args.join(' '));
        } else {
          console.log('❌ 请指定选择器');
        }
        await this.waitForCommand();
        break;

      case 'eval':
        if (args.length > 0) {
          await this.executeScript(args.join(' '));
        } else {
          console.log('❌ 请输入JavaScript代码');
        }
        await this.waitForCommand();
        break;

      case 'screenshot':
        await this.takeScreenshot(args[0]);
        await this.waitForCommand();
        break;

      case 'set':
        if (args.length >= 2) {
          const name = args[0];
          const value = args.slice(1).join(' ');
          try {
            this.setVariable(name, JSON.parse(value));
          } catch {
            this.setVariable(name, value);
          }
        } else {
          console.log('❌ 用法: set <name> <value>');
        }
        await this.waitForCommand();
        break;

      case 'get':
        if (args[0]) {
          const value = this.getVariable(args[0]);
          console.log(`📝 ${args[0]} = ${JSON.stringify(value)}`);
        } else {
          console.log('❌ 请指定变量名');
        }
        await this.waitForCommand();
        break;

      case 'status':
        this.showStatus();
        await this.waitForCommand();
        break;

      case 'help':
      case 'h':
        this.showHelp();
        await this.waitForCommand();
        break;

      case 'quit':
      case 'q':
        this.session!.status = 'stopped';
        break;

      default:
        console.log(`❌ 未知命令: ${command}. 输入 'help' 查看可用命令`);
        await this.waitForCommand();
        break;
    }
  }

  private async executeCurrentStep(): Promise<void> {
    if (!this.session || this.session.currentStep >= this.steps.length) {
      return;
    }

    const step = this.steps[this.session.currentStep];
    await this.executeStep(step);
  }

  private async executeStep(step: StepInfo): Promise<void> {
    console.log(`\n⚡ 执行步骤 ${step.stepNumber}: ${step.description}`);
    
    try {
      await step.action();
      
      if (step.assertions) {
        console.log('🔍 执行断言...');
        await step.assertions();
      }
      
      console.log('✅ 步骤执行成功');
      
    } catch (error) {
      console.log(`❌ 步骤执行失败: ${error}`);
      
      if (step.cleanup) {
        console.log('🧹 执行清理操作...');
        try {
          await step.cleanup();
        } catch (cleanupError) {
          console.log(`❌ 清理操作失败: ${cleanupError}`);
        }
      }
      
      // 暂停以便调试
      this.session!.status = 'paused';
      this.isPaused = true;
    }
  }

  private setupCommands(): void {
    // 设置进程退出处理
    process.on('SIGINT', () => {
      console.log('\n👋 调试会话被中断');
      this.rl.close();
      process.exit(0);
    });
  }

  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例实例
export const interactiveDebugger = new InteractiveDebugger();

// 便捷函数
export const createDebugStep = (
  stepNumber: number,
  description: string,
  action: () => Promise<void>,
  assertions?: () => Promise<void>,
  cleanup?: () => Promise<void>
): StepInfo => ({
  stepNumber,
  description,
  action,
  assertions,
  cleanup
});