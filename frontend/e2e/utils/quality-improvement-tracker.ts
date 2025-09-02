import { TestResult } from '@playwright/test/reporter';
import { TrendAnalyzer, TrendAnalysis } from './trend-analyzer';
import { ExecutionTrendAnalyzer, ExecutionTrendAnalysis } from './execution-trend-analyzer';
import { StabilityMonitor, StabilityMetrics } from './stability-monitor';
import { FailureAnalyzer, FailureAnalysisReport } from './failure-analyzer';
import * as fs from 'fs';
import * as path from 'path';

export interface QualityMetrics {
  timestamp: string;
  overallScore: number;
  dimensions: QualityDimensions;
  improvements: QualityImprovement[];
  regressions: QualityRegression[];
  actionItems: ActionItem[];
}

export interface QualityDimensions {
  reliability: DimensionScore;
  performance: DimensionScore;
  maintainability: DimensionScore;
  coverage: DimensionScore;
  stability: DimensionScore;
}

export interface DimensionScore {
  current: number;
  previous: number;
  target: number;
  trend: 'improving' | 'declining' | 'stable';
  weight: number;
}

export interface QualityImprovement {
  area: string;
  description: string;
  impact: number;
  implementedDate: string;
  measuredBenefit: string;
}

export interface QualityRegression {
  area: string;
  description: string;
  impact: number;
  detectedDate: string;
  rootCause: string;
  status: 'identified' | 'investigating' | 'fixing' | 'resolved';
}

export interface ActionItem {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  estimatedEffort: 'small' | 'medium' | 'large';
  expectedImpact: 'low' | 'medium' | 'high';
  createdDate: string;
  completedDate?: string;
}

export interface QualityReport {
  reportDate: string;
  executiveSummary: ExecutiveSummary;
  qualityMetrics: QualityMetrics;
  trendAnalysis: TrendAnalysis;
  executionAnalysis: ExecutionTrendAnalysis;
  stabilityAnalysis: StabilityMetrics;
  failureAnalysis: FailureAnalysisReport;
  recommendations: QualityRecommendation[];
  roadmap: QualityRoadmap;
}

export interface ExecutiveSummary {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  keyAchievements: string[];
  majorConcerns: string[];
  nextSteps: string[];
}

export interface QualityRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  rationale: string;
  expectedBenefit: string;
  implementationPlan: string[];
  estimatedEffort: string;
  timeline: string;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface QualityRoadmap {
  currentQuarter: RoadmapItem[];
  nextQuarter: RoadmapItem[];
  longTerm: RoadmapItem[];
}

export interface RoadmapItem {
  title: string;
  description: string;
  expectedOutcome: string;
  timeline: string;
  effort: string;
}

export class QualityImprovementTracker {
  private dataDir: string;
  private qualityHistoryFile: string;
  private actionItemsFile: string;
  private trendAnalyzer: TrendAnalyzer;
  private executionAnalyzer: ExecutionTrendAnalyzer;
  private stabilityMonitor: StabilityMonitor;
  private failureAnalyzer: FailureAnalyzer;

