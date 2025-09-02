#!/usr/bin/env node

/**
 * 测试可维护性增强脚本
 * 执行代码重构、质量检查和文档生成
 */

import { promises as fs } from 'fs';
import path from 'path';
import { TestCodeRefactorer } from '../utils/test-code-refactorer';
import { TestMaintainabilityAnalyzer } from '../utils/test-maintainability-analyzer';
import { TestQualityStandardsChecker } from '../utils/test-quality-standards';
import { TestDocumentationGenerator } from '../utils/test-documentation-generator';

interface MaintainabilityEnhancementOptions {
  testDirectory: string;
  outputDirectory: string;
  enableRefactoring: boolean;
  enableQualityCheck: boolean;
  enableDocumentation: boolean;
  applyRefactoring: boolean;
  generateReports: boolean;
}

class TestMaintainabilityEnhancer {
  private readonly refactorer = new TestCodeRefactorer();
  private readonly analyzer = new TestMaintainabilityAnalyzer();
  private readonly qualityChecker = new TestQualityStandardsChecker();
  private readonly docGenerator = new TestDocumentationGenerator();

  /**
   * 执行完整的可维护性增强流程
   */
  async enhanceTestMaintainability(options: MaintainabilityEnhancementOptions): Promise<void> {
    console.log('🚀 开始测试可维护性增强流程...');
    console.log(`📁 测试目录: ${options.testDirectory}`);
    console.log(`📁 输出目录: ${options.outputDirectory}`);
    console.log('');

    // 确保输出目录存在
    await this.ensureDirectoryExists(options.outputDirectory);

    const results = {
      refactoring: null as any,
      maintainability: null as any,
      quality: null as any,
      documentation: null as any
    };

    try {
      // 1. 代码重构分析
      if (options.enableRefactoring) {
        console.log('🔧 执行代码重构分析...');
        results.refactoring = await this.performRefactoringAnalysis(
          options.testDirectory,
          options.outputDirectory,
          options.applyRefactoring
        );
        console.log('✅ 代码重构分析完成');
        console.log('');
      }

      // 2. 可维护性分析
      console.log('📊 执行可维护性分析...');
      results.maintainability = await this.performMaintainabilityAnalysis(
        options.testDirectory,
        options.outputDirectory
      );
      console.log('✅ 可维护性分析完成');
      console.log('');

      // 3. 质量标准检查
      if (options.enableQualityCheck) {
        console.log('🔍 执行质量标准检查...');
        results.quality = await this.performQualityCheck(
          options.testDirectory,
          options.outputDirectory
        );
        console.log('✅ 质量标准检查完成');
        console.log('');
      }

      // 4. 文档生成
      if (options.enableDocumentation) {
        console.log('📚 生成测试文档...');
        results.documentation = await this.generateDocumentation(
          options.testDirectory,
          options.outputDirectory
        );
        console.log('✅ 测试文档生成完成');
        console.log('');
      }

      // 5. 生成综合报告
      if (options.generateReports) {
        console.log('📋 生成综合报告...');
        await this.generateComprehensiveReport(results, options.outputDirectory);
        console.log('✅ 综合报告生成完成');
        console.log('');
      }

      // 6. 显示汇总信息
      this.displaySummary(results);

    } catch (error) {
      console.error('❌ 可维护性增强流程失败:', error);
      throw error;
    }
  }

  /**
   * 执行代码重构分析
   */
  private async performRefactoringAnalysis(
    testDirectory: string,
    outputDirectory: string,
    applyRefactoring: boolean
  ): Promise<any> {
    const refactoringResults = await this.refactorer.refactorTestSuite(testDirectory);
    
    // 保存重构分析报告
    const refactoringReportPath = path.join(outputDirectory, 'refactoring-analysis.json');
    await fs.writeFile(refactoringReportPath, JSON.stringify(refactoringResults, null, 2));

    // 如果启用了应用重构，则实际修改文件
    if (applyRefactoring) {
      console.log('  🔄 应用代码重构...');
      let appliedCount = 0;
      
      for (const result of refactoringResults.results) {
        if (result.changes.length > 0 && result.improvementScore > 20) {
          try {
            // 备份原文件
            const backupPath = `${result.filePath}.backup`;
            await fs.copyFile(result.filePath, backupPath);
            
            // 应用重构
            await fs.writeFile(result.filePath, result.refactoredContent);
            appliedCount++;
            
            console.log(`    ✅ 已重构: ${path.relative(process.cwd(), result.filePath)}`);
          } catch (error) {
            console.warn(`    ⚠️  重构失败: ${result.filePath}`, error);
          }
        }
      }
      
      console.log(`  📊 已应用重构的文件数: ${appliedCount}`);
    }

    // 生成重构建议文档
    await this.generateRefactoringSuggestions(refactoringResults, outputDirectory);

    return refactoringResults;
  }

