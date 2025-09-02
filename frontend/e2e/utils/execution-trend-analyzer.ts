import { TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

export interface ExecutionTrendData {
  date: string;
  timestamp: number;
  executionMetrics: ExecutionMetrics;
  successMetrics: SuccessMetrics;
  performanceBreakdown: PerformanceBreakdown;
  testSuiteMetrics: TestSuiteMetrics[];
}

export interface ExecutionMetrics {
  totalExecutionTime: number;
  averageTestTime: number;
  medianTestTime: number;
  slowestTests: TestPerformance[];
  fastestTests: TestPerformance[];
  parallelEfficiency: number;
  resourceUtilization: ResourceMetrics;
}

export interface SuccessMetrics {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  skippedTests: number;
  flakyTests: number;
  successRate: number;
  firstTimeSuccessRate: number;
  retrySuccessRate: number;
}

export interface PerformanceBreakdown {
  setupTime: number;
  testExecutionTime: number;
  teardownTime: number;
  browserLaunchTime: number;
  pageLoadTime: number;
  networkTime: number;
}

export interface TestSuiteMetrics {
  suiteName: string;
  testCount: number;
  executionTime: number;
  successRate: number;
  averageTestTime: number;
  performance: 'fast' | 'medium' | 'slow';
}

export interface TestPerformance {
  testName: string;
  executionTime: number;
  category: string;
  retryCount: number;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkIO: number;
}

export interface ExecutionTrendAnalysis {
  timeRange: string;
  executionTrends: {
    totalTime: TrendData;
    averageTime: TrendData;
    parallelEfficiency: TrendData;
  };
  successTrends: {
    successRate: TrendData;
    firstTimeSuccess: TrendData;
    retrySuccess: TrendData;
  };
  performanceTrends: {
    slowestTests: TestPerformanceTrend[];
    improvingTests: TestPerformanceTrend[];
    degradingTests: TestPerformanceTrend[];
  };
  insights: ExecutionInsight[];
  recommendations: ExecutionRecommendation[];
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'declining' | 'stable';
  dataPoints: { date: string; value: number }[];
}

export interface TestPerformanceTrend {
  testName: string;
  currentTime: number;
  previousTime: number;
  changePercent: number;
  trend: 'improving' | 'declining' | 'stable';
  category: string;
}

export interface ExecutionInsight {
  type: 'performance' | 'success' | 'efficiency' | 'anomaly';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  data: any;
}

export interface ExecutionRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedBenefit: string;
  implementationEffort: 'low' | 'medium' | 'high';
  affectedTests?: string[];
}

export class ExecutionTrendAnalyzer {
  private dataDir: string;
  private executionHistoryFile: string;
  private maxHistoryDays: number;

