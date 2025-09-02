/**
 * 测试可维护性分析器
 * 分析测试代码质量和可维护性
 */

import fs from 'fs/promises';
import path from 'path';

export interface MaintainabilityMetrics {
  testFile: string;
  linesOfCode: number;
  testCount: number;
  averageTestLength: number;
  duplicatedCode: number;
  complexityScore: number;
  maintainabilityIndex: number;
  codeSmells: CodeSmell[];
  suggestions: string[];
}

export interface CodeSmell {
  type: 'long-test' | 'duplicate-code' | 'hard-coded-values' | 'poor-naming' | 'missing-comments' | 'complex-logic';
  line: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
  refactoringEffort: 'low' | 'medium' | 'high';
}

export interface RefactoringOpportunity {
  type: 'extract-method' | 'extract-constant' | 'simplify-logic' | 'improve-naming' | 'add-comments';
  testFile: string;
  description: string;
  estimatedEffort: string;
  impact: 'high' | 'medium' | 'low';
  codeExample?: {
    before: string;
    after: string;
  };
}

export class TestMaintainabilityAnalyzer {
  private readonly MAX_TEST_LENGTH = 50; // 最大测试长度（行数）
  private readonly MAX_COMPLEXITY_SCORE = 10; // 最大复杂度评分
  private readonly MIN_MAINTAINABILITY_INDEX = 60; // 最小可维护性指数

  /**
   * 分析测试文件的可维护性
   */
  async analyzeTestFile(filePath: string): Promise<MaintainabilityMetrics> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const metrics: MaintainabilityMetrics = {
        testFile: filePath,
        linesOfCode: this.countLinesOfCode(lines),
        testCount: this.countTests(content),
        averageTestLength: this.calculateAverageTestLength(content),
        duplicatedCode: this.detectDuplicatedCode(content),
        complexityScore: this.calculateComplexityScore(content),
        maintainabilityIndex: 0, // 将在最后计算
        codeSmells: this.detectCodeSmells(lines),
        suggestions: []
      };

      // 计算可维护性指数
      metrics.maintainabilityIndex = this.calculateMaintainabilityIndex(metrics);
      
      // 生成改进建议
      metrics.suggestions = this.generateSuggestions(metrics);