  constructor(dataDir: string = 'quality-tracking') {
    this.dataDir = dataDir;
    this.qualityHistoryFile = path.join(dataDir, 'quality-history.json');
    this.actionItemsFile = path.join(dataDir, 'action-items.json');
    
    this.trendAnalyzer = new TrendAnalyzer(path.join(dataDir, 'trends'));
    this.executionAnalyzer = new ExecutionTrendAnalyzer(path.join(dataDir, 'execution'));
    this.stabilityMonitor = new StabilityMonitor();
    this.failureAnalyzer = new FailureAnalyzer(path.join(dataDir, 'failures'));
    
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 生成综合质量报告
   */
  async generateQualityReport(testResults: TestResult[]): Promise<QualityReport> {
    console.log('📊 生成测试质量改进报告...');

    // 收集各种分析数据
    const [
      trendAnalysis,
      executionAnalysis,
      stabilityAnalysis,
      failureAnalysis
    ] = await Promise.all([
      this.trendAnalyzer.analyzeTrends(),
      this.executionAnalyzer.analyzeExecutionTrends(),
      this.stabilityMonitor.monitorStability(testResults),
      this.failureAnalyzer.analyzeFailurePatterns(testResults)
    ]);

    // 计算质量指标
    const qualityMetrics = await this.calculateQualityMetrics(
      testResults,
      trendAnalysis,
      executionAnalysis,
      stabilityAnalysis
    );

    // 生成执行摘要
    const executiveSummary = this.generateExecutiveSummary(
      qualityMetrics,
      trendAnalysis,
      stabilityAnalysis
    );

    // 生成建议
    const recommendations = this.generateQualityRecommendations(
      qualityMetrics,
      trendAnalysis,
      executionAnalysis,
      stabilityAnalysis,
      failureAnalysis
    );

    // 生成路线图
    const roadmap = this.generateQualityRoadmap(recommendations);

    const report: QualityReport = {
      reportDate: new Date().toISOString(),
      executiveSummary,
      qualityMetrics,
      trendAnalysis,
      executionAnalysis,
      stabilityAnalysis,
      failureAnalysis,
      recommendations,
      roadmap
    };

    // 保存报告
    await this.saveQualityReport(report);

    console.log('✅ 质量改进报告生成完成');
    return report;
  }

  /**
   * 计算质量指标
   */
  private async calculateQualityMetrics(
    testResults: TestResult[],
    trendAnalysis: TrendAnalysis,
    executionAnalysis: ExecutionTrendAnalysis,
    stabilityAnalysis: StabilityMetrics
  ): Promise<QualityMetrics> {
    const previousMetrics = await this.loadPreviousQualityMetrics();

    // 计算各维度分数
    const reliability = this.calculateReliabilityScore(testResults, stabilityAnalysis, previousMetrics?.dimensions.reliability);
    const performance = this.calculatePerformanceScore(executionAnalysis, previousMetrics?.dimensions.performance);
    const maintainability = this.calculateMaintainabilityScore(testResults, previousMetrics?.dimensions.maintainability);
    const coverage = this.calculateCoverageScore(trendAnalysis, previousMetrics?.dimensions.coverage);
    const stability = this.calculateStabilityScore(stabilityAnalysis, previousMetrics?.dimensions.stability);

    const dimensions: QualityDimensions = {
      reliability,
      performance,
      maintainability,
      coverage,
      stability
    };

    // 计算总体分数（加权平均）
    const overallScore = this.calculateOverallScore(dimensions);

    // 识别改进和回归
    const improvements = this.identifyImprovements(dimensions, previousMetrics?.dimensions);
    const regressions = this.identifyRegressions(dimensions, previousMetrics?.dimensions);

    // 生成行动项
    const actionItems = await this.generateActionItems(dimensions, improvements, regressions);

    return {
      timestamp: new Date().toISOString(),
      overallScore,
      dimensions,
      improvements,
      regressions,
      actionItems
    };
  }

  /**
   * 计算可靠性分数
   */
  private calculateReliabilityScore(
    testResults: TestResult[],
    stabilityAnalysis: StabilityMetrics,
    previous?: DimensionScore
  ): DimensionScore {
    const passRate = testResults.length > 0 
      ? (testResults.filter(r => r.status === 'passed').length / testResults.length) * 100 
      : 0;
    
    const current = Math.min(100, passRate + (stabilityAnalysis.overallStability * 100) * 0.3);
    const previousValue = previous?.current || current;
    const target = 95;

    return {
      current,
      previous: previousValue,
      target,
      trend: this.calculateTrend(current, previousValue),
      weight: 0.3
    };
  }

  /**
   * 计算性能分数
   */
  private calculatePerformanceScore(
    executionAnalysis: ExecutionTrendAnalysis,
    previous?: DimensionScore
  ): DimensionScore {
    // 基于执行时间和并行效率计算性能分数
    const timeScore = executionAnalysis.executionTrends.averageTime.current > 0 
      ? Math.max(0, 100 - (executionAnalysis.executionTrends.averageTime.current / 1000) * 2)
      : 100;
    
    const efficiencyScore = executionAnalysis.executionTrends.parallelEfficiency.current;
    const current = (timeScore * 0.6 + efficiencyScore * 0.4);
    const previousValue = previous?.current || current;
    const target = 85;

    return {
      current,
      previous: previousValue,
      target,
      trend: this.calculateTrend(current, previousValue),
      weight: 0.25
    };
  }

  /**
   * 计算可维护性分数
   */
  private calculateMaintainabilityScore(
    testResults: TestResult[],
    previous?: DimensionScore
  ): DimensionScore {
    // 基于测试复杂度、重复代码等因素计算可维护性分数
    // 这里使用简化的计算方法
    const retryRate = testResults.length > 0 
      ? testResults.filter(r => r.retry && r.retry > 0).length / testResults.length 
      : 0;
    
    const current = Math.max(0, 100 - retryRate * 50); // 重试率越高，可维护性越低
    const previousValue = previous?.current || current;
    const target = 90;

    return {
      current,
      previous: previousValue,
      target,
      trend: this.calculateTrend(current, previousValue),
      weight: 0.2
    };
  }

  /**
   * 计算覆盖率分数
   */
  private calculateCoverageScore(
    trendAnalysis: TrendAnalysis,
    previous?: DimensionScore
  ): DimensionScore {
    const current = trendAnalysis.trends.coverage.current;
    const previousValue = previous?.current || current;
    const target = 80;

    return {
      current,
      previous: previousValue,
      target,
      trend: this.calculateTrend(current, previousValue),
      weight: 0.15
    };
  }

  /**
   * 计算稳定性分数
   */
  private calculateStabilityScore(
    stabilityAnalysis: StabilityMetrics,
    previous?: DimensionScore
  ): DimensionScore {
    const current = stabilityAnalysis.overallStability * 100;
    const previousValue = previous?.current || current;
    const target = 95;

    return {
      current,
      previous: previousValue,
      target,
      trend: this.calculateTrend(current, previousValue),
      weight: 0.1
    };
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(dimensions: QualityDimensions): number {
    const weightedSum = Object.values(dimensions).reduce((sum, dimension) => {
      return sum + (dimension.current * dimension.weight);
    }, 0);

    return Math.round(weightedSum);
  }

  /**
   * 计算趋势
   */
  private calculateTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
    const threshold = 2; // 2% 变化阈值
    const changePercent = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

    if (Math.abs(changePercent) < threshold) {
      return 'stable';
    }
    return changePercent > 0 ? 'improving' : 'declining';
  }

  /**
   * 识别改进
   */
  private identifyImprovements(
    current: QualityDimensions,
    previous?: QualityDimensions
  ): QualityImprovement[] {
    const improvements: QualityImprovement[] = [];

    if (!previous) return improvements;

    Object.entries(current).forEach(([key, dimension]) => {
      const prevDimension = previous[key as keyof QualityDimensions];
      if (dimension.trend === 'improving' && dimension.current - prevDimension.current > 5) {
        improvements.push({
          area: this.getDimensionDisplayName(key),
          description: `${this.getDimensionDisplayName(key)}从 ${prevDimension.current.toFixed(1)} 提升到 ${dimension.current.toFixed(1)}`,
          impact: dimension.current - prevDimension.current,
          implementedDate: new Date().toISOString(),
          measuredBenefit: `提升了 ${(dimension.current - prevDimension.current).toFixed(1)} 分`
        });
      }
    });

    return improvements;
  }

  /**
   * 识别回归
   */
  private identifyRegressions(
    current: QualityDimensions,
    previous?: QualityDimensions
  ): QualityRegression[] {
    const regressions: QualityRegression[] = [];

    if (!previous) return regressions;

    Object.entries(current).forEach(([key, dimension]) => {
      const prevDimension = previous[key as keyof QualityDimensions];
      if (dimension.trend === 'declining' && prevDimension.current - dimension.current > 5) {
        regressions.push({
          area: this.getDimensionDisplayName(key),
          description: `${this.getDimensionDisplayName(key)}从 ${prevDimension.current.toFixed(1)} 下降到 ${dimension.current.toFixed(1)}`,
          impact: prevDimension.current - dimension.current,
          detectedDate: new Date().toISOString(),
          rootCause: '待分析',
          status: 'identified'
        });
      }
    });

    return regressions;
  }

  /**
   * 获取维度显示名称
   */
  private getDimensionDisplayName(key: string): string {
    const names: Record<string, string> = {
      reliability: '可靠性',
      performance: '性能',
      maintainability: '可维护性',
      coverage: '覆盖率',
      stability: '稳定性'
    };
    return names[key] || key;
  }

  /**
   * 生成行动项
   */
  private async generateActionItems(
    dimensions: QualityDimensions,
    improvements: QualityImprovement[],
    regressions: QualityRegression[]
  ): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];

