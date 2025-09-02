import { TestResult } from '@playwright/test/reporter';
import { ErrorClassifier, ErrorClassification } from './error-classifier';

export interface StabilityMetrics {
  overallStability: number;
  testStability: Map<string, TestStabilityInfo>;
  categoryStability: Map<string, CategoryStabilityInfo>;
  trends: StabilityTrend[];
  recommendations: StabilityRecommendation[];
}

export interface TestStabilityInfo {
  testName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  stabilityScore: number;
  averageExecutionTime: number;
  retryRate: number;
  lastFailureReason?: string;
  improvementSuggestions: string[];
}

export interface CategoryStabilityInfo {
  category: string;
  totalTests: number;
  stableTests: number;
  unstableTests: number;
  flakyTests: number;
  stabilityScore: number;
  commonIssues: string[];
}

export interface StabilityTrend {
  date: string;
  overallStability: number;
  testCount: number;
  newFailures: number;
  resolvedIssues: number;
}

export interface StabilityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  impact: string;
  solution: string;
  effort: 'low' | 'medium' | 'high';
  affectedTests: string[];
}

export class StabilityMonitor {
  private errorClassifier: ErrorClassifier;
  private historicalData: Map<string, TestStabilityInfo>;
  private stabilityThresholds: StabilityThresholds;

  constructor() {
    this.errorClassifier = new ErrorClassifier();
    this.historicalData = new Map();
    this.stabilityThresholds = {
      stable: 0.95,
      unstable: 0.8,
      flaky: 0.5
    };
  }

  /**
   * 监控测试稳定性
   */
  monitorStability(testResults: TestResult[]): StabilityMetrics {
    console.log('📊 开始监控测试稳定性...');

    // 更新历史数据
    this.updateHistoricalData(testResults);

    // 计算整体稳定性
    const overallStability = this.calculateOverallStability(testResults);

    // 分析每个测试的稳定性
    const testStability = this.analyzeTestStability(testResults);

    // 分析分类稳定性
    const categoryStability = this.analyzeCategoryStability(testResults);

    // 生成趋势数据
    const trends = this.generateStabilityTrends();

    // 生成改进建议
    const recommendations = this.generateStabilityRecommendations(testStability, categoryStability);

    return {
      overallStability,
      testStability,
      categoryStability,
      trends,
      recommendations
    };
  }

  /**
   * 更新历史数据
   */
  private updateHistoricalData(testResults: TestResult[]): void {
    const testGroups = this.groupTestsByName(testResults);

    testGroups.forEach((results, testName) => {
      const successfulRuns = results.filter(r => r.status === 'passed').length;
      const failedRuns = results.filter(r => r.status === 'failed').length;
      const totalRuns = results.length;
      const totalExecutionTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
      const totalRetries = results.reduce((sum, r) => sum + (r.retry || 0), 0);

      const lastFailure = results.find(r => r.status === 'failed');
      const lastFailureReason = lastFailure?.error?.message;

      const stabilityInfo: TestStabilityInfo = {
        testName,
        totalRuns,
        successfulRuns,
        failedRuns,
        stabilityScore: totalRuns > 0 ? successfulRuns / totalRuns : 0,
        averageExecutionTime: totalRuns > 0 ? totalExecutionTime / totalRuns : 0,
        retryRate: totalRuns > 0 ? totalRetries / totalRuns : 0,
        lastFailureReason,
        improvementSuggestions: []
      };

      // 生成改进建议
      stabilityInfo.improvementSuggestions = this.generateTestImprovementSuggestions(stabilityInfo, results);

      this.historicalData.set(testName, stabilityInfo);
    });
  }

  /**
   * 按测试名称分组
   */
  private groupTestsByName(testResults: TestResult[]): Map<string, TestResult[]> {
    const groups = new Map<string, TestResult[]>();

    testResults.forEach(result => {
      const testName = result.title;
      if (!groups.has(testName)) {
        groups.set(testName, []);
      }
      groups.get(testName)!.push(result);
    });

    return groups;
  }

  /**
   * 计算整体稳定性
   */
  private calculateOverallStability(testResults: TestResult[]): number {
    if (testResults.length === 0) return 1.0;

    const successfulTests = testResults.filter(r => r.status === 'passed').length;
    return successfulTests / testResults.length;
  }