  /**
   * 执行可维护性分析
   */
  private async performMaintainabilityAnalysis(
    testDirectory: string,
    outputDirectory: string
  ): Promise<any> {
    const maintainabilityAnalysis = await this.analyzer.analyzeTestSuite(testDirectory);
    
    // 生成可维护性报告
    const reportPath = path.join(outputDirectory, 'maintainability-report.json');
    await this.analyzer.generateMaintainabilityReport(maintainabilityAnalysis, reportPath);

    // 生成改进建议
    await this.generateMaintainabilityImprovements(maintainabilityAnalysis, outputDirectory);

    return maintainabilityAnalysis;
  }

  /**
   * 执行质量标准检查
   */
  private async performQualityCheck(
    testDirectory: string,
    outputDirectory: string
  ): Promise<any> {
    const qualityAnalysis = await this.qualityChecker.checkTestSuite(testDirectory);
    
    // 生成质量报告
    const reportPath = path.join(outputDirectory, 'quality-standards-report.json');
    await this.qualityChecker.generateQualityReport(qualityAnalysis, reportPath);

    // 生成质量改进指南
    await this.generateQualityImprovementGuide(qualityAnalysis, outputDirectory);

    return qualityAnalysis;
  }

  /**
   * 生成测试文档
   */
  private async generateDocumentation(
    testDirectory: string,
    outputDirectory: string
  ): Promise<any> {
    const documentationAnalysis = await this.docGenerator.generateTestSuiteDocumentation(testDirectory);
    
    // 生成索引文档
    const indexPath = path.join(outputDirectory, 'test-suite-index.md');
    await this.docGenerator.generateTestSuiteIndex(documentationAnalysis, indexPath);

    // 为每个测试文件生成详细文档
    const docsDir = path.join(outputDirectory, 'test-docs');
    await this.ensureDirectoryExists(docsDir);

    for (const doc of documentationAnalysis.documents) {
      const fileName = path.basename(doc.filePath, '.spec.ts') + '.md';
      const docPath = path.join(docsDir, fileName);
      await this.docGenerator.saveDocumentationToFile(doc, docPath);
    }

    return documentationAnalysis;
  }

