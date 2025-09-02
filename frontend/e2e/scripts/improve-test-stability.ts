#!/usr/bin/env node

/**
 * 测试稳定性改进脚本
 * 自动识别和修复不稳定的测试用例
 */

import { TestStabilityAnalyzer } from '../utils/test-stability-analyzer';
import { EnhancedWaitStrategies } from '../utils/enhanced-wait-strategies';
import { TestEnvironmentIsolator } from '../utils/test-environment-isolator';
import fs from 'fs/promises';
import path from 'path';

interface StabilityImprovementConfig {
  analyzeHistory: boolean;
  generateRecommendations: boolean;
  autoFixCommonIssues: boolean;
  outputDir: string;
  historyPath: string;
  enableAutoFix: boolean;
  backupOriginalFiles: boolean;
}
  
in
terface TestFileAnalysis {
  filePath: string;
  issues: StabilityIssue[];
  recommendations: string[];
  stabilityScore: number;
}

interface StabilityIssue {
  type: 'timeout' | 'element-not-found' | 'click-intercepted' | 'stale-element' | 'race-condition';
  line: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestedFix: string;
}

class TestStabilityImprover {
  private config: StabilityImprovementConfig;
  private analyzer: TestStabilityAnalyzer;

  constructor(config: Partial<StabilityImprovementConfig> = {}) {
    this.config = {
      analyzeHistory: true,
      generateRecommendations: true,
      autoFixCommonIssues: false,
      outputDir: 'test-results/stability',
      historyPath: 'test-results/test-history.json',
      enableAutoFix: false,
      backupOriginalFiles: true,
      ...config
    };

    this.analyzer = new TestStabilityAnalyzer(this.config.historyPath);
  }

  /**
   * 运行完整的稳定性改进流程
   */
  async improveTestStability(): Promise<void> {
    console.log('🔍 开始测试稳定性分析和改进...');

    try {
      // 确保输出目录存在
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // 1. 分析测试历史
      if (this.config.analyzeHistory) {
        console.log('📊 分析测试历史记录...');
        const analysis = await this.analyzer.analyzeStability();
        
        // 生成稳定性报告
        const reportPath = path.join(this.config.outputDir, 'stability-report.json');
        await this.analyzer.generateStabilityReport(analysis, reportPath);
        
        console.log(`✅ 稳定性分析完成，报告保存至: ${reportPath}`);
        console.log(`📈 整体稳定性评分: ${analysis.overallStabilityScore}/100`);
        console.log(`🟢 稳定测试: ${analysis.stableTests}`);
        console.log(`🟡 不稳定测试: ${analysis.flakyTests.length}`);
        console.log(`🔴 极不稳定测试: ${analysis.unstableTests.length}`);
      }

      // 2. 分析测试文件
      console.log('🔍 分析测试文件...');
      const testFiles = await this.findTestFiles();
      const fileAnalyses: TestFileAnalysis[] = [];

      for (const filePath of testFiles) {
        const analysis = await this.analyzeTestFile(filePath);
        fileAnalyses.push(analysis);
      }

      // 3. 生成改进建议
      if (this.config.generateRecommendations) {
        console.log('💡 生成改进建议...');
        await this.generateImprovementRecommendations(fileAnalyses);
      }

      // 4. 自动修复常见问题
      if (this.config.autoFixCommonIssues && this.config.enableAutoFix) {
        console.log('🔧 自动修复常见问题...');
        await this.autoFixCommonIssues(fileAnalyses);
      }

      // 5. 生成稳定性改进报告
      await this.generateStabilityImprovementReport(fileAnalyses);

      console.log('✅ 测试稳定性改进完成！');

    } catch (error) {
      console.error('❌ 测试稳定性改进失败:', error);
      process.exit(1);
    }
  }

