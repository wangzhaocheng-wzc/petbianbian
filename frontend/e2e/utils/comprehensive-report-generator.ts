import { TestResult } from '@playwright/test/reporter';
import { HTMLReportGenerator, TestMetrics, BrowserMetrics } from './html-report-generator';
import { TestVisualization, VisualizationData } from './test-visualization';
import { CoverageAnalyzer, CoverageReport } from './coverage-analyzer';
import * as fs from 'fs';
import * as path from 'path';

export interface ComprehensiveReportData {
  testMetrics: TestMetrics;
  browserMetrics: BrowserMetrics[];
  visualizations: VisualizationData;
  coverage: CoverageReport;
  testResults: TestResult[];
  timestamp: string;
  environment: EnvironmentInfo;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  playwrightVersion: string;
  os: string;
  ci: boolean;
  branch?: string;
  commit?: string;
}

export class ComprehensiveReportGenerator {
  private reportDir: string;
  private htmlGenerator: HTMLReportGenerator;
  private coverageAnalyzer: CoverageAnalyzer;

  constructor(reportDir: string = 'test-reports') {
    this.reportDir = reportDir;
    this.htmlGenerator = new HTMLReportGenerator(path.join(reportDir, 'html'));
    this.coverageAnalyzer = new CoverageAnalyzer(path.join(reportDir, 'coverage'));
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 生成综合测试报告
   */
  async generateComprehensiveReport(testResults: TestResult[]): Promise<string> {
    console.log('🚀 开始生成综合测试报告...');

    try {
      // 收集所有数据
      const reportData = await this.collectReportData(testResults);

      // 生成各种格式的报告
      const htmlReportPath = await this.generateHTMLReport(reportData);
      const jsonReportPath = await this.generateJSONReport(reportData);
      const summaryPath = await this.generateSummaryReport(reportData);

      // 生成索引页面
      const indexPath = await this.generateIndexPage(htmlReportPath, jsonReportPath, summaryPath);

      console.log('✅ 综合测试报告生成完成!');
      console.log(`📊 HTML报告: ${htmlReportPath}`);
      console.log(`📄 JSON报告: ${jsonReportPath}`);
      console.log(`📋 摘要报告: ${summaryPath}`);
      console.log(`🏠 索引页面: ${indexPath}`);

      return indexPath;
    } catch (error) {
      console.error('❌ 生成综合报告失败:', error);
      throw error;
    }
  }

  /**
   * 收集报告数据
   */
  private async collectReportData(testResults: TestResult[]): Promise<ComprehensiveReportData> {
    console.log('📊 收集测试数据...');

    // 计算测试指标
    const testMetrics = this.calculateTestMetrics(testResults);

    // 计算浏览器指标
    const browserMetrics = this.calculateBrowserMetrics(testResults);

    // 生成可视化数据
    const visualizations = TestVisualization.createVisualization(testResults);

    // 分析覆盖率
    const coverage = await this.coverageAnalyzer.analyzeCoverage();

    // 收集环境信息
    const environment = this.collectEnvironmentInfo();

    return {
      testMetrics,
      browserMetrics,
      visualizations,
      coverage,
      testResults,
      timestamp: new Date().toISOString(),
      environment
    };
  }

  /**
   * 计算测试指标
   */
  private calculateTestMetrics(testResults: TestResult[]): TestMetrics {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const failedTests = testResults.filter(r => r.status === 'failed').length;
    const skippedTests = testResults.filter(r => r.status === 'skipped').length;
    const duration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      duration,
      passRate
    };
  }