  /**
   * 生成重构建议文档
   */
  private async generateRefactoringSuggestions(
    refactoringResults: any,
    outputDirectory: string
  ): Promise<void> {
    const suggestions: string[] = [];
    
    suggestions.push('# 代码重构建议');
    suggestions.push('');
    suggestions.push('本文档包含基于代码分析生成的重构建议。');
    suggestions.push('');

    // 汇总信息
    suggestions.push('## 汇总信息');
    suggestions.push('');
    suggestions.push(`- **分析文件数**: ${refactoringResults.summary.totalFiles}`);
    suggestions.push(`- **成功重构数**: ${refactoringResults.summary.successfulRefactorings}`);
    suggestions.push(`- **总变更数**: ${refactoringResults.summary.totalChanges}`);
    suggestions.push(`- **平均改进分数**: ${refactoringResults.summary.averageImprovementScore}`);
    suggestions.push('');

    // 高优先级重构建议
    const highPriorityFiles = refactoringResults.results
      .filter((r: any) => r.improvementScore > 30)
      .sort((a: any, b: any) => b.improvementScore - a.improvementScore);

    if (highPriorityFiles.length > 0) {
      suggestions.push('## 高优先级重构建议');
      suggestions.push('');
      
      highPriorityFiles.forEach((result: any) => {
        const relativePath = path.relative(process.cwd(), result.filePath);
        suggestions.push(`### ${relativePath}`);
        suggestions.push('');
        suggestions.push(`**改进分数**: ${result.improvementScore}`);
        suggestions.push(`**变更数量**: ${result.changes.length}`);
        suggestions.push('');

        if (result.changes.length > 0) {
          suggestions.push('**建议的变更**:');
          result.changes.forEach((change: any) => {
            suggestions.push(`- **${change.type}** (第${change.line}行): ${change.description}`);
          });
          suggestions.push('');
        }

        suggestions.push('---');
        suggestions.push('');
      });
    }

    // 常见重构模式
    suggestions.push('## 常见重构模式');
    suggestions.push('');
    suggestions.push('### 1. 提取常量');
    suggestions.push('```typescript');
    suggestions.push('// 重构前');
    suggestions.push("waitForTimeout(5000);");
    suggestions.push("fill('#email', 'test@example.com');");
    suggestions.push('');
    suggestions.push('// 重构后');
    suggestions.push('const ANALYSIS_TIMEOUT = 5000;');
    suggestions.push("const TEST_EMAIL = 'test@example.com';");
    suggestions.push('waitForTimeout(ANALYSIS_TIMEOUT);');
    suggestions.push("fill('#email', TEST_EMAIL);");
    suggestions.push('```');
    suggestions.push('');

    suggestions.push('### 2. 提取公共方法');
    suggestions.push('```typescript');
    suggestions.push('// 重构前');
    suggestions.push('test("test 1", async ({ page }) => {');
    suggestions.push('  await page.goto("/login");');
    suggestions.push('  await page.fill("#username", "test");');
    suggestions.push('  await page.fill("#password", "test");');
    suggestions.push('  await page.click("#login-btn");');
    suggestions.push('});');
    suggestions.push('');
    suggestions.push('// 重构后');
    suggestions.push('async function performLogin(page, username, password) {');
    suggestions.push('  await page.goto("/login");');
    suggestions.push('  await page.fill("#username", username);');
    suggestions.push('  await page.fill("#password", password);');
    suggestions.push('  await page.click("#login-btn");');
    suggestions.push('}');
    suggestions.push('');
    suggestions.push('test("test 1", async ({ page }) => {');
    suggestions.push('  await performLogin(page, "test", "test");');
    suggestions.push('});');
    suggestions.push('```');
    suggestions.push('');

    const suggestionsPath = path.join(outputDirectory, 'refactoring-suggestions.md');
    await fs.writeFile(suggestionsPath, suggestions.join('\n'));
  }

  /**
   * 生成可维护性改进建议
   */
  private async generateMaintainabilityImprovements(
    analysis: any,
    outputDirectory: string
  ): Promise<void> {
    const improvements: string[] = [];
    
    improvements.push('# 可维护性改进建议');
    improvements.push('');
    improvements.push('基于可维护性分析结果的改进建议。');
    improvements.push('');

    // 汇总信息
    improvements.push('## 分析汇总');
    improvements.push('');
    improvements.push(`- **分析文件数**: ${analysis.summary.totalFiles}`);
    improvements.push(`- **平均可维护性指数**: ${analysis.summary.averageMaintainabilityIndex}`);
    improvements.push(`- **需要关注的文件数**: ${analysis.summary.filesNeedingAttention}`);
    improvements.push(`- **代码异味总数**: ${analysis.summary.totalCodeSmells}`);
    improvements.push('');

    // 需要紧急关注的文件
    const urgentFiles = analysis.fileMetrics
      .filter((m: any) => m.maintainabilityIndex < 50)
      .sort((a: any, b: any) => a.maintainabilityIndex - b.maintainabilityIndex);

    if (urgentFiles.length > 0) {
      improvements.push('## 🚨 需要紧急关注的文件');
      improvements.push('');
      
      urgentFiles.forEach((metrics: any) => {
        const relativePath = path.relative(process.cwd(), metrics.testFile);
        improvements.push(`### ${relativePath}`);
        improvements.push('');
        improvements.push(`**可维护性指数**: ${metrics.maintainabilityIndex}/100`);
        improvements.push(`**代码行数**: ${metrics.linesOfCode}`);
        improvements.push(`**平均测试长度**: ${metrics.averageTestLength} 行`);
        improvements.push(`**复杂度评分**: ${metrics.complexityScore}/10`);
        improvements.push(`**代码异味数**: ${metrics.codeSmells.length}`);
        improvements.push('');

        if (metrics.suggestions.length > 0) {
          improvements.push('**改进建议**:');
          metrics.suggestions.forEach((suggestion: string) => {
            improvements.push(`- ${suggestion}`);
          });
          improvements.push('');
        }

        improvements.push('---');
        improvements.push('');
      });
    }

    // 重构机会
    if (analysis.refactoringOpportunities.length > 0) {
      improvements.push('## 🔧 重构机会');
      improvements.push('');
      
      analysis.refactoringOpportunities.slice(0, 10).forEach((opportunity: any, index: number) => {
        improvements.push(`### ${index + 1}. ${opportunity.description}`);
        improvements.push('');
        improvements.push(`**文件**: ${path.relative(process.cwd(), opportunity.testFile)}`);
        improvements.push(`**类型**: ${opportunity.type}`);
        improvements.push(`**预估工作量**: ${opportunity.estimatedEffort}`);
        improvements.push(`**影响程度**: ${opportunity.impact}`);
        improvements.push('');

        if (opportunity.codeExample) {
          improvements.push('**代码示例**:');
          improvements.push('');
          improvements.push('重构前:');
          improvements.push('```typescript');
          improvements.push(opportunity.codeExample.before);
          improvements.push('```');
          improvements.push('');
          improvements.push('重构后:');
          improvements.push('```typescript');
          improvements.push(opportunity.codeExample.after);
          improvements.push('```');
          improvements.push('');
        }

        improvements.push('---');
        improvements.push('');
      });
    }

    const improvementsPath = path.join(outputDirectory, 'maintainability-improvements.md');
    await fs.writeFile(improvementsPath, improvements.join('\n'));
  }

