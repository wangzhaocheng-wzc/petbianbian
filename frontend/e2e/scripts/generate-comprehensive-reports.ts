#!/usr/bin/env node

/**
 * 综合测试报告生成脚本
 * 
 * 这个脚本整合了所有的测试报告和监控功能，生成完整的测试质量分析报告
 */

import { TestResult } from '@playwright/test/reporter';
import { ComprehensiveReportGenerator } from '../utils/comprehensive-report-generator';
import { FailureAnalyzer } from '../utils/failure-analyzer';
import { StabilityMonitor } from '../utils/stability-monitor';
import { TrendAnalyzer } from '../utils/trend-analyzer';
import { ExecutionTrendAnalyzer } from '../utils/execution-trend-analyzer';
import { QualityImprovementTracker } from '../utils/quality-improvement-tracker';
import * as fs from 'fs';
import * as path from 'path';

interface ReportConfig {
  outputDir: string;
  includeVisualReports: boolean;
  includeTrendAnalysis: boolean;
  includeQualityTracking: boolean;
  generateExecutiveSummary: boolean;
}

class ComprehensiveReportOrchestrator {
  private config: ReportConfig;
  private reportGenerator: ComprehensiveReportGenerator;
  private failureAnalyzer: FailureAnalyzer;
  private stabilityMonitor: StabilityMonitor;
  private trendAnalyzer: TrendAnalyzer;
  private executionAnalyzer: ExecutionTrendAnalyzer;
  private qualityTracker: QualityImprovementTracker;

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      outputDir: 'comprehensive-reports',
      includeVisualReports: true,
      includeTrendAnalysis: true,
      includeQualityTracking: true,
      generateExecutiveSummary: true,
      ...config
    };

    // 初始化所有分析器
    this.reportGenerator = new ComprehensiveReportGenerator(this.config.outputDir);
    this.failureAnalyzer = new FailureAnalyzer(path.join(this.config.outputDir, 'failures'));
    this.stabilityMonitor = new StabilityMonitor();
    this.trendAnalyzer = new TrendAnalyzer(path.join(this.config.outputDir, 'trends'));
    this.executionAnalyzer = new ExecutionTrendAnalyzer(path.join(this.config.outputDir, 'execution'));
    this.qualityTracker = new QualityImprovementTracker(path.join(this.config.outputDir, 'quality'));
  }

  /**
   * 生成所有类型的测试报告
   */
  async generateAllReports(testResults: TestResult[]): Promise<void> {
    console.log('🚀 开始生成综合测试报告...');
    console.log(`📊 处理 ${testResults.length} 个测试结果`);

    try {
      // 1. 收集趋势数据
      if (this.config.includeTrendAnalysis) {
        console.log('📈 收集趋势数据...');
        await this.trendAnalyzer.collectTrendData(testResults);
        await this.executionAnalyzer.collectExecutionData(testResults);
      }

      // 2. 生成基础报告
      console.log('📄 生成基础HTML报告...');
      const basicReportPath = await this.reportGenerator.generateComprehensiveReport(testResults);

      // 3. 生成失败分析报告
      console.log('🔍 分析测试失败模式...');
      const failureAnalysis = await this.failureAnalyzer.analyzeFailurePatterns(testResults);
      const failureReportPath = await this.generateFailureReport(failureAnalysis);

      // 4. 生成稳定性监控报告
      console.log('📊 监控测试稳定性...');
      const stabilityMetrics = this.stabilityMonitor.monitorStability(testResults);
      const stabilityReportPath = await this.generateStabilityReport(stabilityMetrics);

      // 5. 生成趋势分析报告
      let trendReportPath = '';
      let executionTrendReportPath = '';
      if (this.config.includeTrendAnalysis) {
        console.log('📈 分析测试趋势...');
        const trendAnalysis = await this.trendAnalyzer.analyzeTrends();
        trendReportPath = await this.generateTrendReport(trendAnalysis);

        const executionTrends = await this.executionAnalyzer.analyzeExecutionTrends();
        executionTrendReportPath = await this.generateExecutionTrendReport(executionTrends);
      }

      // 6. 生成质量改进跟踪报告
      let qualityReportPath = '';
      if (this.config.includeQualityTracking) {
        console.log('🎯 生成质量改进跟踪报告...');
        const qualityReport = await this.qualityTracker.generateQualityReport(testResults);
        qualityReportPath = await this.generateQualityReport(qualityReport);
      }

      // 7. 生成执行摘要
      if (this.config.generateExecutiveSummary) {
        console.log('📋 生成执行摘要...');
        await this.generateExecutiveSummary({
          basicReportPath,
          failureReportPath,
          stabilityReportPath,
          trendReportPath,
          executionTrendReportPath,
          qualityReportPath,
          testResults
        });
      }

      // 8. 生成导航索引页面
      await this.generateNavigationIndex({
        basicReportPath,
        failureReportPath,
        stabilityReportPath,
        trendReportPath,
        executionTrendReportPath,
        qualityReportPath
      });

      console.log('✅ 所有报告生成完成!');
      console.log(`📂 报告目录: ${path.resolve(this.config.outputDir)}`);

    } catch (error) {
      console.error('❌ 生成报告时出错:', error);
      throw error;
    }
  }

  /**
   * 生成失败分析报告
   */
  private async generateFailureReport(failureAnalysis: any): Promise<string> {
    const reportContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试失败分析报告</title>
    <link rel="stylesheet" href="assets/comprehensive-report.css">
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>🔍 测试失败分析报告</h1>
            <div class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
        </header>
        ${this.failureAnalyzer.generateFailureReportHTML(failureAnalysis)}
    </div>
</body>
</html>`;

    const reportPath = path.join(this.config.outputDir, 'failure-analysis.html');
    fs.writeFileSync(reportPath, reportContent);
    return reportPath;
  }

  /**
   * 生成稳定性报告
   */
  private async generateStabilityReport(stabilityMetrics: any): Promise<string> {
    const reportContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试稳定性监控报告</title>
    <link rel="stylesheet" href="assets/comprehensive-report.css">
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>📊 测试稳定性监控报告</h1>
            <div class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
        </header>
        ${this.stabilityMonitor.generateStabilityReportHTML(stabilityMetrics)}
    </div>
</body>
</html>`;

    const reportPath = path.join(this.config.outputDir, 'stability-monitoring.html');
    fs.writeFileSync(reportPath, reportContent);
    return reportPath;
  }

  /**
   * 生成趋势分析报告
   */
  private async generateTrendReport(trendAnalysis: any): Promise<string> {
    const reportContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试趋势分析报告</title>
    <link rel="stylesheet" href="assets/comprehensive-report.css">
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>📈 测试趋势分析报告</h1>
            <div class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
        </header>
        ${this.trendAnalyzer.generateTrendReportHTML(trendAnalysis)}
    </div>
</body>
</html>`;

    const reportPath = path.join(this.config.outputDir, 'trend-analysis.html');
    fs.writeFileSync(reportPath, reportContent);
    return reportPath;
  }

  /**
   * 生成执行趋势报告
   */
  private async generateExecutionTrendReport(executionTrends: any): Promise<string> {
    const reportContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>执行趋势分析报告</title>
    <link rel="stylesheet" href="assets/comprehensive-report.css">
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>⏱️ 执行趋势分析报告</h1>
            <div class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
        </header>
        ${this.executionAnalyzer.generateExecutionTrendReportHTML(executionTrends)}
    </div>
</body>
</html>`;

    const reportPath = path.join(this.config.outputDir, 'execution-trends.html');
    fs.writeFileSync(reportPath, reportContent);
    return reportPath;
  }

  /**
   * 生成质量报告
   */
  private async generateQualityReport(qualityReport: any): Promise<string> {
    const reportContent = this.qualityTracker.generateQualityReportHTML(qualityReport);
    const reportPath = path.join(this.config.outputDir, 'quality-improvement.html');
    fs.writeFileSync(reportContent, reportPath);
    return reportPath;
  }

  /**
   * 生成执行摘要
   */
  private async generateExecutiveSummary(reports: any): Promise<void> {
    const testResults = reports.testResults as TestResult[];
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const failedTests = testResults.filter(r => r.status === 'failed').length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const summaryContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试执行摘要</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
        .report-card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .report-card h3 { margin-top: 0; color: #374151; }
        .report-card a { color: #3b82f6; text-decoration: none; font-weight: 500; }
        .report-card a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 测试执行摘要报告</h1>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>

        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${totalTests}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${passedTests}</div>
                <div class="metric-label">通过</div>
            </div>
            <div class="metric">
                <div class="metric-value error">${failedTests}</div>
                <div class="metric-label">失败</div>
            </div>
            <div class="metric">
                <div class="metric-value ${passRate >= 90 ? 'success' : passRate >= 70 ? 'warning' : 'error'}">${passRate.toFixed(1)}%</div>
                <div class="metric-label">通过率</div>
            </div>
        </div>

        <h2>📋 详细报告</h2>
        <div class="reports-grid">
            <div class="report-card">
                <h3>🎭 综合测试报告</h3>
                <p>包含完整的测试结果、可视化图表和详细分析</p>
                <a href="${path.basename(reports.basicReportPath)}">查看报告 →</a>
            </div>

            <div class="report-card">
                <h3>🔍 失败分析报告</h3>
                <p>深入分析测试失败原因和改进建议</p>
                <a href="${path.basename(reports.failureReportPath)}">查看报告 →</a>
            </div>

            <div class="report-card">
                <h3>📊 稳定性监控</h3>
                <p>测试稳定性指标和改进建议</p>
                <a href="${path.basename(reports.stabilityReportPath)}">查看报告 →</a>
            </div>

            ${reports.trendReportPath ? `
            <div class="report-card">
                <h3>📈 趋势分析</h3>
                <p>测试质量趋势和预测分析</p>
                <a href="${path.basename(reports.trendReportPath)}">查看报告 →</a>
            </div>
            ` : ''}

            ${reports.executionTrendReportPath ? `
            <div class="report-card">
                <h3>⏱️ 执行趋势</h3>
                <p>测试执行性能和效率分析</p>
                <a href="${path.basename(reports.executionTrendReportPath)}">查看报告 →</a>
            </div>
            ` : ''}

            ${reports.qualityReportPath ? `
            <div class="report-card">
                <h3>🎯 质量改进</h3>
                <p>质量指标跟踪和改进路线图</p>
                <a href="${path.basename(reports.qualityReportPath)}">查看报告 →</a>
            </div>
            ` : ''}
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p>🎭 Playwright 测试报告系统 | 自动生成于 ${new Date().toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>`;

    const summaryPath = path.join(this.config.outputDir, 'executive-summary.html');
    fs.writeFileSync(summaryPath, summaryContent);
  }

  /**
   * 生成导航索引页面
   */
  private async generateNavigationIndex(reports: any): Promise<void> {
    const indexContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告导航</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { text-align: center; color: white; margin-bottom: 40px; }
        .header h1 { font-size: 3rem; margin-bottom: 10px; }
        .header p { font-size: 1.2rem; opacity: 0.9; }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .report-card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); transition: transform 0.3s ease; }
        .report-card:hover { transform: translateY(-5px); }
        .report-icon { font-size: 3rem; margin-bottom: 15px; }
        .report-title { font-size: 1.3rem; font-weight: bold; margin-bottom: 10px; color: #374151; }
        .report-description { color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
        .report-link { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; transition: background 0.3s ease; }
        .report-link:hover { background: #2563eb; }
        .footer { text-align: center; margin-top: 40px; color: white; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 Playwright 测试报告中心</h1>
            <p>全面的测试质量分析和监控报告</p>
        </div>

        <div class="reports-grid">
            <div class="report-card">
                <div class="report-icon">📋</div>
                <div class="report-title">执行摘要</div>
                <div class="report-description">快速了解测试执行情况和关键指标</div>
                <a href="executive-summary.html" class="report-link">查看摘要</a>
            </div>

            <div class="report-card">
                <div class="report-icon">🎭</div>
                <div class="report-title">综合测试报告</div>
                <div class="report-description">详细的测试结果、图表和可视化分析</div>
                <a href="${path.basename(reports.basicReportPath)}" class="report-link">查看报告</a>
            </div>

            <div class="report-card">
                <div class="report-icon">🔍</div>
                <div class="report-title">失败分析</div>
                <div class="report-description">深入分析测试失败模式和根本原因</div>
                <a href="${path.basename(reports.failureReportPath)}" class="report-link">查看分析</a>
            </div>

            <div class="report-card">
                <div class="report-icon">📊</div>
                <div class="report-title">稳定性监控</div>
                <div class="report-description">测试稳定性指标和改进建议</div>
                <a href="${path.basename(reports.stabilityReportPath)}" class="report-link">查看监控</a>
            </div>

            ${reports.trendReportPath ? `
            <div class="report-card">
                <div class="report-icon">📈</div>
                <div class="report-title">趋势分析</div>
                <div class="report-description">测试质量趋势和预测分析</div>
                <a href="${path.basename(reports.trendReportPath)}" class="report-link">查看趋势</a>
            </div>
            ` : ''}

            ${reports.executionTrendReportPath ? `
            <div class="report-card">
                <div class="report-icon">⏱️</div>
                <div class="report-title">执行趋势</div>
                <div class="report-description">测试执行性能和效率分析</div>
                <a href="${path.basename(reports.executionTrendReportPath)}" class="report-link">查看执行</a>
            </div>
            ` : ''}

            ${reports.qualityReportPath ? `
            <div class="report-card">
                <div class="report-icon">🎯</div>
                <div class="report-title">质量改进</div>
                <div class="report-description">质量指标跟踪和改进路线图</div>
                <a href="${path.basename(reports.qualityReportPath)}" class="report-link">查看质量</a>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>生成时间: ${new Date().toLocaleString('zh-CN')} | Playwright 测试报告系统</p>
        </div>
    </div>
</body>
</html>`;

    const indexPath = path.join(this.config.outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexContent);
    console.log(`🏠 导航索引页面: ${indexPath}`);
  }
}

// 主函数
async function main() {
  try {
    // 从命令行参数或环境变量获取配置
    const config: Partial<ReportConfig> = {
      outputDir: process.env.REPORT_OUTPUT_DIR || 'comprehensive-reports',
      includeVisualReports: process.env.INCLUDE_VISUAL !== 'false',
      includeTrendAnalysis: process.env.INCLUDE_TRENDS !== 'false',
      includeQualityTracking: process.env.INCLUDE_QUALITY !== 'false',
      generateExecutiveSummary: process.env.INCLUDE_SUMMARY !== 'false'
    };

    const orchestrator = new ComprehensiveReportOrchestrator(config);

    // 模拟测试结果（实际使用中应该从Playwright测试运行器获取）
    const mockTestResults: TestResult[] = [
      {
        title: '用户登录测试',
        status: 'passed',
        duration: 2500,
        retry: 0
      },
      {
        title: '宠物添加测试',
        status: 'failed',
        duration: 5000,
        retry: 1,
        error: { message: '元素未找到: #pet-name-input' }
      },
      {
        title: '便便分析测试',
        status: 'passed',
        duration: 8000,
        retry: 0
      }
    ] as TestResult[];

    // 生成所有报告
    await orchestrator.generateAllReports(mockTestResults);

    console.log('🎉 所有测试报告生成完成！');
    console.log(`📂 打开 ${path.resolve(config.outputDir, 'index.html')} 查看报告`);

  } catch (error) {
    console.error('❌ 生成报告失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { ComprehensiveReportOrchestrator, ReportConfig };