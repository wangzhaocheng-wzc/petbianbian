import { defineConfig } from '@playwright/test';
import { getCurrentEnvironmentConfig, getCurrentTestConfig } from './e2e/config/test-environments';
import { getBrowserConfigsForEnvironment, createPlaywrightProjects } from './e2e/config/browser-configs';

// 获取当前环境配置
const envConfig = getCurrentEnvironmentConfig();
const testConfig = getCurrentTestConfig();

// 获取浏览器配置
const browserConfigs = getBrowserConfigsForEnvironment(envConfig.name);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* 全局设置 */
  globalSetup: './e2e/utils/global-setup.ts',
  globalTeardown: './e2e/utils/global-teardown.ts',
  
  /* 并行执行设置 */
  fullyParallel: testConfig.parallelExecution,
  
  /* CI环境设置 */
  forbidOnly: !!process.env.CI,
  
  /* 重试设置 */
  retries: envConfig.retries,
  
  /* 工作进程数 */
  workers: envConfig.workers,
  
  /* 报告器配置 */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: envConfig.name === 'development' ? 'always' : 'never'
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    ['line']
  ],
  
  /* 输出目录 */
  outputDir: 'test-results/artifacts',
  
  /* 共享设置 */
  use: {
    /* 基础URL */
    baseURL: envConfig.baseURL,
    
    /* 超时设置 */
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    /* 截图设置 */
    screenshot: envConfig.screenshot,
    
    /* 视频录制 */
    video: envConfig.video,
    
    /* 追踪设置 */
    trace: envConfig.trace,
    
    /* 其他设置 */
    ignoreHTTPSErrors: true,
    
    /* 额外HTTP头 */
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  },

  /* 项目配置 */
  projects: createPlaywrightProjects(browserConfigs, {
    /* 项目级别的设置可以在这里添加 */
  }),

  /* 测试服务器配置 */
  webServer: process.env.PWTEST_SKIP_WEBSERVER ? undefined : {
    command: envConfig.name === 'development' ? 'npm run dev' : 'npm run preview',
    url: envConfig.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  /* 期望设置 */
  expect: {
    /* 断言超时 */
    timeout: 10000,
    
    /* 截图对比设置 */
    toHaveScreenshot: {
      mode: 'css',
      animations: 'disabled'
    },
    
    /* 视觉对比阈值 */
    toMatchSnapshot: {
      threshold: 0.2
    }
  }
});