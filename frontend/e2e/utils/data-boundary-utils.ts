import { Page } from '@playwright/test';

/**
 * 数据边界测试工具类
 * 提供大数据量处理、分页、缓存等测试的辅助方法
 */
export class DataBoundaryUtils {
  constructor(private page: Page) {}

  /**
   * 创建大量测试数据
   */
  async createBulkTestData(type: 'pets' | 'records' | 'posts', count: number, userId: string): Promise<any[]> {
    const data = [];
    
    switch (type) {
      case 'pets':
        for (let i = 1; i <= count; i++) {
          data.push({
            name: `测试宠物${i}`,
            type: i % 2 === 0 ? 'dog' : 'cat',
            breed: i % 2 === 0 ? '金毛' : '英短',
            age: Math.floor(Math.random() * 15) + 1,
            weight: Math.floor(Math.random() * 50) + 1,
            ownerId: userId
          });
        }
        break;
        
      case 'records':
        for (let i = 1; i <= count; i++) {
          data.push({
            petId: userId, // 简化处理，实际应该是宠物ID
            result: {
              healthStatus: i % 3 === 0 ? 'healthy' : i % 3 === 1 ? 'warning' : 'concerning',
              confidence: Math.random() * 100,
              analysis: `分析结果${i}`,
              recommendations: [`建议${i}`]
            },
            notes: `记录${i}的备注`,
            createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          });
        }
        break;
        
      case 'posts':
        for (let i = 1; i <= count; i++) {
          data.push({
            title: `社区帖子标题${i}`,
            content: `这是第${i}个测试帖子的内容，包含一些测试文字来模拟真实的帖子内容。`,
            tags: [`标签${i % 10}`, `分类${i % 5}`],
            authorId: userId,
            images: i % 3 === 0 ? [`test-image-${i}.jpg`] : [],
            createdAt: new Date(Date.now() - i * 60 * 60 * 1000)
          });
        }
        break;
    }
    
    return data;
  }

  /**
   * 验证分页功能
   */
  async verifyPagination(
    listSelector: string,
    paginationSelector: string,
    expectedItemsPerPage: number,
    totalItems: number
  ): Promise<boolean> {
    // 验证当前页面的项目数量
    const currentPageItems = await this.page.locator(listSelector).count();
    if (currentPageItems > expectedItemsPerPage) {
      return false;
    }
    
    // 验证分页控件存在
    const paginationExists = await this.page.locator(paginationSelector).isVisible();
    if (!paginationExists && totalItems > expectedItemsPerPage) {
      return false;
    }
    
    // 计算预期页数
    const expectedPages = Math.ceil(totalItems / expectedItemsPerPage);
    
    // 验证页面信息
    const pageInfo = await this.page.locator('[data-testid="page-info"]').textContent();
    if (pageInfo && !pageInfo.includes(`共 ${expectedPages} 页`)) {
      return false;
    }
    
    return true;
  }

  /**
   * 测试无限滚动加载
   */
  async testInfiniteScroll(
    containerSelector: string,
    itemSelector: string,
    expectedInitialCount: number
  ): Promise<{ success: boolean; finalCount: number }> {
    // 获取初始项目数量
    const initialCount = await this.page.locator(itemSelector).count();
    
    if (initialCount !== expectedInitialCount) {
      return { success: false, finalCount: initialCount };
    }
    
    // 滚动到底部
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // 等待加载更多内容
    await this.page.waitForTimeout(2000);
    
    // 获取加载后的项目数量
    const finalCount = await this.page.locator(itemSelector).count();
    
    return {
      success: finalCount > initialCount,
      finalCount: finalCount
    };
  }