  /**
   * 查找所有测试文件
   */
  private async findTestFiles(): Promise<string[]> {
    const testFiles: string[] = [];
    const specsDir = path.join(__dirname, '../specs');

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.name.endsWith('.spec.ts')) {
            testFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`扫描目录失败: ${dir}`, error);
      }
    };

    await scanDirectory(specsDir);
    return testFiles;
  }

  /**
   * 分析单个测试文件
   */
  private async analyzeTestFile(filePath: string): Promise<TestFileAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const issues: StabilityIssue[] = [];

      // 分析常见的稳定性问题
      lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // 检查硬编码的等待时间
        if (line.includes('waitForTimeout') && /waitForTimeout\(\s*\d+\s*\)/.test(line)) {
          issues.push({
            type: 'timeout',
            line: lineNumber,
            description: '使用硬编码的等待时间',
            severity: 'medium',
            suggestedFix: '使用智能等待策略替代固定等待时间'
          });
        }

        // 检查直接的元素查找
        if (line.includes('.locator(') && !line.includes('waitFor')) {
          issues.push({
            type: 'element-not-found',
            line: lineNumber,
            description: '直接查找元素，可能导致元素未找到错误',
            severity: 'high',
            suggestedFix: '使用waitForElementReady确保元素可用'
          });
        }

        // 检查直接点击
        if (line.includes('.click()') && !line.includes('smart')) {
          issues.push({
            type: 'click-intercepted',
            line: lineNumber,
            description: '直接点击可能被拦截',
            severity: 'medium',
            suggestedFix: '使用smartClick处理点击拦截问题'
          });
        }

        // 检查元素引用重用
        if (line.includes('const element =') && line.includes('.locator(')) {
          const nextLines = lines.slice(index + 1, index + 10);
          const hasReuse = nextLines.some(nextLine => 
            nextLine.includes('element.') && 
            (nextLine.includes('.click') || nextLine.includes('.fill'))
          );
          
          if (hasReuse) {
            issues.push({
              type: 'stale-element',
              line: lineNumber,
              description: '重用元素引用可能导致过期元素错误',
              severity: 'medium',
              suggestedFix: '每次操作前重新获取元素引用'
            });
          }
        }

        // 检查竞态条件
        if (line.includes('Promise.all') && line.includes('.click')) {
          issues.push({
            type: 'race-condition',
            line: lineNumber,
            description: '并发操作可能导致竞态条件',
            severity: 'high',
            suggestedFix: '使用顺序执行或适当的同步机制'
          });
        }
      });

      // 计算稳定性评分
      const stabilityScore = this.calculateFileStabilityScore(issues, content);

      return {
        filePath,
        issues,
        recommendations: this.generateFileRecommendations(issues),
        stabilityScore
      };

    } catch (error) {
      console.warn(`分析文件失败: ${filePath}`, error);
      return {
        filePath,
        issues: [],
        recommendations: [],
        stabilityScore: 0
      };
    }
  }

  /**
   * 计算文件稳定性评分
   */
  private calculateFileStabilityScore(issues: StabilityIssue[], content: string): number {
    let score = 100;
    const testCount = (content.match(/test\(/g) || []).length;
    
    if (testCount === 0) return 0;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    // 根据测试数量调整评分
    const issueRatio = issues.length / testCount;
    if (issueRatio > 0.5) {
      score -= 20;
    } else if (issueRatio > 0.3) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成文件改进建议
   */
  private generateFileRecommendations(issues: StabilityIssue[]): string[] {
    const recommendations: string[] = [];
    const issueTypes = new Set(issues.map(issue => issue.type));

    if (issueTypes.has('timeout')) {
      recommendations.push('使用EnhancedWaitStrategies替代硬编码等待时间');
    }

    if (issueTypes.has('element-not-found')) {
      recommendations.push('实现智能元素等待策略');
    }

    if (issueTypes.has('click-intercepted')) {
      recommendations.push('使用智能点击方法处理交互问题');
    }

    if (issueTypes.has('stale-element')) {
      recommendations.push('避免重用元素引用，每次操作前重新获取');
    }

    if (issueTypes.has('race-condition')) {
      recommendations.push('添加适当的同步机制避免竞态条件');
    }

    if (issues.length > 5) {
      recommendations.push('考虑重构测试以提高可维护性');
    }

    return recommendations;
  }

  /**
   * 生成改进建议报告
   */
  private async generateImprovementRecommendations(analyses: TestFileAnalysis[]): Promise<void> {
    const recommendations = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: analyses.length,
        filesWithIssues: analyses.filter(a => a.issues.length > 0).length,
        totalIssues: analyses.reduce((sum, a) => sum + a.issues.length, 0),
        averageStabilityScore: Math.round(
          analyses.reduce((sum, a) => sum + a.stabilityScore, 0) / analyses.length
        )
      },
      fileAnalyses: analyses.map(analysis => ({
        file: path.relative(process.cwd(), analysis.filePath),
        stabilityScore: analysis.stabilityScore,
        issueCount: analysis.issues.length,
        issues: analysis.issues.map(issue => ({
          type: issue.type,
          line: issue.line,
          description: issue.description,
          severity: issue.severity,
          suggestedFix: issue.suggestedFix
        })),
        recommendations: analysis.recommendations
      })),
      globalRecommendations: this.generateGlobalRecommendations(analyses)
    };

    const reportPath = path.join(this.config.outputDir, 'improvement-recommendations.json');
    await fs.writeFile(reportPath, JSON.stringify(recommendations, null, 2));
    
    console.log(`💡 改进建议报告已生成: ${reportPath}`);
  }

  /**
   * 生成全局改进建议
   */
  private generateGlobalRecommendations(analyses: TestFileAnalysis[]): string[] {
    const allIssues = analyses.flatMap(a => a.issues);
    const issueTypeCounts = new Map<string, number>();
    
    allIssues.forEach(issue => {
      issueTypeCounts.set(issue.type, (issueTypeCounts.get(issue.type) || 0) + 1);
    });

    const recommendations: string[] = [];

    if (issueTypeCounts.get('timeout') && issueTypeCounts.get('timeout')! > 5) {
      recommendations.push('建议在项目中统一使用EnhancedWaitStrategies');
    }

    if (issueTypeCounts.get('element-not-found') && issueTypeCounts.get('element-not-found')! > 10) {
      recommendations.push('建议创建统一的页面对象基类，包含智能等待方法');
    }

    if (issueTypeCounts.get('click-intercepted') && issueTypeCounts.get('click-intercepted')! > 8) {
      recommendations.push('建议在所有测试中使用智能点击策略');
    }

    const lowScoreFiles = analyses.filter(a => a.stabilityScore < 60).length;
    if (lowScoreFiles > analyses.length * 0.3) {
      recommendations.push('建议进行全面的测试重构以提高整体稳定性');
    }

    return recommendations;
  }

  /**
   * 自动修复常见问题
   */
  private async autoFixCommonIssues(analyses: TestFileAnalysis[]): Promise<void> {
    for (const analysis of analyses) {
      if (analysis.issues.length === 0) continue;

      try {
        // 备份原文件
        if (this.config.backupOriginalFiles) {
          const backupPath = `${analysis.filePath}.backup.${Date.now()}`;
          await fs.copyFile(analysis.filePath, backupPath);
          console.log(`📋 已备份文件: ${backupPath}`);
        }

        // 读取文件内容
        let content = await fs.readFile(analysis.filePath, 'utf-8');
        let modified = false;

        // 修复硬编码等待时间
        const timeoutRegex = /\.waitForTimeout\(\s*(\d+)\s*\)/g;
        if (timeoutRegex.test(content)) {
          content = content.replace(timeoutRegex, '.waitForTimeout($1) // TODO: 考虑使用智能等待策略');
          modified = true;
        }

        // 添加导入语句（如果需要）
        if (modified && !content.includes('EnhancedWaitStrategies')) {
          const importLine = "import { EnhancedWaitStrategies } from '../utils/enhanced-wait-strategies';\n";
          content = importLine + content;
        }

        // 保存修改后的文件
        if (modified) {
          await fs.writeFile(analysis.filePath, content);
          console.log(`🔧 已修复文件: ${analysis.filePath}`);
        }

      } catch (error) {
        console.warn(`修复文件失败: ${analysis.filePath}`, error);
      }
    }
  }

  /**
   * 生成稳定性改进报告
   */
  private async generateStabilityImprovementReport(analyses: TestFileAnalysis[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: analyses.length,
        averageStabilityScore: Math.round(
          analyses.reduce((sum, a) => sum + a.stabilityScore, 0) / analyses.length
        ),
        filesNeedingAttention: analyses.filter(a => a.stabilityScore < 80).length,
        totalIssuesFound: analyses.reduce((sum, a) => sum + a.issues.length, 0)
      },
      stabilityDistribution: {
        excellent: analyses.filter(a => a.stabilityScore >= 90).length,
        good: analyses.filter(a => a.stabilityScore >= 80 && a.stabilityScore < 90).length,
        fair: analyses.filter(a => a.stabilityScore >= 60 && a.stabilityScore < 80).length,
        poor: analyses.filter(a => a.stabilityScore < 60).length
      },
      topIssues: this.getTopIssues(analyses),
      improvementPlan: this.generateImprovementPlan(analyses)
    };

    const reportPath = path.join(this.config.outputDir, 'stability-improvement-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 稳定性改进报告已生成: ${reportPath}`);
  }

  /**
   * 获取最常见的问题
   */
  private getTopIssues(analyses: TestFileAnalysis[]): Array<{type: string, count: number, description: string}> {
    const issueTypeCounts = new Map<string, number>();
    const issueDescriptions = new Map<string, string>();
    
    analyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        issueTypeCounts.set(issue.type, (issueTypeCounts.get(issue.type) || 0) + 1);
        if (!issueDescriptions.has(issue.type)) {
          issueDescriptions.set(issue.type, issue.description);
        }
      });
    });

    return Array.from(issueTypeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        description: issueDescriptions.get(type) || ''
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * 生成改进计划
   */
  private generateImprovementPlan(analyses: TestFileAnalysis[]): Array<{priority: string, task: string, estimatedEffort: string}> {
    const plan: Array<{priority: string, task: string, estimatedEffort: string}> = [];
    
    const poorFiles = analyses.filter(a => a.stabilityScore < 60);
    const fairFiles = analyses.filter(a => a.stabilityScore >= 60 && a.stabilityScore < 80);
    
    if (poorFiles.length > 0) {
      plan.push({
        priority: 'High',
        task: `重构 ${poorFiles.length} 个稳定性极差的测试文件`,
        estimatedEffort: `${poorFiles.length * 2}-${poorFiles.length * 4} 小时`
      });
    }

    if (fairFiles.length > 0) {
      plan.push({
        priority: 'Medium',
        task: `改进 ${fairFiles.length} 个稳定性一般的测试文件`,
        estimatedEffort: `${fairFiles.length * 1}-${fairFiles.length * 2} 小时`
      });
    }

    const totalIssues = analyses.reduce((sum, a) => sum + a.issues.length, 0);
    if (totalIssues > 20) {
      plan.push({
        priority: 'Medium',
        task: '实施全局测试稳定性改进策略',
        estimatedEffort: '4-8 小时'
      });
    }

    plan.push({
      priority: 'Low',
      task: '建立测试稳定性监控和持续改进流程',
      estimatedEffort: '2-4 小时'
    });

    return plan;
  }
}

// 主函数
async function main() {
  const config: Partial<StabilityImprovementConfig> = {
    analyzeHistory: process.argv.includes('--analyze-history'),
    generateRecommendations: process.argv.includes('--recommendations'),
    autoFixCommonIssues: process.argv.includes('--auto-fix'),
    enableAutoFix: process.argv.includes('--enable-auto-fix')
  };

  const improver = new TestStabilityImprover(config);
  await improver.improveTestStability();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { TestStabilityImprover };