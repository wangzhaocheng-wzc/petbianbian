#!/usr/bin/env node

/**
 * 测试速度优化脚本
 * 分析测试性能并应用优化策略
 */

import { TestPerformanceAnalyzer, SmartTestSelector } from '../utils/test-performance-analyzer';
import { TestCacheManager, ParallelExecutionOptimizer } from '../utils/test-cache-manager';
import fs from 'fs/promises';
import path from 'path';

interface OptimizationConfig {
  enableCache: boolean;
  enableSmartSelection: boolean;
  enableParallelOptimization: boolean;
  performanceThreshold: number; // 毫秒
  outputReports: boolean;
}

class TestSpeedOptimizer {
  private config: OptimizationConfig;
  private analyzer: TestPerformanceAnalyzer;
  private cacheManager: TestCacheManager;
  private smartSelector: SmartTestSelector;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enableCache: true,
      enableSmartSelection: true,
      enableParallelOptimization: true,
      performanceThreshold: 30000, // 30秒
      outputReports: true,
      ...config
    };

    this.analyzer = new TestPerformanceAnalyzer();
    this.cacheManager = new TestCacheManager();
    this.smartSelector = new SmartTestSelector();
  }

  /**
   * 运行完整的测试优化流程
   */
  async optimize(): Promise<void> {
    console.log('🚀 开始测试速度优化...\n');

    try {
      // 1. 初始化缓存管理器
      if (this.config.enableCache) {
        await this.cacheManager.initialize();
        await this.cacheManager.cleanExpiredCache();
      }

      // 2. 分析当前测试性能
      const analysis = await this.analyzeCurrentPerformance();
      
      // 3. 生成优化建议
      await this.generateOptimizationSuggestions(analysis);

      // 4. 应用自动优化
      await this.applyAutomaticOptimizations(analysis);

      // 5. 生成优化后的配置
      await this.generateOptimizedConfig(analysis);

      console.log('✅ 测试速度优化完成！');

    } catch (error) {
      console.error('❌ 优化过程中出现错误:', error);
      process.exit(1);
    }
  }

  /**
   * 分析当前测试性能
   */
  private async analyzeCurrentPerformance() {
    console.log('📊 分析测试性能...');
    
    const resultsPath = 'test-results/results.json';
    
    try {
      const analysis = await this.analyzer.analyzeTestPerformance(resultsPath);
      
      console.log(`   总测试数: ${analysis.totalTests}`);
      console.log(`   平均耗时: ${(analysis.averageDuration / 1000).toFixed(2)}s`);
      console.log(`   慢速测试: ${analysis.slowTests.length}`);
      console.log(`   优化建议: ${analysis.recommendations.length}\n`);

      return analysis;
    } catch (error) {
      console.warn('   无法分析现有测试结果，将使用默认配置');
      return {
        totalTests: 0,
        averageDuration: 0,
        slowTests: [],
        recommendations: [],
        optimizationSuggestions: []
      };
    }
  }

  /**
   * 生成优化建议
   */
  private async generateOptimizationSuggestions(analysis: any): Promise<void> {
    console.log('💡 生成优化建议...');

    const suggestions = [
      ...analysis.recommendations,
      ...this.generateCacheRecommendations(),
      ...this.generateParallelRecommendations(analysis),
      ...this.generateMockingRecommendations(analysis)
    ];

    if (this.config.outputReports) {
      const reportPath = 'test-results/optimization-suggestions.json';
      await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        suggestions,
        optimizationPotential: analysis.optimizationSuggestions
      }, null, 2));

      console.log(`   优化建议已保存到: ${reportPath}`);
    }

    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion}`);
    });
    console.log();
  }

  /**
   * 生成缓存相关建议
   */
  private generateCacheRecommendations(): string[] {
    const recommendations = [];
    
    if (this.config.enableCache) {
      recommendations.push('启用测试缓存以跳过未变更的通过测试');
      recommendations.push('配置依赖文件监控以提高缓存准确性');
    }

    return recommendations;
  }

  /**
   * 生成并行执行建议
   */
  private generateParallelRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (analysis.totalTests > 10) {
      recommendations.push('启用并行测试执行以提高整体速度');
    }

    if (analysis.slowTests.length > 0) {
      recommendations.push('将长时间测试拆分为更小的独立测试');
    }

    return recommendations;
  }

  /**
   * 生成模拟相关建议
   */
  private generateMockingRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    const hasUploadTests = analysis.slowTests.some((test: any) => 
      test.testName.includes('upload') || test.testName.includes('image')
    );
    
    if (hasUploadTests) {
      recommendations.push('对文件上传测试使用模拟文件以减少I/O时间');
    }

    const hasApiTests = analysis.slowTests.some((test: any) => 
      test.testName.includes('api') || test.testName.includes('analysis')
    );
    
    if (hasApiTests) {
      recommendations.push('模拟外部API调用以减少网络延迟');
    }

    return recommendations;
  }

  /**
   * 应用自动优化
   */
  private async applyAutomaticOptimizations(analysis: any): Promise<void> {
    console.log('🔧 应用自动优化...');

    // 1. 创建优化的测试配置
    await this.createOptimizedTestConfig();

    // 2. 生成测试分组配置
    if (this.config.enableParallelOptimization) {
      await this.createParallelTestGroups(analysis);
    }

    // 3. 创建智能测试选择脚本
    if (this.config.enableSmartSelection) {
      await this.createSmartTestScript();
    }

    // 4. 创建缓存管理脚本
    if (this.config.enableCache) {
      await this.createCacheManagementScript();
    }

    console.log('   自动优化已应用\n');
  }

  /**
   * 创建优化的测试配置
   */
  private async createOptimizedTestConfig(): Promise<void> {
    const optimizedConfig = `
