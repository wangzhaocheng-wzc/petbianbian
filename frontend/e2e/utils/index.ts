/**
 * 测试工具类统一导出
 */

// 基础类
export { BasePage } from './base-page';
export { TestDataManager } from './test-data-manager';
export { APIMocker } from './api-mocker';
export { ErrorHandler } from './error-handler';
export { TestSetup, createTestSetup, test, expect } from './test-setup';

// 视觉测试工具
export { VisualTesting, VisualTestHelper } from './visual-testing';
export { VisualBaselineManager, BaselineCLI } from './visual-baseline-manager';
export { VisualDiffAnalyzer, DiffAnalysisUtils } from './visual-diff-analyzer';

// 性能测试工具
export { 
  PerformanceUtils, 
  PerformanceTestHelper, 
  PERFORMANCE_THRESHOLDS 
} from './performance-utils';

// 类型定义
export type { 
  TestUser, 
  TestPet, 
  TestAnalysisRecord 
} from './test-data-manager';

export type { 
  MockResponse, 
  NetworkConditions 
} from './api-mocker';

export type { 
  ErrorContext, 
  RetryConfig 
} from './error-handler';

export type {
  PerformanceMetrics,
  NetworkMetrics,
  MemoryMetrics
} from './performance-utils';

export type {
  VisualTestOptions,
  ComparisonResult
} from './visual-testing';

export type {
  BaselineInfo,
  BaselineUpdateOptions
} from './visual-baseline-manager';

export type {
  DiffAnalysisResult,
  DiffRegion,
  DiffTypeAnalysis,
  VisualDiffOptions
} from './visual-diff-analyzer';

export type { 
  TestFixtures, 
  TestContext 
} from './test-setup';

// 配置
export { 
  getCurrentEnvironmentConfig,
  getCurrentTestConfig,
  getCurrentDatabaseConfig,
  getCurrentTestDataConfig
} from '../config/test-environments';

export { 
  getBrowserConfigsForEnvironment,
  getBrowserConfigsForTestSuite,
  getBrowserTestConfig,
  createPlaywrightProjects
} from '../config/browser-configs';

// 测试数据
export { default as testData } from '../fixtures/test-data.json' with { type: "json" };
export { default as mockResponses } from '../fixtures/mock-responses.json' with { type: "json" };