  constructor(dataDir: string = 'execution-trends', maxHistoryDays: number = 30) {
    this.dataDir = dataDir;
    this.executionHistoryFile = path.join(dataDir, 'execution-history.json');
    this.maxHistoryDays = maxHistoryDays;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 收集执行趋势数据
   */
  async collectExecutionData(testResults: TestResult[]): Promise<void> {
    console.log('⏱️ 收集测试执行趋势数据...');

    const executionData: ExecutionTrendData = {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      executionMetrics: this.calculateExecutionMetrics(testResults),
      successMetrics: this.calculateSuccessMetrics(testResults),
      performanceBreakdown: this.calculatePerformanceBreakdown(testResults),
      testSuiteMetrics: this.calculateTestSuiteMetrics(testResults)
    };

    await this.saveExecutionData(executionData);
    console.log('✅ 执行趋势数据已保存');
  }

  /**
   * 计算执行指标
   */
  private calculateExecutionMetrics(testResults: TestResult[]): ExecutionMetrics {
    const validResults = testResults.filter(r => r.duration && r.duration > 0);
    
    if (validResults.length === 0) {
      return this.getEmptyExecutionMetrics();
    }

    const durations = validResults.map(r => r.duration!);
    const totalExecutionTime = durations.reduce((sum, d) => sum + d, 0);
    const averageTestTime = totalExecutionTime / durations.length;
    const medianTestTime = this.calculateMedian(durations);

    // 找出最慢和最快的测试
    const sortedResults = validResults.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    const slowestTests = sortedResults.slice(0, 5).map(r => ({
      testName: r.title,
      executionTime: r.duration!,
      category: this.extractTestCategory(r.title),
      retryCount: r.retry || 0
    }));

    const fastestTests = sortedResults.slice(-5).reverse().map(r => ({
      testName: r.title,
      executionTime: r.duration!,
      category: this.extractTestCategory(r.title),
      retryCount: r.retry || 0
    }));

    // 计算并行效率
    const maxDuration = Math.max(...durations);
    const parallelEfficiency = maxDuration > 0 ? (maxDuration / totalExecutionTime) * 100 : 0;

    // 模拟资源使用情况（实际实现中应该从系统监控获取）
    const resourceUtilization = this.estimateResourceUtilization(testResults);

    return {
      totalExecutionTime,
      averageTestTime,
      medianTestTime,
      slowestTests,
      fastestTests,
      parallelEfficiency,
      resourceUtilization
    };
  }

  /**
   * 计算成功指标
   */
  private calculateSuccessMetrics(testResults: TestResult[]): SuccessMetrics {
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(r => r.status === 'passed').length;
    const failedTests = testResults.filter(r => r.status === 'failed').length;
    const skippedTests = testResults.filter(r => r.status === 'skipped').length;
    const flakyTests = testResults.filter(r => r.retry && r.retry > 0 && r.status === 'passed').length;

    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
    
    // 首次成功率（没有重试就成功的测试）
    const firstTimeSuccessful = testResults.filter(r => r.status === 'passed' && (!r.retry || r.retry === 0)).length;
    const firstTimeSuccessRate = totalTests > 0 ? (firstTimeSuccessful / totalTests) * 100 : 0;
    
    // 重试成功率
    const retriedTests = testResults.filter(r => r.retry && r.retry > 0);
    const retriedSuccessful = retriedTests.filter(r => r.status === 'passed').length;
    const retrySuccessRate = retriedTests.length > 0 ? (retriedSuccessful / retriedTests.length) * 100 : 0;

    return {
      totalTests,
      successfulTests,
      failedTests,
      skippedTests,
      flakyTests,
      successRate,
      firstTimeSuccessRate,
      retrySuccessRate
    };
  }

  /**
   * 计算性能分解
   */
  private calculatePerformanceBreakdown(testResults: TestResult[]): PerformanceBreakdown {
    const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    // 这里是估算值，实际实现中应该从详细的测试执行日志中获取
    return {
      setupTime: totalDuration * 0.1,      // 10% 用于设置
      testExecutionTime: totalDuration * 0.7, // 70% 用于实际测试执行
      teardownTime: totalDuration * 0.05,   // 5% 用于清理
      browserLaunchTime: totalDuration * 0.1, // 10% 用于浏览器启动
      pageLoadTime: totalDuration * 0.03,   // 3% 用于页面加载
      networkTime: totalDuration * 0.02     // 2% 用于网络请求
    };
  }

  /**
   * 计算测试套件指标
   */
  private calculateTestSuiteMetrics(testResults: TestResult[]): TestSuiteMetrics[] {
    const suiteMap = new Map<string, TestResult[]>();

    // 按测试套件分组
    testResults.forEach(result => {
      const suiteName = this.extractTestSuite(result.title);
      if (!suiteMap.has(suiteName)) {
        suiteMap.set(suiteName, []);
      }
      suiteMap.get(suiteName)!.push(result);
    });

    return Array.from(suiteMap.entries()).map(([suiteName, results]) => {
      const testCount = results.length;
      const executionTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
      const successfulTests = results.filter(r => r.status === 'passed').length;
      const successRate = testCount > 0 ? (successfulTests / testCount) * 100 : 0;
      const averageTestTime = testCount > 0 ? executionTime / testCount : 0;

      // 性能分类
      let performance: 'fast' | 'medium' | 'slow';
      if (averageTestTime < 5000) performance = 'fast';
      else if (averageTestTime < 15000) performance = 'medium';
      else performance = 'slow';

      return {
        suiteName,
        testCount,
        executionTime,
        successRate,
        averageTestTime,
        performance
      };
    });
  }

  /**
   * 提取测试分类
   */
  private extractTestCategory(testTitle: string): string {
    const title = testTitle.toLowerCase();
    
    if (title.includes('auth') || title.includes('login')) return '认证';
    if (title.includes('pet') || title.includes('宠物')) return '宠物管理';
    if (title.includes('analysis') || title.includes('分析')) return '分析功能';
    if (title.includes('community') || title.includes('社区')) return '社区功能';
    if (title.includes('performance') || title.includes('性能')) return '性能测试';
    if (title.includes('visual') || title.includes('视觉')) return '视觉测试';
    
    return '其他';
  }

  /**
   * 提取测试套件名称
   */
  private extractTestSuite(testTitle: string): string {
    // 从测试标题中提取套件名称，通常是第一个单词或短语
    const parts = testTitle.split(' ');
    if (parts.length > 0) {
      return parts[0];
    }
    return '未分类';
  }

  /**
   * 估算资源使用情况
   */
  private estimateResourceUtilization(testResults: TestResult[]): ResourceMetrics {
    const totalTests = testResults.length;
    const totalDuration = testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    // 基于测试数量和执行时间的估算
    return {
      cpuUsage: Math.min(100, (totalTests * 2) + (totalDuration / 1000 * 0.1)),
      memoryUsage: Math.min(100, (totalTests * 1.5) + (totalDuration / 1000 * 0.05)),
      diskIO: Math.min(100, totalTests * 0.5),
      networkIO: Math.min(100, totalTests * 1.2)
    };
  }

  /**
   * 计算中位数
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * 保存执行数据
   */
  private async saveExecutionData(executionData: ExecutionTrendData): Promise<void> {
    let history: ExecutionTrendData[] = [];

    // 加载现有历史数据
    if (fs.existsSync(this.executionHistoryFile)) {
      try {
        const historyContent = fs.readFileSync(this.executionHistoryFile, 'utf8');
        history = JSON.parse(historyContent);
      } catch (error) {
        console.warn('⚠️ 无法加载执行历史数据:', error);
      }
    }

    // 添加新数据
    history.push(executionData);

    // 清理过期数据
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    history = history.filter(data => new Date(data.date) >= cutoffDate);

    // 保存更新后的历史数据
    fs.writeFileSync(this.executionHistoryFile, JSON.stringify(history, null, 2));
  }

  /**
   * 分析执行趋势
   */
  async analyzeExecutionTrends(): Promise<ExecutionTrendAnalysis> {
    console.log('📊 分析测试执行趋势...');

    const history = await this.loadExecutionHistory();
    
    if (history.length < 2) {
      console.warn('⚠️ 执行历史数据不足，无法进行趋势分析');
      return this.getEmptyExecutionTrendAnalysis();
    }

    const timeRange = this.calculateTimeRange(history);
    const executionTrends = this.calculateExecutionTrends(history);
    const successTrends = this.calculateSuccessTrends(history);
    const performanceTrends = this.calculatePerformanceTrends(history);
    const insights = this.generateExecutionInsights(history, executionTrends, successTrends);
    const recommendations = this.generateExecutionRecommendations(insights, performanceTrends);

    return {
      timeRange,
      executionTrends,
      successTrends,
      performanceTrends,
      insights,
      recommendations
    };
  }

  /**
   * 加载执行历史数据
   */
  private async loadExecutionHistory(): Promise<ExecutionTrendData[]> {
    if (!fs.existsSync(this.executionHistoryFile)) {
      return [];
    }

    try {
      const historyContent = fs.readFileSync(this.executionHistoryFile, 'utf8');
      return JSON.parse(historyContent);
    } catch (error) {
      console.error('❌ 加载执行历史数据失败:', error);
      return [];
    }
  }

  /**
   * 计算时间范围
   */
  private calculateTimeRange(history: ExecutionTrendData[]): string {
    if (history.length === 0) return '';
    
    const startDate = new Date(history[0].date);
    const endDate = new Date(history[history.length - 1].date);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${daysDiff} 天 (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
  }

  /**
   * 计算执行趋势
   */
  private calculateExecutionTrends(history: ExecutionTrendData[]): ExecutionTrendAnalysis['executionTrends'] {
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      totalTime: this.calculateTrendData(
        history.map(h => ({ date: h.date, value: h.executionMetrics.totalExecutionTime })),
        latest.executionMetrics.totalExecutionTime,
        previous.executionMetrics.totalExecutionTime,
        'lower_better'
      ),
      averageTime: this.calculateTrendData(
        history.map(h => ({ date: h.date, value: h.executionMetrics.averageTestTime })),
        latest.executionMetrics.averageTestTime,
        previous.executionMetrics.averageTestTime,
        'lower_better'
      ),
      parallelEfficiency: this.calculateTrendData(
        history.map(h => ({ date: h.date, value: h.executionMetrics.parallelEfficiency })),
        latest.executionMetrics.parallelEfficiency,
        previous.executionMetrics.parallelEfficiency,
        'higher_better'
      )
    };
  }

  /**
   * 计算成功趋势
   */
  private calculateSuccessTrends(history: ExecutionTrendData[]): ExecutionTrendAnalysis['successTrends'] {
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      successRate: this.calculateTrendData(
        history.map(h => ({ date: h.date, value: h.successMetrics.successRate })),
        latest.successMetrics.successRate,
        previous.successMetrics.successRate,
        'higher_better'
      ),
      firstTimeSuccess: this.calculateTrendData(
        history.map(h => ({ date: h.date, value: h.successMetrics.firstTimeSuccessRate })),
        latest.successMetrics.firstTimeSuccessRate,
        previous.successMetrics.firstTimeSuccessRate,
        'higher_better'
      ),
      retrySuccess: this.calculateTrendData(
        history.map(h => ({ date: h.date, value: h.successMetrics.retrySuccessRate })),
        latest.successMetrics.retrySuccessRate,
        previous.successMetrics.retrySuccessRate,
        'higher_better'
      )
    };
  }