    // 为回归问题创建行动项
    regressions.forEach((regression, index) => {
      actionItems.push({
        id: `regression-${Date.now()}-${index}`,
        priority: regression.impact > 10 ? 'critical' : regression.impact > 5 ? 'high' : 'medium',
        category: '质量回归',
        title: `修复${regression.area}回归问题`,
        description: regression.description,
        status: 'open',
        estimatedEffort: regression.impact > 10 ? 'large' : 'medium',
        expectedImpact: regression.impact > 10 ? 'high' : 'medium',
        createdDate: new Date().toISOString()
      });
    });

    // 为低于目标的维度创建行动项
    Object.entries(dimensions).forEach(([key, dimension]) => {
      if (dimension.current < dimension.target) {
        const gap = dimension.target - dimension.current;
        actionItems.push({
          id: `improvement-${key}-${Date.now()}`,
          priority: gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
          category: '质量改进',
          title: `提升${this.getDimensionDisplayName(key)}`,
          description: `当前${this.getDimensionDisplayName(key)}为 ${dimension.current.toFixed(1)}，目标为 ${dimension.target}`,
          status: 'open',
          estimatedEffort: gap > 20 ? 'large' : gap > 10 ? 'medium' : 'small',
          expectedImpact: gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
          createdDate: new Date().toISOString()
        });
      }
    });

