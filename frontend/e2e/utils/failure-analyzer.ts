import { TestResult, TestCase } from '@playwright/test/reporter';
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface FailureData {
  testTitle: string;
  error: string;
  stackTrace: string;
  screenshot?: string;
  video?: string;
  logs: LogEntry[];
  browserInfo: BrowserInfo;
  timestamp: string;
  retryCount: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source: 'console' | 'network' | 'page' | 'test';
}

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  viewport: { width: number; height: number };
}

export interface FailurePattern {
  pattern: string;
  category: string;
  frequency: number;
  examples: string[];
  suggestions: string[];
}

export interface FailureAnalysisReport {
  totalFailures: number;
  patterns: FailurePattern[];
  categories: FailureCategoryStats[];
  recommendations: string[];
  stabilityMetrics: StabilityMetrics;
}

export interface FailureCategoryStats {
  category: string;
  count: number;
  percentage: number;
  examples: string[];
}

export interface StabilityMetrics {
  flakyTests: string[];
  consistentFailures: string[];
  retrySuccessRate: number;
  averageRetries: number;
}

export class FailureAnalyzer {
  private failuresDir: string;
  private screenshotsDir: string;
  private logsDir: string;

  constructor(baseDir: string = 'test-failures') {
    this.failuresDir = baseDir;
    this.screenshotsDir = path.join(baseDir, 'screenshots');
    this.logsDir = path.join(baseDir, 'logs');
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    [this.failuresDir, this.screenshotsDir, this.logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 收集测试失败时的截图和日志
   */
  async captureFailureContext(page: Page, testInfo: any): Promise<FailureData> {
    const timestamp = new Date().toISOString();
    const testTitle = testInfo.title;
    const sanitizedTitle = this.sanitizeFileName(testTitle);

    console.log(`📸 收集失败测试的上下文信息: ${testTitle}`);

    try {
      // 收集截图
      const screenshotPath = await this.captureScreenshot(page, sanitizedTitle, timestamp);

      // 收集浏览器日志
      const logs = await this.collectBrowserLogs(page);

      // 收集浏览器信息
      const browserInfo = await this.collectBrowserInfo(page);

      // 收集错误信息
      const error = testInfo.error?.message || '未知错误';
      const stackTrace = testInfo.error?.stack || '';

      const failureData: FailureData = {
        testTitle,
        error,
        stackTrace,
        screenshot: screenshotPath,
        logs,
        browserInfo,
        timestamp,
        retryCount: testInfo.retry || 0
      };

      // 保存失败数据
      await this.saveFailureData(failureData, sanitizedTitle, timestamp);

      return failureData;
    } catch (error) {
      console.error('❌ 收集失败上下文时出错:', error);
      throw error;
    }
  }

  /**
   * 捕获失败截图
   */
  private async captureScreenshot(page: Page, testTitle: string, timestamp: string): Promise<string> {
    try {
      const screenshotName = `${testTitle}-${timestamp.replace(/[:.]/g, '-')}.png`;
      const screenshotPath = path.join(this.screenshotsDir, screenshotName);

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });

      console.log(`📸 截图已保存: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error('❌ 截图失败:', error);
      return '';
    }
  }

  /**
   * 收集浏览器日志
   */
  private async collectBrowserLogs(page: Page): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];

    try {
      // 收集控制台日志
      const consoleLogs = await page.evaluate(() => {
        return (window as any).__testLogs || [];
      });

      consoleLogs.forEach((log: any) => {
        logs.push({
          timestamp: log.timestamp || new Date().toISOString(),
          level: log.level || 'info',
          message: log.message || '',
          source: 'console'
        });
      });

      // 收集网络错误
      const networkErrors = await page.evaluate(() => {
        return (window as any).__networkErrors || [];
      });

      networkErrors.forEach((error: any) => {
        logs.push({
          timestamp: error.timestamp || new Date().toISOString(),
          level: 'error',
          message: `网络错误: ${error.url} - ${error.status}`,
          source: 'network'
        });
      });

    } catch (error) {
      console.error('❌ 收集浏览器日志失败:', error);
    }

    return logs;
  }

  /**
   * 收集浏览器信息
   */
  private async collectBrowserInfo(page: Page): Promise<BrowserInfo> {
    try {
      const browserInfo = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          platform: navigator.platform
        };
      });

      // 解析浏览器名称和版本
      const { name, version } = this.parseBrowserInfo(browserInfo.userAgent);

      return {
        name,
        version,
        platform: browserInfo.platform,
        viewport: browserInfo.viewport
      };
    } catch (error) {
      console.error('❌ 收集浏览器信息失败:', error);
      return {
        name: '未知',
        version: '未知',
        platform: '未知',
        viewport: { width: 0, height: 0 }
      };
    }
  }

  /**
   * 解析浏览器信息
   */
  private parseBrowserInfo(userAgent: string): { name: string; version: string } {
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      return { name: 'Chrome', version: match ? match[1] : '未知' };
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      return { name: 'Firefox', version: match ? match[1] : '未知' };
    } else if (userAgent.includes('Safari')) {
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      return { name: 'Safari', version: match ? match[1] : '未知' };
    } else if (userAgent.includes('Edge')) {
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      return { name: 'Edge', version: match ? match[1] : '未知' };
    }
    return { name: '未知', version: '未知' };
  }

  /**
   * 保存失败数据
   */
  private async saveFailureData(failureData: FailureData, testTitle: string, timestamp: string): Promise<void> {
    const fileName = `${testTitle}-${timestamp.replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(this.logsDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(failureData, null, 2));
    console.log(`💾 失败数据已保存: ${filePath}`);
  }

  /**
   * 分析测试失败模式
   */
  async analyzeFailurePatterns(testResults: TestResult[]): Promise<FailureAnalysisReport> {
    console.log('🔍 分析测试失败模式...');

    const failures = testResults.filter(result => result.status === 'failed');
    const patterns = this.identifyFailurePatterns(failures);
    const categories = this.categorizeFailures(failures);
    const recommendations = this.generateRecommendations(patterns, categories);
    const stabilityMetrics = this.calculateStabilityMetrics(testResults);

    return {
      totalFailures: failures.length,
      patterns,
      categories,
      recommendations,
      stabilityMetrics
    };
  }

  /**
   * 识别失败模式
   */
  private identifyFailurePatterns(failures: TestResult[]): FailurePattern[] {
    const patternMap = new Map<string, FailurePattern>();

    failures.forEach(failure => {
      const errorMessage = failure.error?.message || '';
      const patterns = this.extractErrorPatterns(errorMessage);

      patterns.forEach(pattern => {
        if (patternMap.has(pattern.pattern)) {
          const existing = patternMap.get(pattern.pattern)!;
          existing.frequency++;
          existing.examples.push(failure.title);
        } else {
          patternMap.set(pattern.pattern, {
            ...pattern,
            frequency: 1,
            examples: [failure.title],
            suggestions: this.getSuggestionsForPattern(pattern.category)
          });
        }
      });
    });

    return Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // 返回前10个最常见的模式
  }

  /**
   * 提取错误模式
   */
  private extractErrorPatterns(errorMessage: string): { pattern: string; category: string }[] {
    const patterns: { pattern: string; category: string }[] = [];

    // 网络相关错误
    if (errorMessage.includes('net::ERR_') || errorMessage.includes('NetworkError')) {
      patterns.push({ pattern: '网络连接错误', category: 'network' });
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      patterns.push({ pattern: '操作超时', category: 'timeout' });
    }

    // 元素未找到
    if (errorMessage.includes('not found') || errorMessage.includes('locator')) {
      patterns.push({ pattern: '元素定位失败', category: 'locator' });
    }

    // 断言失败
    if (errorMessage.includes('expect') || errorMessage.includes('assertion')) {
      patterns.push({ pattern: '断言失败', category: 'assertion' });
    }

    // JavaScript错误
    if (errorMessage.includes('ReferenceError') || errorMessage.includes('TypeError')) {
      patterns.push({ pattern: 'JavaScript运行时错误', category: 'javascript' });
    }

    // 页面加载错误
    if (errorMessage.includes('navigation') || errorMessage.includes('load')) {
      patterns.push({ pattern: '页面加载失败', category: 'navigation' });
    }

    // 如果没有匹配到特定模式，归类为其他
    if (patterns.length === 0) {
      patterns.push({ pattern: '其他错误', category: 'other' });
    }

    return patterns;
  }

  /**
   * 获取模式建议
   */
  private getSuggestionsForPattern(category: string): string[] {
    const suggestions: Record<string, string[]> = {
      network: [
        '检查网络连接稳定性',
        '增加网络请求重试机制',
        '使用网络模拟工具测试弱网环境',
        '检查API端点可用性'
      ],
      timeout: [
        '增加等待时间',
        '使用更精确的等待条件',
        '检查页面加载性能',
        '优化测试执行速度'
      ],
      locator: [
        '检查元素选择器的准确性',
        '使用更稳定的定位策略',
        '添加元素存在性检查',
        '考虑页面渲染时机'
      ],
      assertion: [
        '检查断言条件的合理性',
        '添加更多的中间验证步骤',
        '使用软断言避免测试中断',
        '改进测试数据准备'
      ],
      javascript: [
        '检查页面JavaScript错误',
        '确保依赖库正确加载',
        '添加错误处理机制',
        '检查浏览器兼容性'
      ],
      navigation: [
        '检查页面路由配置',
        '确保页面资源正确加载',
        '添加页面加载完成检查',
        '优化页面加载性能'
      ],
      other: [
        '详细分析错误日志',
        '检查测试环境配置',
        '联系开发团队协助调试',
        '考虑增加更多调试信息'
      ]
    };

    return suggestions[category] || suggestions.other;
  }

  /**
   * 分类失败原因
   */
  private categorizeFailures(failures: TestResult[]): FailureCategoryStats[] {
    const categoryMap = new Map<string, { count: number; examples: string[] }>();

    failures.forEach(failure => {
      const errorMessage = failure.error?.message || '';
      const patterns = this.extractErrorPatterns(errorMessage);

      patterns.forEach(pattern => {
        if (categoryMap.has(pattern.category)) {
          const existing = categoryMap.get(pattern.category)!;
          existing.count++;
          existing.examples.push(failure.title);
        } else {
          categoryMap.set(pattern.category, {
            count: 1,
            examples: [failure.title]
          });
        }
      });
    });

    const totalFailures = failures.length;
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category: this.getCategoryDisplayName(category),
      count: data.count,
      percentage: (data.count / totalFailures) * 100,
      examples: data.examples.slice(0, 3) // 只显示前3个例子
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * 获取分类显示名称
   */
  private getCategoryDisplayName(category: string): string {
    const displayNames: Record<string, string> = {
      network: '网络问题',
      timeout: '超时问题',
      locator: '元素定位',
      assertion: '断言失败',
      javascript: 'JS错误',
      navigation: '页面导航',
      other: '其他问题'
    };
    return displayNames[category] || category;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(patterns: FailurePattern[], categories: FailureCategoryStats[]): string[] {
    const recommendations: string[] = [];

    // 基于最常见的失败模式给出建议
    if (patterns.length > 0) {
      const topPattern = patterns[0];
      recommendations.push(`最常见的失败模式是"${topPattern.pattern}"，出现${topPattern.frequency}次`);
      recommendations.push(...topPattern.suggestions.slice(0, 2));
    }

    // 基于失败分类给出建议
    const topCategory = categories[0];
    if (topCategory && topCategory.percentage > 30) {
      recommendations.push(`${topCategory.category}占失败原因的${topCategory.percentage.toFixed(1)}%，建议重点关注`);
    }

    // 通用建议
    if (categories.length > 3) {
      recommendations.push('失败原因较为分散，建议系统性地改进测试稳定性');
    }

    recommendations.push('定期审查和更新测试用例，确保与应用变更同步');
    recommendations.push('建立测试失败的快速反馈和修复机制');

    return recommendations;
  }

  /**
   * 计算稳定性指标
   */
  private calculateStabilityMetrics(testResults: TestResult[]): StabilityMetrics {
    const testMap = new Map<string, TestResult[]>();

    // 按测试名称分组
    testResults.forEach(result => {
      const title = result.title;
      if (!testMap.has(title)) {
        testMap.set(title, []);
      }
      testMap.get(title)!.push(result);
    });

    const flakyTests: string[] = [];
    const consistentFailures: string[] = [];
    let totalRetries = 0;
    let testsWithRetries = 0;

    testMap.forEach((results, title) => {
      const hasSuccess = results.some(r => r.status === 'passed');
      const hasFailure = results.some(r => r.status === 'failed');
      const retryCount = results.reduce((sum, r) => sum + (r.retry || 0), 0);

      if (retryCount > 0) {
        totalRetries += retryCount;
        testsWithRetries++;
      }

      if (hasSuccess && hasFailure) {
        flakyTests.push(title);
      } else if (hasFailure && !hasSuccess) {
        consistentFailures.push(title);
      }
    });

    const retrySuccessRate = testsWithRetries > 0 
      ? (flakyTests.length / testsWithRetries) * 100 
      : 0;
    const averageRetries = testsWithRetries > 0 
      ? totalRetries / testsWithRetries 
      : 0;

    return {
      flakyTests,
      consistentFailures,
      retrySuccessRate,
      averageRetries
    };
  }

  /**
   * 清理文件名
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  /**
   * 生成失败分析报告HTML
   */
  generateFailureReportHTML(report: FailureAnalysisReport): string {
    return `
<div class="failure-analysis-report">
  <div class="failure-summary">
    <h3>🔍 失败分析概览</h3>
    <div class="summary-stats">
      <div class="stat-item">
        <div class="stat-value">${report.totalFailures}</div>
        <div class="stat-label">总失败数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${report.stabilityMetrics.flakyTests.length}</div>
        <div class="stat-label">不稳定测试</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${report.stabilityMetrics.retrySuccessRate.toFixed(1)}%</div>
        <div class="stat-label">重试成功率</div>
      </div>
    </div>
  </div>

  <div class="failure-patterns">
    <h4>📊 失败模式分析</h4>
    <div class="patterns-list">
      ${report.patterns.map(pattern => `
      <div class="pattern-item">
        <div class="pattern-header">
          <span class="pattern-name">${pattern.pattern}</span>
          <span class="pattern-frequency">${pattern.frequency} 次</span>
        </div>
        <div class="pattern-suggestions">
          <strong>建议:</strong>
          <ul>
            ${pattern.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
      </div>
      `).join('')}
    </div>
  </div>

  <div class="failure-categories">
    <h4>📈 失败分类统计</h4>
    <div class="categories-chart">
      ${report.categories.map(category => `
      <div class="category-item">
        <div class="category-bar">
          <div class="category-fill" style="width: ${category.percentage}%"></div>
        </div>
        <div class="category-info">
          <span class="category-name">${category.category}</span>
          <span class="category-stats">${category.count} 次 (${category.percentage.toFixed(1)}%)</span>
        </div>
      </div>
      `).join('')}
    </div>
  </div>

  <div class="stability-metrics">
    <h4>📊 稳定性指标</h4>
    <div class="metrics-grid">
      <div class="metric-section">
        <h5>不稳定测试 (${report.stabilityMetrics.flakyTests.length})</h5>
        <ul class="test-list">
          ${report.stabilityMetrics.flakyTests.slice(0, 5).map(test => `<li>${test}</li>`).join('')}
          ${report.stabilityMetrics.flakyTests.length > 5 ? `<li>... 还有 ${report.stabilityMetrics.flakyTests.length - 5} 个</li>` : ''}
        </ul>
      </div>
      <div class="metric-section">
        <h5>持续失败测试 (${report.stabilityMetrics.consistentFailures.length})</h5>
        <ul class="test-list">
          ${report.stabilityMetrics.consistentFailures.slice(0, 5).map(test => `<li>${test}</li>`).join('')}
          ${report.stabilityMetrics.consistentFailures.length > 5 ? `<li>... 还有 ${report.stabilityMetrics.consistentFailures.length - 5} 个</li>` : ''}
        </ul>
      </div>
    </div>
  </div>

  <div class="recommendations">
    <h4>💡 改进建议</h4>
    <ul class="recommendations-list">
      ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  </div>
</div>`;
  }
}