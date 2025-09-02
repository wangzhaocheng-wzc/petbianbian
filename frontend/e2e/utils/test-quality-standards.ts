/**
 * 测试代码质量标准和规范检查器
 * 定义和检查测试代码的质量标准
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface QualityStandard {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'naming' | 'documentation' | 'maintainability' | 'performance';
  severity: 'error' | 'warning' | 'info';
  checker: (content: string, filePath: string) => QualityViolation[];
}

export interface QualityViolation {
  standardId: string;
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  codeExample?: {
    bad: string;
    good: string;
  };
}

export interface QualityReport {
  filePath: string;
  violations: QualityViolation[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export class TestQualityStandardsChecker {
  private readonly standards: QualityStandard[] = [
    // 结构标准
    {
      id: 'test-structure-001',
      name: '测试文件结构',
      description: '测试文件应该有清晰的结构和组织',
      category: 'structure',
      severity: 'error',
      checker: this.checkTestStructure.bind(this)
    },
    {
      id: 'test-structure-002',
      name: '测试套件分组',
      description: '相关测试应该使用 describe 进行分组',
      category: 'structure',
      severity: 'warning',
      checker: this.checkTestGrouping.bind(this)
    },
    {
      id: 'test-structure-003',
      name: '测试独立性',
      description: '每个测试应该独立运行，不依赖其他测试',
      category: 'structure',
      severity: 'error',
      checker: this.checkTestIndependence.bind(this)
    },

    // 命名标准
    {
      id: 'test-naming-001',
      name: '测试描述清晰性',
      description: '测试描述应该清晰说明测试的目的和预期结果',
      category: 'naming',
      severity: 'warning',
      checker: this.checkTestDescriptions.bind(this)
    },
    {
      id: 'test-naming-002',
      name: '变量命名规范',
      description: '变量名应该有意义且遵循命名约定',
      category: 'naming',
      severity: 'warning',
      checker: this.checkVariableNaming.bind(this)
    },
    {
      id: 'test-naming-003',
      name: '页面对象命名',
      description: '页面对象变量应该使用一致的命名模式',
      category: 'naming',
      severity: 'info',
      checker: this.checkPageObjectNaming.bind(this)
    },

    // 文档标准
    {
      id: 'test-docs-001',
      name: '文件头部注释',
      description: '测试文件应该包含描述其目的的头部注释',
      category: 'documentation',
      severity: 'warning',
      checker: this.checkFileHeader.bind(this)
    },
    {
      id: 'test-docs-002',
      name: '复杂逻辑注释',
      description: '复杂的测试逻辑应该有解释性注释',
      category: 'documentation',
      severity: 'info',
      checker: this.checkComplexLogicComments.bind(this)
    },
    {
      id: 'test-docs-003',
      name: '测试数据说明',
      description: '测试数据应该有清晰的说明',
      category: 'documentation',
      severity: 'info',
      checker: this.checkTestDataDocumentation.bind(this)
    },

    // 可维护性标准
    {
      id: 'test-maintain-001',
      name: '测试长度限制',
      description: '单个测试不应该过长（建议不超过50行）',
      category: 'maintainability',
      severity: 'warning',
      checker: this.checkTestLength.bind(this)
    },
    {
      id: 'test-maintain-002',
      name: '重复代码检测',
      description: '应该避免重复代码，提取公共方法',
      category: 'maintainability',
      severity: 'warning',
      checker: this.checkDuplicateCode.bind(this)
    },
    {
      id: 'test-maintain-003',
      name: '硬编码值检测',
      description: '应该避免硬编码值，使用常量或配置',
      category: 'maintainability',
      severity: 'info',
      checker: this.checkHardCodedValues.bind(this)
    },
    {
      id: 'test-maintain-004',
      name: '选择器质量',
      description: '应该使用稳定的选择器，优先使用 data-testid',
      category: 'maintainability',
      severity: 'warning',
      checker: this.checkSelectorQuality.bind(this)
    },

    // 性能标准
    {
      id: 'test-perf-001',
      name: '等待策略',
      description: '应该使用智能等待而不是固定延时',
      category: 'performance',
      severity: 'warning',
      checker: this.checkWaitStrategies.bind(this)
    },
    {
      id: 'test-perf-002',
      name: '资源清理',
      description: '测试应该正确清理资源',
      category: 'performance',
      severity: 'error',
      checker: this.checkResourceCleanup.bind(this)
    }
  ];

  /**
   * 检查单个测试文件的质量
   */
  async checkTestFile(filePath: string): Promise<QualityReport> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const violations: QualityViolation[] = [];

      // 运行所有质量检查
      for (const standard of this.standards) {
        try {
          const standardViolations = standard.checker(content, filePath);
          violations.push(...standardViolations);
        } catch (error) {
          console.warn(`质量检查失败 ${standard.id}:`, error);
        }
      }

      // 计算质量分数和等级
      const score = this.calculateQualityScore(violations);
      const grade = this.calculateGrade(score);

      const summary = {
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warning').length,
        infos: violations.filter(v => v.severity === 'info').length
      };

      return {
        filePath,
        violations,
        score,
        grade,
        summary
      };
    } catch (error) {
      console.error(`检查文件质量失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 检查测试文件结构
   */
  private checkTestStructure(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查是否有导入语句
    const hasImports = content.includes('import');
    if (!hasImports) {
      violations.push({
        standardId: 'test-structure-001',
        line: 1,
        message: '测试文件应该包含必要的导入语句',
        severity: 'error',
        suggestion: "添加 import { test, expect } from '@playwright/test';"
      });
    }

    // 检查是否有测试用例
    const hasTests = /test\(|it\(/.test(content);
    if (!hasTests) {
      violations.push({
        standardId: 'test-structure-001',
        line: 1,
        message: '测试文件应该包含至少一个测试用例',
        severity: 'error'
      });
    }

    // 检查是否有适当的 beforeEach/afterEach
    const hasBeforeEach = content.includes('beforeEach');
    const hasAfterEach = content.includes('afterEach');
    
    if (content.includes('TestDataManager') && !hasAfterEach) {
      violations.push({
        standardId: 'test-structure-001',
        line: this.findLineNumber(lines, 'TestDataManager'),
        message: '使用 TestDataManager 时应该在 afterEach 中清理数据',
        severity: 'warning',
        suggestion: '添加 afterEach 钩子进行数据清理'
      });
    }

    return violations;
  }

  /**
   * 检查测试分组
   */
  private checkTestGrouping(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    const testCount = (content.match(/test\(/g) || []).length;
    const describeCount = (content.match(/describe\(/g) || []).length;

    // 如果有多个测试但没有分组
    if (testCount > 3 && describeCount === 0) {
      violations.push({
        standardId: 'test-structure-002',
        line: 1,
        message: '多个测试用例应该使用 describe 进行逻辑分组',
        severity: 'warning',
        suggestion: '使用 describe 将相关测试分组',
        codeExample: {
          bad: `test('test 1', () => {});
test('test 2', () => {});
test('test 3', () => {});`,
          good: `describe('功能模块', () => {
  test('test 1', () => {});
  test('test 2', () => {});
  test('test 3', () => {});
});`
        }
      });
    }

    return violations;
  }

  /**
   * 检查测试独立性
   */
  private checkTestIndependence(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查是否有全局变量在测试间共享状态
    const globalVariablePattern = /let\s+\w+(?:\s*:\s*\w+)?\s*;/g;
    let match;
    while ((match = globalVariablePattern.exec(content)) !== null) {
      const lineNumber = this.findLineNumber(lines, match[0]);
      if (lineNumber > 0 && !this.isInDescribeBlock(lines, lineNumber - 1)) {
        violations.push({
          standardId: 'test-structure-003',
          line: lineNumber,
          message: '避免使用全局变量共享测试状态',
          severity: 'warning',
          suggestion: '将变量移到 describe 块内或使用 beforeEach 初始化'
        });
      }
    }

    return violations;
  }

  /**
   * 检查测试描述
   */
  private checkTestDescriptions(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    const testPattern = /test\(['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = testPattern.exec(content)) !== null) {
      const description = match[1];
      const lineNumber = this.findLineNumber(lines, match[0]);

      // 检查描述长度
      if (description.length < 10) {
        violations.push({
          standardId: 'test-naming-001',
          line: lineNumber,
          message: '测试描述过短，应该清晰说明测试目的',
          severity: 'warning',
          suggestion: '使用更详细的描述说明测试的预期行为'
        });
      }

      // 检查是否使用了模糊的词汇
      const vagueWords = ['test', 'check', 'verify', 'should work'];
      if (vagueWords.some(word => description.toLowerCase().includes(word))) {
        violations.push({
          standardId: 'test-naming-001',
          line: lineNumber,
          message: '测试描述应该具体说明预期行为，避免模糊词汇',
          severity: 'info',
          suggestion: '使用具体的行为描述，如"用户登录成功后应该跳转到首页"'
        });
      }
    }

    return violations;
  }

  /**
   * 检查变量命名
   */
  private checkVariableNaming(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查单字母变量名
    const singleLetterPattern = /\b[a-z]\b(?!\s*[=:])/g;
    let match;
    while ((match = singleLetterPattern.exec(content)) !== null) {
      const lineNumber = this.findLineNumber(lines, match[0]);
      violations.push({
        standardId: 'test-naming-002',
        line: lineNumber,
        message: '避免使用单字母变量名',
        severity: 'warning',
        suggestion: '使用有意义的变量名'
      });
    }

    // 检查常见的不良命名
    const poorNamingPatterns = [
      { pattern: /\bdata\b/g, suggestion: 'testData, userData, petData' },
      { pattern: /\btemp\b/g, suggestion: 'temporary, tempResult' },
      { pattern: /\bres\b/g, suggestion: 'result, response' }
    ];

    poorNamingPatterns.forEach(({ pattern, suggestion }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        violations.push({
          standardId: 'test-naming-002',
          line: lineNumber,
          message: `变量名 "${match[0]}" 不够具体`,
          severity: 'info',
          suggestion: `考虑使用更具体的名称: ${suggestion}`
        });
      }
    });

    return violations;
  }

  /**
   * 检查页面对象命名
   */
  private checkPageObjectNaming(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查页面对象变量命名一致性
    const pageObjectPattern = /(\w+)\s*=\s*new\s+(\w+Page)/g;
    let match;
    while ((match = pageObjectPattern.exec(content)) !== null) {
      const variableName = match[1];
      const className = match[2];
      const expectedName = className.charAt(0).toLowerCase() + className.slice(1);

      if (variableName !== expectedName) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        violations.push({
          standardId: 'test-naming-003',
          line: lineNumber,
          message: `页面对象变量名应该与类名保持一致`,
          severity: 'info',
          suggestion: `将 "${variableName}" 改为 "${expectedName}"`
        });
      }
    }

    return violations;
  }

  /**
   * 检查文件头部注释
   */
  private checkFileHeader(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查前10行是否有文档注释
    const firstTenLines = lines.slice(0, 10).join('\n');
    const hasFileHeader = /\/\*\*[\s\S]*?\*\//.test(firstTenLines) || 
                         lines.some((line, index) => index < 5 && line.trim().startsWith('//'));

    if (!hasFileHeader) {
      violations.push({
        standardId: 'test-docs-001',
        line: 1,
        message: '测试文件应该包含描述其目的的头部注释',
        severity: 'warning',
        suggestion: '添加文件头部注释说明测试套件的目的和范围',
        codeExample: {
          bad: `import { test, expect } from '@playwright/test';`,
          good: `/**
 * 用户认证功能测试套件
 * 测试用户登录、注册、密码重置等功能
 */
import { test, expect } from '@playwright/test';`
        }
      });
    }

    return violations;
  }

  /**
   * 检查复杂逻辑注释
   */
  private checkComplexLogicComments(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查复杂操作是否有注释
    const complexPatterns = [
      { pattern: /waitForTimeout\(\d{4,}\)/, description: '长时间等待' },
      { pattern: /Promise\.all\(/, description: '并发操作' },
      { pattern: /page\.evaluate\(/, description: '页面脚本执行' },
      { pattern: /expect.*toHaveCount\(\d+\)/, description: '元素数量验证' }
    ];

    complexPatterns.forEach(({ pattern, description }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        
        // 检查前后是否有注释
        if (!this.hasNearbyComment(lines, lineNumber - 1)) {
          violations.push({
            standardId: 'test-docs-002',
            line: lineNumber,
            message: `${description}应该添加解释性注释`,
            severity: 'info',
            suggestion: '添加注释说明操作的目的和预期结果'
          });
        }
      }
    });

    return violations;
  }

  /**
   * 检查测试数据文档
   */
  private checkTestDataDocumentation(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查测试数据对象是否有注释
    const testDataPattern = /const\s+\w*[Dd]ata\w*\s*=\s*{/g;
    let match;
    while ((match = testDataPattern.exec(content)) !== null) {
      const lineNumber = this.findLineNumber(lines, match[0]);
      
      if (!this.hasNearbyComment(lines, lineNumber - 1)) {
        violations.push({
          standardId: 'test-docs-003',
          line: lineNumber,
          message: '测试数据对象应该有说明注释',
          severity: 'info',
          suggestion: '添加注释说明测试数据的用途和特点'
        });
      }
    }

    return violations;
  }

  /**
   * 检查测试长度
   */
  private checkTestLength(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const testBlocks = this.extractTestBlocks(content);

    testBlocks.forEach(block => {
      const lines = block.content.split('\n');
      if (lines.length > 50) {
        violations.push({
          standardId: 'test-maintain-001',
          line: block.startLine,
          message: `测试过长 (${lines.length} 行)，建议拆分为多个小测试`,
          severity: 'warning',
          suggestion: '将长测试拆分为多个独立的测试用例'
        });
      }
    });

    return violations;
  }

  /**
   * 检查重复代码
   */
  private checkDuplicateCode(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 简单的重复行检测
    const lineMap = new Map<string, number[]>();
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 20 && !trimmedLine.startsWith('//')) {
        if (!lineMap.has(trimmedLine)) {
          lineMap.set(trimmedLine, []);
        }
        lineMap.get(trimmedLine)!.push(index + 1);
      }
    });

    lineMap.forEach((lineNumbers, line) => {
      if (lineNumbers.length > 2) {
        violations.push({
          standardId: 'test-maintain-002',
          line: lineNumbers[0],
          message: `发现重复代码 (出现 ${lineNumbers.length} 次)`,
          severity: 'warning',
          suggestion: '考虑提取为公共方法或常量'
        });
      }
    });

    return violations;
  }

  /**
   * 检查硬编码值
   */
  private checkHardCodedValues(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查硬编码的超时值
    const timeoutPattern = /waitForTimeout\((\d{3,})\)/g;
    let match;
    while ((match = timeoutPattern.exec(content)) !== null) {
      const timeout = match[1];
      if (parseInt(timeout) > 1000) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        violations.push({
          standardId: 'test-maintain-003',
          line: lineNumber,
          message: `硬编码的超时值 ${timeout}ms`,
          severity: 'info',
          suggestion: '考虑使用命名常量',
          codeExample: {
            bad: `waitForTimeout(5000)`,
            good: `const ANALYSIS_TIMEOUT = 5000;
waitForTimeout(ANALYSIS_TIMEOUT)`
          }
        });
      }
    }

    // 检查硬编码的字符串
    const stringPattern = /'([^']{15,})'/g;
    while ((match = stringPattern.exec(content)) !== null) {
      const str = match[1];
      if (this.isHardCodedTestData(str)) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        violations.push({
          standardId: 'test-maintain-003',
          line: lineNumber,
          message: '硬编码的测试数据',
          severity: 'info',
          suggestion: '考虑使用测试数据常量或配置文件'
        });
      }
    }

    return violations;
  }

  /**
   * 检查选择器质量
   */
  private checkSelectorQuality(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查复杂的CSS选择器
    const complexSelectorPattern = /page\.locator\(['"`]([^'"`]*\s+[^'"`]*\s+[^'"`]*)['"`]\)/g;
    let match;
    while ((match = complexSelectorPattern.exec(content)) !== null) {
      const lineNumber = this.findLineNumber(lines, match[0]);
      violations.push({
        standardId: 'test-maintain-004',
        line: lineNumber,
        message: '复杂的CSS选择器可能不稳定',
        severity: 'warning',
        suggestion: '优先使用 data-testid 或更简单的选择器',
        codeExample: {
          bad: `page.locator('div.container > ul.list > li:nth-child(2)')`,
          good: `page.getByTestId('second-list-item')`
        }
      });
    }

    // 检查是否缺少 data-testid
    const locatorCount = (content.match(/page\.locator\(/g) || []).length;
    const testIdCount = (content.match(/getByTestId\(/g) || []).length;
    
    if (locatorCount > testIdCount * 2) {
      violations.push({
        standardId: 'test-maintain-004',
        line: 1,
        message: '建议更多使用 data-testid 选择器',
        severity: 'info',
        suggestion: '为关键元素添加 data-testid 属性'
      });
    }

    return violations;
  }

  /**
   * 检查等待策略
   */
  private checkWaitStrategies(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    // 检查固定延时
    const fixedDelayPattern = /waitForTimeout\((\d+)\)/g;
    let match;
    while ((match = fixedDelayPattern.exec(content)) !== null) {
      const timeout = parseInt(match[1]);
      if (timeout > 1000) {
        const lineNumber = this.findLineNumber(lines, match[0]);
        violations.push({
          standardId: 'test-perf-001',
          line: lineNumber,
          message: '避免使用长时间的固定延时',
          severity: 'warning',
          suggestion: '使用 waitForSelector 或其他智能等待方法',
          codeExample: {
            bad: `waitForTimeout(5000)`,
            good: `waitForSelector('[data-testid="analysis-result"]', { timeout: 5000 })`
          }
        });
      }
    }

    return violations;
  }

  /**
   * 检查资源清理
   */
  private checkResourceCleanup(content: string, filePath: string): QualityViolation[] {
    const violations: QualityViolation[] = [];
    const lines = content.split('\n');

    const hasTestDataManager = content.includes('TestDataManager');
    const hasAfterEach = content.includes('afterEach');
    const hasCleanup = content.includes('cleanup');

    if (hasTestDataManager && (!hasAfterEach || !hasCleanup)) {
      violations.push({
        standardId: 'test-perf-002',
        line: this.findLineNumber(lines, 'TestDataManager'),
        message: '使用 TestDataManager 时必须在 afterEach 中清理资源',
        severity: 'error',
        suggestion: '添加 afterEach 钩子调用 cleanup 方法'
      });
    }

    return violations;
  }

  /**
   * 辅助方法：查找行号
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
   * 辅助方法：检查是否在 describe 块内
   */
  private isInDescribeBlock(lines: string[], lineIndex: number): boolean {
    let braceCount = 0;
    let inDescribe = false;

    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i];
      if (line.includes('describe(')) {
        inDescribe = true;
      }
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    }

    return inDescribe && braceCount > 0;
  }

  /**
   * 辅助方法：检查附近是否有注释
   */
  private hasNearbyComment(lines: string[], lineIndex: number): boolean {
    const checkRange = 2;
    
    for (let i = Math.max(0, lineIndex - checkRange); 
         i <= Math.min(lines.length - 1, lineIndex + checkRange); 
         i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*') || line.includes('*/')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 辅助方法：提取测试块
   */
  private extractTestBlocks(content: string): Array<{ content: string; startLine: number }> {
    const blocks: Array<{ content: string; startLine: number }> = [];
    const lines = content.split('\n');
    let currentBlock = '';
    let inTest = false;
    let braceCount = 0;
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('test(') || line.includes('it(')) {
        inTest = true;
        currentBlock = line;
        startLine = i + 1;
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (inTest) {
        currentBlock += '\n' + line;
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          blocks.push({ content: currentBlock, startLine });
          currentBlock = '';
          inTest = false;
        }
      }
    }

    return blocks;
  }

  /**
   * 辅助方法：判断是否为硬编码测试数据
   */
  private isHardCodedTestData(str: string): boolean {
    const testDataPatterns = [
      /@.*\.com$/,
      /^test.*user$/i,
      /password/i,
      /^pet.*name$/i
    ];

    return testDataPatterns.some(pattern => pattern.test(str));
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(violations: QualityViolation[]): number {
    let score = 100;

    violations.forEach(violation => {
      switch (violation.severity) {
        case 'error':
          score -= 10;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 2;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * 计算质量等级
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 检查测试套件质量
   */
  async checkTestSuite(testDirectory: string): Promise<{
    reports: QualityReport[];
    summary: {
      totalFiles: number;
      averageScore: number;
      gradeDistribution: Record<string, number>;
      topViolations: Array<{ standardId: string; count: number; description: string }>;
    };
  }> {
    const testFiles = await this.findTestFiles(testDirectory);
    const reports: QualityReport[] = [];

    for (const filePath of testFiles) {
      try {
        const report = await this.checkTestFile(filePath);
        reports.push(report);
      } catch (error) {
        console.error(`检查文件质量失败: ${filePath}`, error);
      }
    }

    // 计算汇总信息
    const averageScore = reports.length > 0 
      ? Math.round(reports.reduce((sum, r) => sum + r.score, 0) / reports.length)
      : 0;

    const gradeDistribution = reports.reduce((dist, report) => {
      dist[report.grade] = (dist[report.grade] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    // 统计最常见的违规
    const violationCounts = new Map<string, number>();
    reports.forEach(report => {
      report.violations.forEach(violation => {
        violationCounts.set(violation.standardId, (violationCounts.get(violation.standardId) || 0) + 1);
      });
    });

    const topViolations = Array.from(violationCounts.entries())
      .map(([standardId, count]) => {
        const standard = this.standards.find(s => s.id === standardId);
        return {
          standardId,
          count,
          description: standard?.description || ''
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      reports,
      summary: {
        totalFiles: reports.length,
        averageScore,
        gradeDistribution,
        topViolations
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

  /**
   * 生成质量报告
   */
  async generateQualityReport(
    analysis: Awaited<ReturnType<typeof this.checkTestSuite>>,
    outputPath: string
  ): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: analysis.summary,
      standards: this.standards.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        severity: s.severity
      })),
      fileReports: analysis.reports.map(r => ({
        file: path.relative(process.cwd(), r.filePath),
        score: r.score,
        grade: r.grade,
        summary: r.summary,
        violations: r.violations.map(v => ({
          standardId: v.standardId,
          line: v.line,
          message: v.message,
          severity: v.severity,
          suggestion: v.suggestion
        }))
      })).sort((a, b) => a.score - b.score)
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`📋 测试质量报告已生成: ${outputPath}`);
  }
}