      return metrics;
    } catch (error) {
      console.warn(`分析文件失败: ${filePath}`, error);
      return this.createEmptyMetrics(filePath);
    }
  }

  /**
   * 计算代码行数（排除空行和注释）
   */
  private countLinesOfCode(lines: string[]): number {
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.startsWith('//') && 
             !trimmed.startsWith('/*') && 
             !trimmed.startsWith('*');
    }).length;
  }

  /**
   * 计算测试数量
   */
  private countTests(content: string): number {
    const testMatches = content.match(/test\(/g) || [];
    const itMatches = content.match(/it\(/g) || [];
    return testMatches.length + itMatches.length;
  }

  /**
   * 计算平均测试长度
   */
  private calculateAverageTestLength(content: string): number {
    const testBlocks = this.extractTestBlocks(content);
    if (testBlocks.length === 0) return 0;
    
    const totalLines = testBlocks.reduce((sum, block) => sum + block.split('\n').length, 0);
    return Math.round(totalLines / testBlocks.length);
  }

  /**
   * 提取测试块
   */
  private extractTestBlocks(content: string): string[] {
    const testBlocks: string[] = [];
    const lines = content.split('\n');
    let currentBlock = '';
    let inTest = false;
    let braceCount = 0;

    for (const line of lines) {
      if (line.includes('test(') || line.includes('it(')) {
        inTest = true;
        currentBlock = line;
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (inTest) {
        currentBlock += '\n' + line;
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          testBlocks.push(currentBlock);
          currentBlock = '';
          inTest = false;
        }
      }
    }

    return testBlocks;
  }

  /**
   * 检测重复代码
   */
  private detectDuplicatedCode(content: string): number {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 10);
    const duplicates = new Set<string>();
    
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[i] === lines[j] && lines[i].length > 20) {
          duplicates.add(lines[i]);
        }
      }
    }

    return duplicates.size;
  }

  /**
   * 计算复杂度评分
   */
  private calculateComplexityScore(content: string): number {
    let score = 0;
    
    // 嵌套层级
    const maxNesting = this.calculateMaxNesting(content);
    score += Math.min(maxNesting * 2, 10);
    
    // 条件语句数量
    const conditionals = (content.match(/if\s*\(|else|switch|case/g) || []).length;
    score += Math.min(conditionals * 0.5, 5);
    
    // 循环语句数量
    const loops = (content.match(/for\s*\(|while\s*\(|forEach/g) || []).length;
    score += Math.min(loops * 1, 5);
    
    // 异步操作数量
    const asyncOps = (content.match(/await|\.then\(|\.catch\(/g) || []).length;
    score += Math.min(asyncOps * 0.3, 3);

    return Math.min(score, this.MAX_COMPLEXITY_SCORE);
  }

  /**
   * 计算最大嵌套层级
   */
  private calculateMaxNesting(content: string): number {
    const lines = content.split('\n');
    let maxNesting = 0;
    let currentNesting = 0;

    for (const line of lines) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      currentNesting += openBraces - closeBraces;
      maxNesting = Math.max(maxNesting, currentNesting);
    }

    return maxNesting;
  }

  /**
   * 检测代码异味
   */
  private detectCodeSmells(lines: string[]): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // 检测硬编码值
      if (this.hasHardCodedValues(trimmedLine)) {
        codeSmells.push({
          type: 'hard-coded-values',
          line: lineNumber,
          description: '包含硬编码值，应该提取为常量',
          severity: 'medium',
          refactoringEffort: 'low'
        });
      }

      // 检测长行
      if (line.length > 120) {
        codeSmells.push({
          type: 'complex-logic',
          line: lineNumber,
          description: '代码行过长，影响可读性',
          severity: 'low',
          refactoringEffort: 'low'
        });
      }

      // 检测魔法数字
      if (this.hasMagicNumbers(trimmedLine)) {
        codeSmells.push({
          type: 'hard-coded-values',
          line: lineNumber,
          description: '包含魔法数字，应该使用命名常量',
          severity: 'medium',
          refactoringEffort: 'low'
        });
      }

      // 检测复杂的选择器
      if (this.hasComplexSelector(trimmedLine)) {
        codeSmells.push({
          type: 'complex-logic',
          line: lineNumber,
          description: '选择器过于复杂，考虑使用data-testid',
          severity: 'medium',
          refactoringEffort: 'medium'
        });
      }

      // 检测缺少注释的复杂逻辑
      if (this.needsComment(trimmedLine) && !this.hasComment(lines, index)) {
        codeSmells.push({
          type: 'missing-comments',
          line: lineNumber,
          description: '复杂逻辑缺少注释说明',
          severity: 'low',
          refactoringEffort: 'low'
        });
      }
    });

    return codeSmells;
  }

  /**
   * 检测硬编码值
   */
  private hasHardCodedValues(line: string): boolean {
    // 检测字符串字面量（排除常见的测试字符串）
    const stringLiterals = line.match(/"[^"]{10,}"|'[^']{10,}'/g) || [];
    return stringLiterals.some(str => 
      !str.includes('test') && 
      !str.includes('spec') && 
      !str.includes('should') &&
      !str.includes('expect')
    );
  }

  /**
   * 检测魔法数字
   */
  private hasMagicNumbers(line: string): boolean {
    // 查找数字（排除常见的测试数字）
    const numbers = line.match(/\b\d{3,}\b/g) || [];
    return numbers.some(num => {
      const n = parseInt(num);
      return n > 100 && n !== 1000 && n !== 5000 && n !== 10000 && n !== 30000;
    });
  }

  /**
   * 检测复杂选择器
   */
  private hasComplexSelector(line: string): boolean {
    if (!line.includes('locator') && !line.includes('$')) return false;
    
    // 检测复杂的CSS选择器
    const selectorPatterns = [
      /['"][^'"]*\s+[^'"]*\s+[^'"]*['"]/, // 多层级选择器
      /['"][^'"]*:nth-child\([^)]+\)['"]/, // nth-child选择器
      /['"][^'"]*\[[^\]]+\].*\[[^\]]+\]['"]/, // 多属性选择器
    ];

    return selectorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 检测是否需要注释
   */
  private needsComment(line: string): boolean {
    const complexPatterns = [
      /waitForTimeout\(\d+\)/, // 等待时间
      /expect.*toHaveCount\(\d+\)/, // 数量断言
      /page\.evaluate\(/, // 页面执行
      /Promise\.all\(/, // 并发操作
    ];

    return complexPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 检测是否有注释
   */
  private hasComment(lines: string[], currentIndex: number): boolean {
    // 检查当前行或前一行是否有注释
    const currentLine = lines[currentIndex];
    const previousLine = currentIndex > 0 ? lines[currentIndex - 1] : '';
    
    return currentLine.includes('//') || 
           previousLine.includes('//') || 
           previousLine.includes('/*');
  }

  /**
   * 计算可维护性指数
   */
  private calculateMaintainabilityIndex(metrics: MaintainabilityMetrics): number {
    let index = 100;

    // 基于代码行数的惩罚
    if (metrics.linesOfCode > 500) {
      index -= 20;
    } else if (metrics.linesOfCode > 300) {
      index -= 10;
    }

    // 基于平均测试长度的惩罚
    if (metrics.averageTestLength > this.MAX_TEST_LENGTH) {
      index -= 15;
    } else if (metrics.averageTestLength > this.MAX_TEST_LENGTH * 0.8) {
      index -= 8;
    }

    // 基于复杂度的惩罚
    index -= metrics.complexityScore * 2;

    // 基于重复代码的惩罚
    index -= metrics.duplicatedCode * 3;

    // 基于代码异味的惩罚
    const highSeveritySmells = metrics.codeSmells.filter(s => s.severity === 'high').length;
    const mediumSeveritySmells = metrics.codeSmells.filter(s => s.severity === 'medium').length;
    const lowSeveritySmells = metrics.codeSmells.filter(s => s.severity === 'low').length;

    index -= highSeveritySmells * 5;
    index -= mediumSeveritySmells * 3;
    index -= lowSeveritySmells * 1;

    return Math.max(0, Math.min(100, index));
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(metrics: MaintainabilityMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.averageTestLength > this.MAX_TEST_LENGTH) {
      suggestions.push('将长测试拆分为多个较小的测试');
    }

    if (metrics.duplicatedCode > 3) {
      suggestions.push('提取重复代码到共享的辅助方法中');
    }

    if (metrics.complexityScore > 7) {
      suggestions.push('简化复杂的测试逻辑，考虑使用页面对象模式');
    }

    const hardCodedSmells = metrics.codeSmells.filter(s => s.type === 'hard-coded-values');
    if (hardCodedSmells.length > 5) {
      suggestions.push('将硬编码值提取为常量或配置');
    }

    const complexLogicSmells = metrics.codeSmells.filter(s => s.type === 'complex-logic');
    if (complexLogicSmells.length > 3) {
      suggestions.push('简化复杂的选择器和逻辑');
    }

    const missingComments = metrics.codeSmells.filter(s => s.type === 'missing-comments');
    if (missingComments.length > 5) {
      suggestions.push('为复杂逻辑添加解释性注释');
    }

    if (metrics.maintainabilityIndex < this.MIN_MAINTAINABILITY_INDEX) {
      suggestions.push('考虑重构整个测试文件以提高可维护性');
    }

    return suggestions;
  }

  /**
   * 创建空的指标对象
   */
  private createEmptyMetrics(filePath: string): MaintainabilityMetrics {
    return {
      testFile: filePath,
      linesOfCode: 0,
      testCount: 0,
      averageTestLength: 0,
      duplicatedCode: 0,
      complexityScore: 0,
      maintainabilityIndex: 0,
      codeSmells: [],
      suggestions: []
    };
  }

  /**
   * 分析多个测试文件
   */
  async analyzeTestSuite(testDirectory: string): Promise<{
    summary: {
      totalFiles: number;
      averageMaintainabilityIndex: number;
      filesNeedingAttention: number;
      totalCodeSmells: number;
    };
    fileMetrics: MaintainabilityMetrics[];
    refactoringOpportunities: RefactoringOpportunity[];
  }> {
    const testFiles = await this.findTestFiles(testDirectory);
    const fileMetrics: MaintainabilityMetrics[] = [];

    for (const filePath of testFiles) {
      const metrics = await this.analyzeTestFile(filePath);
      fileMetrics.push(metrics);
    }

    const summary = {
      totalFiles: fileMetrics.length,
      averageMaintainabilityIndex: Math.round(
        fileMetrics.reduce((sum, m) => sum + m.maintainabilityIndex, 0) / fileMetrics.length
      ),
      filesNeedingAttention: fileMetrics.filter(m => m.maintainabilityIndex < this.MIN_MAINTAINABILITY_INDEX).length,
      totalCodeSmells: fileMetrics.reduce((sum, m) => sum + m.codeSmells.length, 0)
    };

    const refactoringOpportunities = this.identifyRefactoringOpportunities(fileMetrics);

    return {
      summary,
      fileMetrics,
      refactoringOpportunities
    };
  }

  /**
   * 查找测试文件
   */
  private async findTestFiles(directory: string): Promise<string[]> {
    const testFiles: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
            testFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`扫描目录失败: ${dir}`, error);
      }
    };

    await scanDirectory(directory);
    return testFiles;
  }

  /**
   * 识别重构机会
   */
  private identifyRefactoringOpportunities(fileMetrics: MaintainabilityMetrics[]): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    fileMetrics.forEach(metrics => {
      // 提取方法的机会
      if (metrics.averageTestLength > this.MAX_TEST_LENGTH) {
        opportunities.push({
          type: 'extract-method',
          testFile: metrics.testFile,
          description: '将长测试拆分为多个辅助方法',
          estimatedEffort: '2-4 小时',
          impact: 'high',
          codeExample: {
            before: `test('long test', async ({ page }) => {
  // 50+ lines of test code
  await page.goto('/');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test');
  await page.click('#login');
  // ... more code
});`,
            after: `test('user login flow', async ({ page }) => {
  await navigateToLoginPage(page);
  await performLogin(page, 'test', 'test');
  await verifyLoginSuccess(page);
});

async function navigateToLoginPage(page) { /* ... */ }
async function performLogin(page, username, password) { /* ... */ }
async function verifyLoginSuccess(page) { /* ... */ }`
          }
        });
      }

      // 提取常量的机会
      const hardCodedSmells = metrics.codeSmells.filter(s => s.type === 'hard-coded-values');
      if (hardCodedSmells.length > 3) {
        opportunities.push({
          type: 'extract-constant',
          testFile: metrics.testFile,
          description: '将硬编码值提取为常量',
          estimatedEffort: '1-2 小时',
          impact: 'medium',
          codeExample: {
            before: `await page.waitForTimeout(5000);
await page.fill('#username', 'testuser@example.com');`,
            after: `const WAIT_TIMEOUT = 5000;
const TEST_USER_EMAIL = 'testuser@example.com';

await page.waitForTimeout(WAIT_TIMEOUT);
await page.fill('#username', TEST_USER_EMAIL);`
          }
        });
      }

      // 简化逻辑的机会
      if (metrics.complexityScore > 7) {
        opportunities.push({
          type: 'simplify-logic',
          testFile: metrics.testFile,
          description: '简化复杂的测试逻辑',
          estimatedEffort: '3-6 小时',
          impact: 'high'
        });
      }

      // 改进命名的机会
      const poorNamingSmells = metrics.codeSmells.filter(s => s.type === 'poor-naming');
      if (poorNamingSmells.length > 2) {
        opportunities.push({
          type: 'improve-naming',
          testFile: metrics.testFile,
          description: '改进变量和方法命名',
          estimatedEffort: '1-2 小时',
          impact: 'medium'
        });
      }

      // 添加注释的机会
      const missingComments = metrics.codeSmells.filter(s => s.type === 'missing-comments');
      if (missingComments.length > 5) {
        opportunities.push({
          type: 'add-comments',
          testFile: metrics.testFile,
          description: '为复杂逻辑添加解释性注释',
          estimatedEffort: '1 小时',
          impact: 'low'
        });
      }
    });

    return opportunities.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * 生成可维护性报告
   */
  async generateMaintainabilityReport(
    analysis: Awaited<ReturnType<typeof this.analyzeTestSuite>>,
    outputPath: string
  ): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: analysis.summary,
      maintainabilityDistribution: {
        excellent: analysis.fileMetrics.filter(m => m.maintainabilityIndex >= 90).length,
        good: analysis.fileMetrics.filter(m => m.maintainabilityIndex >= 70 && m.maintainabilityIndex < 90).length,
        fair: analysis.fileMetrics.filter(m => m.maintainabilityIndex >= 50 && m.maintainabilityIndex < 70).length,
        poor: analysis.fileMetrics.filter(m => m.maintainabilityIndex < 50).length
      },
      topIssues: this.getTopCodeSmells(analysis.fileMetrics),
      refactoringOpportunities: analysis.refactoringOpportunities.slice(0, 10),
      fileDetails: analysis.fileMetrics.map(m => ({
        file: path.relative(process.cwd(), m.testFile),
        maintainabilityIndex: m.maintainabilityIndex,
        linesOfCode: m.linesOfCode,
        testCount: m.testCount,
        averageTestLength: m.averageTestLength,
        complexityScore: m.complexityScore,
        codeSmellCount: m.codeSmells.length,
        suggestions: m.suggestions
      })).sort((a, b) => a.maintainabilityIndex - b.maintainabilityIndex)
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`📊 可维护性分析报告已生成: ${outputPath}`);
  }

  /**
   * 获取最常见的代码异味
   */
  private getTopCodeSmells(fileMetrics: MaintainabilityMetrics[]): Array<{
    type: string;
    count: number;
    description: string;
  }> {
    const smellCounts = new Map<string, number>();
    const smellDescriptions = new Map<string, string>();

    fileMetrics.forEach(metrics => {
      metrics.codeSmells.forEach(smell => {
        smellCounts.set(smell.type, (smellCounts.get(smell.type) || 0) + 1);
        if (!smellDescriptions.has(smell.type)) {
          smellDescriptions.set(smell.type, smell.description);
        }
      });
    });

    return Array.from(smellCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        description: smellDescriptions.get(type) || ''
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}