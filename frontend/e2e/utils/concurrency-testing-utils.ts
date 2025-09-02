import { Page, BrowserContext } from '@playwright/test';

/**
 * 并发测试工具类
 * 提供并发操作、竞态条件检测等测试的辅助方法
 */
export class ConcurrencyTestingUtils {
  constructor(private page: Page, private context: BrowserContext) {}

  /**
   * 创建多个并发页面
   */
  async createConcurrentPages(count: number): Promise<Page[]> {
    const pages: Page[] = [];
    
    for (let i = 0; i < count; i++) {
      const page = await this.context.newPage();
      pages.push(page);
    }
    
    return pages;
  }

  /**
   * 并发执行操作并收集结果
   */
  async executeConcurrentOperations<T>(
    operations: Array<() => Promise<T>>,
    maxConcurrency: number = 5
  ): Promise<{
    results: T[];
    errors: Error[];
    successCount: number;
    failureCount: number;
    executionTime: number;
  }> {
    const startTime = Date.now();
    const results: T[] = [];
    const errors: Error[] = [];
    
    // 分批执行以控制并发数
    const batches = [];
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      batches.push(operations.slice(i, i + maxConcurrency));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await operation();
          results.push(result);
          return { success: true, result, error: null };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          return { success: false, result: null, error: err };
        }
      });
      
      await Promise.allSettled(batchPromises);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      results,
      errors,
      successCount: results.length,
      failureCount: errors.length,
      executionTime
    };
  }

  /**
   * 测试竞态条件
   */
  async testRaceCondition(
    setupFn: () => Promise<void>,
    competingOperations: Array<() => Promise<any>>,
    verificationFn: (results: any[]) => Promise<boolean>
  ): Promise<{
    raceDetected: boolean;
    results: any[];
    verificationPassed: boolean;
  }> {
    await setupFn();
    
    // 同时执行竞争操作
    const startTime = Date.now();
    const results = await Promise.allSettled(
      competingOperations.map(op => op())
    );
    const endTime = Date.now();
    
    // 检查是否存在竞态条件（操作完成时间过于接近）
    const executionTime = endTime - startTime;
    const raceDetected = executionTime < 100; // 如果所有操作在100ms内完成，可能存在竞态
    
    const successResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    const verificationPassed = await verificationFn(successResults);
    
    return {
      raceDetected,
      results: successResults,
      verificationPassed
    };
  }

  /**
   * 模拟高并发用户操作
   */
  async simulateHighConcurrency(
    userCount: number,
    operationsPerUser: number,
    operationFactory: (userIndex: number, operationIndex: number) => () => Promise<any>
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  }> {
    const allOperations: Array<{ operation: () => Promise<any>; startTime: number }> = [];
    const responseTimes: number[] = [];
    let successfulOperations = 0;
    let failedOperations = 0;
    
    // 创建所有操作
    for (let userIndex = 0; userIndex < userCount; userIndex++) {
      for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
        const operation = operationFactory(userIndex, opIndex);
        allOperations.push({
          operation,
          startTime: Date.now()
        });
      }
    }
    
    // 并发执行所有操作
    const results = await Promise.allSettled(
      allOperations.map(async ({ operation, startTime }) => {
        try {
          const result = await operation();
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);
          successfulOperations++;
          return result;
        } catch (error) {
          failedOperations++;
          throw error;
        }
      })
    );
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    return {
      totalOperations: allOperations.length,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      maxResponseTime: Math.max(...responseTimes, 0),
      minResponseTime: Math.min(...responseTimes, Infinity)
    };
  }

  /**
   * 检测死锁情况
   */
  async detectDeadlock(
    resourceOperations: Array<{
      name: string;
      acquire: () => Promise<void>;
      release: () => Promise<void>;
      operation: () => Promise<any>;
    }>,
    timeoutMs: number = 10000
  ): Promise<{
    deadlockDetected: boolean;
    completedOperations: string[];
    timedOutOperations: string[];
  }> {
    const completedOperations: string[] = [];
    const timedOutOperations: string[] = [];
    
    const operationPromises = resourceOperations.map(async ({ name, acquire, release, operation }) => {
      try {
        // 设置超时
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Operation ${name} timed out`)), timeoutMs);
        });
        
        const operationPromise = (async () => {
          await acquire();
          try {
            await operation();
            completedOperations.push(name);
          } finally {
            await release();
          }
        })();
        
        await Promise.race([operationPromise, timeoutPromise]);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
          timedOutOperations.push(name);
        }
      }
    });
    
    await Promise.allSettled(operationPromises);
    
    return {
      deadlockDetected: timedOutOperations.length > 0,
      completedOperations,
      timedOutOperations
    };
  }

  /**
   * 测试数据一致性
   */
  async testDataConsistency(
    dataReaders: Array<() => Promise<any>>,
    dataWriter: () => Promise<void>,
    consistencyChecker: (data: any[]) => boolean
  ): Promise<{
    consistencyMaintained: boolean;
    readResults: any[];
    inconsistencies: string[];
  }> {
    const inconsistencies: string[] = [];
    
    // 并发读取初始数据
    const initialReads = await Promise.all(dataReaders.map(reader => reader()));
    
    if (!consistencyChecker(initialReads)) {
      inconsistencies.push('Initial data inconsistency detected');
    }
    
    // 执行写操作
    await dataWriter();
    
    // 再次并发读取数据
    const finalReads = await Promise.all(dataReaders.map(reader => reader()));
    
    if (!consistencyChecker(finalReads)) {
      inconsistencies.push('Final data inconsistency detected');
    }
    
    // 检查所有读取结果是否一致
    const firstResult = JSON.stringify(finalReads[0]);
    for (let i = 1; i < finalReads.length; i++) {
      if (JSON.stringify(finalReads[i]) !== firstResult) {
        inconsistencies.push(`Data inconsistency between reader ${0} and reader ${i}`);
      }
    }
    
    return {
      consistencyMaintained: inconsistencies.length === 0,
      readResults: finalReads,
      inconsistencies
    };
  }

  /**
   * 监控资源使用情况
   */
  async monitorResourceUsage(
    operation: () => Promise<void>,
    monitoringInterval: number = 1000
  ): Promise<{
    peakMemoryUsage: number;
    averageMemoryUsage: number;
    memoryUsageHistory: number[];
    executionTime: number;
  }> {
    const memoryUsageHistory: number[] = [];
    const startTime = Date.now();
    
    // 开始监控
    const monitoringInterval_id = setInterval(async () => {
      const memoryUsage = await this.page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return 0;
      });
      memoryUsageHistory.push(memoryUsage);
    }, monitoringInterval);
    
    try {
      await operation();
    } finally {
      clearInterval(monitoringInterval_id);
    }
    
    const executionTime = Date.now() - startTime;
    const peakMemoryUsage = Math.max(...memoryUsageHistory, 0);
    const averageMemoryUsage = memoryUsageHistory.length > 0
      ? memoryUsageHistory.reduce((sum, usage) => sum + usage, 0) / memoryUsageHistory.length
      : 0;
    
    return {
      peakMemoryUsage,
      averageMemoryUsage,
      memoryUsageHistory,
      executionTime
    };
  }

  /**
   * 清理并发测试创建的页面
   */
  async cleanupConcurrentPages(pages: Page[]): Promise<void> {
    await Promise.all(pages.map(page => page.close()));
  }

  /**
   * 创建资源锁模拟器
   */
  createResourceLock(): {
    acquire: () => Promise<void>;
    release: () => Promise<void>;
    isLocked: () => boolean;
  } {
    let locked = false;
    const waitingQueue: Array<() => void> = [];
    
    return {
      acquire: async () => {
        if (!locked) {
          locked = true;
          return;
        }
        
        return new Promise<void>((resolve) => {
          waitingQueue.push(resolve);
        });
      },
      
      release: async () => {
        if (waitingQueue.length > 0) {
          const next = waitingQueue.shift();
          if (next) {
            next();
          }
        } else {
          locked = false;
        }
      },
      
      isLocked: () => locked
    };
  }

  /**
   * 测试事务隔离级别
   */
  async testTransactionIsolation(
    isolationLevel: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable',
    readerOperation: () => Promise<any>,
    writerOperation: () => Promise<void>
  ): Promise<{
    isolationMaintained: boolean;
    readerResults: any[];
    writerCompleted: boolean;
  }> {
    const readerResults: any[] = [];
    let writerCompleted = false;
    
    // 开始读取操作
    const readerPromise = (async () => {
      // 第一次读取
      readerResults.push(await readerOperation());
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 第二次读取
      readerResults.push(await readerOperation());
    })();
    
    // 在读取过程中执行写操作
    const writerPromise = (async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await writerOperation();
      writerCompleted = true;
    })();
    
    await Promise.all([readerPromise, writerPromise]);
    
    // 根据隔离级别检查结果
    let isolationMaintained = true;
    
    switch (isolationLevel) {
      case 'read_uncommitted':
        // 可能读取到未提交的数据，任何结果都是可接受的
        break;
        
      case 'read_committed':
        // 不应该读取到未提交的数据，但可能出现不可重复读
        break;
        
      case 'repeatable_read':
        // 同一事务中的多次读取应该返回相同结果
        isolationMaintained = JSON.stringify(readerResults[0]) === JSON.stringify(readerResults[1]);
        break;
        
      case 'serializable':
        // 最严格的隔离级别，读写操作应该串行化
        isolationMaintained = JSON.stringify(readerResults[0]) === JSON.stringify(readerResults[1]);
        break;
    }
    
    return {
      isolationMaintained,
      readerResults,
      writerCompleted
    };
  }
}

/**
 * 竞态条件检测器
 */
export class RaceConditionDetector {
  private operations: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    result?: any;
    error?: Error;
  }> = [];

  /**
   * 记录操作开始
   */
  recordOperationStart(name: string): string {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    this.operations.push({
      name: operationId,
      startTime: Date.now()
    });
    return operationId;
  }

  /**
   * 记录操作结束
   */
  recordOperationEnd(operationId: string, result?: any, error?: Error): void {
    const operation = this.operations.find(op => op.name === operationId);
    if (operation) {
      operation.endTime = Date.now();
      operation.result = result;
      operation.error = error;
    }
  }

  /**
   * 分析竞态条件
   */
  analyzeRaceConditions(): {
    potentialRaces: Array<{
      operations: string[];
      overlapTime: number;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
    summary: {
      totalOperations: number;
      overlappingOperations: number;
      raceRisk: 'low' | 'medium' | 'high';
    };
  } {
    const potentialRaces: Array<{
      operations: string[];
      overlapTime: number;
      riskLevel: 'low' | 'medium' | 'high';
    }> = [];

    // 检查操作重叠
    for (let i = 0; i < this.operations.length; i++) {
      for (let j = i + 1; j < this.operations.length; j++) {
        const op1 = this.operations[i];
        const op2 = this.operations[j];
        
        if (op1.endTime && op2.endTime) {
          const overlap = this.calculateOverlap(op1, op2);
          if (overlap > 0) {
            const riskLevel = this.assessRiskLevel(overlap, op1, op2);
            potentialRaces.push({
              operations: [op1.name, op2.name],
              overlapTime: overlap,
              riskLevel
            });
          }
        }
      }
    }

    const overlappingOperations = potentialRaces.length;
    const highRiskRaces = potentialRaces.filter(race => race.riskLevel === 'high').length;
    const mediumRiskRaces = potentialRaces.filter(race => race.riskLevel === 'medium').length;

    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    if (highRiskRaces > 0) {
      overallRisk = 'high';
    } else if (mediumRiskRaces > 0) {
      overallRisk = 'medium';
    }

    return {
      potentialRaces,
      summary: {
        totalOperations: this.operations.length,
        overlappingOperations,
        raceRisk: overallRisk
      }
    };
  }

  private calculateOverlap(op1: any, op2: any): number {
    const start1 = op1.startTime;
    const end1 = op1.endTime!;
    const start2 = op2.startTime;
    const end2 = op2.endTime!;

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    return Math.max(0, overlapEnd - overlapStart);
  }

  private assessRiskLevel(
    overlapTime: number,
    op1: any,
    op2: any
  ): 'low' | 'medium' | 'high' {
    // 基于重叠时间和操作类型评估风险
    if (overlapTime > 1000) { // 重叠超过1秒
      return 'high';
    } else if (overlapTime > 100) { // 重叠超过100ms
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 清除记录
   */
  clear(): void {
    this.operations = [];
  }
}