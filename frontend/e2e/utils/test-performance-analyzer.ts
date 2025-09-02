/**
 * 测试性能分析器
 * 分析和优化慢速测试用例
 */

import { TestResult, TestCase } from '@playwright/test/reporter';
import fs from 'fs/promises';
import path from 'path';

export interface TestPerformanceMetrics {
  testName: string;
  duration: number;
  status: string;
  retries: number;
  file: string;
  line?: number;
  category: 'fast' | 'medium' | 'slow' | 'very-slow';
}

export interface PerformanceAnalysisResult {
  totalTests: number;
  averageDuration: number;
  slowTests: TestPerformanceMetrics[];
  recommendations: string[];
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface OptimizationSuggestion {
  type: 'parallel' | 'cache' | 'refactor' | 'skip' | 'mock';
  testName: string;
  description: string;
  estimatedImprovement: number; // 预计改进时间（毫秒）
}

export class TestPerformanceAnalyzer {
  private readonly SLOW_TEST_THRESHOLD = 30000; // 30秒
  private readonly VERY_SLOW_TEST_THRESHOLD = 60000; // 60秒
  private readonly MEDIUM_TEST_THRESHOLD = 10000; // 10秒

  /**
   * 分析测试性能
   */
  async analyzeTestPerformance(resultsPath: string): Promise<PerformanceAnalysisResult> {
    const results = await this.loadTestResults(resultsPath);
    const metrics = this.extractPerformanceMetrics(results);
    
    return {
      totalTests: metrics.length,
      averageDuration: this.calculateAverageDuration(metrics),
      slowTests: this.identifySlowTests(metrics),
      recommendations: this.generateRecommendations(metrics),
      optimizationSuggestions: this.generateOptimizationSuggestions(metrics)
    };
  }

  /**
   * 加载测试结果
   */
  private async loadTestResults(resultsPath: string): Promise<any> {
    try {
      const content = await fs.readFile(resultsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`无法加载测试结果: ${error}`);
      return { suites: [] };
    }
  }

  /**
   * 提取性能指标
   */
  private extractPerformanceMetrics(results: any): TestPerformanceMetrics[] {
    const metrics: TestPerformanceMetrics[] = [];

    const extractFromSuite = (suite: any, filePath: string = '') => {
      if (suite.tests) {
        suite.tests.forEach((test: any) => {
          const duration = test.results?.[0]?.duration || 0;
          metrics.push({
            testName: test.title,
            duration,
            status: test.results?.[0]?.status || 'unknown',
            retries: test.results?.length - 1 || 0,
            file: filePath || suite.file || 'unknown',
            line: test.location?.line,
            category: this.categorizeTestSpeed(duration)
          });
        });
      }

      if (suite.suites) {
        suite.suites.forEach((subSuite: any) => {
          extractFromSuite(subSuite, subSuite.file || filePath);
        });
      }
    };

    if (results.suites) {
      results.suites.forEach((suite: any) => {
        extractFromSuite(suite);
      });
    }

    return metrics;
  }

  /**
   * 分类测试速度
   */
  private categorizeTestSpeed(duration: number): 'fast' | 'medium' | 'slow' | 'very-slow' {
    if (duration >= this.VERY_SLOW_TEST_THRESHOLD) return 'very-slow';
    if (duration >= this.SLOW_TEST_THRESHOLD) return 'slow';
    if (duration >= this.MEDIUM_TEST_THRESHOLD) return 'medium';
    return 'fast';
  }

  /**
   * 计算平均持续时间
   */
  private calculateAverageDuration(metrics: TestPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return Math.round(total / metrics.length);
  }

