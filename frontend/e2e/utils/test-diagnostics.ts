/**
 * 测试状态检查和诊断工具
 * 提供测试环境、页面状态、性能等诊断功能
 */

import { Page, BrowserContext, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DiagnosticReport {
  timestamp: number;
  testName: string;
  environment: EnvironmentInfo;
  browser: BrowserInfo;
  page: PageInfo;
  performance: PerformanceInfo;
  network: NetworkInfo;
  console: ConsoleMessage[];
  errors: ErrorInfo[];
  warnings: string[];
  recommendations: string[];
}

export interface EnvironmentInfo {
  os: string;
  nodeVersion: string;
  playwrightVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    model: string;
    cores: number;
    usage?: number;
  };
}

export interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

export interface PageInfo {
  url: string;
  title: string;
  loadState: string;
  elementCount: number;
  visibleElements: number;
  formElements: number;
  imageElements: number;
  linkElements: number;
  scriptElements: number;
  styleElements: number;
}

export interface PerformanceInfo {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface NetworkInfo {
  requestCount: number;
  failedRequests: number;
  totalSize: number;
  averageResponseTime: number;
  slowRequests: NetworkRequest[];
  failedRequestDetails: NetworkRequest[];
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  responseTime: number;
  size: number;
  resourceType: string;
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  text: string;
  timestamp: number;
  location?: string;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  source: 'page' | 'test' | 'browser';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class TestDiagnostics {
  private consoleMessages: ConsoleMessage[] = [];
  private networkRequests: NetworkRequest[] = [];
  private errors: ErrorInfo[] = [];
  private performanceMetrics: Map<string, number> = new Map();

  /**
   * 生成完整的诊断报告
   */
  async generateDiagnosticReport(page: Page, testName: string): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: Date.now(),
      testName,
      environment: await this.getEnvironmentInfo(),
      browser: await this.getBrowserInfo(page),
      page: await this.getPageInfo(page),
      performance: await this.getPerformanceInfo(page),
      network: this.getNetworkInfo(),
      console: [...this.consoleMessages],
      errors: [...this.errors],
      warnings: [],
      recommendations: []
    };