  /**
   * 计算浏览器指标
   */
  private calculateBrowserMetrics(testResults: TestResult[]): BrowserMetrics[] {
    const browserStats = testResults.reduce((acc, result) => {
      const browser = this.extractBrowserName(result);
      if (!acc[browser]) {
        acc[browser] = {
          browser,
          tests: { totalTests: 0, passedTests: 0, failedTests: 0, skippedTests: 0, duration: 0, passRate: 0 },
          avgDuration: 0,
          errors: []
        };
      }

      acc[browser].tests.totalTests++;
      acc[browser].tests.duration += result.duration || 0;

      if (result.status === 'passed') acc[browser].tests.passedTests++;
      if (result.status === 'failed') {
        acc[browser].tests.failedTests++;
        if (result.error?.message) {
          acc[browser].errors.push(result.error.message);
        }
      }
      if (result.status === 'skipped') acc[browser].tests.skippedTests++;

      return acc;
    }, {} as Record<string, BrowserMetrics>);

    // 计算通过率和平均耗时
    Object.values(browserStats).forEach(stats => {
      stats.tests.passRate = stats.tests.totalTests > 0 
        ? (stats.tests.passedTests / stats.tests.totalTests) * 100 
        : 0;
      stats.avgDuration = stats.tests.totalTests > 0 
        ? stats.tests.duration / stats.tests.totalTests 
        : 0;
    });

    return Object.values(browserStats);
  }

  /**
   * 从测试结果中提取浏览器名称
   */
  private extractBrowserName(result: TestResult): string {
    const title = result.title || '';
    const projectName = (result as any).projectName || '';
    
    if (title.includes('chrome') || projectName.includes('chrome')) return 'Chrome';
    if (title.includes('firefox') || projectName.includes('firefox')) return 'Firefox';
    if (title.includes('safari') || projectName.includes('safari')) return 'Safari';
    if (title.includes('edge') || projectName.includes('edge')) return 'Edge';
    
    return '未知浏览器';
  }

  /**
   * 收集环境信息
   */
  private collectEnvironmentInfo(): EnvironmentInfo {
    return {
      nodeVersion: process.version,
      playwrightVersion: this.getPlaywrightVersion(),
      os: `${process.platform} ${process.arch}`,
      ci: !!process.env.CI,
      branch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH,
      commit: process.env.GITHUB_SHA || process.env.GIT_COMMIT
    };
  }