  /**
   * 生成质量改进指南
   */
  private async generateQualityImprovementGuide(
    analysis: any,
    outputDirectory: string
  ): Promise<void> {
    const guide: string[] = [];
    
    guide.push('# 测试质量改进指南');
    guide.push('');
    guide.push('基于质量标准检查结果的改进指南。');
    guide.push('');

    // 汇总信息
    guide.push('## 质量概览');
    guide.push('');
    guide.push(`- **检查文件数**: ${analysis.summary.totalFiles}`);
    guide.push(`- **平均质量分数**: ${analysis.summary.averageScore}/100`);
    guide.push('');

    // 等级分布
    guide.push('### 质量等级分布');
    guide.push('');
    Object.entries(analysis.summary.gradeDistribution).forEach(([grade, count]) => {
      guide.push(`- **${grade} 级**: ${count} 个文件`);
    });
    guide.push('');

    // 最常见的问题
    if (analysis.summary.topViolations.length > 0) {
      guide.push('## 🔍 最常见的质量问题');
      guide.push('');
      
      analysis.summary.topViolations.forEach((violation: any, index: number) => {
        guide.push(`### ${index + 1}. ${violation.description}`);
        guide.push('');
        guide.push(`**出现次数**: ${violation.count}`);
        guide.push(`**标准ID**: ${violation.standardId}`);
        guide.push('');
      });
    }

    // 低质量文件
    const lowQualityFiles = analysis.reports
      .filter((r: any) => r.grade === 'D' || r.grade === 'F')
      .sort((a: any, b: any) => a.score - b.score);

    if (lowQualityFiles.length > 0) {
      guide.push('## ⚠️ 需要改进的文件');
      guide.push('');
      
      lowQualityFiles.forEach((report: any) => {
        const relativePath = path.relative(process.cwd(), report.filePath);
        guide.push(`### ${relativePath}`);
        guide.push('');
        guide.push(`**质量分数**: ${report.score}/100 (${report.grade} 级)`);
        guide.push(`**错误数**: ${report.summary.errors}`);
        guide.push(`**警告数**: ${report.summary.warnings}`);
        guide.push(`**信息数**: ${report.summary.infos}`);
        guide.push('');

        // 显示前5个违规
        const topViolations = report.violations.slice(0, 5);
        if (topViolations.length > 0) {
          guide.push('**主要问题**:');
          topViolations.forEach((violation: any) => {
            guide.push(`- 第${violation.line}行: ${violation.message} (${violation.severity})`);
            if (violation.suggestion) {
              guide.push(`  💡 建议: ${violation.suggestion}`);
            }
          });
          guide.push('');
        }

        guide.push('---');
        guide.push('');
      });
    }

    // 质量改进最佳实践
    guide.push('## 📋 质量改进最佳实践');
    guide.push('');
    
    guide.push('### 1. 测试结构');
    guide.push('- 使用 `describe` 对相关测试进行分组');
    guide.push('- 每个测试应该独立运行');
    guide.push('- 使用 `beforeEach` 和 `afterEach` 进行设置和清理');
    guide.push('');

    guide.push('### 2. 命名规范');
    guide.push('- 测试描述应该清晰说明测试目的');
    guide.push('- 变量名应该有意义且遵循命名约定');
    guide.push('- 页面对象变量应该与类名保持一致');
    guide.push('');

    guide.push('### 3. 代码质量');
    guide.push('- 避免硬编码值，使用常量或配置');
    guide.push('- 提取重复代码到公共方法');
    guide.push('- 为复杂逻辑添加解释性注释');
    guide.push('');

    guide.push('### 4. 选择器策略');
    guide.push('- 优先使用 `data-testid` 属性');
    guide.push('- 避免复杂的CSS选择器');
    guide.push('- 使用语义化的选择器方法');
    guide.push('');

    guide.push('### 5. 等待策略');
    guide.push('- 使用智能等待而不是固定延时');
    guide.push('- 设置合理的超时时间');
    guide.push('- 为长时间操作添加说明注释');
    guide.push('');

    const guidePath = path.join(outputDirectory, 'quality-improvement-guide.md');
    await fs.writeFile(guidePath, guide.join('\n'));
  }

