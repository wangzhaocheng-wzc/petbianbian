import { TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export interface TestTrendData {
  date: string;
  timestamp: number;
  summary: TestSummary;
  performance: PerformanceMetrics;
  stability: StabilityMetrics;
  coverage: CoverageMetrics;
  environment: EnvironmentInfo;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  duration: number;
  retries: number;
}

export interface PerformanceMetrics {
  averageTestDuration: number;
  slowestTest: { name: string; duration: number };
  fastestTest: { name: string; duration: number };
  totalExecutionTime: number;
  parallelEfficiency: number;
}

export interface StabilityMetrics {
  stableTests: number;
  flakyTests: number;
  newFailures: number;
  resolvedFailures: number;
  stabilityScore: number;
}

export interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface EnvironmentInfo {
  os: string;
  nodeVersion: string;
  playwrightVersion: string;
  ci: boolean;
  branch?: string;
  commit?: string;
}

export interface TrendAnalysis {
  period: 'daily' | 'weekly' | 'monthly';
  trends: {
    passRate: TrendMetric;
    performance: TrendMetric;
    stability: TrendMetric;
    coverage: TrendMetric;
  };
  insights: TrendInsight[];
  predictions: TrendPrediction[];
  recommendations: TrendRecommendation[];
}

export interface TrendMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
}

export interface TrendInsight {
  type: 'improvement' | 'regression' | 'anomaly' | 'pattern';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  data: any;
}

export interface TrendPrediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

export interface TrendRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
}

export class TrendAnalyzer {
  private dataDir: string;
  private historyFile: string;
  private maxHistoryDays: number;

