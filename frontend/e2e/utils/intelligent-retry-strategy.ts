/**
 * 智能重试策略
 * 基于失败原因和历史数据智能决定重试策略
 */

import { TestInfo } from '@playwright/test';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  enableIntelligentRetry: boolean;
  retryOnlyOnSpecificErrors: boolean;
  specificErrors: string[];
}

export interface RetryDecision {
  shouldRetry: boolean;
  delay: number;
  reason: string;
  strategy: 'immediate' | 'linear' | 'exponential' | 'adaptive';
}

export interface FailureAnalysis {
  errorType: 'timeout' | 'network' | 'element' | 'assertion' | 'unknown';
  isTransient: boolean;
  confidence: number; // 0-1之间，表示对错误类型判断的信心
  suggestedAction: string;
}

export class IntelligentRetryStrategy {
  private config: RetryConfig;
  private failureHistory: Map<string, Array<{
    timestamp: number;
    errorType: string;
    retrySuccessful: boolean;
  }>> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      enableIntelligentRetry: true,
      retryOnlyOnSpecificErrors: false,
      specificErrors: [
        'timeout',
        'network',
        'connection',
        'element not found',
        'click intercepted',
        'stale element'
      ],
      ...config
    };
  }

  /**
   * 决定是否应该重试测试
   */
  shouldRetry(
    testInfo: TestInfo,
    error: Error,
    currentRetry: number
  ): RetryDecision {
    // 检查是否超过最大重试次数
    if (currentRetry >= this.config.maxRetries) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: '已达到最大重试次数',
        strategy: 'immediate'
      };
    }

    // 分析失败原因
    const failureAnalysis = this.analyzeFailure(error);
    
    // 如果启用了智能重试
    if (this.config.enableIntelligentRetry) {
      return this.makeIntelligentRetryDecision(
        testInfo,
        failureAnalysis,
        currentRetry
      );
    }

    // 如果只对特定错误重试
    if (this.config.retryOnlyOnSpecificErrors) {
      const shouldRetryBasedOnError = this.config.specificErrors.some(
        errorPattern => error.message.toLowerCase().includes(errorPattern.toLowerCase())
      );

      if (!shouldRetryBasedOnError) {
        return {
          shouldRetry: false,
          delay: 0,
          reason: '错误类型不在重试列表中',
          strategy: 'immediate'
        };
      }
    }

    // 默认重试策略
    return {
      shouldRetry: true,
      delay: this.calculateDelay(currentRetry, 'exponential'),
      reason: '使用默认重试策略',
      strategy: 'exponential'
    };
  }

  /**
   * 分析失败原因
   */
  private analyzeFailure(error: Error): FailureAnalysis {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // 超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        errorType: 'timeout',
        isTransient: true,
        confidence: 0.9,
        suggestedAction: '增加等待时间或使用更智能的等待策略'
      };
    }

    // 网络错误
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('net::')) {
      return {
        errorType: 'network',
        isTransient: true,
        confidence: 0.85,
        suggestedAction: '检查网络连接或使用网络重试机制'
      };
    }

    // 元素相关错误
    if (errorMessage.includes('element') ||
        errorMessage.includes('locator') ||
        errorMessage.includes('selector') ||
        errorMessage.includes('click intercepted') ||
        errorMessage.includes('stale element')) {
      return {
        errorType: 'element',
        isTransient: true,
        confidence: 0.8,
        suggestedAction: '改进元素等待策略或选择器'
      };
    }

    // 断言错误
    if (errorMessage.includes('expect') ||
        errorMessage.includes('assertion') ||
        errorStack.includes('expect')) {
      return {
        errorType: 'assertion',
        isTransient: false,
        confidence: 0.95,
        suggestedAction: '检查测试逻辑或应用状态'
      };
    }

    // 未知错误
    return {
      errorType: 'unknown',
      isTransient: false,
      confidence: 0.3,
      suggestedAction: '需要人工分析错误原因'
    };
  }

  /**
   * 做出智能重试决策
   */
  private makeIntelligentRetryDecision(
    testInfo: TestInfo,
    failureAnalysis: FailureAnalysis,
    currentRetry: number
  ): RetryDecision {
    const testName = testInfo.title;

    // 如果错误不是瞬时的，通常不应该重试
    if (!failureAnalysis.isTransient && failureAnalysis.confidence > 0.7) {
      return {
        shouldRetry: false,
        delay: 0,
        reason: `错误类型 '${failureAnalysis.errorType}' 通常不是瞬时的`,
        strategy: 'immediate'
      };
    }

    // 获取历史失败数据
    const history = this.failureHistory.get(testName) || [];
    const recentFailures = history.filter(
      h => Date.now() - h.timestamp < 24 * 60 * 60 * 1000 // 最近24小时
    );

    // 如果最近失败太多，降低重试积极性
    if (recentFailures.length > 5) {
      const successfulRetries = recentFailures.filter(h => h.retrySuccessful).length;
      const retrySuccessRate = successfulRetries / recentFailures.length;

      if (retrySuccessRate < 0.3) {
        return {
          shouldRetry: false,
          delay: 0,
          reason: '该测试最近重试成功率过低',
          strategy: 'immediate'
        };
      }
    }

    // 根据错误类型选择重试策略
    let strategy: RetryDecision['strategy'] = 'exponential';
    let delayMultiplier = 1;

    switch (failureAnalysis.errorType) {
      case 'timeout':
        strategy = 'linear';
        delayMultiplier = 2; // 超时错误需要更长的等待时间
        break;
      
      case 'network':
        strategy = 'exponential';
        delayMultiplier = 1.5; // 网络错误使用指数退避
        break;
      
      case 'element':
        strategy = 'adaptive';
        delayMultiplier = 1; // 元素错误使用自适应策略
        break;
      
      default:
        strategy = 'exponential';
        delayMultiplier = 1;
    }

    const delay = this.calculateDelay(currentRetry, strategy) * delayMultiplier;

    return {
      shouldRetry: true,
      delay: Math.min(delay, this.config.maxDelay),
      reason: `智能重试: ${failureAnalysis.errorType} 错误，使用 ${strategy} 策略`,
      strategy
    };
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(retryCount: number, strategy: RetryDecision['strategy']): number {
    switch (strategy) {
      case 'immediate':
        return 0;
      
      case 'linear':
        return this.config.baseDelay * (retryCount + 1);
      
      case 'exponential':
        return this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retryCount);
      
      case 'adaptive':
        // 自适应策略：结合线性和指数
        const linear = this.config.baseDelay * (retryCount + 1);
        const exponential = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retryCount);
        return (linear + exponential) / 2;
      
      default:
        return this.config.baseDelay;
    }
  }

  /**
   * 记录重试结果
   */
  recordRetryResult(
    testName: string,
    errorType: string,
    retrySuccessful: boolean
  ): void {
    if (!this.failureHistory.has(testName)) {
      this.failureHistory.set(testName, []);
    }

    const history = this.failureHistory.get(testName)!;
    history.push({
      timestamp: Date.now(),
      errorType,
      retrySuccessful
    });

    // 保留最近50条记录
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * 获取测试的重试统计
   */
  getRetryStatistics(testName: string): {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    successRate: number;
    commonErrorTypes: Array<{ type: string; count: number }>;
  } {
    const history = this.failureHistory.get(testName) || [];
    const totalRetries = history.length;
    const successfulRetries = history.filter(h => h.retrySuccessful).length;
    const failedRetries = totalRetries - successfulRetries;
    const successRate = totalRetries > 0 ? successfulRetries / totalRetries : 0;

    // 统计常见错误类型
    const errorTypeCounts = new Map<string, number>();
    history.forEach(h => {
      errorTypeCounts.set(h.errorType, (errorTypeCounts.get(h.errorType) || 0) + 1);
    });

    const commonErrorTypes = Array.from(errorTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRetries,
      successfulRetries,
      failedRetries,
      successRate,
      commonErrorTypes
    };
  }

  /**
   * 导出重试历史数据
   */
  exportRetryHistory(): Record<string, any> {
    const data: Record<string, any> = {};
    
    this.failureHistory.forEach((history, testName) => {
      data[testName] = {
        history,
        statistics: this.getRetryStatistics(testName)
      };
    });

    return data;
  }

  /**
   * 导入重试历史数据
   */
  importRetryHistory(data: Record<string, any>): void {
    Object.entries(data).forEach(([testName, testData]) => {
      if (testData.history && Array.isArray(testData.history)) {
        this.failureHistory.set(testName, testData.history);
      }
    });
  }

  /**
   * 清理过期的历史数据
   */
  cleanupOldHistory(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAgeMs;
    
    this.failureHistory.forEach((history, testName) => {
      const filteredHistory = history.filter(h => h.timestamp > cutoffTime);
      
      if (filteredHistory.length === 0) {
        this.failureHistory.delete(testName);
      } else {
        this.failureHistory.set(testName, filteredHistory);
      }
    });
  }

  /**
   * 获取重试建议
   */
  getRetryRecommendations(): Array<{
    testName: string;
    issue: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      testName: string;
      issue: string;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    this.failureHistory.forEach((history, testName) => {
      const stats = this.getRetryStatistics(testName);
      
      // 重试成功率过低
      if (stats.totalRetries > 5 && stats.successRate < 0.3) {
        recommendations.push({
          testName,
          issue: `重试成功率过低 (${(stats.successRate * 100).toFixed(1)}%)`,
          recommendation: '考虑重写测试或改进测试稳定性',
          priority: 'high'
        });
      }

      // 重试次数过多
      if (stats.totalRetries > 20) {
        recommendations.push({
          testName,
          issue: `重试次数过多 (${stats.totalRetries}次)`,
          recommendation: '分析根本原因并改进测试实现',
          priority: 'high'
        });
      }

      // 特定错误类型过多
      stats.commonErrorTypes.forEach(errorType => {
        if (errorType.count > 10) {
          let recommendation = '';
          switch (errorType.type) {
            case 'timeout':
              recommendation = '优化等待策略，使用智能等待替代固定等待';
              break;
            case 'element':
              recommendation = '改进元素选择器和等待策略';
              break;
            case 'network':
              recommendation = '添加网络错误处理和重试机制';
              break;
            default:
              recommendation = '分析具体错误原因并制定针对性解决方案';
          }

          recommendations.push({
            testName,
            issue: `${errorType.type} 错误频繁出现 (${errorType.count}次)`,
            recommendation,
            priority: 'medium'
          });
        }
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

/**
 * 创建默认的智能重试策略实例
 */
export function createDefaultRetryStrategy(): IntelligentRetryStrategy {
  return new IntelligentRetryStrategy({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    enableIntelligentRetry: true,
    retryOnlyOnSpecificErrors: true,
    specificErrors: [
      'timeout',
      'network',
      'connection',
      'element not found',
      'click intercepted',
      'stale element',
      'navigation'
    ]
  });
}

/**
 * 创建保守的重试策略（较少重试）
 */
export function createConservativeRetryStrategy(): IntelligentRetryStrategy {
  return new IntelligentRetryStrategy({
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    enableIntelligentRetry: true,
    retryOnlyOnSpecificErrors: true,
    specificErrors: [
      'timeout',
      'network',
      'connection'
    ]
  });
}

/**
 * 创建积极的重试策略（更多重试）
 */
export function createAggressiveRetryStrategy(): IntelligentRetryStrategy {
  return new IntelligentRetryStrategy({
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 15000,
    backoffMultiplier: 1.5,
    enableIntelligentRetry: true,
    retryOnlyOnSpecificErrors: false,
    specificErrors: []
  });
}