  /**
   * 生成综合报告
   */
  private async generateComprehensiveReport(
    results: any,
    outputDirectory: string
  ): Promise<void> {
    const report: string[] = [];
    
    report.push('# 测试可维护性增强综合报告');
    report.push('');
    report.push(`**生成时间**: ${new Date().toLocaleString('zh-CN')}`);
    report.push('');

    // 执行摘要
    report.push('## 📊 执行摘要');
    report.push('');

    if (results.refactoring) {
      report.push('### 代码重构');
      report.push(`- 分析文件数: ${results.refactoring.summary.totalFiles}`);
      report.push(`- 成功重构数: ${results.refactoring.summary.successfulRefactorings}`);
      report.push(`- 总变更数: ${results.refactoring.summary.totalChanges}`);
      report.push(`- 平均改进分数: ${results.refactoring.summary.averageImprovementScore}`);
      report.push('');
    }

    if (results.maintainability) {
      report.push('### 可维护性分析');
      report.push(`- 分析文件数: ${results.maintainability.summary.totalFiles}`);
      report.push(`- 平均可维护性指数: ${results.maintainability.summary.averageMaintainabilityIndex}`);
      report.push(`- 需要关注的文件数: ${results.maintainability.summary.filesNeedingAttention}`);
      report.push(`- 代码异味总数: ${results.maintainability.summary.totalCodeSmells}`);
      report.push('');
    }

    if (results.quality) {
      report.push('### 质量标准检查');
      report.push(`- 检查文件数: ${results.quality.summary.totalFiles}`);
      report.push(`- 平均质量分数: ${results.quality.summary.averageScore}/100`);
      report.push('- 质量等级分布:');
      Object.entries(results.quality.summary.gradeDistribution).forEach(([grade, count]) => {
        report.push(`  - ${grade} 级: ${count} 个文件`);
      });
      report.push('');
    }

    if (results.documentation) {
      report.push('### 文档生成');
      report.push(`- 文档化文件数: ${results.documentation.summary.totalFiles}`);
      report.push(`- 测试套件总数: ${results.documentation.summary.totalTestSuites}`);
      report.push(`- 测试用例总数: ${results.documentation.summary.totalTestCases}`);
      report.push(`- 功能覆盖数: ${results.documentation.summary.featureCoverage.length}`);
      report.push('');
    }

    // 关键发现
    report.push('## 🔍 关键发现');
    report.push('');

    // 最需要改进的文件
    if (results.maintainability) {
      const worstFiles = results.maintainability.fileMetrics
        .filter((m: any) => m.maintainabilityIndex < 60)
        .sort((a: any, b: any) => a.maintainabilityIndex - b.maintainabilityIndex)
        .slice(0, 5);

      if (worstFiles.length > 0) {
        report.push('### 最需要改进的文件');
        worstFiles.forEach((metrics: any) => {
          const relativePath = path.relative(process.cwd(), metrics.testFile);
          report.push(`- **${relativePath}**: 可维护性指数 ${metrics.maintainabilityIndex}/100`);
        });
        report.push('');
      }
    }

    // 改进建议优先级
    report.push('## 🎯 改进建议优先级');
    report.push('');
    report.push('### 高优先级 (立即执行)');
    report.push('- 修复质量检查中的错误级别问题');
    report.push('- 重构可维护性指数低于50的文件');
    report.push('- 提取重复代码和硬编码值');
    report.push('');

    report.push('### 中优先级 (本周内完成)');
    report.push('- 改进测试描述和命名');
    report.push('- 添加缺失的注释和文档');
    report.push('- 优化复杂的选择器');
    report.push('');

    report.push('### 低优先级 (持续改进)');
    report.push('- 完善测试文档');
    report.push('- 统一代码风格');
    report.push('- 优化测试执行性能');
    report.push('');

    // 生成的文件列表
    report.push('## 📁 生成的文件');
    report.push('');
    report.push('### 分析报告');
    if (results.refactoring) {
      report.push('- `refactoring-analysis.json` - 代码重构分析结果');
      report.push('- `refactoring-suggestions.md` - 重构建议文档');
    }
    if (results.maintainability) {
      report.push('- `maintainability-report.json` - 可维护性分析报告');
      report.push('- `maintainability-improvements.md` - 可维护性改进建议');
    }
    if (results.quality) {
      report.push('- `quality-standards-report.json` - 质量标准检查报告');
      report.push('- `quality-improvement-guide.md` - 质量改进指南');
    }
    report.push('');

    report.push('### 文档');
    if (results.documentation) {
      report.push('- `test-suite-index.md` - 测试套件索引');
      report.push('- `test-docs/` - 详细测试文档目录');
    }
    report.push('');

    // 下一步行动
    report.push('## 🚀 下一步行动');
    report.push('');
    report.push('1. **审查报告**: 仔细阅读各项分析报告和改进建议');
    report.push('2. **制定计划**: 根据优先级制定具体的改进计划');
    report.push('3. **执行改进**: 按计划执行代码重构和质量改进');
    report.push('4. **验证效果**: 重新运行分析验证改进效果');
    report.push('5. **持续监控**: 建立定期的质量检查机制');
    report.push('');

    const reportPath = path.join(outputDirectory, 'comprehensive-report.md');
    await fs.writeFile(reportPath, report.join('\n'));
  }