  constructor(dataDir: string = 'test-trends', maxHistoryDays: number = 90) {
    this.dataDir = dataDir;
    this.historyFile = path.join(dataDir, 'trend-history.json');
    this.maxHistoryDays = maxHistoryDays;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 收集并存储测试趋势数据
   */
  async collectTrendData(testResults: TestResult[]): Promise<void> {
    console.log('📈 收集测试趋势数据...');

    const trendData: TestTrendData = {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      summary: this.calculateTestSummary(testResults),
      performance: this.calculatePerformanceMetrics(testResults),
      stability: await this.calculateStabilityMetrics(testResults),
      coverage: await this.loadCoverageMetrics(),
      environment: this.collectEnvironmentInfo()
    };

    await this.saveTrendData(trendData);
    console.log('✅ 趋势数据已保存');
  }

  /**
   * 计算测试摘要
   */
  private calculateTestSummary(testResults: TestResult[]): TestSummary {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const failedTests = testResults.filter(r => r.status === 'failed').length;
    const skippedTests = testResults.filter(r => r.status === 'skipped').length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const duration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const retries = testResults.reduce((sum, r) => sum + (r.retry || 0), 0);

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate,
      duration,
      retries
    };
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(testResults: TestResult[]): PerformanceMetrics {
    const validResults = testResults.filter(r => r.duration && r.duration > 0);
    
    if (validResults.length === 0) {
      return {
        averageTestDuration: 0,
        slowestTest: { name: '', duration: 0 },
        fastestTest: { name: '', duration: 0 },
        totalExecutionTime: 0,
        parallelEfficiency: 0
      };
    }

    const durations = validResults.map(r => r.duration!);
    const averageTestDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const totalExecutionTime = durations.reduce((sum, d) => sum + d, 0);

    const slowestResult = validResults.reduce((prev, current) => 
      (current.duration! > prev.duration!) ? current : prev
    );
    const fastestResult = validResults.reduce((prev, current) => 
      (current.duration! < prev.duration!) ? current : prev
    );

    // 计算并行效率（假设理想情况下所有测试可以并行执行）
    const maxDuration = Math.max(...durations);
    const parallelEfficiency = maxDuration > 0 ? (maxDuration / totalExecutionTime) * 100 : 0;

    return {
      averageTestDuration,
      slowestTest: { name: slowestResult.title, duration: slowestResult.duration! },
      fastestTest: { name: fastestResult.title, duration: fastestResult.duration! },
      totalExecutionTime,
      parallelEfficiency
    };
  }

  /**
   * 计算稳定性指标
   */
  private async calculateStabilityMetrics(testResults: TestResult[]): Promise<StabilityMetrics> {
    const previousData = await this.loadPreviousTrendData();
    
    const currentFailures = new Set(
      testResults.filter(r => r.status === 'failed').map(r => r.title)
    );
    
    const previousFailures = previousData ? new Set(
      Object.keys(previousData.failedTests || {})
    ) : new Set();

    const newFailures = Array.from(currentFailures).filter(test => !previousFailures.has(test)).length;
    const resolvedFailures = Array.from(previousFailures).filter(test => !currentFailures.has(test)).length;

    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const stableTests = passedTests; // 简化计算
    const flakyTests = testResults.filter(r => r.retry && r.retry > 0).length;
    const stabilityScore = totalTests > 0 ? (stableTests / totalTests) * 100 : 0;

    return {
      stableTests,
      flakyTests,
      newFailures,
      resolvedFailures,
      stabilityScore
    };
  }

  /**
   * 加载覆盖率指标
   */
  private async loadCoverageMetrics(): Promise<CoverageMetrics> {
    const coverageFile = path.join('coverage', 'coverage-summary.json');
    
    if (fs.existsSync(coverageFile)) {
      try {
        const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        const total = coverageData.total;
        
        return {
          statements: total?.statements?.pct || 0,
          branches: total?.branches?.pct || 0,
          functions: total?.functions?.pct || 0,
          lines: total?.lines?.pct || 0
        };
      } catch (error) {
        console.warn('⚠️ 无法加载覆盖率数据:', error);
      }
    }

    return { statements: 0, branches: 0, functions: 0, lines: 0 };
  }

  /**
   * 收集环境信息
   */
  private collectEnvironmentInfo(): EnvironmentInfo {
    return {
      os: `${process.platform} ${process.arch}`,
      nodeVersion: process.version,
      playwrightVersion: this.getPlaywrightVersion(),
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
      // 忽略错误
    }
    return '未知版本';
  }

  /**
   * 保存趋势数据
   */
  private async saveTrendData(trendData: TestTrendData): Promise<void> {
    let history: TestTrendData[] = [];

    // 加载现有历史数据
    if (fs.existsSync(this.historyFile)) {
      try {
        const historyContent = fs.readFileSync(this.historyFile, 'utf8');
        history = JSON.parse(historyContent);
      } catch (error) {
        console.warn('⚠️ 无法加载历史数据:', error);
      }
    }

    // 添加新数据
    history.push(trendData);

    // 清理过期数据
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    history = history.filter(data => new Date(data.date) >= cutoffDate);

    // 保存更新后的历史数据
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * 加载历史趋势数据
   */
  private async loadHistoryData(): Promise<TestTrendData[]> {
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }

    try {
      const historyContent = fs.readFileSync(this.historyFile, 'utf8');
      return JSON.parse(historyContent);
    } catch (error) {
      console.error('❌ 加载历史数据失败:', error);
      return [];
    }
  }

  /**
   * 加载上一次的趋势数据
   */
  private async loadPreviousTrendData(): Promise<TestTrendData | null> {
    const history = await this.loadHistoryData();
    return history.length > 1 ? history[history.length - 2] : null;
  }

  /**
   * 分析测试趋势
   */
  async analyzeTrends(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<TrendAnalysis> {
    console.log(`📊 分析${period === 'daily' ? '每日' : period === 'weekly' ? '每周' : '每月'}趋势...`);

    const history = await this.loadHistoryData();
    
    if (history.length < 2) {
      console.warn('⚠️ 历史数据不足，无法进行趋势分析');
      return this.getEmptyTrendAnalysis(period);
    }

    const filteredHistory = this.filterHistoryByPeriod(history, period);
    const trends = this.calculateTrends(filteredHistory);
    const insights = this.generateInsights(filteredHistory, trends);
    const predictions = this.generatePredictions(filteredHistory, trends);
    const recommendations = this.generateTrendRecommendations(trends, insights);

    return {
      period,
      trends,
      insights,
      predictions,
      recommendations
    };
  }

  /**
   * 按周期过滤历史数据
   */
  private filterHistoryByPeriod(history: TestTrendData[], period: 'daily' | 'weekly' | 'monthly'): TestTrendData[] {
    const now = new Date();
    let cutoffDate = new Date();

    switch (period) {
      case 'daily':
        cutoffDate.setDate(now.getDate() - 7); // 最近7天
        break;
      case 'weekly':
        cutoffDate.setDate(now.getDate() - 30); // 最近30天
        break;
      case 'monthly':
        cutoffDate.setDate(now.getDate() - 90); // 最近90天
        break;
    }

    return history.filter(data => new Date(data.date) >= cutoffDate);
  }

  /**
   * 计算趋势指标
   */
  private calculateTrends(history: TestTrendData[]): TrendAnalysis['trends'] {
    if (history.length < 2) {
      return this.getEmptyTrends();
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      passRate: this.calculateTrendMetric(
        latest.summary.passRate,
        previous.summary.passRate,
        'higher_better'
      ),
      performance: this.calculateTrendMetric(
        latest.performance.averageTestDuration,
        previous.performance.averageTestDuration,
        'lower_better'
      ),
      stability: this.calculateTrendMetric(
        latest.stability.stabilityScore,
        previous.stability.stabilityScore,
        'higher_better'
      ),
      coverage: this.calculateTrendMetric(
        (latest.coverage.statements + latest.coverage.branches + latest.coverage.functions + latest.coverage.lines) / 4,
        (previous.coverage.statements + previous.coverage.branches + previous.coverage.functions + previous.coverage.lines) / 4,
        'higher_better'
      )
    };
  }

  /**
   * 计算单个趋势指标
   */
  private calculateTrendMetric(
    current: number,
    previous: number,
    direction: 'higher_better' | 'lower_better'
  ): TrendMetric {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'improving' | 'declining' | 'stable';
    const threshold = 0.05; // 5% 变化阈值

    if (Math.abs(changePercent) < threshold) {
      trend = 'stable';
    } else if (direction === 'higher_better') {
      trend = change > 0 ? 'improving' : 'declining';
    } else {
      trend = change < 0 ? 'improving' : 'declining';
    }

    // 计算置信度（基于数据点数量和变化幅度）
    const confidence = Math.min(0.9, 0.5 + Math.abs(changePercent) / 100);

    return {
      current,
      previous,
      change,
      changePercent,
      trend,
      confidence
    };
  }

  /**
   * 生成趋势洞察
   */
  private generateInsights(history: TestTrendData[], trends: TrendAnalysis['trends']): TrendInsight[] {
    const insights: TrendInsight[] = [];

    // 通过率洞察
    if (trends.passRate.trend === 'improving' && trends.passRate.changePercent > 5) {
      insights.push({
        type: 'improvement',
        title: '测试通过率显著提升',
        description: `通过率从 ${trends.passRate.previous.toFixed(1)}% 提升到 ${trends.passRate.current.toFixed(1)}%`,
        impact: 'high',
        data: { metric: 'passRate', change: trends.passRate.changePercent }
      });
    } else if (trends.passRate.trend === 'declining' && trends.passRate.changePercent < -5) {
      insights.push({
        type: 'regression',
        title: '测试通过率下降',
        description: `通过率从 ${trends.passRate.previous.toFixed(1)}% 下降到 ${trends.passRate.current.toFixed(1)}%`,
        impact: 'high',
        data: { metric: 'passRate', change: trends.passRate.changePercent }
      });
    }

    // 性能洞察
    if (trends.performance.trend === 'improving' && trends.performance.changePercent < -10) {
      insights.push({
        type: 'improvement',
        title: '测试执行性能提升',
        description: `平均测试时间减少了 ${Math.abs(trends.performance.changePercent).toFixed(1)}%`,
        impact: 'medium',
        data: { metric: 'performance', change: trends.performance.changePercent }
      });
    } else if (trends.performance.trend === 'declining' && trends.performance.changePercent > 20) {
      insights.push({
        type: 'regression',
        title: '测试执行性能下降',
        description: `平均测试时间增加了 ${trends.performance.changePercent.toFixed(1)}%`,
        impact: 'medium',
        data: { metric: 'performance', change: trends.performance.changePercent }
      });
    }

    // 稳定性洞察
    if (trends.stability.trend === 'declining' && trends.stability.changePercent < -10) {
      insights.push({
        type: 'regression',
        title: '测试稳定性下降',
        description: `稳定性分数下降了 ${Math.abs(trends.stability.changePercent).toFixed(1)}%`,
        impact: 'high',
        data: { metric: 'stability', change: trends.stability.changePercent }
      });
    }

    // 覆盖率洞察
    if (trends.coverage.trend === 'improving' && trends.coverage.changePercent > 5) {
      insights.push({
        type: 'improvement',
        title: '代码覆盖率提升',
        description: `平均覆盖率提升了 ${trends.coverage.changePercent.toFixed(1)}%`,
        impact: 'medium',
        data: { metric: 'coverage', change: trends.coverage.changePercent }
      });
    }

    // 异常检测
    const recentData = history.slice(-5);
    if (recentData.length >= 3) {
      const passRates = recentData.map(d => d.summary.passRate);
      const variance = this.calculateVariance(passRates);
      
      if (variance > 100) { // 通过率波动较大
        insights.push({
          type: 'anomaly',
          title: '测试结果不稳定',
          description: '最近的测试通过率波动较大，可能存在不稳定的测试',
          impact: 'medium',
          data: { variance, passRates }
        });
      }
    }

    return insights;
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * 生成趋势预测
   */
  private generatePredictions(history: TestTrendData[], trends: TrendAnalysis['trends']): TrendPrediction[] {
    const predictions: TrendPrediction[] = [];

    if (history.length < 5) {
      return predictions; // 数据不足，无法预测
    }

    // 通过率预测
    if (trends.passRate.trend !== 'stable') {
      const passRateData = history.slice(-5).map(d => d.summary.passRate);
      const predictedPassRate = this.linearPredict(passRateData);
      
      predictions.push({
        metric: '测试通过率',
        predictedValue: Math.max(0, Math.min(100, predictedPassRate)),
        confidence: trends.passRate.confidence,
        timeframe: '下次测试运行',
        factors: ['历史趋势', '测试稳定性', '代码变更频率']
      });
    }

    // 性能预测
    if (trends.performance.trend !== 'stable') {
      const performanceData = history.slice(-5).map(d => d.performance.averageTestDuration);
      const predictedDuration = this.linearPredict(performanceData);
      
      predictions.push({
        metric: '平均测试时间',
        predictedValue: Math.max(0, predictedDuration),
        confidence: trends.performance.confidence,
        timeframe: '下次测试运行',
        factors: ['测试复杂度', '系统性能', '并行执行效率']
      });
    }

    return predictions;
  }

  /**
   * 简单线性预测
   */
  private linearPredict(values: number[]): number {
    if (values.length < 2) return values[0] || 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    // 计算线性回归
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 预测下一个值
    return slope * n + intercept;
  }

  /**
   * 生成趋势建议
   */
  private generateTrendRecommendations(
    trends: TrendAnalysis['trends'],
    insights: TrendInsight[]
  ): TrendRecommendation[] {
    const recommendations: TrendRecommendation[] = [];

    // 基于通过率趋势的建议
    if (trends.passRate.trend === 'declining') {
      recommendations.push({
        priority: 'high',
        category: '测试质量',
        title: '改善测试通过率',
        description: '测试通过率呈下降趋势，需要分析失败原因并采取改进措施',
        expectedImpact: '提高测试可靠性，减少误报',
        effort: 'medium'
      });
    }

    // 基于性能趋势的建议
    if (trends.performance.trend === 'declining') {
      recommendations.push({
        priority: 'medium',
        category: '测试性能',
        title: '优化测试执行效率',
        description: '测试执行时间呈上升趋势，建议优化测试代码和执行策略',
        expectedImpact: '缩短测试反馈时间，提高开发效率',
        effort: 'medium'
      });
    }

    // 基于稳定性趋势的建议
    if (trends.stability.trend === 'declining') {
      recommendations.push({
        priority: 'high',
        category: '测试稳定性',
        title: '提升测试稳定性',
        description: '测试稳定性下降，需要识别和修复不稳定的测试用例',
        expectedImpact: '减少测试不稳定性，提高测试可信度',
        effort: 'high'
      });
    }

    // 基于覆盖率趋势的建议
    if (trends.coverage.trend === 'declining') {
      recommendations.push({
        priority: 'medium',
        category: '测试覆盖率',
        title: '增加测试覆盖率',
        description: '代码覆盖率呈下降趋势，建议增加测试用例覆盖更多代码路径',
        expectedImpact: '提高代码质量，减少潜在缺陷',
        effort: 'medium'
      });
    }

    // 基于洞察的建议
    const highImpactRegressions = insights.filter(i => i.type === 'regression' && i.impact === 'high');
    if (highImpactRegressions.length > 0) {
      recommendations.push({
        priority: 'high',
        category: '紧急修复',
        title: '处理高影响回归问题',
        description: '检测到高影响的回归问题，需要立即关注和修复',
        expectedImpact: '防止问题进一步恶化',
        effort: 'high'
      });
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: '持续改进',
        title: '保持测试质量',
        description: '当前测试趋势稳定，建议继续保持并寻找进一步优化的机会',
        expectedImpact: '维持高质量的测试标准',
        effort: 'low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 获取空的趋势分析
   */
  private getEmptyTrendAnalysis(period: 'daily' | 'weekly' | 'monthly'): TrendAnalysis {
    return {
      period,
      trends: this.getEmptyTrends(),
      insights: [],
      predictions: [],
      recommendations: [{
        priority: 'low',
        category: '数据收集',
        title: '积累历史数据',
        description: '需要更多历史数据才能进行有效的趋势分析',
        expectedImpact: '为未来的趋势分析提供基础',
        effort: 'low'
      }]
    };
  }

  /**
   * 获取空的趋势指标
   */
  private getEmptyTrends(): TrendAnalysis['trends'] {
    const emptyMetric: TrendMetric = {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: 'stable',
      confidence: 0
    };

    return {
      passRate: emptyMetric,
      performance: emptyMetric,
      stability: emptyMetric,
      coverage: emptyMetric
    };
  }

  /**
   * 生成趋势分析报告HTML
   */
  generateTrendReportHTML(analysis: TrendAnalysis): string {
    return `
<div class="trend-analysis-report">
  <div class="trend-overview">
    <h3>📈 趋势分析概览 (${this.getPeriodLabel(analysis.period)})</h3>
    <div class="trend-metrics">
      <div class="trend-metric">
        <div class="metric-header">
          <span class="metric-name">通过率</span>
          <span class="trend-indicator ${analysis.trends.passRate.trend}">
            ${this.getTrendIcon(analysis.trends.passRate.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.trends.passRate.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.trends.passRate.trend}">
            ${analysis.trends.passRate.changePercent > 0 ? '+' : ''}${analysis.trends.passRate.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div class="trend-metric">
        <div class="metric-header">
          <span class="metric-name">性能</span>
          <span class="trend-indicator ${analysis.trends.performance.trend}">
            ${this.getTrendIcon(analysis.trends.performance.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${(analysis.trends.performance.current / 1000).toFixed(1)}s</span>
          <span class="change-value ${analysis.trends.performance.trend}">
            ${analysis.trends.performance.changePercent > 0 ? '+' : ''}${analysis.trends.performance.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div class="trend-metric">
        <div class="metric-header">
          <span class="metric-name">稳定性</span>
          <span class="trend-indicator ${analysis.trends.stability.trend}">
            ${this.getTrendIcon(analysis.trends.stability.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.trends.stability.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.trends.stability.trend}">
            ${analysis.trends.stability.changePercent > 0 ? '+' : ''}${analysis.trends.stability.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div class="trend-metric">
        <div class="metric-header">
          <span class="metric-name">覆盖率</span>
          <span class="trend-indicator ${analysis.trends.coverage.trend}">
            ${this.getTrendIcon(analysis.trends.coverage.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.trends.coverage.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.trends.coverage.trend}">
            ${analysis.trends.coverage.changePercent > 0 ? '+' : ''}${analysis.trends.coverage.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="trend-insights">
    <h4>💡 关键洞察</h4>
    <div class="insights-list">
      ${analysis.insights.map(insight => `
      <div class="insight-item ${insight.type} ${insight.impact}">
        <div class="insight-header">
          <span class="insight-type">${this.getInsightTypeIcon(insight.type)}</span>
          <span class="insight-title">${insight.title}</span>
          <span class="impact-badge ${insight.impact}">${this.getImpactLabel(insight.impact)}</span>
        </div>
        <div class="insight-description">${insight.description}</div>
      </div>
      `).join('')}
    </div>
  </div>

  ${analysis.predictions.length > 0 ? `
  <div class="trend-predictions">
    <h4>🔮 趋势预测</h4>
    <div class="predictions-list">
      ${analysis.predictions.map(prediction => `
      <div class="prediction-item">
        <div class="prediction-header">
          <span class="prediction-metric">${prediction.metric}</span>
          <span class="confidence-badge">置信度: ${(prediction.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="prediction-value">
          预测值: ${prediction.predictedValue.toFixed(1)}
          <span class="timeframe">(${prediction.timeframe})</span>
        </div>
        <div class="prediction-factors">
          影响因素: ${prediction.factors.join(', ')}
        </div>
      </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="trend-recommendations">
    <h4>🎯 改进建议</h4>
    <div class="recommendations-list">
      ${analysis.recommendations.map(rec => `
      <div class="recommendation-item priority-${rec.priority}">
        <div class="recommendation-header">
          <span class="priority-badge ${rec.priority}">${this.getPriorityLabel(rec.priority)}</span>
          <span class="category-tag">${rec.category}</span>
        </div>
        <div class="recommendation-content">
          <div class="recommendation-title">${rec.title}</div>
          <div class="recommendation-description">${rec.description}</div>
          <div class="recommendation-meta">
            <span class="expected-impact">预期影响: ${rec.expectedImpact}</span>
            <span class="effort-level">工作量: ${this.getEffortLabel(rec.effort)}</span>
          </div>
        </div>
      </div>
      `).join('')}
    </div>
  </div>
</div>`;
  }

  private getPeriodLabel(period: string): string {
    const labels = { daily: '每日', weekly: '每周', monthly: '每月' };
    return labels[period] || period;
  }

  private getTrendIcon(trend: string): string {
    const icons = { improving: '📈', declining: '📉', stable: '➡️' };
    return icons[trend] || '➡️';
  }

  private getInsightTypeIcon(type: string): string {
    const icons = { improvement: '✅', regression: '⚠️', anomaly: '🔍', pattern: '📊' };
    return icons[type] || '📊';
  }

  private getImpactLabel(impact: string): string {
    const labels = { high: '高', medium: '中', low: '低' };
    return labels[impact] || impact;
  }

  private getPriorityLabel(priority: string): string {
    const labels = { high: '高', medium: '中', low: '低' };
    return labels[priority] || priority;
  }

  private getEffortLabel(effort: string): string {
    const labels = { high: '高', medium: '中', low: '低' };
    return labels[effort] || effort;
  }
}