  /**
   * 分析测试稳定性
   */
  private analyzeTestStability(testResults: TestResult[]): Map<string, TestStabilityInfo> {
    const testStability = new Map<string, TestStabilityInfo>();

    this.historicalData.forEach((info, testName) => {
      testStability.set(testName, info);
    });

    return testStability;
  }

  /**
   * 分析分类稳定性
   */
  private analyzeCategoryStability(testResults: TestResult[]): Map<string, CategoryStabilityInfo> {
    const categoryMap = new Map<string, CategoryStabilityInfo>();

    // 按测试分类分组
    const categories = this.categorizeTests(testResults);

    categories.forEach((tests, category) => {
      const totalTests = tests.length;
      const stableTests = tests.filter(t => {
        const info = this.historicalData.get(t.title);
        return info && info.stabilityScore >= this.stabilityThresholds.stable;
      }).length;

      const unstableTests = tests.filter(t => {
        const info = this.historicalData.get(t.title);
        return info && info.stabilityScore < this.stabilityThresholds.stable && info.stabilityScore >= this.stabilityThresholds.unstable;
      }).length;

      const flakyTests = tests.filter(t => {
        const info = this.historicalData.get(t.title);
        return info && info.stabilityScore < this.stabilityThresholds.unstable;
      }).length;

      const stabilityScore = totalTests > 0 ? stableTests / totalTests : 0;

      // 收集常见问题
      const commonIssues = this.identifyCommonIssues(tests);

      categoryMap.set(category, {
        category,
        totalTests,
        stableTests,
        unstableTests,
        flakyTests,
        stabilityScore,
        commonIssues
      });
    });

    return categoryMap;
  }

  /**
   * 测试分类
   */
  private categorizeTests(testResults: TestResult[]): Map<string, TestResult[]> {
    const categories = new Map<string, TestResult[]>();

    testResults.forEach(result => {
      const category = this.extractTestCategory(result.title);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(result);
    });

    return categories;
  }

  /**
   * 提取测试分类
   */
  private extractTestCategory(testTitle: string): string {
    const title = testTitle.toLowerCase();
    
    if (title.includes('auth') || title.includes('login') || title.includes('register')) {
      return '认证测试';
    } else if (title.includes('pet') || title.includes('宠物')) {
      return '宠物管理';
    } else if (title.includes('analysis') || title.includes('分析')) {
      return '便便分析';
    } else if (title.includes('community') || title.includes('社区')) {
      return '社区功能';
    } else if (title.includes('performance') || title.includes('性能')) {
      return '性能测试';
    } else if (title.includes('visual') || title.includes('视觉')) {
      return '视觉测试';
    } else if (title.includes('accessibility') || title.includes('可访问性')) {
      return '可访问性测试';
    } else if (title.includes('error') || title.includes('错误')) {
      return '错误处理';
    } else if (title.includes('boundary') || title.includes('边界')) {
      return '边界测试';
    } else if (title.includes('integration') || title.includes('集成')) {
      return '集成测试';
    }
    
    return '其他测试';
  }