  /**
   * 显示汇总信息
   */
  private displaySummary(results: any): void {
    console.log('📋 可维护性增强完成汇总:');
    console.log('');

    if (results.refactoring) {
      console.log(`🔧 代码重构: ${results.refactoring.summary.successfulRefactorings}/${results.refactoring.summary.totalFiles} 文件`);
    }

    if (results.maintainability) {
      console.log(`📊 可维护性: 平均指数 ${results.maintainability.summary.averageMaintainabilityIndex}/100`);
    }

    if (results.quality) {
      console.log(`🔍 质量检查: 平均分数 ${results.quality.summary.averageScore}/100`);
    }

    if (results.documentation) {
      console.log(`📚 文档生成: ${results.documentation.summary.totalFiles} 个文件已文档化`);
    }

    console.log('');
    console.log('🎉 所有改进任务已完成！请查看输出目录中的详细报告。');
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

// 命令行接口
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options: MaintainabilityEnhancementOptions = {
    testDirectory: args[0] || 'frontend/e2e/specs',
    outputDirectory: args[1] || 'frontend/e2e/maintainability-reports',
    enableRefactoring: !args.includes('--no-refactoring'),
    enableQualityCheck: !args.includes('--no-quality'),
    enableDocumentation: !args.includes('--no-docs'),
    applyRefactoring: args.includes('--apply-refactoring'),
    generateReports: !args.includes('--no-reports')
  };

  console.log('🔧 测试可维护性增强工具');
  console.log('================================');
  console.log('');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('用法: node enhance-test-maintainability.ts [测试目录] [输出目录] [选项]');
    console.log('');
    console.log('选项:');
    console.log('  --no-refactoring     跳过代码重构分析');
    console.log('  --no-quality         跳过质量标准检查');
    console.log('  --no-docs            跳过文档生成');
    console.log('  --no-reports         跳过报告生成');
    console.log('  --apply-refactoring  实际应用代码重构 (谨慎使用)');
    console.log('  --help, -h           显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node enhance-test-maintainability.ts');
    console.log('  node enhance-test-maintainability.ts frontend/e2e/specs reports');
    console.log('  node enhance-test-maintainability.ts --apply-refactoring');
    return;
  }

  const enhancer = new TestMaintainabilityEnhancer();
  
  try {
    await enhancer.enhanceTestMaintainability(options);
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { TestMaintainabilityEnhancer, MaintainabilityEnhancementOptions };