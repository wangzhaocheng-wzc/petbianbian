#!/usr/bin/env node

/**
 * Environment Health Check and Monitoring Script
 * Monitors test environment health and provides diagnostics
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class HealthMonitor {
  constructor(options = {}) {
    this.environment = options.environment || process.env.TEST_ENV || 'ci';
    this.verbose = options.verbose || false;
    this.interval = options.interval || 30000; // 30 seconds
    this.timeout = options.timeout || 10000; // 10 seconds
    
    this.config = {
      ci: {
        services: [
          { name: 'Backend API', url: 'http://localhost:5000/api/health', critical: true },
          { name: 'MongoDB', host: 'localhost', port: 27017, critical: true },
          { name: 'Redis', host: 'localhost', port: 6379, critical: true }
        ]
      },
      local: {
        services: [
          { name: 'Backend API', url: 'http://localhost:5001/api/health', critical: true },
          { name: 'Frontend', url: 'http://localhost:3001', critical: false },
          { name: 'MongoDB', host: 'localhost', port: 27017, critical: true },
          { name: 'Redis', host: 'localhost', port: 6379, critical: true }
        ]
      },
      docker: {
        services: [
          { name: 'Backend API', url: 'http://backend:5000/api/health', critical: true },
          { name: 'Frontend', url: 'http://frontend:3000', critical: false },
          { name: 'MongoDB', host: 'mongo', port: 27017, critical: true },
          { name: 'Redis', host: 'redis', port: 6379, critical: true }
        ]
      }
    };

    this.healthHistory = [];
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      failureRate: 0.3, // 30%
      consecutiveFailures: 3
    };
  }

  log(message, level = 'info') {
    if (!this.verbose && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
      alert: '🚨'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkHealth() {
    const services = this.config[this.environment]?.services || [];
    const results = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      overall: 'healthy',
      services: [],
      metrics: {
        totalServices: services.length,
        healthyServices: 0,
        unhealthyServices: 0,
        criticalFailures: 0
      }
    };

    this.log(`Checking health of ${services.length} services...`);

    for (const service of services) {
      const serviceResult = await this.checkService(service);
      results.services.push(serviceResult);

      if (serviceResult.status === 'healthy') {
        results.metrics.healthyServices++;
      } else {
        results.metrics.unhealthyServices++;
        if (service.critical) {
          results.metrics.criticalFailures++;
          results.overall = 'unhealthy';
        }
      }
    }

    // Store health history
    this.healthHistory.push(results);
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift(); // Keep only last 100 checks
    }

    // Check for alerts
    await this.checkAlerts(results);

    return results;
  }

  async checkService(service) {
    const startTime = Date.now();
    const result = {
      name: service.name,
      status: 'unknown',
      responseTime: 0,
      error: null,
      details: {}
    };

    try {
      if (service.url) {
        // HTTP health check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(service.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'HealthMonitor/1.0' }
        });

        clearTimeout(timeoutId);
        result.responseTime = Date.now() - startTime;

        if (response.ok) {
          result.status = 'healthy';
          result.details = {
            httpStatus: response.status,
            contentType: response.headers.get('content-type')
          };

          // Try to parse response for additional details
          try {
            const text = await response.text();
            if (text) {
              result.details.response = text.substring(0, 200); // First 200 chars
            }
          } catch (e) {
            // Ignore parsing errors
          }
        } else {
          result.status = 'unhealthy';
          result.error = `HTTP ${response.status}`;
        }
      } else if (service.host && service.port) {
        // TCP port check
        result.responseTime = await this.checkTcpPort(service.host, service.port);
        result.status = 'healthy';
        result.details = { host: service.host, port: service.port };
      }
    } catch (error) {
      result.status = 'unhealthy';
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
    }

    const statusIcon = result.status === 'healthy' ? '✅' : '❌';
    const responseTimeStr = `${result.responseTime}ms`;
    this.log(`${statusIcon} ${service.name}: ${result.status} (${responseTimeStr})`, 
             result.status === 'healthy' ? 'debug' : 'warning');

    return result;
  }

  async checkTcpPort(host, port) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }, this.timeout);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(Date.now() - startTime);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async checkAlerts(results) {
    // Check for critical service failures
    if (results.metrics.criticalFailures > 0) {
      this.log(`🚨 CRITICAL: ${results.metrics.criticalFailures} critical services are down!`, 'alert');
      await this.sendAlert('critical_services_down', results);
    }

    // Check response time alerts
    const slowServices = results.services.filter(s => 
      s.responseTime > this.alertThresholds.responseTime && s.status === 'healthy'
    );
    
    if (slowServices.length > 0) {
      this.log(`⚠️  WARNING: ${slowServices.length} services have slow response times`, 'warning');
      await this.sendAlert('slow_response_times', { services: slowServices });
    }

    // Check failure rate over time
    if (this.healthHistory.length >= 10) {
      const recentChecks = this.healthHistory.slice(-10);
      const failureRate = recentChecks.filter(check => check.overall === 'unhealthy').length / recentChecks.length;
      
      if (failureRate >= this.alertThresholds.failureRate) {
        this.log(`🚨 ALERT: High failure rate detected (${(failureRate * 100).toFixed(1)}%)`, 'alert');
        await this.sendAlert('high_failure_rate', { failureRate, recentChecks: recentChecks.length });
      }
    }
  }

  async sendAlert(type, data) {
    // In a real implementation, this would send alerts via email, Slack, etc.
    // For now, we'll just log and optionally write to a file
    
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      data
    };

    // Write alert to file
    const alertsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(alertsDir)) {
      fs.mkdirSync(alertsDir, { recursive: true });
    }

    const alertsFile = path.join(alertsDir, 'health-alerts.jsonl');
    fs.appendFileSync(alertsFile, JSON.stringify(alert) + '\n');

    this.log(`Alert logged: ${type}`, 'debug');
  }

  async generateReport() {
    if (this.healthHistory.length === 0) {
      this.log('No health data available for report', 'warning');
      return null;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      environment: this.environment,
      period: {
        from: this.healthHistory[0].timestamp,
        to: this.healthHistory[this.healthHistory.length - 1].timestamp,
        checks: this.healthHistory.length
      },
      summary: {
        overallUptime: 0,
        serviceStats: {},
        averageResponseTimes: {},
        incidents: []
      }
    };

    // Calculate overall uptime
    const healthyChecks = this.healthHistory.filter(check => check.overall === 'healthy').length;
    report.summary.overallUptime = (healthyChecks / this.healthHistory.length) * 100;

    // Calculate per-service statistics
    const services = this.config[this.environment]?.services || [];
    
    for (const service of services) {
      const serviceChecks = this.healthHistory
        .map(check => check.services.find(s => s.name === service.name))
        .filter(Boolean);

      if (serviceChecks.length > 0) {
        const healthyServiceChecks = serviceChecks.filter(check => check.status === 'healthy').length;
        const avgResponseTime = serviceChecks.reduce((sum, check) => sum + check.responseTime, 0) / serviceChecks.length;

        report.summary.serviceStats[service.name] = {
          uptime: (healthyServiceChecks / serviceChecks.length) * 100,
          totalChecks: serviceChecks.length,
          healthyChecks: healthyServiceChecks,
          unhealthyChecks: serviceChecks.length - healthyServiceChecks
        };

        report.summary.averageResponseTimes[service.name] = Math.round(avgResponseTime);
      }
    }

    // Identify incidents (consecutive failures)
    let currentIncident = null;
    
    for (const check of this.healthHistory) {
      if (check.overall === 'unhealthy') {
        if (!currentIncident) {
          currentIncident = {
            startTime: check.timestamp,
            endTime: check.timestamp,
            duration: 0,
            affectedServices: []
          };
        } else {
          currentIncident.endTime = check.timestamp;
        }
        
        // Track affected services
        const unhealthyServices = check.services
          .filter(s => s.status === 'unhealthy')
          .map(s => s.name);
        
        currentIncident.affectedServices = [
          ...new Set([...currentIncident.affectedServices, ...unhealthyServices])
        ];
      } else if (currentIncident) {
        // End of incident
        currentIncident.duration = new Date(currentIncident.endTime) - new Date(currentIncident.startTime);
        report.summary.incidents.push(currentIncident);
        currentIncident = null;
      }
    }

    // If there's an ongoing incident
    if (currentIncident) {
      currentIncident.duration = new Date(currentIncident.endTime) - new Date(currentIncident.startTime);
      report.summary.incidents.push(currentIncident);
    }

    // Write report to file
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFile = path.join(reportsDir, `health-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    this.log(`Health report generated: ${reportFile}`, 'success');
    return report;
  }

  async startMonitoring() {
    this.log(`Starting health monitoring (interval: ${this.interval}ms)...`, 'info');
    
    const monitor = async () => {
      try {
        const results = await this.checkHealth();
        
        if (this.verbose) {
          console.log('\n' + '='.repeat(50));
          console.log(`Health Check Results - ${results.timestamp}`);
          console.log('='.repeat(50));
          console.log(`Overall Status: ${results.overall}`);
          console.log(`Healthy Services: ${results.metrics.healthyServices}/${results.metrics.totalServices}`);
          
          if (results.metrics.criticalFailures > 0) {
            console.log(`Critical Failures: ${results.metrics.criticalFailures}`);
          }
          
          console.log('\nService Details:');
          results.services.forEach(service => {
            const status = service.status === 'healthy' ? '✅' : '❌';
            console.log(`  ${status} ${service.name}: ${service.responseTime}ms`);
            if (service.error) {
              console.log(`    Error: ${service.error}`);
            }
          });
          console.log('='.repeat(50) + '\n');
        }
      } catch (error) {
        this.log(`Health check failed: ${error.message}`, 'error');
      }
    };

    // Initial check
    await monitor();

    // Set up interval
    const intervalId = setInterval(monitor, this.interval);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      this.log('Stopping health monitoring...', 'info');
      clearInterval(intervalId);
      
      // Generate final report
      await this.generateReport();
      process.exit(0);
    });

    return intervalId;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  const options = {
    environment: process.env.TEST_ENV || 'ci',
    verbose: args.includes('--verbose') || args.includes('-v'),
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
  };

  const monitor = new HealthMonitor(options);

  try {
    switch (command) {
      case 'check':
        const results = await monitor.checkHealth();
        console.log(JSON.stringify(results, null, 2));
        process.exit(results.overall === 'healthy' ? 0 : 1);
        break;
      case 'monitor':
        await monitor.startMonitoring();
        break;
      case 'report':
        const report = await monitor.generateReport();
        if (report) {
          console.log(JSON.stringify(report, null, 2));
        }
        break;
      default:
        console.log('Usage: node health-monitor.js [check|monitor|report] [--verbose]');
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

module.exports = { HealthMonitor };