  /**
   * 识别常见问题
   */
  private identifyCommonIssues(tests: TestResult[]): string[] {
    const issueMap = new Map<string, number>();

    tests.filter(t => t.status === 'failed').forEach(test => {
      const classification = this.errorClassifier.classifyError(test);
      const issue = classification.rootCause;
      issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
    });

    return Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue]) => issue);
  }

  /**
   * 生成稳定性趋势
   */
  private generateStabilityTrends(): StabilityTrend[] {
    // 这里应该从历史数据中生成趋势
    // 目前返回模拟数据
    const trends: StabilityTrend[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        overallStability: 0.85 + Math.random() * 0.1,
        testCount: 100 + Math.floor(Math.random() * 20),
        newFailures: Math.floor(Math.random() * 5),
        resolvedIssues: Math.floor(Math.random() * 3)
      });
    }

    return trends;
  }

  /**
   * 生成稳定性改进建议
   */
  private generateStabilityRecommendations(
    testStability: Map<string, TestStabilityInfo>,
    categoryStability: Map<string, CategoryStabilityInfo>
  ): StabilityRecommendation[] {
    const recommendations: StabilityRecommendation[] = [];

    // 基于测试稳定性的建议
    testStability.forEach((info, testName) => {
      if (info.stabilityScore < this.stabilityThresholds.flaky) {
        recommendations.push({
          priority: 'high',
          category: '不稳定测试',
          issue: `测试 "${testName}" 稳定性极低 (${(info.stabilityScore * 100).toFixed(1)}%)`,
          impact: '严重影响测试套件的可靠性和开发效率',
          solution: '重新设计测试逻辑，改进等待策略，或考虑拆分为多个小测试',
          effort: 'high',
          affectedTests: [testName]
        });
      } else if (info.stabilityScore < this.stabilityThresholds.unstable) {
        recommendations.push({
          priority: 'medium',
          category: '不稳定测试',
          issue: `测试 "${testName}" 稳定性较低 (${(info.stabilityScore * 100).toFixed(1)}%)`,
          impact: '可能导致误报，影响开发流程',
          solution: '分析失败原因，优化测试实现，增加重试机制',
          effort: 'medium',
          affectedTests: [testName]
        });
      }

      if (info.retryRate > 0.5) {
        recommendations.push({
          priority: 'medium',
          category: '重试率过高',
          issue: `测试 "${testName}" 重试率过高 (${(info.retryRate * 100).toFixed(1)}%)`,
          impact: '增加测试执行时间，可能掩盖真实问题',
          solution: '分析重试原因，改进测试稳定性，减少对重试的依赖',
          effort: 'medium',
          affectedTests: [testName]
        });
      }

      if (info.averageExecutionTime > 30000) { // 30秒
        recommendations.push({
          priority: 'low',
          category: '执行时间过长',
          issue: `测试 "${testName}" 执行时间过长 (${(info.averageExecutionTime / 1000).toFixed(1)}s)`,
          impact: '影响测试套件整体执行效率',
          solution: '优化测试步骤，减少不必要的等待，考虑并行执行',
          effort: 'low',
          affectedTests: [testName]
        });
      }
    });

    // 基于分类稳定性的建议
    categoryStability.forEach((info, category) => {
      if (info.stabilityScore < 0.8) {
        recommendations.push({
          priority: 'high',
          category: '分类稳定性',
          issue: `${category} 分类整体稳定性较低 (${(info.stabilityScore * 100).toFixed(1)}%)`,
          impact: '影响该功能模块的测试可靠性',
          solution: '系统性地审查和改进该分类下的所有测试',
          effort: 'high',
          affectedTests: []
        });
      }

      if (info.flakyTests > info.totalTests * 0.2) {
        recommendations.push({
          priority: 'medium',
          category: '不稳定测试比例',
          issue: `${category} 分类中不稳定测试比例过高 (${((info.flakyTests / info.totalTests) * 100).toFixed(1)}%)`,
          impact: '该分类测试结果不可靠',
          solution: '重点关注不稳定测试，建立专项改进计划',
          effort: 'medium',
          affectedTests: []
        });
      }
    });

    // 通用建议
    const overallStability = Array.from(testStability.values())
      .reduce((sum, info) => sum + info.stabilityScore, 0) / testStability.size;

    if (overallStability < 0.9) {
      recommendations.push({
        priority: 'high',
        category: '整体稳定性',
        issue: `测试套件整体稳定性需要改进 (${(overallStability * 100).toFixed(1)}%)`,
        impact: '影响整个项目的测试质量和开发效率',
        solution: '建立测试稳定性监控机制，定期审查和改进测试',
        effort: 'high',
        affectedTests: []
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 生成测试改进建议
   */
  private generateTestImprovementSuggestions(
    info: TestStabilityInfo,
    results: TestResult[]
  ): string[] {
    const suggestions: string[] = [];

    // 基于稳定性分数
    if (info.stabilityScore < this.stabilityThresholds.flaky) {
      suggestions.push('考虑重新设计测试逻辑，可能存在根本性问题');
      suggestions.push('检查测试依赖和前置条件');
    } else if (info.stabilityScore < this.stabilityThresholds.unstable) {
      suggestions.push('分析失败模式，改进等待策略');
      suggestions.push('增加中间验证步骤');
    }

    // 基于重试率
    if (info.retryRate > 0.3) {
      suggestions.push('减少对重试机制的依赖');
      suggestions.push('改进测试的确定性');
    }

    // 基于执行时间
    if (info.averageExecutionTime > 20000) {
      suggestions.push('优化测试执行效率');
      suggestions.push('考虑拆分为更小的测试单元');
    }

    // 基于失败原因
    if (info.lastFailureReason) {
      const classification = this.errorClassifier.classifyError(results.find(r => r.status === 'failed')!);
      suggestions.push(...classification.resolution.slice(0, 2));
    }

    return suggestions;
  }

  /**
   * 生成稳定性报告HTML
   */
  generateStabilityReportHTML(metrics: StabilityMetrics): string {
    return `
<div class="stability-report">
  <div class="stability-overview">
    <h3>📊 稳定性概览</h3>
    <div class="overview-metrics">
      <div class="metric-card ${metrics.overallStability >= 0.9 ? 'success' : metrics.overallStability >= 0.8 ? 'warning' : 'error'}">
        <div class="metric-value">${(metrics.overallStability * 100).toFixed(1)}%</div>
        <div class="metric-label">整体稳定性</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.testStability.size}</div>
        <div class="metric-label">监控测试数</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.recommendations.filter(r => r.priority === 'high').length}</div>
        <div class="metric-label">高优先级建议</div>
      </div>
    </div>
  </div>

  <div class="stability-trends">
    <h4>📈 稳定性趋势</h4>
    <div class="trends-chart">
      <canvas id="stabilityTrendChart"></canvas>
    </div>
  </div>

  <div class="test-stability">
    <h4>🧪 测试稳定性详情</h4>
    <div class="stability-table">
      <table>
        <thead>
          <tr>
            <th>测试名称</th>
            <th>稳定性分数</th>
            <th>成功/总数</th>
            <th>重试率</th>
            <th>平均耗时</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(metrics.testStability.entries()).map(([name, info]) => `
          <tr class="stability-row ${this.getStabilityClass(info.stabilityScore)}">
            <td class="test-name">${name}</td>
            <td class="stability-score">${(info.stabilityScore * 100).toFixed(1)}%</td>
            <td class="success-ratio">${info.successfulRuns}/${info.totalRuns}</td>
            <td class="retry-rate">${(info.retryRate * 100).toFixed(1)}%</td>
            <td class="avg-time">${(info.averageExecutionTime / 1000).toFixed(1)}s</td>
            <td class="stability-status">
              <span class="status-badge ${this.getStabilityClass(info.stabilityScore)}">
                ${this.getStabilityLabel(info.stabilityScore)}
              </span>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="category-stability">
    <h4>📂 分类稳定性</h4>
    <div class="category-grid">
      ${Array.from(metrics.categoryStability.entries()).map(([category, info]) => `
      <div class="category-card">
        <div class="category-header">
          <h5>${category}</h5>
          <div class="category-score ${this.getStabilityClass(info.stabilityScore)}">
            ${(info.stabilityScore * 100).toFixed(1)}%
          </div>
        </div>
        <div class="category-stats">
          <div class="stat-row">
            <span>稳定测试:</span>
            <span class="success">${info.stableTests}</span>
          </div>
          <div class="stat-row">
            <span>不稳定测试:</span>
            <span class="warning">${info.unstableTests}</span>
          </div>
          <div class="stat-row">
            <span>不稳定测试:</span>
            <span class="error">${info.flakyTests}</span>
          </div>
        </div>
        ${info.commonIssues.length > 0 ? `
        <div class="common-issues">
          <strong>常见问题:</strong>
          <ul>
            ${info.commonIssues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      `).join('')}
    </div>
  </div>

  <div class="stability-recommendations">
    <h4>💡 改进建议</h4>
    <div class="recommendations-list">
      ${metrics.recommendations.map(rec => `
      <div class="recommendation-item priority-${rec.priority}">
        <div class="recommendation-header">
          <span class="priority-badge ${rec.priority}">${this.getPriorityLabel(rec.priority)}</span>
          <span class="category-tag">${rec.category}</span>
        </div>
        <div class="recommendation-content">
          <div class="issue">${rec.issue}</div>
          <div class="impact">影响: ${rec.impact}</div>
          <div class="solution">解决方案: ${rec.solution}</div>
          <div class="effort">工作量: ${this.getEffortLabel(rec.effort)}</div>
        </div>
      </div>
      `).join('')}
    </div>
  </div>
</div>`;
  }

  private getStabilityClass(score: number): string {
    if (score >= this.stabilityThresholds.stable) return 'stable';
    if (score >= this.stabilityThresholds.unstable) return 'unstable';
    return 'flaky';
  }

  private getStabilityLabel(score: number): string {
    if (score >= this.stabilityThresholds.stable) return '稳定';
    if (score >= this.stabilityThresholds.unstable) return '不稳定';
    return '不稳定';
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

interface StabilityThresholds {
  stable: number;
  unstable: number;
  flaky: number;
}