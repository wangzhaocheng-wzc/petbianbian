/**
 * 测试环境配置
 */
export interface TestEnvironment {
  name: string;
  baseURL: string;
  apiBaseURL: string;
  timeout: number;
  retries: number;
  workers: number;
  headless: boolean;
  slowMo: number;
  video: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  screenshot: 'off' | 'on' | 'only-on-failure' | 'on-first-retry';
  trace: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
}

/**
 * 开发环境配置
 */
export const developmentConfig: TestEnvironment = {
  name: 'development',
  baseURL: 'http://localhost:3000',
  apiBaseURL: 'http://localhost:5000/api',
  timeout: 30000,
  retries: 0,
  workers: 1,
  headless: false,
  slowMo: 500,
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
};

/**
 * 测试环境配置
 */
export const testConfig: TestEnvironment = {
  name: 'test',
  baseURL: 'http://localhost:3001',
  apiBaseURL: 'http://localhost:5001/api',
  timeout: 30000,
  retries: 2,
  workers: 2,
  headless: true,
  slowMo: 0,
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
};

/**
 * CI环境配置
 */
export const ciConfig: TestEnvironment = {
  name: 'ci',
  baseURL: 'http://localhost:3000',
  apiBaseURL: 'http://localhost:5000/api',
  timeout: 60000,
  retries: 3,
  workers: 2,
  headless: true,
  slowMo: 0,
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
};

/**
 * 预发布环境配置
 */
export const stagingConfig: TestEnvironment = {
  name: 'staging',
  baseURL: 'https://staging.pet-health.com',
  apiBaseURL: 'https://staging-api.pet-health.com/api',
  timeout: 45000,
  retries: 2,
  workers: 3,
  headless: true,
  slowMo: 0,
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
};

/**
 * 生产环境配置（仅用于监控测试）
 */
export const productionConfig: TestEnvironment = {
  name: 'production',
  baseURL: 'https://pet-health.com',
  apiBaseURL: 'https://api.pet-health.com/api',
  timeout: 60000,
  retries: 1,
  workers: 1,
  headless: true,
  slowMo: 0,
  video: 'off',
  screenshot: 'only-on-failure',
  trace: 'off'
};

/**
 * 获取当前环境配置
 */
export function getCurrentEnvironmentConfig(): TestEnvironment {
  const env = process.env.TEST_ENV || process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'test':
      return testConfig;
    case 'ci':
      return ciConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
}

/**
 * 环境特定的测试配置
 */
export interface EnvironmentTestConfig {
  skipSlowTests: boolean;
  enableVisualTesting: boolean;
  enablePerformanceTesting: boolean;
  enableAccessibilityTesting: boolean;
  testDataCleanup: boolean;
  parallelExecution: boolean;
}

/**
 * 各环境的测试配置
 */
export const environmentTestConfigs: Record<string, EnvironmentTestConfig> = {
  development: {
    skipSlowTests: false,
    enableVisualTesting: true,
    enablePerformanceTesting: false,
    enableAccessibilityTesting: true,
    testDataCleanup: true,
    parallelExecution: false
  },
  test: {
    skipSlowTests: false,
    enableVisualTesting: true,
    enablePerformanceTesting: true,
    enableAccessibilityTesting: true,
    testDataCleanup: true,
    parallelExecution: true
  },
  ci: {
    skipSlowTests: true,
    enableVisualTesting: false,
    enablePerformanceTesting: false,
    enableAccessibilityTesting: false,
    testDataCleanup: true,
    parallelExecution: true
  },
  staging: {
    skipSlowTests: false,
    enableVisualTesting: true,
    enablePerformanceTesting: true,
    enableAccessibilityTesting: true,
    testDataCleanup: false,
    parallelExecution: true
  },
  production: {
    skipSlowTests: true,
    enableVisualTesting: false,
    enablePerformanceTesting: true,
    enableAccessibilityTesting: false,
    testDataCleanup: false,
    parallelExecution: false
  }
};

/**
 * 获取当前环境的测试配置
 */
export function getCurrentTestConfig(): EnvironmentTestConfig {
  const env = process.env.TEST_ENV || process.env.NODE_ENV || 'development';
  return environmentTestConfigs[env] || environmentTestConfigs.development;
}

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

/**
 * 各环境的数据库配置
 */
export const databaseConfigs: Record<string, DatabaseConfig> = {
  development: {
    host: 'localhost',
    port: 27017,
    database: 'pet_health_dev'
  },
  test: {
    host: 'localhost',
    port: 27017,
    database: 'pet_health_test'
  },
  ci: {
    host: 'localhost',
    port: 27017,
    database: 'pet_health_ci'
  },
  staging: {
    host: 'staging-db.pet-health.com',
    port: 27017,
    database: 'pet_health_staging',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: true
  }
};

/**
 * 获取当前环境的数据库配置
 */
export function getCurrentDatabaseConfig(): DatabaseConfig {
  const env = process.env.TEST_ENV || process.env.NODE_ENV || 'development';
  return databaseConfigs[env] || databaseConfigs.development;
}

/**
 * 测试数据配置
 */
export interface TestDataConfig {
  useRealData: boolean;
  seedData: boolean;
  cleanupAfterTest: boolean;
  maxTestUsers: number;
  maxTestPets: number;
  maxTestRecords: number;
}

/**
 * 各环境的测试数据配置
 */
export const testDataConfigs: Record<string, TestDataConfig> = {
  development: {
    useRealData: false,
    seedData: true,
    cleanupAfterTest: true,
    maxTestUsers: 10,
    maxTestPets: 50,
    maxTestRecords: 100
  },
  test: {
    useRealData: false,
    seedData: true,
    cleanupAfterTest: true,
    maxTestUsers: 100,
    maxTestPets: 500,
    maxTestRecords: 1000
  },
  ci: {
    useRealData: false,
    seedData: false,
    cleanupAfterTest: true,
    maxTestUsers: 20,
    maxTestPets: 100,
    maxTestRecords: 200
  },
  staging: {
    useRealData: true,
    seedData: false,
    cleanupAfterTest: false,
    maxTestUsers: 5,
    maxTestPets: 25,
    maxTestRecords: 50
  }
};

/**
 * 获取当前环境的测试数据配置
 */
export function getCurrentTestDataConfig(): TestDataConfig {
  const env = process.env.TEST_ENV || process.env.NODE_ENV || 'development';
  return testDataConfigs[env] || testDataConfigs.development;
}