  /**
   * 获取Playwright版本
   */
  private getPlaywrightVersion(): string {
    try {
      const packagePath = path.join(process.cwd(), 'node_modules', '@playwright', 'test', 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version;
      }
    } catch (error) {
      console.warn('无法获取Playwright版本:', error);
    }
    return '未知版本';
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(data: ComprehensiveReportData): Promise<string> {
    console.log('📄 生成HTML报告...');

    const htmlContent = this.generateEnhancedHTML(data);
    const htmlPath = path.join(this.reportDir, 'comprehensive-report.html');
    
    fs.writeFileSync(htmlPath, htmlContent);
    
    // 生成资源文件
    await this.generateReportAssets();
    
    return htmlPath;
  }

  /**
   * 生成增强的HTML内容
   */
  private generateEnhancedHTML(data: ComprehensiveReportData): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>综合测试报告 - Playwright</title>
    <link rel="stylesheet" href="assets/comprehensive-report.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/date-fns@2.29.3/index.min.js"></script>
</head>
<body>
    <div class="report-container">
        <!-- 报告头部 -->
        <header class="report-header">
            <div class="header-content">
                <h1>🎭 Playwright 综合测试报告</h1>
                <div class="header-meta">
                    <div class="meta-item">
                        <span class="meta-label">生成时间:</span>
                        <span class="meta-value">${new Date(data.timestamp).toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">环境:</span>
                        <span class="meta-value">${data.environment.os}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Node版本:</span>
                        <span class="meta-value">${data.environment.nodeVersion}</span>
                    </div>
                    ${data.environment.branch ? `
                    <div class="meta-item">
                        <span class="meta-label">分支:</span>
                        <span class="meta-value">${data.environment.branch}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </header>

        <!-- 导航菜单 -->
        <nav class="report-nav">
            <ul class="nav-list">
                <li><a href="#overview" class="nav-link active">概览</a></li>
                <li><a href="#metrics" class="nav-link">指标</a></li>
                <li><a href="#browsers" class="nav-link">浏览器</a></li>
                <li><a href="#coverage" class="nav-link">覆盖率</a></li>
                <li><a href="#details" class="nav-link">详情</a></li>
            </ul>
        </nav>

        <!-- 概览部分 -->
        <section id="overview" class="report-section">
            <h2>📊 测试概览</h2>
            <div class="overview-grid">
                <div class="overview-card ${data.testMetrics.passRate >= 90 ? 'success' : data.testMetrics.passRate >= 70 ? 'warning' : 'error'}">
                    <div class="card-icon">🎯</div>
                    <div class="card-content">
                        <div class="card-value">${data.testMetrics.passRate.toFixed(1)}%</div>
                        <div class="card-label">通过率</div>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon">📋</div>
                    <div class="card-content">
                        <div class="card-value">${data.testMetrics.totalTests}</div>
                        <div class="card-label">总测试数</div>
                    </div>
                </div>
                <div class="overview-card success">
                    <div class="card-icon">✅</div>
                    <div class="card-content">
                        <div class="card-value">${data.testMetrics.passedTests}</div>
                        <div class="card-label">通过</div>
                    </div>
                </div>
                <div class="overview-card error">
                    <div class="card-icon">❌</div>
                    <div class="card-content">
                        <div class="card-value">${data.testMetrics.failedTests}</div>
                        <div class="card-label">失败</div>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon">⏱️</div>
                    <div class="card-content">
                        <div class="card-value">${(data.testMetrics.duration / 1000).toFixed(1)}s</div>
                        <div class="card-label">总耗时</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 指标部分 -->
        <section id="metrics" class="report-section">
            <h2>📈 测试指标</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>测试状态分布</h3>
                    <canvas id="statusChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>执行时间趋势</h3>
                    <canvas id="durationChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>测试套件分解</h3>
                    <canvas id="suiteChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>重试分析</h3>
                    <canvas id="retryChart"></canvas>
                </div>
            </div>
        </section>

        <!-- 浏览器部分 -->
        <section id="browsers" class="report-section">
            <h2>🌐 浏览器测试结果</h2>
            <div class="browser-grid">
                ${data.browserMetrics.map(browser => `
                <div class="browser-card">
                    <div class="browser-header">
                        <h3>${this.getBrowserIcon(browser.browser)} ${browser.browser}</h3>
                        <div class="browser-pass-rate ${browser.tests.passRate >= 90 ? 'success' : browser.tests.passRate >= 70 ? 'warning' : 'error'}">
                            ${browser.tests.passRate.toFixed(1)}%
                        </div>
                    </div>
                    <div class="browser-stats">
                        <div class="stat-item">
                            <span class="stat-label">总测试:</span>
                            <span class="stat-value">${browser.tests.totalTests}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">通过:</span>
                            <span class="stat-value success">${browser.tests.passedTests}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">失败:</span>
                            <span class="stat-value error">${browser.tests.failedTests}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均耗时:</span>
                            <span class="stat-value">${(browser.avgDuration / 1000).toFixed(2)}s</span>
                        </div>
                    </div>
                    ${browser.errors.length > 0 ? `
                    <div class="browser-errors">
                        <h4>主要错误:</h4>
                        <ul>
                            ${browser.errors.slice(0, 3).map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            <div class="browser-comparison-chart">
                <h3>浏览器对比</h3>
                <canvas id="browserChart"></canvas>
            </div>
        </section>

        <!-- 覆盖率部分 -->
        <section id="coverage" class="report-section">
            <h2>📊 代码覆盖率</h2>
            ${this.coverageAnalyzer.generateCoverageReportHTML(data.coverage)}
        </section>

        <!-- 详情部分 -->
        <section id="details" class="report-section">
            <h2>📋 测试详情</h2>
            <div class="test-details">
                <div class="details-filters">
                    <button class="filter-btn active" data-filter="all">全部</button>
                    <button class="filter-btn" data-filter="passed">通过</button>
                    <button class="filter-btn" data-filter="failed">失败</button>
                    <button class="filter-btn" data-filter="skipped">跳过</button>
                </div>
                <div class="test-list">
                    ${data.testResults.map((test, index) => `
                    <div class="test-item ${test.status}" data-status="${test.status}">
                        <div class="test-header">
                            <div class="test-title">${test.title}</div>
                            <div class="test-status-badge ${test.status}">
                                ${this.getStatusIcon(test.status)} ${this.getStatusText(test.status)}
                            </div>
                        </div>
                        <div class="test-meta">
                            <span class="test-duration">${test.duration ? (test.duration / 1000).toFixed(2) + 's' : '-'}</span>
                            ${test.retry ? `<span class="test-retry">重试 ${test.retry} 次</span>` : ''}
                        </div>
                        ${test.error ? `
                        <div class="test-error">
                            <button class="error-toggle" onclick="toggleError(${index})">查看错误</button>
                            <div class="error-content" id="error-${index}" style="display: none;">
                                <pre>${test.error.message}</pre>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    `).join('')}
                </div>
            </div>
        </section>
    </div>

    <script src="assets/comprehensive-report.js"></script>
    <script>
        // 初始化报告
        window.reportData = ${JSON.stringify(data)};
        initializeReport();
    </script>
</body>
</html>`;
  }

  /**
   * 获取浏览器图标
   */
  private getBrowserIcon(browser: string): string {
    const icons = {
      'Chrome': '🟢',
      'Firefox': '🟠',
      'Safari': '🔵',
      'Edge': '🟦'
    };
    return icons[browser] || '🌐';
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: string): string {
    const icons = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      timedOut: '⏰'
    };
    return icons[status] || '❓';
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const texts = {
      passed: '通过',
      failed: '失败',
      skipped: '跳过',
      timedOut: '超时'
    };
    return texts[status] || status;
  }

  /**
   * 生成JSON报告
   */
  private async generateJSONReport(data: ComprehensiveReportData): Promise<string> {
    console.log('📄 生成JSON报告...');
    
    const jsonPath = path.join(this.reportDir, 'test-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    
    return jsonPath;
  }

  /**
   * 生成摘要报告
   */
  private async generateSummaryReport(data: ComprehensiveReportData): Promise<string> {
    console.log('📋 生成摘要报告...');
    
    const summary = {
      timestamp: data.timestamp,
      environment: data.environment,
      summary: {
        totalTests: data.testMetrics.totalTests,
        passedTests: data.testMetrics.passedTests,
        failedTests: data.testMetrics.failedTests,
        passRate: data.testMetrics.passRate,
        duration: data.testMetrics.duration
      },
      coverage: {
        statements: data.coverage.summary.statements.percentage,
        branches: data.coverage.summary.branches.percentage,
        functions: data.coverage.summary.functions.percentage,
        lines: data.coverage.summary.lines.percentage
      },
      browsers: data.browserMetrics.map(b => ({
        name: b.browser,
        passRate: b.tests.passRate,
        avgDuration: b.avgDuration
      }))
    };
    
    const summaryPath = path.join(this.reportDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    return summaryPath;
  }

  /**
   * 生成索引页面
   */
  private async generateIndexPage(htmlPath: string, jsonPath: string, summaryPath: string): Promise<string> {
    const indexContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告索引</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .report-link { display: block; padding: 20px; margin: 10px 0; background: #f8f9fa; border-radius: 8px; text-decoration: none; color: #333; }
        .report-link:hover { background: #e9ecef; }
        .report-title { font-size: 1.2em; font-weight: bold; margin-bottom: 5px; }
        .report-desc { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 Playwright 测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        
        <a href="${path.basename(htmlPath)}" class="report-link">
            <div class="report-title">📊 综合HTML报告</div>
            <div class="report-desc">包含详细的测试结果、图表和可视化数据</div>
        </a>
        
        <a href="${path.basename(jsonPath)}" class="report-link">
            <div class="report-title">📄 JSON数据报告</div>
            <div class="report-desc">机器可读的完整测试数据</div>
        </a>
        
        <a href="${path.basename(summaryPath)}" class="report-link">
            <div class="report-title">📋 摘要报告</div>
            <div class="report-desc">简化的测试结果摘要</div>
        </a>
    </div>
</body>
</html>`;
    
    const indexPath = path.join(this.reportDir, 'index.html');
    fs.writeFileSync(indexPath, indexContent);
    
    return indexPath;
  }

  /**
   * 生成报告资源文件
   */
  private async generateReportAssets(): Promise<void> {
    const assetsDir = path.join(this.reportDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 生成CSS文件
    const cssContent = this.generateComprehensiveCSS();
    fs.writeFileSync(path.join(assetsDir, 'comprehensive-report.css'), cssContent);

    // 生成JS文件
    const jsContent = this.generateComprehensiveJS();
    fs.writeFileSync(path.join(assetsDir, 'comprehensive-report.js'), jsContent);
  }

  /**
   * 生成综合CSS样式
   */
  private generateComprehensiveCSS(): string {
    return `
/* 基础样式 */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8fafc;
    color: #334155;
    line-height: 1.6;
}

.report-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

/* 头部样式 */
.report-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px;
    border-radius: 16px;
    margin-bottom: 30px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
    font-size: 2.5rem;
    margin-bottom: 20px;
    text-align: center;
}

.header-meta {
    display: flex;
    justify-content: center;
    gap: 30px;
    flex-wrap: wrap;
}

.meta-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.meta-label {
    font-size: 0.9rem;
    opacity: 0.8;
}

.meta-value {
    font-weight: 600;
}

/* 导航样式 */
.report-nav {
    background: white;
    border-radius: 12px;
    padding: 0;
    margin-bottom: 30px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.nav-list {
    display: flex;
    list-style: none;
}

.nav-link {
    display: block;
    padding: 15px 25px;
    text-decoration: none;
    color: #64748b;
    font-weight: 500;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
}

.nav-link:hover,
.nav-link.active {
    color: #3b82f6;
    background: #f8fafc;
    border-bottom-color: #3b82f6;
}

/* 报告部分样式 */
.report-section {
    background: white;
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.report-section h2 {
    font-size: 1.8rem;
    margin-bottom: 25px;
    color: #1e293b;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 10px;
}

/* 概览卡片样式 */
.overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.overview-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 25px;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: all 0.3s ease;
}

.overview-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.overview-card.success { border-color: #10b981; }
.overview-card.warning { border-color: #f59e0b; }
.overview-card.error { border-color: #ef4444; }

.card-icon {
    font-size: 2rem;
}

.card-value {
    font-size: 2rem;
    font-weight: bold;
    color: #1e293b;
}

.card-label {
    color: #64748b;
    font-size: 0.9rem;
}

/* 图表样式 */
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 25px;
}

.chart-container {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
}

.chart-container h3 {
    margin-bottom: 15px;
    color: #374151;
    text-align: center;
}

/* 浏览器样式 */
.browser-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.browser-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
}

.browser-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.browser-header h3 {
    color: #374151;
    font-size: 1.2rem;
}

.browser-pass-rate {
    padding: 5px 12px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 0.9rem;
}

.browser-pass-rate.success { background: #dcfce7; color: #166534; }
.browser-pass-rate.warning { background: #fef3c7; color: #92400e; }
.browser-pass-rate.error { background: #fee2e2; color: #991b1b; }

.browser-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
}

.stat-value.success { color: #10b981; font-weight: 600; }
.stat-value.error { color: #ef4444; font-weight: 600; }

.browser-errors {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
}

.browser-errors h4 {
    color: #ef4444;
    margin-bottom: 10px;
    font-size: 0.9rem;
}

.browser-errors ul {
    list-style: none;
}

.browser-errors li {
    background: #fee2e2;
    color: #991b1b;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 5px;
    font-size: 0.8rem;
}

/* 测试详情样式 */
.details-filters {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.filter-btn {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.filter-btn:hover,
.filter-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.test-item {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    transition: all 0.3s ease;
}

.test-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-item.passed { border-left: 4px solid #10b981; }
.test-item.failed { border-left: 4px solid #ef4444; }
.test-item.skipped { border-left: 4px solid #f59e0b; }

.test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.test-title {
    font-weight: 500;
    color: #374151;
}

.test-status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
}

.test-status-badge.passed { background: #dcfce7; color: #166534; }
.test-status-badge.failed { background: #fee2e2; color: #991b1b; }
.test-status-badge.skipped { background: #fef3c7; color: #92400e; }

.test-meta {
    display: flex;
    gap: 15px;
    color: #64748b;
    font-size: 0.9rem;
}

.test-retry {
    color: #f59e0b;
    font-weight: 500;
}

.error-toggle {
    background: #fee2e2;
    color: #991b1b;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    margin-top: 10px;
}

.error-content {
    margin-top: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 15px;
}

.error-content pre {
    color: #ef4444;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-break: break-word;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .report-container { padding: 10px; }
    .header-meta { flex-direction: column; gap: 15px; }
    .nav-list { flex-direction: column; }
    .overview-grid { grid-template-columns: 1fr; }
    .charts-grid { grid-template-columns: 1fr; }
    .browser-grid { grid-template-columns: 1fr; }
    .test-header { flex-direction: column; align-items: flex-start; gap: 10px; }
}
`;
  }

  /**
   * 生成综合JavaScript代码
   */
  private generateComprehensiveJS(): string {
    return `
function initializeReport() {
    initializeNavigation();
    initializeCharts();
    initializeFilters();
    console.log('📊 综合测试报告已初始化');
}

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.report-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            // 更新导航状态
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // 滚动到目标部分
            targetSection.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function initializeCharts() {
    const data = window.reportData;
    
    // 状态分布图
    if (data.visualizations.statusDistribution) {
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            new Chart(statusCtx, data.visualizations.statusDistribution);
        }
    }
    
    // 执行时间趋势图
    if (data.visualizations.durationTrends) {
        const durationCtx = document.getElementById('durationChart');
        if (durationCtx) {
            new Chart(durationCtx, data.visualizations.durationTrends);
        }
    }
    
    // 测试套件分解图
    if (data.visualizations.testSuiteBreakdown) {
        const suiteCtx = document.getElementById('suiteChart');
        if (suiteCtx) {
            new Chart(suiteCtx, data.visualizations.testSuiteBreakdown);
        }
    }
    
    // 重试分析图
    if (data.visualizations.retryAnalysis) {
        const retryCtx = document.getElementById('retryChart');
        if (retryCtx) {
            new Chart(retryCtx, data.visualizations.retryAnalysis);
        }
    }
    
    // 浏览器对比图
    if (data.visualizations.browserComparison) {
        const browserCtx = document.getElementById('browserChart');
        if (browserCtx) {
            new Chart(browserCtx, data.visualizations.browserComparison);
        }
    }
}

function initializeFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const testItems = document.querySelectorAll('.test-item');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            
            // 更新按钮状态
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 过滤测试项
            testItems.forEach(item => {
                const status = item.getAttribute('data-status');
                if (filter === 'all' || status === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

function toggleError(index) {
    const errorContent = document.getElementById(\`error-\${index}\`);
    if (errorContent.style.display === 'none') {
        errorContent.style.display = 'block';
    } else {
        errorContent.style.display = 'none';
    }
}

// 导出功能
function exportReport(format) {
    const data = window.reportData;
    
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadFile(blob, 'test-report.json');
    } else if (format === 'csv') {
        const csv = convertToCSV(data.testResults);
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadFile(blob, 'test-results.csv');
    }
}

function convertToCSV(testResults) {
    const headers = ['Title', 'Status', 'Duration', 'Retry', 'Error'];
    const rows = testResults.map(test => [
        test.title,
        test.status,
        test.duration || 0,
        test.retry || 0,
        test.error?.message || ''
    ]);
    
    return [headers, ...rows].map(row => 
        row.map(field => \`"\${field}"\`).join(',')
    ).join('\\n');
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
`;
  }
}