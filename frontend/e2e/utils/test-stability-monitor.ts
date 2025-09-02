/**
 * 测试稳定性监控器
 * 实时监控测试执行并收集稳定性数据
 */

import { TestResult } from '@playwright/test/reporter';
import { Page, BrowserContext } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

export interface StabilityMetrics {
  testName: string;
  testFile: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  retryCount: number;
  errorMessage?: string;
  errorStack?: string;
  screenshots: string[];
  performanceMetrics: PerformanceMetrics;
  environmentInfo: EnvironmentInfo;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  domElements: number;
  pageLoadTime: number;
  interactionTime: number;
}

export interface EnvironmentInfo {
  browser: string;
  browserVersion: string;
  viewport: { width: number; height: number };
  userAgent: string;
  platform: string;
  timestamp: string;
}

export interface StabilityAlert {
  type: 'flaky-test' | 'performance-degradation' | 'high-failure-rate' | 'timeout-increase';
  testName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  timestamp: string;
}

export class TestStabilityMonitor {
  private metrics: StabilityMetrics[] = [];
  private alerts: StabilityAlert[] = [];
  private currentTest: Partial<StabilityMetrics> | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private config: {
    enablePerformanceMonitoring: boolean;
    enableScreenshots: boolean;
    alertThresholds: {
      failureRate: number;
      performanceDegradation: number;
      timeoutIncrease: number;
    };
    dataRetentionDays: number;
  };

  constructor(config: Partial<typeof TestStabilityMonitor.prototype.config> = {}) {
    this.config = {
      enablePerformanceMonitoring: true,
      enableScreenshots: true,
      alertThresholds: {
        failureRate: 0.2, // 20%失败率触发警报
        performanceDegradation: 0.5, // 50%性能下降触发警报
        timeoutIncrease: 2.0 // 超时时间增加2倍触发警报
      },
      dataRetentionDays: 30,
      ...config
    };
  }

  /**
   * 开始监控测试
   */
  async startTestMonitoring(
    testName: string,
    testFile: string,
    page: Page,
    context: BrowserContext
  ): Promise<void> {
    const startTime = Date.now();
    
    this.currentTest = {
      testName,
      testFile,
      startTime,
      retryCount: 0,
      screenshots: [],
      performanceMetrics: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0,
        domElements: 0,
        pageLoadTime: 0,
        interactionTime: 0
      },
      environmentInfo: await this.collectEnvironmentInfo(page, context)
    };

    // 开始性能监控
    if (this.config.enablePerformanceMonitoring) {
      await this.startPerformanceMonitoring(page);
    }

    // 监听网络请求
    this.setupNetworkMonitoring(page);

