/**
 * 测试代码重构工具
 * 自动重构测试代码以提高可维护性
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface RefactoringResult {
  filePath: string;
  originalContent: string;
  refactoredContent: string;
  changes: RefactoringChange[];
  improvementScore: number;
}

export interface RefactoringChange {
  type: 'extract-constant' | 'extract-method' | 'improve-naming' | 'add-comments' | 'simplify-selector';
  line: number;
  description: string;
  before: string;
  after: string;
}

export interface CommonPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
  category: 'constants' | 'methods' | 'selectors' | 'comments';
}

export class TestCodeRefactorer {
  private readonly commonPatterns: CommonPattern[] = [
    // 常见的硬编码值模式
    {
      pattern: /waitForTimeout\((\d{4,})\)/g,
      replacement: 'waitForTimeout(TIMEOUT_CONSTANTS.$1)',
      description: '提取超时常量',
      category: 'constants'
    },
    {
      pattern: /'([^']{20,})'/g,
      replacement: "TEST_DATA.$1",
      description: '提取测试数据常量',
      category: 'constants'
    },
    // 复杂选择器模式
    {
      pattern: /page\.locator\('([^']*\s+[^']*\s+[^']*)'\)/g,
      replacement: "page.getByTestId('$1')",
      description: '简化复杂选择器',
      category: 'selectors'
    }
  ];

  private readonly testDataConstants = new Map<string, string>();
  private readonly timeoutConstants = new Map<string, string>();
  private readonly extractedMethods = new Map<string, string>();

  /**
   * 重构单个测试文件
   */
  async refactorTestFile(filePath: string): Promise<RefactoringResult> {
    try {
      const originalContent = await fs.readFile(filePath, 'utf-8');
      let refactoredContent = originalContent;
      const changes: RefactoringChange[] = [];

      // 1. 提取常量
      const constantChanges = this.extractConstants(refactoredContent);
      refactoredContent = constantChanges.content;
      changes.push(...constantChanges.changes);

      // 2. 提取重复方法
      const methodChanges = this.extractCommonMethods(refactoredContent);
      refactoredContent = methodChanges.content;
      changes.push(...methodChanges.changes);

      // 3. 改进选择器
      const selectorChanges = this.improveSelectors(refactoredContent);
      refactoredContent = selectorChanges.content;
      changes.push(...selectorChanges.changes);

      // 4. 添加注释
      const commentChanges = this.addMissingComments(refactoredContent);
      refactoredContent = commentChanges.content;
      changes.push(...commentChanges.changes);

      // 5. 改进命名
      const namingChanges = this.improveNaming(refactoredContent);
      refactoredContent = namingChanges.content;
      changes.push(...namingChanges.changes);

      // 计算改进分数
      const improvementScore = this.calculateImprovementScore(originalContent, refactoredContent);

      return {
        filePath,
        originalContent,
        refactoredContent,
        changes,
        improvementScore
      };
    } catch (error) {
      console.error(`重构文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 提取常量
   */
  private extractConstants(content: string): { content: string; changes: RefactoringChange[] } {
    const changes: RefactoringChange[] = [];
    let modifiedContent = content;
    const lines = content.split('\n');

    // 提取超时常量
    const timeoutPattern = /waitForTimeout\((\d{3,})\)/g;
    let match;
    while ((match = timeoutPattern.exec(content)) !== null) {
      const timeout = match[1];
      const constantName = this.generateTimeoutConstantName(timeout);
      
      if (!this.timeoutConstants.has(timeout)) {
        this.timeoutConstants.set(timeout, constantName);
        changes.push({
          type: 'extract-constant',
          line: this.findLineNumber(lines, match[0]),
          description: `提取超时常量 ${timeout}ms`,
          before: match[0],
          after: `waitForTimeout(${constantName})`
        });
      }
    }

    // 提取测试数据常量
    const testDataPattern = /'([^']{15,})'/g;
    while ((match = testDataPattern.exec(content)) !== null) {
      const data = match[1];
      if (this.isTestData(data)) {
        const constantName = this.generateTestDataConstantName(data);
        
        if (!this.testDataConstants.has(data)) {
          this.testDataConstants.set(data, constantName);
          changes.push({
            type: 'extract-constant',
            line: this.findLineNumber(lines, match[0]),
            description: `提取测试数据常量`,
            before: match[0],
            after: constantName
          });
        }
      }
    }

    // 应用常量替换
    modifiedContent = this.applyConstantReplacements(modifiedContent);

    return { content: modifiedContent, changes };
  }

  /**
   * 提取通用方法
   */
  private extractCommonMethods(content: string): { content: string; changes: RefactoringChange[] } {
    const changes: RefactoringChange[] = [];
    let modifiedContent = content;

    // 识别重复的代码块
    const duplicateBlocks = this.findDuplicateCodeBlocks(content);
    
    duplicateBlocks.forEach(block => {
      const methodName = this.generateMethodName(block.pattern);
      const methodSignature = this.generateMethodSignature(block.pattern);
      
      if (!this.extractedMethods.has(block.pattern)) {
        this.extractedMethods.set(block.pattern, methodName);
        
        changes.push({
          type: 'extract-method',
          line: block.firstOccurrence,
          description: `提取重复方法: ${methodName}`,
          before: block.pattern,
          after: `await ${methodName}(${block.parameters.join(', ')});`
        });
      }
    });

    return { content: modifiedContent, changes };
  }

  /**
   * 改进选择器
   */
  private improveSelectors(content: string): { content: string; changes: RefactoringChange[] } {
    const changes: RefactoringChange[] = [];
    let modifiedContent = content;
    const lines = content.split('\n');

    // 复杂CSS选择器模式
    const complexSelectorPatterns = [
      {
        pattern: /page\.locator\('([^']*\s+[^']*\s+[^']*)'\)/g,
        suggestion: "使用 data-testid 属性"
      },
      {
        pattern: /page\.locator\('([^']*:nth-child\([^)]+\)[^']*)'\)/g,
        suggestion: "避免使用 nth-child，使用更稳定的选择器"
      },
      {
        pattern: /page\.locator\('([^']*\[[^\]]+\].*\[[^\]]+\][^']*)'\)/g,
        suggestion: "简化多属性选择器"
      }
    ];

    complexSelectorPatterns.forEach(({ pattern, suggestion }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        const improvedSelector = this.suggestBetterSelector(match[1]);
        
        changes.push({
          type: 'simplify-selector',
          line: lineNumber,
          description: suggestion,
          before: match[0],
          after: `page.getByTestId('${improvedSelector}')`
        });
      }
    });

    return { content: modifiedContent, changes };
  }

  /**
   * 添加缺失的注释
   */
  private addMissingComments(content: string): { content: string; changes: RefactoringChange[] } {
    const changes: RefactoringChange[] = [];
    const lines = content.split('\n');
    let modifiedLines = [...lines];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 检测需要注释的复杂操作
      if (this.needsComment(trimmedLine) && !this.hasNearbyComment(lines, index)) {
        const comment = this.generateComment(trimmedLine);
        
        if (comment) {
          const indentation = line.match(/^\s*/)?.[0] || '';
          modifiedLines.splice(index, 0, `${indentation}// ${comment}`);
          
          changes.push({
            type: 'add-comments',
            line: index + 1,
            description: '添加解释性注释',
            before: trimmedLine,
            after: `// ${comment}\n${trimmedLine}`
          });
        }
      }
    });

    return { content: modifiedLines.join('\n'), changes };
  }

  /**
   * 改进命名
   */
  private improveNaming(content: string): { content: string; changes: RefactoringChange[] } {
    const changes: RefactoringChange[] = [];
    let modifiedContent = content;

    // 改进变量命名
    const poorNamingPatterns = [
      { pattern: /\bdata\b/g, suggestion: 'testData' },
      { pattern: /\btemp\b/g, suggestion: 'temporary' },
      { pattern: /\bres\b/g, suggestion: 'result' },
      { pattern: /\belem\b/g, suggestion: 'element' }
    ];

    poorNamingPatterns.forEach(({ pattern, suggestion }) => {
      if (pattern.test(content)) {
        changes.push({
          type: 'improve-naming',
          line: 0,
          description: `改进变量命名: ${pattern.source} -> ${suggestion}`,
          before: pattern.source,
          after: suggestion
        });
      }
    });

    return { content: modifiedContent, changes };
  }

  /**
   * 生成超时常量名
   */
  private generateTimeoutConstantName(timeout: string): string {
    const timeoutMap: Record<string, string> = {
      '1000': 'SHORT_TIMEOUT',
      '3000': 'MEDIUM_TIMEOUT',
      '5000': 'LONG_TIMEOUT',
      '10000': 'VERY_LONG_TIMEOUT',
      '30000': 'ANALYSIS_TIMEOUT'
    };

    return timeoutMap[timeout] || `TIMEOUT_${timeout}MS`;
  }

  /**
   * 生成测试数据常量名
   */
  private generateTestDataConstantName(data: string): string {
    if (data.includes('@')) return 'TEST_EMAIL';
    if (data.includes('password') || data.includes('Password')) return 'TEST_PASSWORD';
    if (data.includes('user') || data.includes('User')) return 'TEST_USERNAME';
    if (data.includes('pet') || data.includes('Pet')) return 'TEST_PET_NAME';
    
    return 'TEST_DATA_CONSTANT';
  }

  /**
   * 判断是否为测试数据
   */
  private isTestData(data: string): boolean {
    const testDataPatterns = [
      /@.*\.com$/,
      /^test.*user$/i,
      /^.*password.*$/i,
      /^pet.*name$/i,
      /^test.*data$/i
    ];

    return testDataPatterns.some(pattern => pattern.test(data));
  }

  /**
   * 查找行号
   */
  private findLineNumber(lines: string[], searchText: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 0;
  }

  /**
   * 查找重复代码块
   */
  private findDuplicateCodeBlocks(content: string): Array<{
    pattern: string;
    occurrences: number;
    firstOccurrence: number;
    parameters: string[];
  }> {
    const blocks: Array<{
      pattern: string;
      occurrences: number;
      firstOccurrence: number;
      parameters: string[];
    }> = [];

    // 这里可以实现更复杂的重复代码检测逻辑
    // 目前返回空数组，实际实现中可以添加具体的检测算法

    return blocks;
  }

  /**
   * 生成方法名
   */
  private generateMethodName(pattern: string): string {
    if (pattern.includes('login')) return 'performLogin';
    if (pattern.includes('register')) return 'performRegistration';
    if (pattern.includes('upload')) return 'uploadFile';
    if (pattern.includes('analysis')) return 'performAnalysis';
    
    return 'extractedMethod';
  }

  /**
   * 生成方法签名
   */
  private generateMethodSignature(pattern: string): string {
    return 'async function extractedMethod(page: Page): Promise<void>';
  }

  /**
   * 建议更好的选择器
   */
  private suggestBetterSelector(selector: string): string {
    // 从复杂选择器中提取有意义的部分作为 test-id
    const meaningfulParts = selector.match(/[a-zA-Z-]+/g) || [];
    return meaningfulParts.join('-').toLowerCase();
  }

  /**
   * 检测是否需要注释
   */
  private needsComment(line: string): boolean {
    const complexPatterns = [
      /waitForTimeout\(\d+\)/,
      /expect.*toHaveCount\(\d+\)/,
      /page\.evaluate\(/,
      /Promise\.all\(/,
      /page\.waitForSelector.*timeout/,
      /page\.locator.*nth\(/
    ];

    return complexPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 检测附近是否有注释
   */
  private hasNearbyComment(lines: string[], currentIndex: number): boolean {
    const checkRange = 2; // 检查前后2行
    
    for (let i = Math.max(0, currentIndex - checkRange); 
         i <= Math.min(lines.length - 1, currentIndex + checkRange); 
         i++) {
      if (lines[i].trim().startsWith('//') || lines[i].includes('/*')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 生成注释
   */
  private generateComment(line: string): string | null {
    if (line.includes('waitForTimeout')) {
      const timeout = line.match(/waitForTimeout\((\d+)\)/)?.[1];
      return `等待 ${timeout}ms 确保操作完成`;
    }
    
    if (line.includes('toHaveCount')) {
      const count = line.match(/toHaveCount\((\d+)\)/)?.[1];
      return `验证元素数量为 ${count}`;
    }
    
    if (line.includes('page.evaluate')) {
      return '在页面上下文中执行JavaScript代码';
    }
    
    if (line.includes('Promise.all')) {
      return '并发执行多个异步操作';
    }
    
    return null;
  }

  /**
   * 应用常量替换
   */
  private applyConstantReplacements(content: string): string {
    let modifiedContent = content;

    // 应用超时常量替换
    this.timeoutConstants.forEach((constantName, timeout) => {
      const pattern = new RegExp(`waitForTimeout\\(${timeout}\\)`, 'g');
      modifiedContent = modifiedContent.replace(pattern, `waitForTimeout(${constantName})`);
    });

    // 应用测试数据常量替换
    this.testDataConstants.forEach((constantName, data) => {
      const pattern = new RegExp(`'${data.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
      modifiedContent = modifiedContent.replace(pattern, constantName);
    });

    return modifiedContent;
  }

  /**
   * 计算改进分数
   */
  private calculateImprovementScore(originalContent: string, refactoredContent: string): number {
    let score = 0;

    // 基于变更数量的分数
    const changeCount = this.timeoutConstants.size + this.testDataConstants.size + this.extractedMethods.size;
    score += Math.min(changeCount * 10, 50);

    // 基于代码长度减少的分数
    const lengthReduction = originalContent.length - refactoredContent.length;
    if (lengthReduction > 0) {
      score += Math.min(lengthReduction / 100, 30);
    }

    // 基于复杂度降低的分数
    const originalComplexity = this.calculateComplexity(originalContent);
    const refactoredComplexity = this.calculateComplexity(refactoredContent);
    const complexityReduction = originalComplexity - refactoredComplexity;
    
    if (complexityReduction > 0) {
      score += Math.min(complexityReduction * 5, 20);
    }

    return Math.min(score, 100);
  }

  /**
   * 计算代码复杂度
   */
  private calculateComplexity(content: string): number {
    let complexity = 0;
    
    // 嵌套层级
    const maxNesting = this.calculateMaxNesting(content);
    complexity += maxNesting * 2;
    
    // 条件语句
    const conditionals = (content.match(/if\s*\(|else|switch|case/g) || []).length;
    complexity += conditionals;
    
    // 循环语句
    const loops = (content.match(/for\s*\(|while\s*\(|forEach/g) || []).length;
    complexity += loops * 2;
    
    return complexity;
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
   * 生成常量定义
   */
  generateConstantDefinitions(): string {
    const constants: string[] = [];

    // 超时常量
    if (this.timeoutConstants.size > 0) {
      constants.push('// 超时常量');
      this.timeoutConstants.forEach((constantName, timeout) => {
        constants.push(`const ${constantName} = ${timeout};`);
      });
      constants.push('');
    }

    // 测试数据常量
    if (this.testDataConstants.size > 0) {
      constants.push('// 测试数据常量');
      this.testDataConstants.forEach((constantName, data) => {
        constants.push(`const ${constantName} = '${data}';`);
      });
      constants.push('');
    }

    return constants.join('\n');
  }

  /**
   * 生成提取的方法
   */
  generateExtractedMethods(): string {
    const methods: string[] = [];

    this.extractedMethods.forEach((methodName, pattern) => {
      methods.push(`/**
 * 提取的通用方法
 */
async function ${methodName}(page: Page): Promise<void> {
  // TODO: 实现方法逻辑
  ${pattern}
}
`);
    });

    return methods.join('\n');
  }

  /**
   * 重构多个测试文件
   */
  async refactorTestSuite(testDirectory: string): Promise<{
    results: RefactoringResult[];
    summary: {
      totalFiles: number;
      successfulRefactorings: number;
      totalChanges: number;
      averageImprovementScore: number;
    };
  }> {
    const testFiles = await this.findTestFiles(testDirectory);
    const results: RefactoringResult[] = [];
    let successfulRefactorings = 0;
    let totalChanges = 0;

    for (const filePath of testFiles) {
      try {
        const result = await this.refactorTestFile(filePath);
        results.push(result);
        
        if (result.changes.length > 0) {
          successfulRefactorings++;
          totalChanges += result.changes.length;
        }
      } catch (error) {
        console.error(`重构文件失败: ${filePath}`, error);
      }
    }

    const averageImprovementScore = results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.improvementScore, 0) / results.length)
      : 0;

    return {
      results,
      summary: {
        totalFiles: testFiles.length,
        successfulRefactorings,
        totalChanges,
        averageImprovementScore
      }
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
}