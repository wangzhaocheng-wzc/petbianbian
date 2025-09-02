/**
 * 测试缓存管理器
 * 实现测试缓存和增量测试机制
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface TestCacheEntry {
  testFile: string;
  testName: string;
  fileHash: string;
  dependencyHashes: Record<string, string>;
  lastRun: string;
  result: 'passed' | 'failed' | 'skipped';
  duration: number;
}

export interface CacheConfig {
  enabled: boolean;
  maxAge: number; // 缓存最大年龄（毫秒）
  dependencies: string[]; // 依赖文件模式
  excludePatterns: string[]; // 排除模式
}

export class TestCacheManager {
  private cacheDir: string;
  private cacheFile: string;
  private config: CacheConfig;
  private cache: Map<string, TestCacheEntry> = new Map();

  constructor(
    cacheDir: string = 'test-results/cache',
    config: Partial<CacheConfig> = {}
  ) {
    this.cacheDir = cacheDir;
    this.cacheFile = path.join(cacheDir, 'test-cache.json');
    this.config = {
      enabled: true,
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      dependencies: [
        'src/**/*.{ts,tsx,js,jsx}',
        'backend/src/**/*.{ts,js}',
        'package.json',
        'playwright.config.ts'
      ],
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'test-results/**'
      ],
      ...config
    };
  }

  /**
   * 初始化缓存
   */
  async initialize(): Promise<void> {
    await this.ensureCacheDir();
    await this.loadCache();
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn(`创建缓存目录失败: ${error}`);
    }
  }

  /**
   * 加载缓存
   */
  private async loadCache(): Promise<void> {
    try {
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const cacheData = JSON.parse(content);
      
      Object.entries(cacheData).forEach(([key, entry]) => {
        this.cache.set(key, entry as TestCacheEntry);
      });
      
      console.log(`已加载 ${this.cache.size} 个缓存条目`);
    } catch (error) {
      console.log('初始化新的测试缓存');
    }
  }

  /**
   * 保存缓存
   */
  async saveCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.cache);
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`已保存 ${this.cache.size} 个缓存条目`);
    } catch (error) {
      console.error(`保存缓存失败: ${error}`);
    }
  }

  /**
   * 检查测试是否可以跳过
   */
  async canSkipTest(testFile: string, testName: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    const cacheKey = this.getCacheKey(testFile, testName);
    const cacheEntry = this.cache.get(cacheKey);

    if (!cacheEntry) return false;

    // 检查缓存是否过期
    const lastRun = new Date(cacheEntry.lastRun);
    const now = new Date();
    if (now.getTime() - lastRun.getTime() > this.config.maxAge) {
      this.cache.delete(cacheKey);
      return false;
    }

    // 检查文件是否有变更
    const currentFileHash = await this.calculateFileHash(testFile);
    if (currentFileHash !== cacheEntry.fileHash) {
      return false;
    }

    // 检查依赖文件是否有变更
    const currentDependencyHashes = await this.calculateDependencyHashes();
    for (const [dep, hash] of Object.entries(cacheEntry.dependencyHashes)) {
      if (currentDependencyHashes[dep] !== hash) {
        return false;
      }
    }

    // 只有通过的测试才能跳过
    return cacheEntry.result === 'passed';
  }

  /**
   * 更新测试缓存
   */
  async updateTestCache(
    testFile: string,
    testName: string,
    result: 'passed' | 'failed' | 'skipped',
    duration: number
  ): Promise<void> {
    const cacheKey = this.getCacheKey(testFile, testName);
    const fileHash = await this.calculateFileHash(testFile);
    const dependencyHashes = await this.calculateDependencyHashes();

    const cacheEntry: TestCacheEntry = {
      testFile,
      testName,
      fileHash,
      dependencyHashes,
      lastRun: new Date().toISOString(),
      result,
      duration
    };

    this.cache.set(cacheKey, cacheEntry);
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(testFile: string, testName: string): string {
    return crypto
      .createHash('md5')
      .update(`${testFile}:${testName}`)
      .digest('hex');
  }

  /**
   * 计算文件哈希
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * 计算依赖文件哈希
   */
  private async calculateDependencyHashes(): Promise<Record<string, string>> {
    const hashes: Record<string, string> = {};
    
    // 这里简化实现，实际应该使用glob模式匹配文件
    const importantFiles = [
      'package.json',
      'playwright.config.ts',
      'frontend/src/App.tsx',
      'backend/src/server.ts'
    ];

    for (const file of importantFiles) {
      try {
        const hash = await this.calculateFileHash(file);
        if (hash) {
          hashes[file] = hash;
        }
      } catch (error) {
        // 文件不存在或无法读取
      }
    }

    return hashes;
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      const lastRun = new Date(entry.lastRun);
      if (now.getTime() - lastRun.getTime() > this.config.maxAge) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`已清理 ${cleanedCount} 个过期缓存条目`);
      await this.saveCache();
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalEntries: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    cacheHitRate: number;
  } {
    const entries = Array.from(this.cache.values());
    const passedTests = entries.filter(e => e.result === 'passed').length;
    const failedTests = entries.filter(e => e.result === 'failed').length;
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const averageDuration = entries.length > 0 ? totalDuration / entries.length : 0;

    return {
      totalEntries: entries.length,
      passedTests,
      failedTests,
      averageDuration: Math.round(averageDuration),
      cacheHitRate: 0 // 需要在运行时计算
    };
  }

  /**
   * 重置缓存
   */
  async resetCache(): Promise<void> {
    this.cache.clear();
    try {
      await fs.unlink(this.cacheFile);
      console.log('缓存已重置');
    } catch (error) {
      // 文件不存在
    }
  }
}

/**
 * 并行执行优化器
 */
export class ParallelExecutionOptimizer {
  /**
   * 优化测试分组以提高并行执行效率
   */
  static optimizeTestGroups(
    tests: Array<{ name: string; duration: number; dependencies: string[] }>,
    maxWorkers: number = 4
  ): Array<string[]> {
    // 按持续时间排序（长时间测试优先）
    const sortedTests = [...tests].sort((a, b) => b.duration - a.duration);
    
    // 初始化工作组
    const groups: Array<{ tests: string[]; totalDuration: number }> = [];
    for (let i = 0; i < maxWorkers; i++) {
      groups.push({ tests: [], totalDuration: 0 });
    }

    // 贪心算法分配测试到工作组
    sortedTests.forEach(test => {
      // 找到当前总时间最短的组
      const targetGroup = groups.reduce((min, group, index) => 
        group.totalDuration < groups[min].totalDuration ? index : min, 0
      );

      groups[targetGroup].tests.push(test.name);
      groups[targetGroup].totalDuration += test.duration;
    });

    return groups.map(group => group.tests);
  }

  /**
   * 生成并行执行配置
   */
  static generateParallelConfig(testGroups: string[][]): any {
    return {
      fullyParallel: true,
      workers: testGroups.length,
      projects: testGroups.map((group, index) => ({
        name: `worker-${index + 1}`,
        testMatch: group,
        use: {
          // 可以为每个工作组设置不同的配置
        }
      }))
    };
  }
}