    console.log(`🔍 开始监控测试: ${testName}`);
  }

  /**
   * 结束测试监控
   */
  async endTestMonitoring(
    status: StabilityMetrics['status'],
    error?: Error,
    page?: Page
  ): Promise<void> {
    if (!this.currentTest) {
      console.warn('没有正在进行的测试监控');
      return;
    }

    const endTime = Date.now();
    const duration = endTime - this.currentTest.startTime!;

    // 收集最终性能指标
    if (page && this.config.enablePerformanceMonitoring) {
      this.currentTest.performanceMetrics = await this.collectPerformanceMetrics(page);
    }

    // 截图（如果测试失败）
    if (status === 'failed' && page && this.config.enableScreenshots) {
      const screenshotPath = await this.captureFailureScreenshot(page, this.currentTest.testName!);
      if (screenshotPath) {
        this.currentTest.screenshots!.push(screenshotPath);
      }
    }

    const metrics: StabilityMetrics = {
      ...this.currentTest as StabilityMetrics,
      endTime,
      duration,
      status,
      errorMessage: error?.message,
      errorStack: error?.stack
    };

    this.metrics.push(metrics);

    // 分析并生成警报
    await this.analyzeAndGenerateAlerts(metrics);

    // 保存数据
    await this.saveMetrics();

    console.log(`✅ 测试监控结束: ${metrics.testName} (${status}, ${duration}ms)`);
    
    this.currentTest = null;
  }

  /**
   * 记录重试
   */
  recordRetry(): void {
    if (this.currentTest) {
      this.currentTest.retryCount = (this.currentTest.retryCount || 0) + 1;
      console.log(`🔄 测试重试: ${this.currentTest.testName} (第${this.currentTest.retryCount}次)`);
    }
  }

  /**
   * 收集环境信息
   */
  private async collectEnvironmentInfo(page: Page, context: BrowserContext): Promise<EnvironmentInfo> {
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    
    const browserInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }));

    return {
      browser: context.browser()?.browserType().name() || 'unknown',
      browserVersion: context.browser()?.version() || 'unknown',
      viewport,
      userAgent: browserInfo.userAgent,
      platform: browserInfo.platform,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 开始性能监控
   */
  private async startPerformanceMonitoring(page: Page): Promise<void> {
    try {
      // 注入性能监控脚本
      await page.addInitScript(() => {
        // 监控页面加载性能
        window.addEventListener('load', () => {
          const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          (window as any).__testPerformanceData = {
            pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
            firstPaint: 0,
            firstContentfulPaint: 0
          };

          // 获取Paint Timing
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach(entry => {
            if (entry.name === 'first-paint') {
              (window as any).__testPerformanceData.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
              (window as any).__testPerformanceData.firstContentfulPaint = entry.startTime;
            }
          });
        });
      });
    } catch (error) {
      console.warn('性能监控初始化失败:', error);
    }
  }

  /**
   * 设置网络监控
   */
  private setupNetworkMonitoring(page: Page): void {
    let requestCount = 0;

    page.on('request', () => {
      requestCount++;
      if (this.currentTest) {
        this.currentTest.performanceMetrics!.networkRequests = requestCount;
      }
    });
  }

  /**
   * 收集性能指标
   */
  private async collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    try {
      // 获取内存使用情况
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : { usedJSHeapSize: 0, totalJSHeapSize: 0 };
      });

      // 获取DOM元素数量
      const domElements = await page.evaluate(() => document.querySelectorAll('*').length);

      // 获取页面性能数据
      const performanceData = await page.evaluate(() => (window as any).__testPerformanceData || {});

      return {
        memoryUsage: memoryInfo.usedJSHeapSize,
        cpuUsage: 0, // CPU使用率需要通过其他方式获取
        networkRequests: this.currentTest?.performanceMetrics?.networkRequests || 0,
        domElements,
        pageLoadTime: performanceData.pageLoadTime || 0,
        interactionTime: 0 // 交互时间需要在具体交互时测量
      };
    } catch (error) {
      console.warn('收集性能指标失败:', error);
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0,
        domElements: 0,
        pageLoadTime: 0,
        interactionTime: 0
      };
    }
  }

  /**
   * 捕获失败截图
   */
  private async captureFailureScreenshot(page: Page, testName: string): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(
        'test-results',
        'screenshots',
        `${testName}-${timestamp}.png`
      );

      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      return screenshotPath;
    } catch (error) {
      console.warn('截图失败:', error);
      return null;
    }
  }

  /**
   * 分析并生成警报
   */
  private async analyzeAndGenerateAlerts(currentMetrics: StabilityMetrics): Promise<void> {
    const testName = currentMetrics.testName;
    const historicalMetrics = this.metrics.filter(m => m.testName === testName);

    // 检查失败率
    if (historicalMetrics.length >= 5) {
      const recentFailures = historicalMetrics.slice(-10);
      const failureRate = recentFailures.filter(m => m.status === 'failed').length / recentFailures.length;
      
      if (failureRate >= this.config.alertThresholds.failureRate) {
        this.alerts.push({
          type: 'high-failure-rate',
          testName,
          severity: failureRate >= 0.5 ? 'critical' : 'high',
          message: `测试 ${testName} 失败率过高: ${(failureRate * 100).toFixed(1)}%`,
          data: { failureRate, recentRuns: recentFailures.length },
          timestamp: new Date().toISOString()
        });
      }
    }

    // 检查性能退化
    if (historicalMetrics.length >= 3) {
      const recentDurations = historicalMetrics.slice(-5).map(m => m.duration);
      const averageDuration = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
      const currentDuration = currentMetrics.duration;
      
      if (currentDuration > averageDuration * (1 + this.config.alertThresholds.performanceDegradation)) {
        this.alerts.push({
          type: 'performance-degradation',
          testName,
          severity: 'medium',
          message: `测试 ${testName} 执行时间显著增加: ${currentDuration}ms (平均: ${averageDuration.toFixed(0)}ms)`,
          data: { currentDuration, averageDuration },
          timestamp: new Date().toISOString()
        });
      }
    }

    // 检查不稳定性（重试次数）
    if (currentMetrics.retryCount > 0) {
      const recentRetries = historicalMetrics.slice(-10);
      const totalRetries = recentRetries.reduce((sum, m) => sum + m.retryCount, 0);
      
      if (totalRetries >= 5) {
        this.alerts.push({
          type: 'flaky-test',
          testName,
          severity: 'high',
          message: `测试 ${testName} 表现不稳定，最近10次运行中重试了${totalRetries}次`,
          data: { totalRetries, recentRuns: recentRetries.length },
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * 保存指标数据
   */
  private async saveMetrics(): Promise<void> {
    try {
      const dataDir = 'test-results/stability-monitoring';
      await fs.mkdir(dataDir, { recursive: true });

      // 保存指标数据
      const metricsPath = path.join(dataDir, 'metrics.json');
      await fs.writeFile(metricsPath, JSON.stringify(this.metrics, null, 2));

      // 保存警报数据
      const alertsPath = path.join(dataDir, 'alerts.json');
      await fs.writeFile(alertsPath, JSON.stringify(this.alerts, null, 2));

      // 清理过期数据
      await this.cleanupOldData();
    } catch (error) {
      console.warn('保存监控数据失败:', error);
    }
  }

  /**
   * 清理过期数据
   */
  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays);
    const cutoffTime = cutoffDate.getTime();

    // 清理过期指标
    this.metrics = this.metrics.filter(m => m.startTime > cutoffTime);

    // 清理过期警报
    this.alerts = this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoffTime);
  }

  /**
   * 获取测试稳定性报告
   */
  getStabilityReport(): {
    summary: any;
    recentAlerts: StabilityAlert[];
    testMetrics: any[];
  } {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.startTime > last24Hours);

    const summary = {
      totalTests: recentMetrics.length,
      passedTests: recentMetrics.filter(m => m.status === 'passed').length,
      failedTests: recentMetrics.filter(m => m.status === 'failed').length,
      flakyTests: recentMetrics.filter(m => m.retryCount > 0).length,
      averageDuration: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
        : 0,
      alertCount: this.alerts.filter(a => new Date(a.timestamp).getTime() > last24Hours).length
    };

    const testMetrics = this.getTestMetricsSummary();
    const recentAlerts = this.alerts.filter(a => new Date(a.timestamp).getTime() > last24Hours);

    return {
      summary,
      recentAlerts,
      testMetrics
    };
  }

  /**
   * 获取测试指标摘要
   */
  private getTestMetricsSummary(): any[] {
    const testGroups = new Map<string, StabilityMetrics[]>();
    
    this.metrics.forEach(metric => {
      if (!testGroups.has(metric.testName)) {
        testGroups.set(metric.testName, []);
      }
      testGroups.get(metric.testName)!.push(metric);
    });

    return Array.from(testGroups.entries()).map(([testName, metrics]) => {
      const recentMetrics = metrics.slice(-10);
      const passRate = recentMetrics.filter(m => m.status === 'passed').length / recentMetrics.length;
      const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const totalRetries = recentMetrics.reduce((sum, m) => sum + m.retryCount, 0);

      return {
        testName,
        totalRuns: recentMetrics.length,
        passRate: Math.round(passRate * 100),
        averageDuration: Math.round(averageDuration),
        totalRetries,
        stabilityScore: Math.round((passRate * 0.7 + (1 - totalRetries / recentMetrics.length) * 0.3) * 100)
      };
    }).sort((a, b) => a.stabilityScore - b.stabilityScore);
  }

  /**
   * 导出监控数据
   */
  async exportData(outputPath: string): Promise<void> {
    const data = {
      exportTime: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.alerts,
      summary: this.getStabilityReport()
    };

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`📊 监控数据已导出到: ${outputPath}`);
  }
}