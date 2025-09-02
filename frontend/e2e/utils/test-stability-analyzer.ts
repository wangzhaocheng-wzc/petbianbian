/**
 * 测试稳定性分析器
 * 识别和修复不稳定的测试用例
 */

import { TestResult } from '@playwright/test/reporter';
import fs from 'fs/promises';
import path from 'path';

export interface FlakynessMetrics {
  testName: string;
  testFile: string;
  totalRuns: number;
  failures: number;
  flakynessRate: number; // 0-1之间的值
  failureReasons: string[];
  commonFailurePatterns: string[];
  lastFailure: string;
  stabilityScore: number; // 0-100的稳定性评分
}

export interface StabilityAnalysisResult {
  totalTests: number;
  stableTests: number;
  flakyTests: FlakynessMetrics[];
  unstableTests: FlakynessMetrics[];
  recommendations: StabilityRecommendation[];
  overallStabilityScore: number;
}

export interface StabilityRecommendation {
  type: 'wait-strategy' | 'retry-logic' | 'test-isolation' | 'environment' | 'refactor';
  testName: string;
  issue: string;
  solution: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string;
}

export class TestStabilityAnalyzer {
  private readonly FLAKY_THRESHOLD = 0.1; // 10%失败率认为是不稳定
  private readonly UNSTABLE_THRESHOLD = 0.3; // 30%失败率认为是非常不稳定
  private historyPath: string;

  constructor(historyPath: string = 'test-results/test-history.json') {
    this.historyPath = historyPath;
  }

  /**
   * 分析测试稳定性
   */
  async analyzeStability(): Promise<StabilityAnalysisResult> {
    const history = await this.loadTestHistory();
    const metrics = this.calculateFlakynessMetrics(history);
    
    const flakyTests = metrics.filter(m => 
      m.flakynessRate >= this.FLAKY_THRESHOLD && m.flakynessRate < this.UNSTABLE_THRESHOLD
    );
    
    const unstableTests = metrics.filter(m => 
      m.flakynessRate >= this.UNSTABLE_THRESHOLD
    );
    
    const stableTests = metrics.filter(m => 
      m.flakynessRate < this.FLAKY_THRESHOLD
    );

    return {
      totalTests: metrics.length,
      stableTests: stableTests.length,
      flakyTests,
      unstableTests,
      recommendations: this.generateStabilityRecommendations([...flakyTests, ...unstableTests]),
      overallStabilityScore: this.calculateOverallStabilityScore(metrics)
    };
  }

