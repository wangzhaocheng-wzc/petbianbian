/**
 * 测试文档生成器
 * 自动生成测试用例文档和注释
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface TestDocumentation {
  filePath: string;
  title: string;
  description: string;
  testSuites: TestSuite[];
  coverage: TestCoverage;
  dependencies: string[];
  lastUpdated: string;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
  setup?: string;
  teardown?: string;
}

export interface TestCase {
  name: string;
  description: string;
  steps: TestStep[];
  assertions: string[];
  tags: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedDuration: string;
}

export interface TestStep {
  action: string;
  target?: string;
  data?: string;
  expected?: string;
}

export interface TestCoverage {
  features: string[];
  userStories: string[];
  requirements: string[];
}

export class TestDocumentationGenerator {
  /**
   * 生成单个测试文件的文档
   */
  async generateTestFileDocumentation(filePath: string): Promise<TestDocumentation> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, '.spec.ts');
      
      return {
        filePath,
        title: this.extractTitle(content, fileName),
        description: this.extractDescription(content),
        testSuites: this.extractTestSuites(content),
        coverage: this.extractCoverage(content),
        dependencies: this.extractDependencies(content),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`生成测试文档失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 提取测试文件标题
   */
  private extractTitle(content: string, fileName: string): string {
    // 尝试从文件头部注释提取标题
    const headerCommentMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
    if (headerCommentMatch) {
      return headerCommentMatch[1].trim();
    }

    // 尝试从第一个 describe 提取标题
    const describeMatch = content.match(/describe\(['"`]([^'"`]+)['"`]/);
    if (describeMatch) {
      return describeMatch[1];
    }

    // 从文件名生成标题
    return this.generateTitleFromFileName(fileName);
  }

  /**
   * 从文件名生成标题
   */
  private generateTitleFromFileName(fileName: string): string {
    return fileName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Spec$/, 'Tests');
  }

  /**
   * 提取测试描述
   */
  private extractDescription(content: string): string {
    // 尝试从文件头部注释提取描述
    const headerCommentMatch = content.match(/\/\*\*\s*\n\s*\*\s*[^\n]+\s*\n\s*\*\s*([^*]+?)\s*\*\//s);
    if (headerCommentMatch) {
      return headerCommentMatch[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line.length > 0)
        .join(' ');
    }

    // 从测试内容推断描述
    return this.inferDescriptionFromContent(content);
  }

  /**
   * 从内容推断描述
   */
  private inferDescriptionFromContent(content: string): string {
    const features = [];
    
    if (content.includes('login') || content.includes('Login')) {
      features.push('用户登录');
    }
    if (content.includes('register') || content.includes('Register')) {
      features.push('用户注册');
    }
    if (content.includes('pet') || content.includes('Pet')) {
      features.push('宠物管理');
    }
    if (content.includes('analysis') || content.includes('Analysis')) {
      features.push('便便分析');
    }
    if (content.includes('community') || content.includes('Community')) {
      features.push('社区功能');
    }

    if (features.length > 0) {
      return `测试 ${features.join('、')} 相关功能的端到端测试套件`;
    }

    return '端到端测试套件';
  }

  /**
   * 提取测试套件
   */
  private extractTestSuites(content: string): TestSuite[] {
    const suites: TestSuite[] = [];
    const lines = content.split('\n');
    
    // 查找所有 describe 块
    const describeBlocks = this.findDescribeBlocks(content);
    
    describeBlocks.forEach(block => {
      const suite: TestSuite = {
        name: block.name,
        description: this.extractSuiteDescription(block.content),
        tests: this.extractTestCases(block.content),
        setup: this.extractSetupCode(block.content),
        teardown: this.extractTeardownCode(block.content)
      };
      
      suites.push(suite);
    });

    // 如果没有 describe 块，直接提取测试用例
    if (suites.length === 0) {
      const rootTests = this.extractTestCases(content);
      if (rootTests.length > 0) {
        suites.push({
          name: '主测试套件',
          description: '根级别的测试用例',
          tests: rootTests
        });
      }
    }

    return suites;
  }

  /**
   * 查找 describe 块
   */
  private findDescribeBlocks(content: string): Array<{ name: string; content: string }> {
    const blocks: Array<{ name: string; content: string }> = [];
    const lines = content.split('\n');
    
    let currentBlock: { name: string; content: string; startLine: number } | null = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测 describe 开始
      const describeMatch = line.match(/describe\(['"`]([^'"`]+)['"`]/);
      if (describeMatch && !currentBlock) {
        currentBlock = {
          name: describeMatch[1],
          content: line,
          startLine: i
        };
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (currentBlock) {
        currentBlock.content += '\n' + line;
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          blocks.push({
            name: currentBlock.name,
            content: currentBlock.content
          });
          currentBlock = null;
        }
      }
    }

    return blocks;
  }

  /**
   * 提取套件描述
   */
  private extractSuiteDescription(content: string): string {
    // 查找 describe 块前的注释
    const lines = content.split('\n');
    const describeLineIndex = lines.findIndex(line => line.includes('describe('));
    
    if (describeLineIndex > 0) {
      // 检查前面的注释
      for (let i = describeLineIndex - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('//')) {
          return line.replace(/^\/\/\s*/, '');
        }
        if (line.startsWith('/*') || line.includes('*/')) {
          return this.extractCommentContent(lines.slice(i, describeLineIndex).join('\n'));
        }
        if (line.length > 0 && !line.startsWith('*')) {
          break;
        }
      }
    }

    return '测试套件';
  }

  /**
   * 提取注释内容
   */
  private extractCommentContent(comment: string): string {
    return comment
      .replace(/\/\*\*?|\*\/|\*\s?/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ');
  }

  /**
   * 提取测试用例
   */
  private extractTestCases(content: string): TestCase[] {
    const testCases: TestCase[] = [];
    const testBlocks = this.findTestBlocks(content);

    testBlocks.forEach(block => {
      const testCase: TestCase = {
        name: block.name,
        description: this.extractTestDescription(block.content, block.name),
        steps: this.extractTestSteps(block.content),
        assertions: this.extractAssertions(block.content),
        tags: this.extractTags(block.content, block.name),
        complexity: this.calculateComplexity(block.content),
        estimatedDuration: this.estimateDuration(block.content)
      };

      testCases.push(testCase);
    });

    return testCases;
  }

  /**
   * 查找测试块
   */
  private findTestBlocks(content: string): Array<{ name: string; content: string }> {
    const blocks: Array<{ name: string; content: string }> = [];
    const lines = content.split('\n');
    
    let currentBlock: { name: string; content: string } | null = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测测试开始
      const testMatch = line.match(/(?:test|it)\(['"`]([^'"`]+)['"`]/);
      if (testMatch && !currentBlock) {
        currentBlock = {
          name: testMatch[1],
          content: line
        };
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (currentBlock) {
        currentBlock.content += '\n' + line;
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount === 0) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
      }
    }

    return blocks;
  }

  /**
   * 提取测试描述
   */
  private extractTestDescription(content: string, testName: string): string {
    // 查找测试前的注释
    const lines = content.split('\n');
    const testLineIndex = lines.findIndex(line => line.includes('test(') || line.includes('it('));
    
    if (testLineIndex > 0) {
      for (let i = testLineIndex - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('//')) {
          return line.replace(/^\/\/\s*/, '');
        }
        if (line.length > 0) {
          break;
        }
      }
    }

    // 从测试名称生成描述
    return this.generateDescriptionFromTestName(testName);
  }

  /**
   * 从测试名称生成描述
   */
  private generateDescriptionFromTestName(testName: string): string {
    // 简单的描述生成逻辑
    if (testName.includes('should')) {
      return testName;
    }
    
    return `验证${testName}的功能是否正常`;
  }

  /**
   * 提取测试步骤
   */
  private extractTestSteps(content: string): TestStep[] {
    const steps: TestStep[] = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 页面导航
      if (trimmedLine.includes('goto(')) {
        const urlMatch = trimmedLine.match(/goto\(['"`]([^'"`]+)['"`]\)/);
        steps.push({
          action: '导航到页面',
          target: urlMatch ? urlMatch[1] : '指定页面'
        });
      }
      
      // 点击操作
      else if (trimmedLine.includes('click(')) {
        const selectorMatch = trimmedLine.match(/click\(['"`]([^'"`]+)['"`]\)/);
        steps.push({
          action: '点击元素',
          target: selectorMatch ? selectorMatch[1] : '指定元素'
        });
      }
      
      // 填写表单
      else if (trimmedLine.includes('fill(')) {
        const fillMatch = trimmedLine.match(/fill\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]*)['"`]\)/);
        if (fillMatch) {
          steps.push({
            action: '填写输入框',
            target: fillMatch[1],
            data: fillMatch[2]
          });
        }
      }
      
      // 上传文件
      else if (trimmedLine.includes('setInputFiles(')) {
        const uploadMatch = trimmedLine.match(/setInputFiles\(['"`]([^'"`]+)['"`]/);
        steps.push({
          action: '上传文件',
          target: uploadMatch ? uploadMatch[1] : '文件输入框'
        });
      }
      
      // 等待操作
      else if (trimmedLine.includes('waitFor')) {
        if (trimmedLine.includes('waitForSelector')) {
          const selectorMatch = trimmedLine.match(/waitForSelector\(['"`]([^'"`]+)['"`]\)/);
          steps.push({
            action: '等待元素出现',
            target: selectorMatch ? selectorMatch[1] : '指定元素'
          });
        } else if (trimmedLine.includes('waitForTimeout')) {
          const timeoutMatch = trimmedLine.match(/waitForTimeout\((\d+)\)/);
          steps.push({
            action: '等待时间',
            data: timeoutMatch ? `${timeoutMatch[1]}ms` : '指定时间'
          });
        }
      }
    });

    return steps;
  }

  /**
   * 提取断言
   */
  private extractAssertions(content: string): string[] {
    const assertions: string[] = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('expect(')) {
        // 提取断言内容
        const expectMatch = trimmedLine.match(/expect\(([^)]+)\)\.([^(]+)\(([^)]*)\)/);
        if (expectMatch) {
          const target = expectMatch[1];
          const matcher = expectMatch[2];
          const expected = expectMatch[3];
          
          let assertion = '';
          switch (matcher) {
            case 'toBe':
              assertion = `${target} 应该等于 ${expected}`;
              break;
            case 'toContain':
              assertion = `${target} 应该包含 ${expected}`;
              break;
            case 'toBeVisible':
              assertion = `${target} 应该可见`;
              break;
            case 'toHaveText':
              assertion = `${target} 应该包含文本 ${expected}`;
              break;
            case 'toHaveCount':
              assertion = `${target} 的数量应该为 ${expected}`;
              break;
            default:
              assertion = `${target} ${matcher} ${expected}`;
          }
          
          assertions.push(assertion);
        } else {
          // 简单提取
          assertions.push(trimmedLine.replace(/^\s*await\s+/, ''));
        }
      }
    });

    return assertions;
  }

  /**
   * 提取标签
   */
  private extractTags(content: string, testName: string): string[] {
    const tags: string[] = [];

    // 从内容推断标签
    if (content.includes('login') || testName.includes('登录')) {
      tags.push('authentication');
    }
    if (content.includes('register') || testName.includes('注册')) {
      tags.push('registration');
    }
    if (content.includes('pet') || testName.includes('宠物')) {
      tags.push('pet-management');
    }
    if (content.includes('analysis') || testName.includes('分析')) {
      tags.push('analysis');
    }
    if (content.includes('upload') || testName.includes('上传')) {
      tags.push('file-upload');
    }
    if (content.includes('community') || testName.includes('社区')) {
      tags.push('community');
    }

    // 从测试复杂度推断标签
    const complexity = this.calculateComplexity(content);
    tags.push(`complexity-${complexity}`);

    // 从测试类型推断标签
    if (content.includes('error') || testName.includes('错误')) {
      tags.push('error-handling');
    }
    if (content.includes('performance') || testName.includes('性能')) {
      tags.push('performance');
    }
    if (content.includes('visual') || testName.includes('视觉')) {
      tags.push('visual');
    }

    return tags;
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(content: string): 'low' | 'medium' | 'high' {
    let score = 0;

    // 基于代码行数
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    score += Math.min(lines.length / 10, 3);

    // 基于异步操作数量
    const asyncOps = (content.match(/await/g) || []).length;
    score += Math.min(asyncOps / 5, 2);

    // 基于条件语句数量
    const conditionals = (content.match(/if\s*\(|else|switch/g) || []).length;
    score += conditionals;

    // 基于循环数量
    const loops = (content.match(/for\s*\(|while\s*\(|forEach/g) || []).length;
    score += loops * 2;

    if (score <= 3) return 'low';
    if (score <= 7) return 'medium';
    return 'high';
  }

  /**
   * 估算执行时间
   */
  private estimateDuration(content: string): string {
    let duration = 0;

    // 基础时间
    duration += 2; // 2秒基础时间

    // 页面导航
    const navigations = (content.match(/goto\(/g) || []).length;
    duration += navigations * 2;

    // 表单操作
    const formOps = (content.match(/fill\(|click\(/g) || []).length;
    duration += formOps * 0.5;

    // 文件上传
    const uploads = (content.match(/setInputFiles\(/g) || []).length;
    duration += uploads * 3;

    // 等待操作
    const waits = (content.match(/waitFor/g) || []).length;
    duration += waits * 1;

    // 断言
    const assertions = (content.match(/expect\(/g) || []).length;
    duration += assertions * 0.2;

    if (duration <= 5) return '< 5秒';
    if (duration <= 15) return '5-15秒';
    if (duration <= 30) return '15-30秒';
    return '> 30秒';
  }

  /**
   * 提取设置代码
   */
  private extractSetupCode(content: string): string | undefined {
    const beforeEachMatch = content.match(/beforeEach\(async[^{]*{([^}]+)}/s);
    if (beforeEachMatch) {
      return this.formatCodeBlock(beforeEachMatch[1]);
    }
    return undefined;
  }

  /**
   * 提取清理代码
   */
  private extractTeardownCode(content: string): string | undefined {
    const afterEachMatch = content.match(/afterEach\(async[^{]*{([^}]+)}/s);
    if (afterEachMatch) {
      return this.formatCodeBlock(afterEachMatch[1]);
    }
    return undefined;
  }

  /**
   * 格式化代码块
   */
  private formatCodeBlock(code: string): string {
    return code
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * 提取覆盖范围
   */
  private extractCoverage(content: string): TestCoverage {
    const features: string[] = [];
    const userStories: string[] = [];
    const requirements: string[] = [];

    // 从内容推断功能覆盖
    if (content.includes('login') || content.includes('Login')) {
      features.push('用户登录');
      userStories.push('作为用户，我希望能够登录系统');
    }
    if (content.includes('register') || content.includes('Register')) {
      features.push('用户注册');
      userStories.push('作为新用户，我希望能够注册账户');
    }
    if (content.includes('pet') || content.includes('Pet')) {
      features.push('宠物管理');
      userStories.push('作为宠物主人，我希望能够管理我的宠物信息');
    }
    if (content.includes('analysis') || content.includes('Analysis')) {
      features.push('便便分析');
      userStories.push('作为用户，我希望能够分析宠物的便便健康状况');
    }

    // 从注释中提取需求引用
    const requirementMatches = content.match(/_需求[：:]\s*([^_\n]+)/g) || [];
    requirementMatches.forEach(match => {
      const requirement = match.replace(/_需求[：:]\s*/, '').trim();
      requirements.push(requirement);
    });

    return {
      features,
      userStories,
      requirements
    };
  }

  /**
   * 提取依赖
   */
  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // 提取导入的页面对象
    const pageObjectImports = content.match(/import\s*{[^}]*}\s*from\s*['"`][^'"`]*page-objects[^'"`]*['"`]/g) || [];
    pageObjectImports.forEach(importStatement => {
      const matches = importStatement.match(/{([^}]+)}/);
      if (matches) {
        const imports = matches[1].split(',').map(imp => imp.trim());
        dependencies.push(...imports);
      }
    });

    // 提取工具类依赖
    const utilImports = content.match(/import\s*{[^}]*}\s*from\s*['"`][^'"`]*utils[^'"`]*['"`]/g) || [];
    utilImports.forEach(importStatement => {
      const matches = importStatement.match(/{([^}]+)}/);
      if (matches) {
        const imports = matches[1].split(',').map(imp => imp.trim());
        dependencies.push(...imports);
      }
    });

    return [...new Set(dependencies)]; // 去重
  }

  /**
   * 生成 Markdown 文档
   */
  generateMarkdownDocumentation(doc: TestDocumentation): string {
    const markdown: string[] = [];

    // 标题和描述
    markdown.push(`# ${doc.title}`);
    markdown.push('');
    markdown.push(doc.description);
    markdown.push('');

    // 基本信息
    markdown.push('## 基本信息');
    markdown.push('');
    markdown.push(`- **文件路径**: \`${doc.filePath}\``);
    markdown.push(`- **最后更新**: ${new Date(doc.lastUpdated).toLocaleString('zh-CN')}`);
    markdown.push(`- **测试套件数量**: ${doc.testSuites.length}`);
    markdown.push(`- **总测试用例数**: ${doc.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0)}`);
    markdown.push('');

    // 功能覆盖
    if (doc.coverage.features.length > 0) {
      markdown.push('## 功能覆盖');
      markdown.push('');
      doc.coverage.features.forEach(feature => {
        markdown.push(`- ${feature}`);
      });
      markdown.push('');
    }

    // 用户故事
    if (doc.coverage.userStories.length > 0) {
      markdown.push('## 用户故事');
      markdown.push('');
      doc.coverage.userStories.forEach(story => {
        markdown.push(`- ${story}`);
      });
      markdown.push('');
    }

    // 需求映射
    if (doc.coverage.requirements.length > 0) {
      markdown.push('## 需求映射');
      markdown.push('');
      doc.coverage.requirements.forEach(req => {
        markdown.push(`- ${req}`);
      });
      markdown.push('');
    }

    // 依赖
    if (doc.dependencies.length > 0) {
      markdown.push('## 依赖');
      markdown.push('');
      doc.dependencies.forEach(dep => {
        markdown.push(`- \`${dep}\``);
      });
      markdown.push('');
    }

    // 测试套件详情
    markdown.push('## 测试套件');
    markdown.push('');

    doc.testSuites.forEach((suite, suiteIndex) => {
      markdown.push(`### ${suiteIndex + 1}. ${suite.name}`);
      markdown.push('');
      markdown.push(suite.description);
      markdown.push('');

      // 设置和清理
      if (suite.setup) {
        markdown.push('**设置代码:**');
        markdown.push('```typescript');
        markdown.push(suite.setup);
        markdown.push('```');
        markdown.push('');
      }

      if (suite.teardown) {
        markdown.push('**清理代码:**');
        markdown.push('```typescript');
        markdown.push(suite.teardown);
        markdown.push('```');
        markdown.push('');
      }

      // 测试用例
      markdown.push('#### 测试用例');
      markdown.push('');

      suite.tests.forEach((test, testIndex) => {
        markdown.push(`##### ${suiteIndex + 1}.${testIndex + 1} ${test.name}`);
        markdown.push('');
        markdown.push(`**描述**: ${test.description}`);
        markdown.push(`**复杂度**: ${test.complexity}`);
        markdown.push(`**预估时间**: ${test.estimatedDuration}`);
        
        if (test.tags.length > 0) {
          markdown.push(`**标签**: ${test.tags.map(tag => `\`${tag}\``).join(', ')}`);
        }
        markdown.push('');

        // 测试步骤
        if (test.steps.length > 0) {
          markdown.push('**测试步骤**:');
          test.steps.forEach((step, stepIndex) => {
            let stepDesc = `${stepIndex + 1}. ${step.action}`;
            if (step.target) stepDesc += ` - ${step.target}`;
            if (step.data) stepDesc += ` (${step.data})`;
            if (step.expected) stepDesc += ` → ${step.expected}`;
            markdown.push(stepDesc);
          });
          markdown.push('');
        }

        // 断言
        if (test.assertions.length > 0) {
          markdown.push('**验证点**:');
          test.assertions.forEach(assertion => {
            markdown.push(`- ${assertion}`);
          });
          markdown.push('');
        }

        markdown.push('---');
        markdown.push('');
      });
    });

    return markdown.join('\n');
  }

  /**
   * 生成测试套件文档
   */
  async generateTestSuiteDocumentation(testDirectory: string): Promise<{
    documents: TestDocumentation[];
    summary: {
      totalFiles: number;
      totalTestSuites: number;
      totalTestCases: number;
      featureCoverage: string[];
      complexityDistribution: Record<string, number>;
    };
  }> {
    const testFiles = await this.findTestFiles(testDirectory);
    const documents: TestDocumentation[] = [];

    for (const filePath of testFiles) {
      try {
        const doc = await this.generateTestFileDocumentation(filePath);
        documents.push(doc);
      } catch (error) {
        console.error(`生成文档失败: ${filePath}`, error);
      }
    }

    // 计算汇总信息
    const totalTestSuites = documents.reduce((sum, doc) => sum + doc.testSuites.length, 0);
    const totalTestCases = documents.reduce((sum, doc) => 
      sum + doc.testSuites.reduce((suiteSum, suite) => suiteSum + suite.tests.length, 0), 0);

    const allFeatures = new Set<string>();
    const complexityDistribution: Record<string, number> = { low: 0, medium: 0, high: 0 };

    documents.forEach(doc => {
      doc.coverage.features.forEach(feature => allFeatures.add(feature));
      doc.testSuites.forEach(suite => {
        suite.tests.forEach(test => {
          complexityDistribution[test.complexity]++;
        });
      });
    });

    return {
      documents,
      summary: {
        totalFiles: documents.length,
        totalTestSuites,
        totalTestCases,
        featureCoverage: Array.from(allFeatures),
        complexityDistribution
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
   * 保存文档到文件
   */
  async saveDocumentationToFile(
    doc: TestDocumentation,
    outputPath: string
  ): Promise<void> {
    const markdown = this.generateMarkdownDocumentation(doc);
    await fs.writeFile(outputPath, markdown, 'utf-8');
    console.log(`📚 测试文档已生成: ${outputPath}`);
  }

  /**
   * 生成测试套件索引文档
   */
  async generateTestSuiteIndex(
    analysis: Awaited<ReturnType<typeof this.generateTestSuiteDocumentation>>,
    outputPath: string
  ): Promise<void> {
    const markdown: string[] = [];

    markdown.push('# 测试套件文档索引');
    markdown.push('');
    markdown.push('本文档提供了所有测试套件的概览和索引。');
    markdown.push('');

    // 汇总信息
    markdown.push('## 汇总信息');
    markdown.push('');
    markdown.push(`- **测试文件总数**: ${analysis.summary.totalFiles}`);
    markdown.push(`- **测试套件总数**: ${analysis.summary.totalTestSuites}`);
    markdown.push(`- **测试用例总数**: ${analysis.summary.totalTestCases}`);
    markdown.push('');

    // 功能覆盖
    markdown.push('## 功能覆盖');
    markdown.push('');
    analysis.summary.featureCoverage.forEach(feature => {
      markdown.push(`- ${feature}`);
    });
    markdown.push('');

    // 复杂度分布
    markdown.push('## 复杂度分布');
    markdown.push('');
    markdown.push(`- **低复杂度**: ${analysis.summary.complexityDistribution.low} 个测试`);
    markdown.push(`- **中等复杂度**: ${analysis.summary.complexityDistribution.medium} 个测试`);
    markdown.push(`- **高复杂度**: ${analysis.summary.complexityDistribution.high} 个测试`);
    markdown.push('');

    // 测试文件索引
    markdown.push('## 测试文件索引');
    markdown.push('');

    analysis.documents.forEach(doc => {
      const relativePath = path.relative(process.cwd(), doc.filePath);
      const testCount = doc.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
      
      markdown.push(`### ${doc.title}`);
      markdown.push('');
      markdown.push(`**文件**: \`${relativePath}\``);
      markdown.push(`**描述**: ${doc.description}`);
      markdown.push(`**测试用例数**: ${testCount}`);
      markdown.push('');

      // 功能列表
      if (doc.coverage.features.length > 0) {
        markdown.push('**覆盖功能**:');
        doc.coverage.features.forEach(feature => {
          markdown.push(`- ${feature}`);
        });
        markdown.push('');
      }

      markdown.push('---');
      markdown.push('');
    });

    await fs.writeFile(outputPath, markdown.join('\n'), 'utf-8');
    console.log(`📋 测试套件索引已生成: ${outputPath}`);
  }
}