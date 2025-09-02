import { TestResult, TestCase, TestSuite } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  passRate: number;
}

export interface TestCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface BrowserMetrics {
  browser: string;
  tests: TestMetrics;
  avgDuration: number;
  errors: string[];
}

export class HTMLReportGenerator {
  private reportDir: string;
  private templatePath: string;

  constructor(reportDir: string = 'playwright-report') {
    this.reportDir = reportDir;
    this.templatePath = path.join(__dirname, '../templates');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    if (!fs.existsSync(this.templatePath)) {
      fs.mkdirSync(this.templatePath, { recursive: true });
    }
  }

  /**
   * 生成完整的HTML测试报告
   */
  async generateReport(
    testResults: TestResult[],
    coverage?: TestCoverage,
    browserMetrics?: BrowserMetrics[]
  ): Promise<string> {
    const metrics = this.calculateMetrics(testResults);
    const reportData = {
      timestamp: new Date().toISOString(),
      metrics,
      coverage,
      browserMetrics,
      testResults: this.processTestResults(testResults),
      charts: this.generateChartData(metrics, browserMetrics)
    };

    const htmlContent = this.generateHTMLContent(reportData);
    const reportPath = path.join(this.reportDir, 'index.html');
    
    fs.writeFileSync(reportPath, htmlContent);
    
    // 生成CSS和JS文件
    await this.generateAssets();
    
    console.log(`📊 HTML测试报告已生成: ${reportPath}`);
    return reportPath;
  }

  /**
   * 计算测试指标
   */
  private calculateMetrics(testResults: TestResult[]): TestMetrics {
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
   * 处理测试结果数据
   */
  private processTestResults(testResults: TestResult[]): any[] {
    return testResults.map(result => ({
      title: result.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      retry: result.retry,
      attachments: result.attachments?.map(a => ({
        name: a.name,
        path: a.path,
        contentType: a.contentType
      }))
    }));
  }

  /**
   * 生成图表数据
   */
  private generateChartData(metrics: TestMetrics, browserMetrics?: BrowserMetrics[]): any {
    const statusChart = {
      type: 'pie',
      data: {
        labels: ['通过', '失败', '跳过'],
        datasets: [{
          data: [metrics.passedTests, metrics.failedTests, metrics.skippedTests],
          backgroundColor: ['#10B981', '#EF4444', '#F59E0B']
        }]
      }
    };

    const browserChart = browserMetrics ? {
      type: 'bar',
      data: {
        labels: browserMetrics.map(b => b.browser),
        datasets: [{
          label: '通过率 (%)',
          data: browserMetrics.map(b => b.tests.passRate),
          backgroundColor: '#3B82F6'
        }]
      }
    } : null;

    return { statusChart, browserChart };
  }

  /**
   * 生成HTML内容
   */
  private generateHTMLContent(data: any): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright 测试报告</title>
    <link rel="stylesheet" href="assets/report.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>🎭 Playwright 测试报告</h1>
            <div class="timestamp">生成时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}</div>
        </header>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${data.metrics.totalTests}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric-card success">
                <div class="metric-value">${data.metrics.passedTests}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="metric-card error">
                <div class="metric-value">${data.metrics.failedTests}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="metric-card warning">
                <div class="metric-value">${data.metrics.skippedTests}</div>
                <div class="metric-label">跳过</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.metrics.passRate.toFixed(1)}%</div>
                <div class="metric-label">通过率</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(data.metrics.duration / 1000).toFixed(1)}s</div>
                <div class="metric-label">总耗时</div>
            </div>
        </div>

        <div class="charts-section">
            <div class="chart-container">
                <h3>测试状态分布</h3>
                <canvas id="statusChart"></canvas>
            </div>
            ${data.charts.browserChart ? `
            <div class="chart-container">
                <h3>浏览器通过率</h3>
                <canvas id="browserChart"></canvas>
            </div>
            ` : ''}
        </div>

        ${data.coverage ? `
        <div class="coverage-section">
            <h3>📊 代码覆盖率</h3>
            <div class="coverage-grid">
                <div class="coverage-item">
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${data.coverage.statements}%"></div>
                    </div>
                    <div class="coverage-label">语句: ${data.coverage.statements}%</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${data.coverage.branches}%"></div>
                    </div>
                    <div class="coverage-label">分支: ${data.coverage.branches}%</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${data.coverage.functions}%"></div>
                    </div>
                    <div class="coverage-label">函数: ${data.coverage.functions}%</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${data.coverage.lines}%</div>
                    </div>
                    <div class="coverage-label">行数: ${data.coverage.lines}%</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="test-results-section">
            <h3>📋 测试结果详情</h3>
            <div class="test-results-table">
                <table>
                    <thead>
                        <tr>
                            <th>测试用例</th>
                            <th>状态</th>
                            <th>耗时</th>
                            <th>重试次数</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.testResults.map(test => `
                        <tr class="test-row ${test.status}">
                            <td class="test-title">${test.title}</td>
                            <td class="test-status">
                                <span class="status-badge ${test.status}">
                                    ${this.getStatusIcon(test.status)} ${this.getStatusText(test.status)}
                                </span>
                            </td>
                            <td class="test-duration">${test.duration ? (test.duration / 1000).toFixed(2) + 's' : '-'}</td>
                            <td class="test-retry">${test.retry || 0}</td>
                            <td class="test-actions">
                                ${test.error ? `<button onclick="showError('${test.title}', '${test.error}')">查看错误</button>` : ''}
                                ${test.attachments?.length ? `<button onclick="showAttachments('${test.title}')">查看附件</button>` : ''}
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script src="assets/report.js"></script>
    <script>
        // 初始化图表
        const chartData = ${JSON.stringify(data.charts)};
        initializeCharts(chartData);
        
        // 测试数据
        window.testData = ${JSON.stringify(data.testResults)};
    </script>
</body>
</html>`;
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
   * 生成CSS和JS资源文件
   */
  private async generateAssets(): Promise<void> {
    const assetsDir = path.join(this.reportDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 生成CSS文件
    const cssContent = this.generateCSS();
    fs.writeFileSync(path.join(assetsDir, 'report.css'), cssContent);

    // 生成JS文件
    const jsContent = this.generateJS();
    fs.writeFileSync(path.join(assetsDir, 'report.js'), jsContent);
  }

  /**
   * 生成CSS样式
   */
  private generateCSS(): string {
    return `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8fafc;
    color: #334155;
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.report-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.report-header h1 {
    font-size: 2.5rem;
    color: #1e293b;
    margin-bottom: 10px;
}

.timestamp {
    color: #64748b;
    font-size: 0.9rem;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.metric-card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #e2e8f0;
}

.metric-card.success {
    border-left-color: #10b981;
}

.metric-card.error {
    border-left-color: #ef4444;
}

.metric-card.warning {
    border-left-color: #f59e0b;
}

.metric-value {
    font-size: 2rem;
    font-weight: bold;
    color: #1e293b;
}

.metric-label {
    color: #64748b;
    font-size: 0.9rem;
    margin-top: 5px;
}

.charts-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 30px;
    margin-bottom: 30px;
}