    return actionItems;
  }

  /**
   * 生成执行摘要
   */
  private generateExecutiveSummary(
    qualityMetrics: QualityMetrics,
    trendAnalysis: TrendAnalysis,
    stabilityAnalysis: StabilityMetrics
  ): ExecutiveSummary {
    let overallHealth: ExecutiveSummary['overallHealth'];
    if (qualityMetrics.overallScore >= 90) overallHealth = 'excellent';
    else if (qualityMetrics.overallScore >= 80) overallHealth = 'good';
    else if (qualityMetrics.overallScore >= 70) overallHealth = 'fair';
    else overallHealth = 'poor';

    const keyAchievements: string[] = [];
    const majorConcerns: string[] = [];

    // 识别关键成就
    qualityMetrics.improvements.forEach(improvement => {
      if (improvement.impact > 5) {
        keyAchievements.push(improvement.description);
      }
    });

    // 识别主要关注点
    qualityMetrics.regressions.forEach(regression => {
      if (regression.impact > 5) {
        majorConcerns.push(regression.description);
      }
    });

    Object.entries(qualityMetrics.dimensions).forEach(([key, dimension]) => {
      if (dimension.current < dimension.target - 10) {
        majorConcerns.push(`${this.getDimensionDisplayName(key)}低于目标 ${(dimension.target - dimension.current).toFixed(1)} 分`);
      }
    });

    const nextSteps = [
      '继续监控测试质量指标',
      '执行高优先级的改进行动项',
      '分析和修复质量回归问题'
    ];

    return {
      overallHealth,
      keyAchievements,
      majorConcerns,
      nextSteps
    };
  }

  /**
   * 生成质量建议
   */
  private generateQualityRecommendations(
    qualityMetrics: QualityMetrics,
    trendAnalysis: TrendAnalysis,
    executionAnalysis: ExecutionTrendAnalysis,
    stabilityAnalysis: StabilityMetrics,
    failureAnalysis: FailureAnalysisReport
  ): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // 基于质量指标的建议
    Object.entries(qualityMetrics.dimensions).forEach(([key, dimension]) => {
      if (dimension.current < dimension.target) {
        recommendations.push(this.createDimensionRecommendation(key, dimension));
      }
    });

    // 基于失败分析的建议
    if (failureAnalysis.totalFailures > 0) {
      recommendations.push({
        id: `failure-analysis-${Date.now()}`,
        priority: 'high',
        category: '失败分析',
        title: '系统性地解决测试失败问题',
        description: `当前有 ${failureAnalysis.totalFailures} 个失败测试需要关注`,
        rationale: '减少测试失败可以提高整体测试可靠性',
        expectedBenefit: '提高测试通过率和开发效率',
        implementationPlan: [
          '分析失败模式和根本原因',
          '制定修复计划',
          '实施修复措施',
          '验证修复效果'
        ],
        estimatedEffort: '2-3 周',
        timeline: '本季度',
        dependencies: ['开发团队配合'],
        riskLevel: 'medium'
      });
    }

    // 基于稳定性分析的建议
    if (stabilityAnalysis.overallStability < 0.9) {
      recommendations.push({
        id: `stability-${Date.now()}`,
        priority: 'high',
        category: '测试稳定性',
        title: '提升测试套件稳定性',
        description: `当前测试稳定性为 ${(stabilityAnalysis.overallStability * 100).toFixed(1)}%`,
        rationale: '稳定的测试套件是持续集成的基础',
        expectedBenefit: '减少误报，提高开发团队对测试结果的信任',
        implementationPlan: [
          '识别不稳定的测试用例',
          '分析不稳定的根本原因',
          '重构或重写不稳定的测试',
          '建立稳定性监控机制'
        ],
        estimatedEffort: '3-4 周',
        timeline: '本季度',
        dependencies: ['测试框架优化'],
        riskLevel: 'low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 创建维度建议
   */
  private createDimensionRecommendation(key: string, dimension: DimensionScore): QualityRecommendation {
    const dimensionName = this.getDimensionDisplayName(key);
    const gap = dimension.target - dimension.current;

    const recommendations: Record<string, Partial<QualityRecommendation>> = {
      reliability: {
        title: '提升测试可靠性',
        description: '通过改进测试设计和实现来提高测试可靠性',
        implementationPlan: [
          '审查失败测试的根本原因',
          '改进测试数据管理',
          '优化测试环境配置',
          '增强错误处理机制'
        ]
      },
      performance: {
        title: '优化测试执行性能',
        description: '通过并行化和优化来减少测试执行时间',
        implementationPlan: [
          '分析性能瓶颈',
          '优化慢速测试',
          '改进并行执行策略',
          '升级测试基础设施'
        ]
      },
      maintainability: {
        title: '提升测试可维护性',
        description: '通过重构和标准化来提高测试代码质量',
        implementationPlan: [
          '建立测试代码规范',
          '重构重复代码',
          '改进页面对象模式',
          '增加测试文档'
        ]
      },
      coverage: {
        title: '增加测试覆盖率',
        description: '扩展测试覆盖范围以提高代码质量',
        implementationPlan: [
          '识别未覆盖的代码路径',
          '编写新的测试用例',
          '改进现有测试的覆盖范围',
          '建立覆盖率监控'
        ]
      },
      stability: {
        title: '提升测试稳定性',
        description: '减少测试不稳定性和误报',
        implementationPlan: [
          '识别不稳定测试',
          '改进等待策略',
          '优化测试数据管理',
          '增强测试隔离'
        ]
      }
    };

    const baseRecommendation = recommendations[key] || {};

    return {
      id: `${key}-improvement-${Date.now()}`,
      priority: gap > 20 ? 'critical' : gap > 10 ? 'high' : 'medium',
      category: '质量改进',
      rationale: `当前${dimensionName}低于目标 ${gap.toFixed(1)} 分`,
      expectedBenefit: `提升${dimensionName}到目标水平`,
      estimatedEffort: gap > 20 ? '4-6 周' : gap > 10 ? '2-3 周' : '1-2 周',
      timeline: gap > 20 ? '下季度' : '本季度',
      dependencies: ['团队协作'],
      riskLevel: 'low',
      ...baseRecommendation
    } as QualityRecommendation;
  }

  /**
   * 生成质量路线图
   */
  private generateQualityRoadmap(recommendations: QualityRecommendation[]): QualityRoadmap {
    const currentQuarter: RoadmapItem[] = [];
    const nextQuarter: RoadmapItem[] = [];
    const longTerm: RoadmapItem[] = [];

    recommendations.forEach(rec => {
      const roadmapItem: RoadmapItem = {
        title: rec.title,
        description: rec.description,
        expectedOutcome: rec.expectedBenefit,
        timeline: rec.timeline,
        effort: rec.estimatedEffort
      };

      if (rec.timeline === '本季度') {
        currentQuarter.push(roadmapItem);
      } else if (rec.timeline === '下季度') {
        nextQuarter.push(roadmapItem);
      } else {
        longTerm.push(roadmapItem);
      }
    });

    return {
      currentQuarter,
      nextQuarter,
      longTerm
    };
  }

  /**
   * 加载上一次的质量指标
   */
  private async loadPreviousQualityMetrics(): Promise<QualityMetrics | null> {
    if (!fs.existsSync(this.qualityHistoryFile)) {
      return null;
    }

    try {
      const historyContent = fs.readFileSync(this.qualityHistoryFile, 'utf8');
      const history: QualityMetrics[] = JSON.parse(historyContent);
      return history.length > 0 ? history[history.length - 1] : null;
    } catch (error) {
      console.error('❌ 加载质量历史数据失败:', error);
      return null;
    }
  }

  /**
   * 保存质量报告
   */
  private async saveQualityReport(report: QualityReport): Promise<void> {
    // 保存完整报告
    const reportPath = path.join(this.dataDir, `quality-report-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 更新质量历史
    let history: QualityMetrics[] = [];
    if (fs.existsSync(this.qualityHistoryFile)) {
      try {
        const historyContent = fs.readFileSync(this.qualityHistoryFile, 'utf8');
        history = JSON.parse(historyContent);
      } catch (error) {
        console.warn('⚠️ 无法加载质量历史数据:', error);
      }
    }

    history.push(report.qualityMetrics);
    
    // 只保留最近30天的数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    history = history.filter(metrics => new Date(metrics.timestamp) >= thirtyDaysAgo);

    fs.writeFileSync(this.qualityHistoryFile, JSON.stringify(history, null, 2));

    console.log(`📊 质量报告已保存: ${reportPath}`);
  }

  /**
   * 生成质量改进跟踪报告HTML
   */
  generateQualityReportHTML(report: QualityReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试质量改进跟踪报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
        .section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9rem; }
        .trend-up { color: #10b981; }
        .trend-down { color: #ef4444; }
        .trend-stable { color: #6b7280; }
        .health-excellent { color: #10b981; }
        .health-good { color: #3b82f6; }
        .health-fair { color: #f59e0b; }
        .health-poor { color: #ef4444; }
        .priority-critical { background: #fee2e2; color: #991b1b; }
        .priority-high { background: #fef3c7; color: #92400e; }
        .priority-medium { background: #dbeafe; color: #1e40af; }
        .priority-low { background: #f0fdf4; color: #166534; }
        .recommendation-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .roadmap-section { margin-bottom: 20px; }
        .roadmap-item { background: #f8f9fa; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 测试质量改进跟踪报告</h1>
            <p>生成时间: ${new Date(report.reportDate).toLocaleString('zh-CN')}</p>
        </div>

        <div class="section">
            <h2>📋 执行摘要</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value health-${report.executiveSummary.overallHealth}">
                        ${this.getHealthLabel(report.executiveSummary.overallHealth)}
                    </div>
                    <div class="metric-label">整体健康状况</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.qualityMetrics.overallScore}</div>
                    <div class="metric-label">质量总分</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.qualityMetrics.improvements.length}</div>
                    <div class="metric-label">质量改进</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.qualityMetrics.regressions.length}</div>
                    <div class="metric-label">质量回归</div>
                </div>
            </div>
            
            ${report.executiveSummary.keyAchievements.length > 0 ? `
            <h3>🏆 关键成就</h3>
            <ul>
                ${report.executiveSummary.keyAchievements.map(achievement => `<li>${achievement}</li>`).join('')}
            </ul>
            ` : ''}
            
            ${report.executiveSummary.majorConcerns.length > 0 ? `
            <h3>⚠️ 主要关注点</h3>
            <ul>
                ${report.executiveSummary.majorConcerns.map(concern => `<li>${concern}</li>`).join('')}
            </ul>
            ` : ''}
        </div>

        <div class="section">
            <h2>📊 质量维度分析</h2>
            <div class="metrics-grid">
                ${Object.entries(report.qualityMetrics.dimensions).map(([key, dimension]) => `
                <div class="metric-card">
                    <div class="metric-value trend-${dimension.trend}">
                        ${dimension.current.toFixed(1)}
                    </div>
                    <div class="metric-label">${this.getDimensionDisplayName(key)}</div>
                    <div style="font-size: 0.8rem; color: #666;">
                        目标: ${dimension.target} | 
                        趋势: ${this.getTrendLabel(dimension.trend)}
                    </div>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>💡 改进建议</h2>
            ${report.recommendations.map(rec => `
            <div class="recommendation-item priority-${rec.priority}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0;">${rec.title}</h3>
                    <span class="priority-badge">${this.getPriorityLabel(rec.priority)}</span>
                </div>
                <p>${rec.description}</p>
                <div style="font-size: 0.9rem; color: #666;">
                    <strong>预期收益:</strong> ${rec.expectedBenefit}<br>
                    <strong>预估工作量:</strong> ${rec.estimatedEffort}<br>
                    <strong>时间线:</strong> ${rec.timeline}
                </div>
            </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🗺️ 质量改进路线图</h2>
            
            <div class="roadmap-section">
                <h3>本季度计划</h3>
                ${report.roadmap.currentQuarter.map(item => `
                <div class="roadmap-item">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                    <div style="font-size: 0.9rem; color: #666;">
                        预期结果: ${item.expectedOutcome} | 工作量: ${item.effort}
                    </div>
                </div>
                `).join('')}
            </div>

            <div class="roadmap-section">
                <h3>下季度计划</h3>
                ${report.roadmap.nextQuarter.map(item => `
                <div class="roadmap-item">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                    <div style="font-size: 0.9rem; color: #666;">
                        预期结果: ${item.expectedOutcome} | 工作量: ${item.effort}
                    </div>
                </div>
                `).join('')}
            </div>

            ${report.roadmap.longTerm.length > 0 ? `
            <div class="roadmap-section">
                <h3>长期规划</h3>
                ${report.roadmap.longTerm.map(item => `
                <div class="roadmap-item">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                    <div style="font-size: 0.9rem; color: #666;">
                        预期结果: ${item.expectedOutcome} | 工作量: ${item.effort}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  private getHealthLabel(health: string): string {
    const labels = { excellent: '优秀', good: '良好', fair: '一般', poor: '较差' };
    return labels[health] || health;
  }

  private getTrendLabel(trend: string): string {
    const labels = { improving: '改善', declining: '下降', stable: '稳定' };
    return labels[trend] || trend;
  }

  private getPriorityLabel(priority: string): string {
    const labels = { critical: '紧急', high: '高', medium: '中', low: '低' };
    return labels[priority] || priority;
  }
}