// 优化的Playwright配置
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 启用完全并行执行
  fullyParallel: true,
  
  // 优化工作进程数
  workers: process.env.CI ? 2 : 4,
  
  // 减少重试次数以加快失败测试
  retries: process.env.CI ? 1 : 0,
  
  // 优化超时设置
  timeout: 30000,
  
  // 启用测试缓存
  use: {
    // 减少截图和视频录制以提高速度
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // 优化等待策略
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  
  // 优化报告器
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // 项目配置优化
  projects: [
    {
      name: 'fast-tests',
      testMatch: /.*\\.fast\\.spec\\.ts/,
      use: { 
        screenshot: 'off',
        video: 'off',
        trace: 'off'
      }
    },
    {
      name: 'regular-tests',
      testMatch: /.*\\.spec\\.ts/,
      testIgnore: /.*\\.fast\\.spec\\.ts/
    }
  ]
});
`;

    await fs.writeFile('frontend/playwright.config.optimized.ts', optimizedConfig);
  }

  /**
   * 创建并行测试分组
   */
  private async createParallelTestGroups(analysis: any): Promise<void> {
    // 模拟测试数据（实际应该从测试文件中提取）
    const testData = analysis.slowTests.map((test: any) => ({
      name: test.testName,
      duration: test.duration,
      dependencies: []
    }));

    const groups = ParallelExecutionOptimizer.optimizeTestGroups(testData, 4);
    
    const groupConfig = {
      timestamp: new Date().toISOString(),
      groups: groups.map((group, index) => ({
        name: `group-${index + 1}`,
        tests: group
      }))
    };

    await fs.writeFile('test-results/parallel-groups.json', JSON.stringify(groupConfig, null, 2));
  }

  /**
   * 创建智能测试选择脚本
   */
  private async createSmartTestScript(): Promise<void> {
    const script = `#!/usr/bin/env node

/**
 * 智能测试选择脚本
 * 基于代码变更选择需要运行的测试
 */

const { SmartTestSelector } = require('../utils/test-performance-analyzer');
const { execSync } = require('child_process');

