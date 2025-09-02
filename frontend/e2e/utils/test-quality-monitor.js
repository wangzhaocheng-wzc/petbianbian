#!/usr/bin/env node

/**
 * Test Quality Monitor
 * Monitors test quality metrics and provides alerts
 */

const fs = require('fs');
const path = require('path');

class TestQualityMonitor {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../quality-data');
    this.verbose = options.verbose || false;
    this.thresholds = {
      successRate: 95, // Minimum success rate percentage
      avgDuration: 300000, // Maximum average test duration in ms (5 minutes)
      flakiness: 5, // Maximum flakiness percentage
      coverage: 80, // Minimum code coverage percentage
      performanceRegression: 20 // Maximum performance regression percentage
    };
    
    this.metrics = {
      timestamp: new Date().toISOString(),
      successRate: 0,
      avgDuration: 0,
      flakiness: 0,
      coverage: 0,
      performance: {},
      trends: {},
      alerts: []
    };
  }

  log(message, level = 'info') {
    if (!this.verbose && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📊',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
      alert: '🚨'
    }[level] || '📊';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async analyzeTestResults(resultsFile) {
    this.log('Analyzing test quality metrics...');
    
    if (!fs.existsSync(resultsFile)) {
      throw new Error(`Results file not found: ${resultsFile}`);
    }

    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    // Calculate current metrics
    await this.calculateSuccessRate(results);
    await this.calculateAverageDuration(results);
    await this.calculateFlakiness(results);
    await this.analyzeCoverage(results);
    await this.analyzePerformance(results);
    
    // Load historical data and calculate trends
    await this.calculateTrends();
    
    // Check for quality alerts
    await this.checkQualityAlerts();
    
    // Save current metrics
    await this.saveMetrics();
    
    this.log('Quality analysis completed', 'success');
    return this.metrics;
  }

  async calculateSuccessRate(results) {
    if (results.summary && results.summary.totalTests > 0) {
      this.metrics.successRate = (results.summary.passed / results.summary.totalTests) * 100;
    }
    
    this.log(`Success rate: ${this.metrics.successRate.toFixed(1)}%`, 'debug');
  }

  async calculateAverageDuration(results) {
    if (results.summary && results.summary.totalTests > 0) {
      this.metrics.avgDuration = results.summary.duration / results.summary.totalTests;
    }
    
    this.log(`Average duration: ${this.formatDuration(this.metrics.avgDuration)}`, 'debug');
  }

  async calculateFlakiness(results) {
    // Flakiness calculation requires historical data
    const historicalData = await this.loadHistoricalData();
    
    if (historicalData.length < 5) {
      this.metrics.flakiness = 0;
      this.log('Insufficient data for flakiness calculation', 'debug');
      return;
    }

    // Identify tests that have inconsistent results
    const testResults = new Map();
    
    // Collect test results from current run
    if (results.browsers) {
      for (const browser of results.browsers) {
        for (const suite of browser.suites) {
          for (const test of suite.tests) {
            const testKey = `${suite.title}::${test.title}`;
            if (!testResults.has(testKey)) {
              testResults.set(testKey, []);
            }
            testResults.get(testKey).push(test.status);
          }
        }
      }
    }

    // Compare with historical data
    let flakyTests = 0;
    let totalTests = 0;

    for (const [testKey, currentResults] of testResults) {
      totalTests++;
      
      // Check if this test has been flaky in recent history
      const historicalResults = this.getTestHistoricalResults(testKey, historicalData);
      
      if (historicalResults.length >= 3) {
        const uniqueStatuses = new Set([...currentResults, ...historicalResults]);
        if (uniqueStatuses.size > 1 && uniqueStatuses.has('passed') && uniqueStatuses.has('failed')) {
          flakyTests++;
        }
      }
    }

    this.metrics.flakiness = totalTests > 0 ? (flakyTests / totalTests) * 100 : 0;
    this.log(`Flakiness: ${this.metrics.flakiness.toFixed(1)}%`, 'debug');
  }

  async analyzeCoverage(results) {
    if (results.coverage && results.coverage.total) {
      this.metrics.coverage = results.coverage.total.lines?.pct || 0;
    }
    
    this.log(`Coverage: ${this.metrics.coverage.toFixed(1)}%`, 'debug');
  }

  async analyzePerformance(results) {
    if (results.performance) {
      this.metrics.performance = {
        pageLoad: results.performance.pageLoad || {},
        interaction: results.performance.interaction || {},
        analysis: results.performance.analysis || {}
      };
    }
    
    this.log('Performance metrics analyzed', 'debug');
  }

  async calculateTrends() {
    const historicalData = await this.loadHistoricalData();
    
    if (historicalData.length < 2) {
      this.metrics.trends = { insufficient_data: true };
      return;
    }

    const recent = historicalData.slice(-5); // Last 5 runs
    const older = historicalData.slice(-10, -5); // Previous 5 runs

    this.metrics.trends = {
      successRate: this.calculateTrend(recent, older, 'successRate'),
      avgDuration: this.calculateTrend(recent, older, 'avgDuration'),
      flakiness: this.calculateTrend(recent, older, 'flakiness'),
      coverage: this.calculateTrend(recent, older, 'coverage')
    };

    this.log('Trends calculated', 'debug');
  }

  calculateTrend(recent, older, metric) {
    if (recent.length === 0 || older.length === 0) {
      return { trend: 'stable', change: 0 };
    }

    const recentAvg = recent.reduce((sum, data) => sum + (data[metric] || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, data) => sum + (data[metric] || 0), 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const changePercent = olderAvg > 0 ? (change / olderAvg) * 100 : 0;
    
    let trend = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'improving' : 'declining';
      
      // For some metrics, higher is worse
      if (metric === 'avgDuration' || metric === 'flakiness') {
        trend = changePercent > 0 ? 'declining' : 'improving';
      }
    }

    return {
      trend,
      change: changePercent,
      recent: recentAvg,
      previous: olderAvg
    };
  }

  async checkQualityAlerts() {
    this.metrics.alerts = [];

    // Success rate alert
    if (this.metrics.successRate < this.thresholds.successRate) {
      this.metrics.alerts.push({
        type: 'success_rate',
        severity: 'high',
        message: `Success rate (${this.metrics.successRate.toFixed(1)}%) is below threshold (${this.thresholds.successRate}%)`,
        threshold: this.thresholds.successRate,
        actual: this.metrics.successRate
      });
    }

    // Duration alert
    if (this.metrics.avgDuration > this.thresholds.avgDuration) {
      this.metrics.alerts.push({
        type: 'duration',
        severity: 'medium',
        message: `Average test duration (${this.formatDuration(this.metrics.avgDuration)}) exceeds threshold (${this.formatDuration(this.thresholds.avgDuration)})`,
        threshold: this.thresholds.avgDuration,
        actual: this.metrics.avgDuration
      });
    }

    // Flakiness alert
    if (this.metrics.flakiness > this.thresholds.flakiness) {
      this.metrics.alerts.push({
        type: 'flakiness',
        severity: 'high',
        message: `Test flakiness (${this.metrics.flakiness.toFixed(1)}%) exceeds threshold (${this.thresholds.flakiness}%)`,
        threshold: this.thresholds.flakiness,
        actual: this.metrics.flakiness
      });
    }

    // Coverage alert
    if (this.metrics.coverage < this.thresholds.coverage) {
      this.metrics.alerts.push({
        type: 'coverage',
        severity: 'medium',
        message: `Code coverage (${this.metrics.coverage.toFixed(1)}%) is below threshold (${this.thresholds.coverage}%)`,
        threshold: this.thresholds.coverage,
        actual: this.metrics.coverage
      });
    }

    // Trend alerts
    if (this.metrics.trends.successRate?.trend === 'declining' && Math.abs(this.metrics.trends.successRate.change) > 10) {
      this.metrics.alerts.push({
        type: 'trend_decline',
        severity: 'medium',
        message: `Success rate is declining (${this.metrics.trends.successRate.change.toFixed(1)}% change)`,
        trend: this.metrics.trends.successRate
      });
    }

    // Log alerts
    for (const alert of this.metrics.alerts) {
      this.log(`${alert.severity.toUpperCase()}: ${alert.message}`, 'alert');
    }

    if (this.metrics.alerts.length === 0) {
      this.log('No quality alerts detected', 'success');
    }
  }

  async loadHistoricalData() {
    const historyFile = path.join(this.dataDir, 'quality-history.json');
    
    if (!fs.existsSync(historyFile)) {
      return [];
    }

    try {
      const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch (error) {
      this.log(`Error loading historical data: ${error.message}`, 'warning');
      return [];
    }
  }

  getTestHistoricalResults(testKey, historicalData) {
    const results = [];
    
    for (const data of historicalData) {
      // This would need to be implemented based on the actual data structure
      // For now, return empty array
    }
    
    return results;
  }

  async saveMetrics() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Save current metrics
    const metricsFile = path.join(this.dataDir, `quality-metrics-${Date.now()}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));

    // Update history
    const historyFile = path.join(this.dataDir, 'quality-history.json');
    let history = await this.loadHistoricalData();
    
    history.push({
      timestamp: this.metrics.timestamp,
      successRate: this.metrics.successRate,
      avgDuration: this.metrics.avgDuration,
      flakiness: this.metrics.flakiness,
      coverage: this.metrics.coverage,
      alertCount: this.metrics.alerts.length
    });

    // Keep only last 50 entries
    if (history.length > 50) {
      history = history.slice(-50);
    }

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    
    this.log(`Metrics saved to ${metricsFile}`, 'debug');
  }

  async generateQualityReport() {
    const reportTemplate = `
# Test Quality Report

**Generated:** ${new Date(this.metrics.timestamp).toLocaleString()}

## Quality Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Success Rate | ${this.metrics.successRate.toFixed(1)}% | ${this.thresholds.successRate}% | ${this.metrics.successRate >= this.thresholds.successRate ? '✅' : '❌'} |
| Avg Duration | ${this.formatDuration(this.metrics.avgDuration)} | ${this.formatDuration(this.thresholds.avgDuration)} | ${this.metrics.avgDuration <= this.thresholds.avgDuration ? '✅' : '❌'} |
| Flakiness | ${this.metrics.flakiness.toFixed(1)}% | ${this.thresholds.flakiness}% | ${this.metrics.flakiness <= this.thresholds.flakiness ? '✅' : '❌'} |
| Coverage | ${this.metrics.coverage.toFixed(1)}% | ${this.thresholds.coverage}% | ${this.metrics.coverage >= this.thresholds.coverage ? '✅' : '❌'} |

## Trends

${Object.entries(this.metrics.trends).map(([metric, trend]) => {
  if (trend.insufficient_data) return '';
  const arrow = trend.trend === 'improving' ? '📈' : trend.trend === 'declining' ? '📉' : '➡️';
  return `- **${metric}**: ${arrow} ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%)`;
}).filter(Boolean).join('\n')}

## Alerts

${this.metrics.alerts.length === 0 ? '✅ No quality alerts' : 
  this.metrics.alerts.map(alert => `- 🚨 **${alert.severity.toUpperCase()}**: ${alert.message}`).join('\n')}

## Recommendations

${this.generateRecommendations().map(rec => `- ${rec}`).join('\n')}
`;

    const reportFile = path.join(this.dataDir, 'quality-report.md');
    fs.writeFileSync(reportFile, reportTemplate);
    
    this.log(`Quality report generated: ${reportFile}`, 'success');
    return reportFile;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.successRate < this.thresholds.successRate) {
      recommendations.push('🔧 Investigate and fix failing tests to improve success rate');
    }

    if (this.metrics.avgDuration > this.thresholds.avgDuration) {
      recommendations.push('⚡ Optimize slow tests or consider parallel execution');
    }

    if (this.metrics.flakiness > this.thresholds.flakiness) {
      recommendations.push('🔄 Identify and stabilize flaky tests with better wait strategies');
    }

    if (this.metrics.coverage < this.thresholds.coverage) {
      recommendations.push('📊 Add more test cases to improve code coverage');
    }

    if (this.metrics.trends.successRate?.trend === 'declining') {
      recommendations.push('📉 Address declining success rate trend before it becomes critical');
    }

    if (recommendations.length === 0) {
      recommendations.push('✨ Test quality is good! Continue monitoring for any changes');
    }

    return recommendations;
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dataDir: args.includes('--data-dir') ? args[args.indexOf('--data-dir') + 1] : undefined
  };

  const monitor = new TestQualityMonitor(options);

  try {
    switch (command) {
      case 'analyze':
        const resultsFile = args[1];
        if (!resultsFile) {
          console.log('Usage: node test-quality-monitor.js analyze <results-file> [--verbose]');
          process.exit(1);
        }
        
        const metrics = await monitor.analyzeTestResults(resultsFile);
        console.log('✅ Quality analysis completed');
        console.log(`📊 Success Rate: ${metrics.successRate.toFixed(1)}%`);
        console.log(`⏱️  Avg Duration: ${monitor.formatDuration(metrics.avgDuration)}`);
        console.log(`🔄 Flakiness: ${metrics.flakiness.toFixed(1)}%`);
        console.log(`🚨 Alerts: ${metrics.alerts.length}`);
        
        process.exit(metrics.alerts.filter(a => a.severity === 'high').length > 0 ? 1 : 0);
        break;
        
      case 'report':
        const reportFile = await monitor.generateQualityReport();
        console.log(`✅ Quality report generated: ${reportFile}`);
        break;
        
      default:
        console.log('Usage: node test-quality-monitor.js [analyze|report] [options]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TestQualityMonitor };