.chart-container {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
    margin-bottom: 20px;
    color: #1e293b;
}

.coverage-section {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 30px;
}

.coverage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.coverage-item {
    text-align: center;
}

.coverage-bar {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

.coverage-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #059669);
    transition: width 0.3s ease;
}

.coverage-label {
    font-size: 0.9rem;
    color: #64748b;
}

.test-results-section {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.test-results-section h3 {
    padding: 20px;
    margin: 0;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
}

.test-results-table {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
}

th {
    background: #f8fafc;
    font-weight: 600;
    color: #374151;
}

.test-row.failed {
    background: #fef2f2;
}

.test-row.passed {
    background: #f0fdf4;
}

.test-row.skipped {
    background: #fffbeb;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
}

.status-badge.passed {
    background: #dcfce7;
    color: #166534;
}

.status-badge.failed {
    background: #fee2e2;
    color: #991b1b;
}

.status-badge.skipped {
    background: #fef3c7;
    color: #92400e;
}

.test-actions button {
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    margin-right: 5px;
}

.test-actions button:hover {
    background: #f9fafb;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .charts-section {
        grid-template-columns: 1fr;
    }
    
    .coverage-grid {
        grid-template-columns: 1fr;
    }
}
`;
  }

  /**
   * 生成JavaScript代码
   */
  private generateJS(): string {
    return `
function initializeCharts(chartData) {
    // 状态分布饼图
    if (chartData.statusChart) {
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            new Chart(statusCtx, chartData.statusChart);
        }
    }
    
    // 浏览器通过率柱状图
    if (chartData.browserChart) {
        const browserCtx = document.getElementById('browserChart');
        if (browserCtx) {
            new Chart(browserCtx, chartData.browserChart);
        }
    }
}

function showError(testTitle, errorMessage) {
    const modal = createModal('测试错误详情', \`
        <div class="error-details">
            <h4>\${testTitle}</h4>
            <pre class="error-message">\${errorMessage}</pre>
        </div>
    \`);
    document.body.appendChild(modal);
}

function showAttachments(testTitle) {
    const test = window.testData.find(t => t.title === testTitle);
    if (!test || !test.attachments) return;
    
    const attachmentsList = test.attachments.map(att => \`
        <div class="attachment-item">
            <strong>\${att.name}</strong>
            <span class="attachment-type">(\${att.contentType})</span>
            <a href="\${att.path}" target="_blank">查看</a>
        </div>
    \`).join('');
    
    const modal = createModal('测试附件', \`
        <div class="attachments-list">
            <h4>\${testTitle}</h4>
            \${attachmentsList}
        </div>
    \`);
    document.body.appendChild(modal);
}

function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = \`
        <div class="modal-content">
            <div class="modal-header">
                <h3>\${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                \${content}
            </div>
        </div>
    \`;
    
    // 添加模态框样式
    if (!document.querySelector('#modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = \`
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow: auto;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #64748b;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .error-message {
                background: #f8fafc;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #ef4444;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 0.9rem;
            }
            
            .attachment-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                margin-bottom: 10px;
            }
            
            .attachment-type {
                color: #64748b;
                font-size: 0.9rem;
            }
            
            .attachment-item a {
                margin-left: auto;
                color: #3b82f6;
                text-decoration: none;
            }
        \`;
        document.head.appendChild(styles);
    }
    
    return modal;
}

// 点击模态框外部关闭
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.remove();
    }
});
`;
  }
}