    // 生成警告和建议
    report.warnings = this.generateWarnings(report);
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * 开始监控页面
   */
  async startMonitoring(page: Page): Promise<void> {
    // 清理之前的数据
    this.consoleMessages = [];
    this.networkRequests = [];
    this.errors = [];
    this.performanceMetrics.clear();

    // 监听控制台消息
    page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type() as any,
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location()?.url
      });
    });

    // 监听页面错误
    page.on('pageerror', (error) => {
      this.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        source: 'page',
        severity: 'high'
      });
    });

    // 监听网络请求
    page.on('request', (request) => {
      const startTime = Date.now();
      
      request.response().then((response) => {
        if (response) {
          const endTime = Date.now();
          this.networkRequests.push({
            url: request.url(),
            method: request.method(),
            status: response.status(),
            responseTime: endTime - startTime,
            size: 0, // 需要从响应头获取
            resourceType: request.resourceType()
          });
        }
      }).catch(() => {
        // 请求失败
        this.networkRequests.push({
          url: request.url(),
          method: request.method(),
          status: 0,
          responseTime: 0,
          size: 0,
          resourceType: request.resourceType()
        });
      });
    });

    // 监听响应
    page.on('response', async (response) => {
      const request = this.networkRequests.find(req => req.url === response.url());
      if (request) {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            request.size = parseInt(contentLength);
          }
        } catch (error) {
          // 忽略获取响应大小的错误
        }
      }
    });
  }

  /**
   * 停止监控
   */
  stopMonitoring(page: Page): void {
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('request');
    page.removeAllListeners('response');
  }

  /**
   * 检查页面健康状态
   */
  async checkPageHealth(page: Page): Promise<{
    isHealthy: boolean;
    issues: string[];
    score: number;
  }> {
    const issues: string[] = [];
    let score = 100;

    try {
      // 检查页面是否加载完成
      const loadState = await page.evaluate(() => document.readyState);
      if (loadState !== 'complete') {
        issues.push('页面未完全加载');
        score -= 20;
      }

      // 检查是否有JavaScript错误
      const jsErrors = this.errors.filter(e => e.source === 'page');
      if (jsErrors.length > 0) {
        issues.push(`发现 ${jsErrors.length} 个JavaScript错误`);
        score -= jsErrors.length * 10;
      }

      // 检查控制台错误
      const consoleErrors = this.consoleMessages.filter(m => m.type === 'error');
      if (consoleErrors.length > 0) {
        issues.push(`发现 ${consoleErrors.length} 个控制台错误`);
        score -= consoleErrors.length * 5;
      }

      // 检查网络请求失败
      const failedRequests = this.networkRequests.filter(r => r.status >= 400);
      if (failedRequests.length > 0) {
        issues.push(`发现 ${failedRequests.length} 个失败的网络请求`);
        score -= failedRequests.length * 5;
      }

      // 检查页面性能
      const performanceInfo = await this.getPerformanceInfo(page);
      if (performanceInfo.loadTime > 5000) {
        issues.push('页面加载时间过长');
        score -= 15;
      }

      // 检查内存使用
      if (performanceInfo.memoryUsage) {
        const memoryUsageRatio = performanceInfo.memoryUsage.usedJSHeapSize / 
                                performanceInfo.memoryUsage.jsHeapSizeLimit;
        if (memoryUsageRatio > 0.8) {
          issues.push('内存使用率过高');
          score -= 10;
        }
      }

    } catch (error) {
      issues.push(`健康检查失败: ${error}`);
      score -= 30;
    }

    return {
      isHealthy: score >= 70,
      issues,
      score: Math.max(0, score)
    };
  }

  /**
   * 性能分析
   */
  async analyzePerformance(page: Page): Promise<{
    metrics: PerformanceInfo;
    bottlenecks: string[];
    suggestions: string[];
  }> {
    const metrics = await this.getPerformanceInfo(page);
    const bottlenecks: string[] = [];
    const suggestions: string[] = [];

    // 分析加载时间
    if (metrics.loadTime > 3000) {
      bottlenecks.push('页面加载时间过长');
      suggestions.push('优化资源加载，考虑使用CDN');
    }

    // 分析首屏渲染
    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 2000) {
      bottlenecks.push('首屏渲染时间过长');
      suggestions.push('优化关键渲染路径，减少阻塞资源');
    }

    // 分析布局稳定性
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      bottlenecks.push('布局稳定性差');
      suggestions.push('为图片和广告位预留空间，避免布局偏移');
    }

    // 分析网络请求
    const slowRequests = this.networkRequests.filter(r => r.responseTime > 2000);
    if (slowRequests.length > 0) {
      bottlenecks.push(`发现 ${slowRequests.length} 个慢请求`);
      suggestions.push('优化API响应时间，考虑使用缓存');
    }

    // 分析内存使用
    if (metrics.memoryUsage) {
      const memoryUsageRatio = metrics.memoryUsage.usedJSHeapSize / 
                              metrics.memoryUsage.jsHeapSizeLimit;
      if (memoryUsageRatio > 0.7) {
        bottlenecks.push('内存使用率高');
        suggestions.push('检查内存泄漏，优化数据结构');
      }
    }

    return { metrics, bottlenecks, suggestions };
  }

  /**
   * 保存诊断报告
   */
  async saveDiagnosticReport(report: DiagnosticReport, filename?: string): Promise<string> {
    const reportName = filename || `diagnostic_${report.testName}_${Date.now()}.json`;
    const reportPath = path.join(process.cwd(), 'frontend/e2e/diagnostic-reports', reportName);
    
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    return reportPath;
  }

  /**
   * 生成HTML诊断报告
   */
  async generateHTMLReport(report: DiagnosticReport): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试诊断报告 - ${report.testName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .error { color: #d32f2f; }
        .warning { color: #f57c00; }
        .success { color: #388e3c; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f9f9f9; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>测试诊断报告</h1>
        <p><strong>测试名称:</strong> ${report.testName}</p>
        <p><strong>生成时间:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>环境信息</h2>
        <div class="metric"><strong>操作系统:</strong> ${report.environment.os}</div>
        <div class="metric"><strong>Node版本:</strong> ${report.environment.nodeVersion}</div>
        <div class="metric"><strong>内存使用:</strong> ${(report.environment.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB</div>
    </div>

    <div class="section">
        <h2>浏览器信息</h2>
        <div class="metric"><strong>浏览器:</strong> ${report.browser.name} ${report.browser.version}</div>
        <div class="metric"><strong>视窗:</strong> ${report.browser.viewport.width}x${report.browser.viewport.height}</div>
        <div class="metric"><strong>移动端:</strong> ${report.browser.isMobile ? '是' : '否'}</div>
    </div>

    <div class="section">
        <h2>页面信息</h2>
        <div class="metric"><strong>URL:</strong> ${report.page.url}</div>
        <div class="metric"><strong>标题:</strong> ${report.page.title}</div>
        <div class="metric"><strong>元素总数:</strong> ${report.page.elementCount}</div>
        <div class="metric"><strong>可见元素:</strong> ${report.page.visibleElements}</div>
    </div>

    <div class="section">
        <h2>性能指标</h2>
        <div class="metric"><strong>加载时间:</strong> ${report.performance.loadTime}ms</div>
        <div class="metric"><strong>DOM加载:</strong> ${report.performance.domContentLoaded}ms</div>
        ${report.performance.firstContentfulPaint ? `<div class="metric"><strong>首屏渲染:</strong> ${report.performance.firstContentfulPaint}ms</div>` : ''}
        ${report.performance.largestContentfulPaint ? `<div class="metric"><strong>最大内容渲染:</strong> ${report.performance.largestContentfulPaint}ms</div>` : ''}
    </div>

    <div class="section">
        <h2>网络信息</h2>
        <div class="metric"><strong>请求总数:</strong> ${report.network.requestCount}</div>
        <div class="metric"><strong>失败请求:</strong> ${report.network.failedRequests}</div>
        <div class="metric"><strong>平均响应时间:</strong> ${report.network.averageResponseTime}ms</div>
    </div>

    ${report.errors.length > 0 ? `
    <div class="section">
        <h2 class="error">错误信息</h2>
        <table>
            <tr><th>时间</th><th>来源</th><th>严重程度</th><th>消息</th></tr>
            ${report.errors.map(error => `
                <tr>
                    <td>${new Date(error.timestamp).toLocaleTimeString()}</td>
                    <td>${error.source}</td>
                    <td class="${error.severity === 'critical' ? 'error' : error.severity === 'high' ? 'warning' : ''}">${error.severity}</td>
                    <td>${error.message}</td>
                </tr>
            `).join('')}
        </table>
    </div>
    ` : ''}

    ${report.warnings.length > 0 ? `
    <div class="section">
        <h2 class="warning">警告</h2>
        <ul>
            ${report.warnings.map(warning => `<li>${warning}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
    <div class="section">
        <h2>建议</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>`;

    const htmlPath = path.join(
      process.cwd(), 
      'frontend/e2e/diagnostic-reports', 
      `${report.testName}_${Date.now()}.html`
    );
    
    const dir = path.dirname(htmlPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(htmlPath, html, 'utf-8');
    return htmlPath;
  }

  // 私有方法
  private async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    const memInfo = process.memoryUsage();
    
    return {
      os: `${os.type()} ${os.release()}`,
      nodeVersion: process.version,
      playwrightVersion: require('@playwright/test/package.json').version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: memInfo.heapUsed
      },
      cpu: {
        model: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length
      }
    };
  }

  private async getBrowserInfo(page: Page): Promise<BrowserInfo> {
    const context = page.context();
    const browser = context.browser();
    const viewport = page.viewportSize() || { width: 0, height: 0 };
    
    return {
      name: browser?.browserType().name() || 'unknown',
      version: browser?.version() || 'unknown',
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport,
      deviceScaleFactor: await page.evaluate(() => window.devicePixelRatio),
      isMobile: await page.evaluate(() => /Mobi|Android/i.test(navigator.userAgent)),
      hasTouch: await page.evaluate(() => 'ontouchstart' in window)
    };
  }

  private async getPageInfo(page: Page): Promise<PageInfo> {
    return {
      url: page.url(),
      title: await page.title(),
      loadState: await page.evaluate(() => document.readyState),
      elementCount: await page.locator('*').count(),
      visibleElements: await page.locator(':visible').count(),
      formElements: await page.locator('form, input, textarea, select').count(),
      imageElements: await page.locator('img').count(),
      linkElements: await page.locator('a').count(),
      scriptElements: await page.locator('script').count(),
      styleElements: await page.locator('style, link[rel="stylesheet"]').count()
    };
  }

  private async getPerformanceInfo(page: Page): Promise<PerformanceInfo> {
    const performanceData = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        memoryUsage: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : undefined
      };
    });

    return performanceData;
  }

  private getNetworkInfo(): NetworkInfo {
    const failedRequests = this.networkRequests.filter(r => r.status >= 400 || r.status === 0);
    const totalResponseTime = this.networkRequests.reduce((sum, r) => sum + r.responseTime, 0);
    const totalSize = this.networkRequests.reduce((sum, r) => sum + r.size, 0);
    
    return {
      requestCount: this.networkRequests.length,
      failedRequests: failedRequests.length,
      totalSize,
      averageResponseTime: this.networkRequests.length > 0 ? 
        Math.round(totalResponseTime / this.networkRequests.length) : 0,
      slowRequests: this.networkRequests.filter(r => r.responseTime > 2000),
      failedRequestDetails: failedRequests
    };
  }

  private generateWarnings(report: DiagnosticReport): string[] {
    const warnings: string[] = [];

    if (report.performance.loadTime > 3000) {
      warnings.push('页面加载时间超过3秒');
    }

    if (report.network.failedRequests > 0) {
      warnings.push(`发现${report.network.failedRequests}个失败的网络请求`);
    }

    if (report.errors.length > 0) {
      warnings.push(`发现${report.errors.length}个错误`);
    }

    const consoleErrors = report.console.filter(m => m.type === 'error');
    if (consoleErrors.length > 0) {
      warnings.push(`发现${consoleErrors.length}个控制台错误`);
    }

    return warnings;
  }

  private generateRecommendations(report: DiagnosticReport): string[] {
    const recommendations: string[] = [];

    if (report.performance.loadTime > 3000) {
      recommendations.push('优化页面加载性能，考虑使用懒加载和代码分割');
    }

    if (report.network.slowRequests.length > 0) {
      recommendations.push('优化慢速API请求，考虑使用缓存策略');
    }

    if (report.page.elementCount > 1000) {
      recommendations.push('页面元素过多，考虑虚拟化或分页处理');
    }

    if (report.performance.memoryUsage) {
      const memoryUsageRatio = report.performance.memoryUsage.usedJSHeapSize / 
                              report.performance.memoryUsage.jsHeapSizeLimit;
      if (memoryUsageRatio > 0.7) {
        recommendations.push('内存使用率较高，检查是否存在内存泄漏');
      }
    }

    return recommendations;
  }
}

// 导出单例实例
export const testDiagnostics = new TestDiagnostics();