async function runSmartTests() {
  try {
    // 获取变更的文件
    const changedFiles = execSync('git diff --name-only HEAD~1', { encoding: 'utf-8' })
      .split('\\n')
      .filter(file => file.trim());

    if (changedFiles.length === 0) {
      console.log('没有检测到文件变更，运行所有测试');
      execSync('npx playwright test', { stdio: 'inherit' });
      return;
    }

    console.log('检测到变更文件:', changedFiles);

    const selector = new SmartTestSelector();
    const selectedTests = await selector.selectTestsForChanges(changedFiles);

    if (selectedTests.length === 0) {
      console.log('没有找到相关测试，运行核心测试套件');
      execSync('npx playwright test --grep "@smoke"', { stdio: 'inherit' });
    } else {
      console.log('运行相关测试:', selectedTests);
      const testPattern = selectedTests.join('|');
      execSync(\`npx playwright test --grep "\${testPattern}"\`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('智能测试选择失败:', error);
    process.exit(1);
  }
}

runSmartTests();
`;

    await fs.writeFile('frontend/e2e/scripts/run-smart-tests.js', script);
    
    // 使脚本可执行
    try {
      await fs.chmod('frontend/e2e/scripts/run-smart-tests.js', '755');
    } catch (error) {
      // Windows系统可能不支持chmod
    }
  }

  /**
   * 创建缓存管理脚本
   */
  private async createCacheManagementScript(): Promise<void> {
    const script = `#!/usr/bin/env node

/**
 * 测试缓存管理脚本
 */

const { TestCacheManager } = require('../utils/test-cache-manager');

async function manageCacheCommand() {
  const command = process.argv[2];
  const cacheManager = new TestCacheManager();
  
  await cacheManager.initialize();

  switch (command) {
    case 'stats':
      const stats = cacheManager.getCacheStats();
      console.log('缓存统计:');
      console.log(\`  总条目: \${stats.totalEntries}\`);
      console.log(\`  通过测试: \${stats.passedTests}\`);
      console.log(\`  失败测试: \${stats.failedTests}\`);
      console.log(\`  平均耗时: \${(stats.averageDuration / 1000).toFixed(2)}s\`);
      break;
      
    case 'clean':
      await cacheManager.cleanExpiredCache();
      console.log('已清理过期缓存');
      break;
      
    case 'reset':
      await cacheManager.resetCache();
      console.log('缓存已重置');
      break;
      
    default:
      console.log('用法: node cache-manager.js [stats|clean|reset]');
  }
}

manageCacheCommand().catch(console.error);
`;

    await fs.writeFile('frontend/e2e/scripts/cache-manager.js', script);
  }

  /**
   * 生成优化后的配置
   */
  private async generateOptimizedConfig(analysis: any): Promise<void> {
    console.log('📝 生成优化配置...');

    const config = {
      optimization: {
        enabled: true,
        cache: this.config.enableCache,
        smartSelection: this.config.enableSmartSelection,
        parallelExecution: this.config.enableParallelOptimization
      },
      performance: {
        threshold: this.config.performanceThreshold,
        slowTestsCount: analysis.slowTests.length,
        averageDuration: analysis.averageDuration,
        optimizationPotential: analysis.optimizationSuggestions.reduce(
          (sum: number, s: any) => sum + s.estimatedImprovement, 0
        )
      },
      recommendations: analysis.recommendations,
      lastOptimized: new Date().toISOString()
    };

    await fs.writeFile('test-results/optimization-config.json', JSON.stringify(config, null, 2));
    console.log('   优化配置已保存到: test-results/optimization-config.json\n');
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<OptimizationConfig> = {};

  // 解析命令行参数
  args.forEach(arg => {
    switch (arg) {
      case '--no-cache':
        config.enableCache = false;
        break;
      case '--no-smart-selection':
        config.enableSmartSelection = false;
        break;
      case '--no-parallel':
        config.enableParallelOptimization = false;
        break;
      case '--no-reports':
        config.outputReports = false;
        break;
    }
  });

  const optimizer = new TestSpeedOptimizer(config);
  await optimizer.optimize();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('优化失败:', error);
    process.exit(1);
  });
}

export { TestSpeedOptimizer };