  /**
   * 监控内存使用情况
   */
  async monitorMemoryUsage(): Promise<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usageRatio: number;
  } | null> {
    const memoryInfo = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      return {
        ...memoryInfo,
        usageRatio: memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit
      };
    }
    
    return null;
  }

  /**
   * 测试并发操作
   */
  async testConcurrentOperations(
    operations: Array<() => Promise<void>>,
    maxConcurrency: number = 5
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const chunks = [];
    
    // 将操作分组以控制并发数
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      chunks.push(operations.slice(i, i + maxConcurrency));
    }
    
    for (const chunk of chunks) {
      try {
        await Promise.all(chunk.map(async (operation) => {
          try {
            await operation();
          } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
          }
        }));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    
    return {
      success: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 验证数据一致性
   */
  async verifyDataConsistency(
    dataSelectors: string[],
    expectedValues: string[]
  ): Promise<boolean> {
    if (dataSelectors.length !== expectedValues.length) {
      return false;
    }
    
    for (let i = 0; i < dataSelectors.length; i++) {
      const actualValue = await this.page.locator(dataSelectors[i]).textContent();
      if (actualValue !== expectedValues[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 测试缓存行为
   */
  async testCacheBehavior(
    dataModificationFn: () => Promise<void>,
    verificationSelector: string,
    expectedValueAfterModification: string
  ): Promise<boolean> {
    // 获取修改前的值
    const originalValue = await this.page.locator(verificationSelector).textContent();
    
    // 执行数据修改
    await dataModificationFn();
    
    // 刷新页面以测试缓存更新
    await this.page.reload();
    await this.page.waitForSelector(verificationSelector);
    
    // 验证缓存是否正确更新
    const updatedValue = await this.page.locator(verificationSelector).textContent();
    
    return updatedValue === expectedValueAfterModification && updatedValue !== originalValue;
  }

  /**
   * 模拟网络延迟
   */
  async simulateNetworkDelay(delayMs: number, failureRate: number = 0): Promise<void> {
    await this.page.route('**/api/**', async route => {
      // 随机失败
      if (Math.random() < failureRate) {
        await route.abort();
        return;
      }
      
      // 添加延迟
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  /**
   * 测试数据库连接超时处理
   */
  async testDatabaseTimeout(
    operationFn: () => Promise<void>,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; timedOut: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      await Promise.race([
        operationFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
        )
      ]);
      
      const duration = Date.now() - startTime;
      return { success: true, timedOut: false };
    } catch (error) {
      const duration = Date.now() - startTime;
      const timedOut = duration >= timeoutMs;
      
      return {
        success: false,
        timedOut: timedOut,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 清理本地存储
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * 测试本地存储容量限制
   */
  async testLocalStorageLimit(): Promise<{
    success: boolean;
    maxSizeReached: boolean;
    error?: string;
  }> {
    try {
      const testData = 'x'.repeat(1024 * 1024); // 1MB chunks
      let i = 0;
      
      while (i < 10) { // 尝试存储最多10MB
        localStorage.setItem(`test_data_${i}`, testData);
        i++;
      }
      
      // 清理测试数据
      for (let j = 0; j < i; j++) {
        localStorage.removeItem(`test_data_${j}`);
      }
      
      return { success: true, maxSizeReached: false };
    } catch (error) {
      // 清理可能已存储的数据
      for (let j = 0; j < 10; j++) {
        try {
          localStorage.removeItem(`test_data_${j}`);
        } catch (e) {
          // 忽略清理错误
        }
      }
      
      return {
        success: false,
        maxSizeReached: error instanceof Error && error.name === 'QuotaExceededError',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 验证事务完整性
   */
  async verifyTransactionIntegrity(
    transactionSteps: Array<() => Promise<void>>,
    verificationFn: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      // 执行事务步骤
      for (const step of transactionSteps) {
        await step();
      }
      
      // 验证事务结果
      return await verificationFn();
    } catch (error) {
      // 如果事务失败，验证数据是否回滚
      return await verificationFn();
    }
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    memoryUsage?: any;
  }> {
    const performanceData = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const report: any = {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
      };
      
      // 添加绘制指标
      paint.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          report.firstContentfulPaint = entry.startTime;
        }
        if (entry.name === 'largest-contentful-paint') {
          report.largestContentfulPaint = entry.startTime;
        }
      });
      
      // 添加内存使用情况
      if (performance.memory) {
        report.memoryUsage = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      
      return report;
    });
    
    return performanceData;
  }
}

/**
 * 数据库测试工具
 */
export class DatabaseTestUtils {
  constructor(private page: Page) {}

  /**
   * 模拟数据库连接问题
   */
  async simulateDatabaseIssues(issueType: 'timeout' | 'connection_error' | 'deadlock'): Promise<void> {
    await this.page.route('**/api/**', async route => {
      const url = route.request().url();
      
      switch (issueType) {
        case 'timeout':
          // 模拟超时
          await new Promise(resolve => setTimeout(resolve, 30000));
          await route.continue();
          break;
          
        case 'connection_error':
          // 模拟连接错误
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Database connection failed' })
          });
          break;
          
        case 'deadlock':
          // 模拟死锁错误
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Deadlock detected' })
          });
          break;
      }
    });
  }

  /**
   * 验证数据库事务回滚
   */
  async verifyTransactionRollback(
    beforeState: any,
    failingOperation: () => Promise<void>,
    stateVerificationFn: () => Promise<any>
  ): Promise<boolean> {
    try {
      await failingOperation();
      return false; // 操作应该失败
    } catch (error) {
      // 验证状态是否回滚到之前的状态
      const currentState = await stateVerificationFn();
      return JSON.stringify(currentState) === JSON.stringify(beforeState);
    }
  }
}

/**
 * 缓存测试工具
 */
export class CacheTestUtils {
  constructor(private page: Page) {}

  /**
   * 清除所有缓存
   */
  async clearAllCaches(): Promise<void> {
    await this.page.evaluate(async () => {
      // 清除本地存储
      localStorage.clear();
      sessionStorage.clear();
      
      // 清除缓存API（如果支持）
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
    });
  }

  /**
   * 验证缓存更新
   */
  async verifyCacheUpdate(
    cacheKey: string,
    expectedValue: any,
    storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
  ): Promise<boolean> {
    const actualValue = await this.page.evaluate(
      ({ key, type }) => {
        const storage = type === 'localStorage' ? localStorage : sessionStorage;
        const value = storage.getItem(key);
        return value ? JSON.parse(value) : null;
      },
      { key: cacheKey, type: storageType }
    );
    
    return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  }

  /**
   * 模拟缓存失效
   */
  async simulateCacheExpiry(cacheKey: string): Promise<void> {
    await this.page.evaluate((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }, cacheKey);
  }
}