  /**
   * 计算性能趋势
   */
  private calculatePerformanceTrends(history: ExecutionTrendData[]): ExecutionTrendAnalysis['performanceTrends'] {
    if (history.length < 2) {
      return { slowestTests: [], improvingTests: [], degradingTests: [] };
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    // 创建测试性能映射
    const latestTestMap = new Map(latest.executionMetrics.slowestTests.map(t => [t.testName, t.executionTime]));
    const previousTestMap = new Map(previous.executionMetrics.slowestTests.map(t => [t.testName, t.executionTime]));

    const performanceTrends: TestPerformanceTrend[] = [];

    // 分析所有测试的性能变化
    const allTests = new Set([...latestTestMap.keys(), ...previousTestMap.keys()]);
    
    allTests.forEach(testName => {
      const currentTime = latestTestMap.get(testName);
      const previousTime = previousTestMap.get(testName);
      
      if (currentTime && previousTime) {
        const changePercent = ((currentTime - previousTime) / previousTime) * 100;
        let trend: 'improving' | 'declining' | 'stable';
        
        if (Math.abs(changePercent) < 5) {
          trend = 'stable';
        } else {
          trend = changePercent < 0 ? 'improving' : 'declining';
        }

        performanceTrends.push({
          testName,
          currentTime,
          previousTime,
          changePercent,
          trend,
          category: this.extractTestCategory(testName)
        });
      }
    });

    // 分类性能趋势
    const slowestTests = performanceTrends
      .sort((a, b) => b.currentTime - a.currentTime)
      .slice(0, 5);

    const improvingTests = performanceTrends
      .filter(t => t.trend === 'improving')
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    const degradingTests = performanceTrends
      .filter(t => t.trend === 'declining')
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    return {
      slowestTests,
      improvingTests,
      degradingTests
    };
  }

  /**
   * 计算趋势数据
   */
  private calculateTrendData(
    dataPoints: { date: string; value: number }[],
    current: number,
    previous: number,
    direction: 'higher_better' | 'lower_better'
  ): TrendData {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'improving' | 'declining' | 'stable';
    const threshold = 5; // 5% 变化阈值

    if (Math.abs(changePercent) < threshold) {
      trend = 'stable';
    } else if (direction === 'higher_better') {
      trend = change > 0 ? 'improving' : 'declining';
    } else {
      trend = change < 0 ? 'improving' : 'declining';
    }

    return {
      current,
      previous,
      change,
      changePercent,
      trend,
      dataPoints
    };
  }

  /**
   * 生成执行洞察
   */
  private generateExecutionInsights(
    history: ExecutionTrendData[],
    executionTrends: ExecutionTrendAnalysis['executionTrends'],
    successTrends: ExecutionTrendAnalysis['successTrends']
  ): ExecutionInsight[] {
    const insights: ExecutionInsight[] = [];

    // 执行时间洞察
    if (executionTrends.totalTime.trend === 'declining' && executionTrends.totalTime.changePercent < -20) {
      insights.push({
        type: 'performance',
        severity: 'high',
        title: '测试执行时间显著改善',
        description: `总执行时间减少了 ${Math.abs(executionTrends.totalTime.changePercent).toFixed(1)}%`,
        impact: '提高了开发效率和CI/CD流水线速度',
        data: { metric: 'totalTime', change: executionTrends.totalTime.changePercent }
      });
    } else if (executionTrends.totalTime.trend === 'improving' && executionTrends.totalTime.changePercent > 30) {
      insights.push({
        type: 'performance',
        severity: 'high',
        title: '测试执行时间显著增加',
        description: `总执行时间增加了 ${executionTrends.totalTime.changePercent.toFixed(1)}%`,
        impact: '可能影响开发效率和CI/CD流水线性能',
        data: { metric: 'totalTime', change: executionTrends.totalTime.changePercent }
      });
    }

    // 成功率洞察
    if (successTrends.successRate.trend === 'declining' && successTrends.successRate.changePercent < -10) {
      insights.push({
        type: 'success',
        severity: 'high',
        title: '测试成功率下降',
        description: `成功率从 ${successTrends.successRate.previous.toFixed(1)}% 下降到 ${successTrends.successRate.current.toFixed(1)}%`,
        impact: '可能表明代码质量问题或测试不稳定',
        data: { metric: 'successRate', change: successTrends.successRate.changePercent }
      });
    }

    // 并行效率洞察
    if (executionTrends.parallelEfficiency.current < 20) {
      insights.push({
        type: 'efficiency',
        severity: 'medium',
        title: '并行执行效率较低',
        description: `当前并行效率为 ${executionTrends.parallelEfficiency.current.toFixed(1)}%`,
        impact: '测试执行时间可能可以通过优化并行策略来改善',
        data: { metric: 'parallelEfficiency', value: executionTrends.parallelEfficiency.current }
      });
    }

    // 首次成功率洞察
    if (successTrends.firstTimeSuccess.current < 80) {
      insights.push({
        type: 'success',
        severity: 'medium',
        title: '首次成功率较低',
        description: `首次成功率为 ${successTrends.firstTimeSuccess.current.toFixed(1)}%`,
        impact: '可能存在不稳定的测试，需要重试才能通过',
        data: { metric: 'firstTimeSuccess', value: successTrends.firstTimeSuccess.current }
      });
    }

    return insights;
  }

  /**
   * 生成执行建议
   */
  private generateExecutionRecommendations(
    insights: ExecutionInsight[],
    performanceTrends: ExecutionTrendAnalysis['performanceTrends']
  ): ExecutionRecommendation[] {
    const recommendations: ExecutionRecommendation[] = [];

    // 基于洞察的建议
    insights.forEach(insight => {
      if (insight.type === 'performance' && insight.severity === 'high') {
        if (insight.data.change > 0) {
          recommendations.push({
            priority: 'high',
            category: '性能优化',
            title: '优化测试执行性能',
            description: '测试执行时间显著增加，需要分析原因并优化',
            expectedBenefit: '减少测试执行时间，提高开发效率',
            implementationEffort: 'medium'
          });
        }
      }

      if (insight.type === 'success' && insight.severity === 'high') {
        recommendations.push({
          priority: 'high',
          category: '测试稳定性',
          title: '提高测试成功率',
          description: '测试成功率下降，需要分析失败原因并修复',
          expectedBenefit: '提高测试可靠性，减少误报',
          implementationEffort: 'high'
        });
      }

      if (insight.type === 'efficiency') {
        recommendations.push({
          priority: 'medium',
          category: '并行优化',
          title: '优化测试并行执行',
          description: '当前并行效率较低，可以通过优化测试分组和执行策略来改善',
          expectedBenefit: '显著减少总执行时间',
          implementationEffort: 'medium'
        });
      }
    });

    // 基于性能趋势的建议
    if (performanceTrends.degradingTests.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: '性能回归',
        title: '修复性能回归的测试',
        description: '一些测试的执行时间显著增加，需要分析和优化',
        expectedBenefit: '改善整体测试执行效率',
        implementationEffort: 'medium',
        affectedTests: performanceTrends.degradingTests.slice(0, 3).map(t => t.testName)
      });
    }