  /**
   * 加载测试历史记录
   */
  private async loadTestHistory(): Promise<any[]> {
    try {
      const content = await fs.readFile(this.historyPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('无法加载测试历史记录，返回空数组');
      return [];
    }
  }

  /**
   * 计算不稳定性指标
   */
  private calculateFlakynessMetrics(history: any[]): FlakynessMetrics[] {
    const testMetrics = new Map<string, FlakynessMetrics>();

    history.forEach(run => {
      if (run.tests) {
        run.tests.forEach((test: any) => {
          const key = `${test.file}:${test.title}`;
          
          if (!testMetrics.has(key)) {
            testMetrics.set(key, {
              testName: test.title,
              testFile: test.file,
              totalRuns: 0,
              failures: 0,
              flakynessRate: 0,
              failureReasons: [],
              commonFailurePatterns: [],
              lastFailure: '',
              stabilityScore: 100
            });
          }

          const metrics = testMetrics.get(key)!;
          metrics.totalRuns++;

          if (test.status === 'failed') {
            metrics.failures++;
            if (test.error) {
              metrics.failureReasons.push(test.error);
              metrics.lastFailure = run.timestamp || new Date().toISOString();
            }
          }
        });
      }
    });

    // 计算不稳定性率和稳定性评分
    testMetrics.forEach(metrics => {
      metrics.flakynessRate = metrics.totalRuns > 0 ? metrics.failures / metrics.totalRuns : 0;
      metrics.stabilityScore = Math.max(0, 100 - (metrics.flakynessRate * 100));
      metrics.commonFailurePatterns = this.identifyFailurePatterns(metrics.failureReasons);
    });

    return Array.from(testMetrics.values());
  }

  /**
   * 识别失败模式
   */
  private identifyFailurePatterns(failureReasons: string[]): string[] {
    const patterns = new Map<string, number>();
    
    const commonPatterns = [
      { pattern: /timeout/i, name: 'Timeout' },
      { pattern: /element not found/i, name: 'Element Not Found' },
      { pattern: /network/i, name: 'Network Error' },
      { pattern: /connection/i, name: 'Connection Error' },
      { pattern: /stale element/i, name: 'Stale Element' },
      { pattern: /click intercepted/i, name: 'Click Intercepted' },
      { pattern: /navigation/i, name: 'Navigation Error' },
      { pattern: /screenshot/i, name: 'Screenshot Error' }
    ];

    failureReasons.forEach(reason => {
      commonPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(reason)) {
          patterns.set(name, (patterns.get(name) || 0) + 1);
        }
      });
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern]) => pattern);
  }

  /**
   * 生成稳定性建议
   */
  private generateStabilityRecommendations(unstableTests: FlakynessMetrics[]): StabilityRecommendation[] {
    const recommendations: StabilityRecommendation[] = [];

    unstableTests.forEach(test => {
      // 基于失败模式生成建议
      test.commonFailurePatterns.forEach(pattern => {
        switch (pattern) {
          case 'Timeout':
            recommendations.push({
              type: 'wait-strategy',
              testName: test.testName,
              issue: '测试经常超时',
              solution: '增加等待时间或使用更智能的等待策略',
              priority: 'high',
              estimatedEffort: '1-2小时'
            });
            break;

          case 'Element Not Found':
            recommendations.push({
              type: 'wait-strategy',
              testName: test.testName,
              issue: '元素未找到',
              solution: '添加元素可见性等待或改进选择器',
              priority: 'high',
              estimatedEffort: '30分钟-1小时'
            });
            break;

          case 'Network Error':
            recommendations.push({
              type: 'retry-logic',
              testName: test.testName,
              issue: '网络错误导致失败',
              solution: '添加网络重试机制或使用API模拟',
              priority: 'medium',
              estimatedEffort: '1-2小时'
            });
            break;

          case 'Click Intercepted':
            recommendations.push({
              type: 'wait-strategy',
              testName: test.testName,
              issue: '点击被拦截',
              solution: '等待元素可点击或滚动到元素位置',
              priority: 'medium',
              estimatedEffort: '30分钟'
            });
            break;

          case 'Stale Element':
            recommendations.push({
              type: 'refactor',
              testName: test.testName,
              issue: '元素引用过期',
              solution: '重新获取元素引用或使用页面对象模式',
              priority: 'medium',
              estimatedEffort: '1小时'
            });
            break;
        }
      });

      // 基于不稳定性率生成通用建议
      if (test.flakynessRate > 0.5) {
        recommendations.push({
          type: 'refactor',
          testName: test.testName,
          issue: '测试极不稳定',
          solution: '完全重写测试或拆分为更小的测试',
          priority: 'high',
          estimatedEffort: '2-4小时'
        });
      } else if (test.flakynessRate > 0.2) {
        recommendations.push({
          type: 'test-isolation',
          testName: test.testName,
          issue: '测试不稳定',
          solution: '改进测试隔离和数据清理',
          priority: 'medium',
          estimatedEffort: '1-2小时'
        });
      }
    });

    return recommendations;
  }

  /**
   * 计算整体稳定性评分
   */
  private calculateOverallStabilityScore(metrics: FlakynessMetrics[]): number {
    if (metrics.length === 0) return 100;
    
    const totalScore = metrics.reduce((sum, metric) => sum + metric.stabilityScore, 0);
    return Math.round(totalScore / metrics.length);
  }

  /**
   * 生成稳定性报告
   */
  async generateStabilityReport(analysis: StabilityAnalysisResult, outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: analysis.totalTests,
        stableTests: analysis.stableTests,
        flakyTests: analysis.flakyTests.length,
        unstableTests: analysis.unstableTests.length,
        overallStabilityScore: analysis.overallStabilityScore,
        stabilityRate: `${((analysis.stableTests / analysis.totalTests) * 100).toFixed(1)}%`
      },
      flakyTests: analysis.flakyTests.map(test => ({
        name: test.testName,
        file: test.testFile,
        flakynessRate: `${(test.flakynessRate * 100).toFixed(1)}%`,
        stabilityScore: test.stabilityScore,
        totalRuns: test.totalRuns,
        failures: test.failures,
        commonPatterns: test.commonFailurePatterns
      })),
      unstableTests: analysis.unstableTests.map(test => ({
        name: test.testName,
        file: test.testFile,
        flakynessRate: `${(test.flakynessRate * 100).toFixed(1)}%`,
        stabilityScore: test.stabilityScore,
        totalRuns: test.totalRuns,
        failures: test.failures,
        commonPatterns: test.commonFailurePatterns
      })),
      recommendations: analysis.recommendations.map(rec => ({
        type: rec.type,
        testName: rec.testName,
        issue: rec.issue,
        solution: rec.solution,
        priority: rec.priority,
        estimatedEffort: rec.estimatedEffort
      }))
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`稳定性分析报告已生成: ${outputPath}`);
  }

  /**
   * 更新测试历史记录
   */
  async updateTestHistory(testResults: any): Promise<void> {
    const history = await this.loadTestHistory();
    
    const newEntry = {
      timestamp: new Date().toISOString(),
      tests: testResults,
      environment: process.env.NODE_ENV || 'test'
    };

    history.push(newEntry);

    // 保留最近100次运行记录
    const recentHistory = history.slice(-100);
    
    await fs.writeFile(this.historyPath, JSON.stringify(recentHistory, null, 2));
  }
}