  /**
   * 识别慢速测试
   */
  private identifySlowTests(metrics: TestPerformanceMetrics[]): TestPerformanceMetrics[] {
    return metrics
      .filter(metric => metric.category === 'slow' || metric.category === 'very-slow')
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(metrics: TestPerformanceMetrics[]): string[] {
    const recommendations: string[] = [];
    const slowTests = this.identifySlowTests(metrics);
    const failedTests = metrics.filter(m => m.status === 'failed');
    const retriedTests = metrics.filter(m => m.retries > 0);

    if (slowTests.length > 0) {
      recommendations.push(`发现 ${slowTests.length} 个慢速测试，建议优化`);
    }

    if (failedTests.length > metrics.length * 0.1) {
      recommendations.push('失败测试比例较高，建议检查测试稳定性');
    }

    if (retriedTests.length > metrics.length * 0.2) {
      recommendations.push('重试测试比例较高，建议改进等待策略');
    }

    const avgDuration = this.calculateAverageDuration(metrics);
    if (avgDuration > 15000) {
      recommendations.push('平均测试时间较长，建议启用并行执行');
    }

    return recommendations;
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(metrics: TestPerformanceMetrics[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const slowTests = this.identifySlowTests(metrics);

    slowTests.forEach(test => {
      // 基于测试名称和文件路径推断优化建议
      if (test.testName.includes('upload') || test.testName.includes('image')) {
        suggestions.push({
          type: 'mock',
          testName: test.testName,
          description: '使用模拟文件上传替代真实文件上传',
          estimatedImprovement: Math.min(test.duration * 0.7, 20000)
        });
      }

      if (test.testName.includes('analysis') || test.testName.includes('AI')) {
        suggestions.push({
          type: 'mock',
          testName: test.testName,
          description: '模拟AI分析响应，避免实际API调用',
          estimatedImprovement: Math.min(test.duration * 0.8, 30000)
        });
      }

      if (test.testName.includes('database') || test.testName.includes('data')) {
        suggestions.push({
          type: 'cache',
          testName: test.testName,
          description: '使用测试数据缓存，减少数据库操作',
          estimatedImprovement: Math.min(test.duration * 0.5, 15000)
        });
      }

      if (test.retries > 2) {
        suggestions.push({
          type: 'refactor',
          testName: test.testName,
          description: '重构测试以提高稳定性，减少重试次数',
          estimatedImprovement: test.duration * test.retries * 0.3
        });
      }

      if (test.duration > this.VERY_SLOW_TEST_THRESHOLD) {
        suggestions.push({
          type: 'parallel',
          testName: test.testName,
          description: '将长时间测试拆分为可并行执行的子测试',
          estimatedImprovement: test.duration * 0.6
        });
      }
    });

    return suggestions;
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(analysis: PerformanceAnalysisResult, outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: analysis.totalTests,
        averageDuration: `${(analysis.averageDuration / 1000).toFixed(2)}s`,
        slowTestsCount: analysis.slowTests.length,
        totalOptimizationPotential: `${(analysis.optimizationSuggestions.reduce((sum, s) => sum + s.estimatedImprovement, 0) / 1000).toFixed(2)}s`
      },
      slowTests: analysis.slowTests.map(test => ({
        name: test.testName,
        duration: `${(test.duration / 1000).toFixed(2)}s`,
        file: test.file,
        category: test.category,
        retries: test.retries
      })),
      recommendations: analysis.recommendations,
      optimizationSuggestions: analysis.optimizationSuggestions.map(suggestion => ({
        type: suggestion.type,
        testName: suggestion.testName,
        description: suggestion.description,
        estimatedImprovement: `${(suggestion.estimatedImprovement / 1000).toFixed(2)}s`
      }))
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`性能分析报告已生成: ${outputPath}`);
  }
}

/**
 * 智能测试选择器
 * 基于代码变更和历史数据选择需要运行的测试
 */
export class SmartTestSelector {
  private testHistoryPath: string;

  constructor(testHistoryPath: string = 'test-results/test-history.json') {
    this.testHistoryPath = testHistoryPath;
  }

  /**
   * 基于代码变更选择测试
   */
  async selectTestsForChanges(changedFiles: string[]): Promise<string[]> {
    const testMapping = await this.loadTestMapping();
    const selectedTests = new Set<string>();

    changedFiles.forEach(file => {
      const relatedTests = this.findRelatedTests(file, testMapping);
      relatedTests.forEach(test => selectedTests.add(test));
    });

    return Array.from(selectedTests);
  }

  /**
   * 加载测试映射关系
   */
  private async loadTestMapping(): Promise<Record<string, string[]>> {
    try {
      const content = await fs.readFile('test-results/test-mapping.json', 'utf-8');
      return JSON.parse(content);
    } catch {
      return this.generateDefaultTestMapping();
    }
  }

  /**
   * 生成默认测试映射
   */
  private generateDefaultTestMapping(): Record<string, string[]> {
    return {
      'src/pages/PoopAnalysis.tsx': ['specs/analysis/**/*.spec.ts'],
      'src/pages/Profile.tsx': ['specs/auth/**/*.spec.ts'],
      'src/components/pets/': ['specs/pets/**/*.spec.ts'],
      'src/components/community/': ['specs/community/**/*.spec.ts'],
      'backend/src/routes/': ['specs/integration/**/*.spec.ts'],
      'backend/src/models/': ['specs/integration/**/*.spec.ts']
    };
  }

  /**
   * 查找相关测试
   */
  private findRelatedTests(changedFile: string, testMapping: Record<string, string[]>): string[] {
    const relatedTests: string[] = [];

    Object.entries(testMapping).forEach(([pattern, tests]) => {
      if (changedFile.includes(pattern) || pattern.includes(changedFile)) {
        relatedTests.push(...tests);
      }
    });

    return relatedTests;
  }
}