    if (performanceTrends.slowestTests.length > 0) {
      recommendations.push({
        priority: 'low',
        category: '性能优化',
        title: '优化最慢的测试',
        description: '关注执行时间最长的测试，寻找优化机会',
        expectedBenefit: '减少测试套件的总执行时间',
        implementationEffort: 'low',
        affectedTests: performanceTrends.slowestTests.slice(0, 3).map(t => t.testName)
      });
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: '持续监控',
        title: '保持执行性能监控',
        description: '当前执行趋势良好，建议继续监控并寻找进一步优化的机会',
        expectedBenefit: '维持高效的测试执行',
        implementationEffort: 'low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 获取空的执行指标
   */
  private getEmptyExecutionMetrics(): ExecutionMetrics {
    return {
      totalExecutionTime: 0,
      averageTestTime: 0,
      medianTestTime: 0,
      slowestTests: [],
      fastestTests: [],
      parallelEfficiency: 0,
      resourceUtilization: { cpuUsage: 0, memoryUsage: 0, diskIO: 0, networkIO: 0 }
    };
  }

  /**
   * 获取空的执行趋势分析
   */
  private getEmptyExecutionTrendAnalysis(): ExecutionTrendAnalysis {
    const emptyTrendData: TrendData = {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: 'stable',
      dataPoints: []
    };

    return {
      timeRange: '',
      executionTrends: {
        totalTime: emptyTrendData,
        averageTime: emptyTrendData,
        parallelEfficiency: emptyTrendData
      },
      successTrends: {
        successRate: emptyTrendData,
        firstTimeSuccess: emptyTrendData,
        retrySuccess: emptyTrendData
      },
      performanceTrends: {
        slowestTests: [],
        improvingTests: [],
        degradingTests: []
      },
      insights: [],
      recommendations: [{
        priority: 'low',
        category: '数据收集',
        title: '积累执行历史数据',
        description: '需要更多历史数据才能进行有效的执行趋势分析',
        expectedBenefit: '为未来的性能优化提供基础',
        implementationEffort: 'low'
      }]
    };
  }

  /**
   * 生成执行趋势报告HTML
   */
  generateExecutionTrendReportHTML(analysis: ExecutionTrendAnalysis): string {
    return `
<div class="execution-trend-report">
  <div class="trend-header">
    <h3>⏱️ 测试执行趋势分析</h3>
    <div class="time-range">时间范围: ${analysis.timeRange}</div>
  </div>

  <div class="execution-metrics">
    <h4>📊 执行指标趋势</h4>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">总执行时间</span>
          <span class="trend-indicator ${analysis.executionTrends.totalTime.trend}">
            ${this.getTrendIcon(analysis.executionTrends.totalTime.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${(analysis.executionTrends.totalTime.current / 1000).toFixed(1)}s</span>
          <span class="change-value ${analysis.executionTrends.totalTime.trend}">
            ${analysis.executionTrends.totalTime.changePercent > 0 ? '+' : ''}${analysis.executionTrends.totalTime.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">平均测试时间</span>
          <span class="trend-indicator ${analysis.executionTrends.averageTime.trend}">
            ${this.getTrendIcon(analysis.executionTrends.averageTime.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${(analysis.executionTrends.averageTime.current / 1000).toFixed(1)}s</span>
          <span class="change-value ${analysis.executionTrends.averageTime.trend}">
            ${analysis.executionTrends.averageTime.changePercent > 0 ? '+' : ''}${analysis.executionTrends.averageTime.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">并行效率</span>
          <span class="trend-indicator ${analysis.executionTrends.parallelEfficiency.trend}">
            ${this.getTrendIcon(analysis.executionTrends.parallelEfficiency.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.executionTrends.parallelEfficiency.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.executionTrends.parallelEfficiency.trend}">
            ${analysis.executionTrends.parallelEfficiency.changePercent > 0 ? '+' : ''}${analysis.executionTrends.parallelEfficiency.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="success-metrics">
    <h4>✅ 成功率趋势</h4>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">总成功率</span>
          <span class="trend-indicator ${analysis.successTrends.successRate.trend}">
            ${this.getTrendIcon(analysis.successTrends.successRate.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.successTrends.successRate.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.successTrends.successRate.trend}">
            ${analysis.successTrends.successRate.changePercent > 0 ? '+' : ''}${analysis.successTrends.successRate.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">首次成功率</span>
          <span class="trend-indicator ${analysis.successTrends.firstTimeSuccess.trend}">
            ${this.getTrendIcon(analysis.successTrends.firstTimeSuccess.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.successTrends.firstTimeSuccess.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.successTrends.firstTimeSuccess.trend}">
            ${analysis.successTrends.firstTimeSuccess.changePercent > 0 ? '+' : ''}${analysis.successTrends.firstTimeSuccess.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">重试成功率</span>
          <span class="trend-indicator ${analysis.successTrends.retrySuccess.trend}">
            ${this.getTrendIcon(analysis.successTrends.retrySuccess.trend)}
          </span>
        </div>
        <div class="metric-values">
          <span class="current-value">${analysis.successTrends.retrySuccess.current.toFixed(1)}%</span>
          <span class="change-value ${analysis.successTrends.retrySuccess.trend}">
            ${analysis.successTrends.retrySuccess.changePercent > 0 ? '+' : ''}${analysis.successTrends.retrySuccess.changePercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="performance-trends">
    <h4>🚀 性能趋势详情</h4>
    <div class="performance-sections">
      ${analysis.performanceTrends.slowestTests.length > 0 ? `
      <div class="performance-section">
        <h5>最慢的测试</h5>
        <div class="test-list">
          ${analysis.performanceTrends.slowestTests.map(test => `
          <div class="test-item slow">
            <span class="test-name">${test.testName}</span>
            <span class="test-time">${(test.currentTime / 1000).toFixed(1)}s</span>
            <span class="test-category">${test.category}</span>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${analysis.performanceTrends.improvingTests.length > 0 ? `
      <div class="performance-section">
        <h5>性能改善的测试</h5>
        <div class="test-list">
          ${analysis.performanceTrends.improvingTests.map(test => `
          <div class="test-item improving">
            <span class="test-name">${test.testName}</span>
            <span class="test-change">改善 ${Math.abs(test.changePercent).toFixed(1)}%</span>
            <span class="test-category">${test.category}</span>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${analysis.performanceTrends.degradingTests.length > 0 ? `
      <div class="performance-section">
        <h5>性能下降的测试</h5>
        <div class="test-list">
          ${analysis.performanceTrends.degradingTests.map(test => `
          <div class="test-item degrading">
            <span class="test-name">${test.testName}</span>
            <span class="test-change">下降 ${test.changePercent.toFixed(1)}%</span>
            <span class="test-category">${test.category}</span>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="execution-insights">
    <h4>💡 关键洞察</h4>
    <div class="insights-list">
      ${analysis.insights.map(insight => `
      <div class="insight-item ${insight.type} ${insight.severity}">
        <div class="insight-header">
          <span class="insight-type">${this.getInsightTypeIcon(insight.type)}</span>
          <span class="insight-title">${insight.title}</span>
          <span class="severity-badge ${insight.severity}">${this.getSeverityLabel(insight.severity)}</span>
        </div>
        <div class="insight-description">${insight.description}</div>
        <div class="insight-impact">影响: ${insight.impact}</div>
      </div>
      `).join('')}
    </div>
  </div>

  <div class="execution-recommendations">
    <h4>🎯 优化建议</h4>
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
            <span class="expected-benefit">预期收益: ${rec.expectedBenefit}</span>
            <span class="implementation-effort">实施难度: ${this.getEffortLabel(rec.implementationEffort)}</span>
          </div>
          ${rec.affectedTests ? `
          <div class="affected-tests">
            影响的测试: ${rec.affectedTests.join(', ')}
          </div>
          ` : ''}
        </div>
      </div>
      `).join('')}
    </div>
  </div>
</div>`;
  }

  private getTrendIcon(trend: string): string {
    const icons = { improving: '📈', declining: '📉', stable: '➡️' };
    return icons[trend] || '➡️';
  }

  private getInsightTypeIcon(type: string): string {
    const icons = { performance: '⚡', success: '✅', efficiency: '🔧', anomaly: '🔍' };
    return icons[type] || '📊';
  }

  private getSeverityLabel(severity: string): string {
    const labels = { high: '高', medium: '中', low: '低' };
    return labels[severity] || severity;
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