import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 测试报告生成器
export class TestReporter {
  private results: any[] = [];
  private startTime: number = Date.now();
  
  constructor() {
    this.results = [];
  }
  
  // 添加测试结果
  addResult(testName: string, status: 'passed' | 'failed' | 'skipped', duration: number, error?: string) {
    this.results.push({
      testName,
      status,
      duration,
      error,
      timestamp: new Date().toISOString()
    });
  }
  
  // 生成HTML报告
  generateHTMLReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;
    const skippedTests = this.results.filter(r => r.status === 'skipped').length;
    const totalDuration = Date.now() - this.startTime;
    
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat.passed { border-left: 4px solid #4CAF50; }
        .stat.failed { border-left: 4px solid #f44336; }
        .stat.skipped { border-left: 4px solid #ff9800; }
        .test-results { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-item { padding: 15px; border-bottom: 1px solid #eee; }
        .test-item:last-child { border-bottom: none; }
        .test-item.passed { background: #f8fff8; }
        .test-item.failed { background: #fff8f8; }
        .test-item.skipped { background: #fff8f0; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-meta { color: #666; font-size: 0.9em; }
        .error { color: #f44336; margin-top: 10px; padding: 10px; background: #ffebee; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>宠物健康平台 E2E 测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>总耗时: ${(totalDuration / 1000).toFixed(2)}秒</p>
    </div>
    
    <div class="summary">
        <div class="stat">
            <h3>总测试数</h3>
            <div style="font-size: 2em; font-weight: bold;">${totalTests}</div>
        </div>
        <div class="stat passed">
            <h3>通过</h3>
            <div style="font-size: 2em; font-weight: bold; color: #4CAF50;">${passedTests}</div>
        </div>
        <div class="stat failed">
            <h3>失败</h3>
            <div style="font-size: 2em; font-weight: bold; color: #f44336;">${failedTests}</div>
        </div>
        <div class="stat skipped">
            <h3>跳过</h3>
            <div style="font-size: 2em; font-weight: bold; color: #ff9800;">${skippedTests}</div>
        </div>
    </div>
    
    <div class="test-results">
        <h2 style="padding: 15px; margin: 0; background: #f5f5f5;">测试详情</h2>
        ${this.results.map(result => `
            <div class="test-item ${result.status}">
                <div class="test-name">${result.testName}</div>
                <div class="test-meta">
                    状态: ${this.getStatusText(result.status)} | 
                    耗时: ${result.duration}ms | 
                    时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}
                </div>
                ${result.error ? `<div class="error">${result.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    
    return html;
  }
  
  // 获取状态文本
  private getStatusText(status: string): string {
    const statusMap = {
      'passed': '✅ 通过',
      'failed': '❌ 失败',
      'skipped': '⏭️ 跳过'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }
  
  // 保存报告到文件
  saveReport(filename: string = 'e2e-test-report.html') {
    const reportPath = path.join(process.cwd(), 'test-results', filename);
    const reportDir = path.dirname(reportPath);
    
    // 确保目录存在
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const htmlContent = this.generateHTMLReport();
    fs.writeFileSync(reportPath, htmlContent, 'utf8');
    
    console.log(`测试报告已生成: ${reportPath}`);
    return reportPath;
  }
  
  // 生成JSON报告
  generateJSONReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;
    const skippedTests = this.results.filter(r => r.status === 'skipped').length;
    const totalDuration = Date.now() - this.startTime;
    
    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        duration: totalDuration,
        timestamp: new Date().toISOString()
      },
      results: this.results
    };
  }
  
  // 保存JSON报告
  saveJSONReport(filename: string = 'e2e-test-results.json') {
    const reportPath = path.join(process.cwd(), 'test-results', filename);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const jsonContent = JSON.stringify(this.generateJSONReport(), null, 2);
    fs.writeFileSync(reportPath, jsonContent, 'utf8');
    
    console.log(`JSON测试报告已生成: ${reportPath}`);
    return reportPath;
  }
}

// 全局测试报告实例
export const globalReporter = new TestReporter();