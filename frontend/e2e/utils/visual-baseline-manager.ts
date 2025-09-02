/**
 * 视觉基准管理工具
 * 用于管理和更新视觉测试基准图片
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface BaselineInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  testSuite: string;
}

export interface BaselineUpdateOptions {
  /** 测试套件名称 */
  testSuite?: string;
  /** 特定基准名称 */
  baselineName?: string;
  /** 是否强制更新 */
  force?: boolean;
  /** 是否备份旧基准 */
  backup?: boolean;
}

export class VisualBaselineManager {
  private baseDir: string;
  private backupDir: string;

  constructor() {
    this.baseDir = path.join('test-results', 'visual-baselines');
    this.backupDir = path.join('test-results', 'visual-baselines-backup');
  }

  /**
   * 获取所有基准信息
   */
  async getAllBaselines(): Promise<BaselineInfo[]> {
    const baselines: BaselineInfo[] = [];
    
    try {
      const testSuites = await fs.readdir(this.baseDir);
      
      for (const testSuite of testSuites) {
        const suitePath = path.join(this.baseDir, testSuite);
        const stat = await fs.stat(suitePath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(suitePath);
          
          for (const file of files) {
            if (file.endsWith('.png')) {
              const filePath = path.join(suitePath, file);
              const fileStat = await fs.stat(filePath);
              
              baselines.push({
                name: file.replace('.png', ''),
                path: filePath,
                size: fileStat.size,
                lastModified: fileStat.mtime,
                testSuite
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('No baselines found or error reading baselines:', error);
    }
    
    return baselines;
  }

  /**
   * 获取特定测试套件的基准
   */
  async getBaselinesForSuite(testSuite: string): Promise<BaselineInfo[]> {
    const allBaselines = await this.getAllBaselines();
    return allBaselines.filter(baseline => baseline.testSuite === testSuite);
  }

  /**
   * 备份基准图片
   */
  async backupBaselines(options: BaselineUpdateOptions = {}): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, timestamp);
    
    await fs.mkdir(backupPath, { recursive: true });
    
    if (options.testSuite) {
      // 备份特定测试套件
      const suitePath = path.join(this.baseDir, options.testSuite);
      const backupSuitePath = path.join(backupPath, options.testSuite);
      
      try {
        await this.copyDirectory(suitePath, backupSuitePath);
        console.log(`✅ Backed up baselines for ${options.testSuite} to ${backupSuitePath}`);
      } catch (error) {
        console.error(`❌ Failed to backup baselines for ${options.testSuite}:`, error);
        throw error;
      }
    } else {
      // 备份所有基准
      try {
        await this.copyDirectory(this.baseDir, backupPath);
        console.log(`✅ Backed up all baselines to ${backupPath}`);
      } catch (error) {
        console.error('❌ Failed to backup baselines:', error);
        throw error;
      }
    }
  }

  /**
   * 更新基准图片
   */
  async updateBaselines(options: BaselineUpdateOptions = {}): Promise<void> {
    // 如果需要备份，先进行备份
    if (options.backup) {
      await this.backupBaselines(options);
    }

    const actualDir = path.join('test-results', 'visual-actual');
    
    if (options.testSuite && options.baselineName) {
      // 更新特定基准
      await this.updateSpecificBaseline(options.testSuite, options.baselineName, options.force);
    } else if (options.testSuite) {
      // 更新特定测试套件的所有基准
      await this.updateSuiteBaselines(options.testSuite, options.force);
    } else {
      // 更新所有基准
      await this.updateAllBaselines(options.force);
    }
  }

  /**
   * 更新特定基准
   */
  private async updateSpecificBaseline(testSuite: string, baselineName: string, force: boolean = false): Promise<void> {
    const actualPath = path.join('test-results', 'visual-actual', testSuite, `${baselineName}.png`);
    const baselinePath = path.join(this.baseDir, testSuite, `${baselineName}.png`);
    
    try {
      // 检查实际截图是否存在
      await fs.access(actualPath);
      
      // 检查是否需要强制更新
      if (!force) {
        try {
          await fs.access(baselinePath);
          console.log(`⚠️  Baseline already exists for ${testSuite}/${baselineName}. Use force=true to overwrite.`);
          return;
        } catch {
          // 基准不存在，可以创建
        }
      }
      
      // 确保目录存在
      await fs.mkdir(path.dirname(baselinePath), { recursive: true });
      
      // 复制文件
      await fs.copyFile(actualPath, baselinePath);
      console.log(`✅ Updated baseline: ${testSuite}/${baselineName}`);
      
    } catch (error) {
      console.error(`❌ Failed to update baseline ${testSuite}/${baselineName}:`, error);
      throw error;
    }
  }

  /**
   * 更新测试套件的所有基准
   */
  private async updateSuiteBaselines(testSuite: string, force: boolean = false): Promise<void> {
    const actualSuitePath = path.join('test-results', 'visual-actual', testSuite);
    
    try {
      const files = await fs.readdir(actualSuitePath);
      const pngFiles = files.filter(file => file.endsWith('.png'));
      
      for (const file of pngFiles) {
        const baselineName = file.replace('.png', '');
        await this.updateSpecificBaseline(testSuite, baselineName, force);
      }
      
      console.log(`✅ Updated ${pngFiles.length} baselines for ${testSuite}`);
    } catch (error) {
      console.error(`❌ Failed to update baselines for ${testSuite}:`, error);
      throw error;
    }
  }

  /**
   * 更新所有基准
   */
  private async updateAllBaselines(force: boolean = false): Promise<void> {
    const actualDir = path.join('test-results', 'visual-actual');
    
    try {
      const testSuites = await fs.readdir(actualDir);
      
      for (const testSuite of testSuites) {
        const suitePath = path.join(actualDir, testSuite);
        const stat = await fs.stat(suitePath);
        
        if (stat.isDirectory()) {
          await this.updateSuiteBaselines(testSuite, force);
        }
      }
      
      console.log(`✅ Updated baselines for ${testSuites.length} test suites`);
    } catch (error) {
      console.error('❌ Failed to update all baselines:', error);
      throw error;
    }
  }

  /**
   * 删除基准图片
   */
  async deleteBaseline(testSuite: string, baselineName: string): Promise<void> {
    const baselinePath = path.join(this.baseDir, testSuite, `${baselineName}.png`);
    
    try {
      await fs.unlink(baselinePath);
      console.log(`✅ Deleted baseline: ${testSuite}/${baselineName}`);
    } catch (error) {
      console.error(`❌ Failed to delete baseline ${testSuite}/${baselineName}:`, error);
      throw error;
    }
  }

  /**
   * 清理过期的备份
   */
  async cleanupOldBackups(daysToKeep: number = 7): Promise<void> {
    try {
      const backups = await fs.readdir(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const stat = await fs.stat(backupPath);
        
        if (stat.isDirectory() && stat.mtime < cutoffDate) {
          await fs.rm(backupPath, { recursive: true, force: true });
          console.log(`✅ Cleaned up old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error);
    }
  }

  /**
   * 生成基准管理报告
   */
  async generateReport(): Promise<void> {
    const baselines = await this.getAllBaselines();
    const reportPath = path.join('test-results', 'baseline-report.html');
    
    // 按测试套件分组
    const suiteGroups = baselines.reduce((groups, baseline) => {
      if (!groups[baseline.testSuite]) {
        groups[baseline.testSuite] = [];
      }
      groups[baseline.testSuite].push(baseline);
      return groups;
    }, {} as Record<string, BaselineInfo[]>);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Baseline Management Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .suite { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        .baseline { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { padding: 10px; background: #e3f2fd; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Visual Baseline Management Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    
    <div class="stats">
        <div class="stat">
            <strong>Total Baselines:</strong> ${baselines.length}
        </div>
        <div class="stat">
            <strong>Test Suites:</strong> ${Object.keys(suiteGroups).length}
        </div>
        <div class="stat">
            <strong>Total Size:</strong> ${this.formatBytes(baselines.reduce((sum, b) => sum + b.size, 0))}
        </div>
    </div>
    
    ${Object.entries(suiteGroups).map(([suiteName, suiteBaselines]) => `
    <div class="suite">
        <h2>${suiteName}</h2>
        <p>Baselines: ${suiteBaselines.length}</p>
        
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Last Modified</th>
                </tr>
            </thead>
            <tbody>
                ${suiteBaselines.map(baseline => `
                <tr>
                    <td>${baseline.name}</td>
                    <td>${this.formatBytes(baseline.size)}</td>
                    <td>${baseline.lastModified.toISOString()}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `).join('')}
</body>
</html>
    `;
    
    await fs.writeFile(reportPath, html);
    console.log(`✅ Baseline management report generated: ${reportPath}`);
  }

  /**
   * 复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * CLI工具函数
 */
export class BaselineCLI {
  private manager: VisualBaselineManager;

  constructor() {
    this.manager = new VisualBaselineManager();
  }

  /**
   * 处理命令行参数
   */
  async handleCommand(args: string[]): Promise<void> {
    const command = args[0];
    
    switch (command) {
      case 'list':
        await this.listBaselines(args[1]);
        break;
      case 'update':
        await this.updateBaselines(args);
        break;
      case 'backup':
        await this.backupBaselines(args[1]);
        break;
      case 'delete':
        await this.deleteBaseline(args[1], args[2]);
        break;
      case 'cleanup':
        await this.cleanupBackups(parseInt(args[1]) || 7);
        break;
      case 'report':
        await this.generateReport();
        break;
      default:
        this.showHelp();
    }
  }

  private async listBaselines(testSuite?: string): Promise<void> {
    const baselines = testSuite 
      ? await this.manager.getBaselinesForSuite(testSuite)
      : await this.manager.getAllBaselines();
    
    console.log(`Found ${baselines.length} baselines:`);
    baselines.forEach(baseline => {
      console.log(`  ${baseline.testSuite}/${baseline.name} (${this.formatBytes(baseline.size)})`);
    });
  }

  private async updateBaselines(args: string[]): Promise<void> {
    const options: BaselineUpdateOptions = {
      testSuite: args[1],
      baselineName: args[2],
      force: args.includes('--force'),
      backup: args.includes('--backup')
    };
    
    await this.manager.updateBaselines(options);
  }

  private async backupBaselines(testSuite?: string): Promise<void> {
    await this.manager.backupBaselines({ testSuite });
  }

  private async deleteBaseline(testSuite: string, baselineName: string): Promise<void> {
    if (!testSuite || !baselineName) {
      console.error('❌ Test suite and baseline name are required');
      return;
    }
    
    await this.manager.deleteBaseline(testSuite, baselineName);
  }

  private async cleanupBackups(days: number): Promise<void> {
    await this.manager.cleanupOldBackups(days);
  }

  private async generateReport(): Promise<void> {
    await this.manager.generateReport();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private showHelp(): void {
    console.log(`
Visual Baseline Manager CLI

Usage:
  list [testSuite]                    - List all baselines or for specific test suite
  update [testSuite] [baseline] [--force] [--backup] - Update baselines
  backup [testSuite]                  - Backup baselines
  delete <testSuite> <baseline>       - Delete specific baseline
  cleanup [days]                      - Cleanup old backups (default: 7 days)
  report                              - Generate baseline management report

Examples:
  npm run baseline list
  npm run baseline update auth --force --backup
  npm run baseline backup
  npm run baseline delete auth login-page
  npm run baseline cleanup 14
  npm run baseline report
    `);
  }
}