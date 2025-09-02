#!/usr/bin/env node

/**
 * CI Integration Script
 * Orchestrates the complete CI testing workflow
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { TestEnvironmentManager } = require('./setup-test-env');
const { TestDataAutomation } = require('./test-data-automation');
const { HealthMonitor } = require('./health-monitor');
const { TestResultsCollector } = require('../utils/test-results-collector');
const { TestQualityMonitor } = require('../utils/test-quality-monitor');

class CIIntegration {
  constructor(options = {}) {
    this.environment = options.environment || process.env.TEST_ENV || 'ci';
    this.verbose = options.verbose || false;
    this.skipSetup = options.skipSetup || false;
    this.skipCleanup = options.skipCleanup || false;
    this.testSuite = options.testSuite || 'all';
    this.browsers = options.browsers || ['chromium', 'firefox', 'webkit'];
    this.parallel = options.parallel !== false;
    this.retries = options.retries || 2;
    
    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      success: false,
      stages: {},
      artifacts: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔄',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
      stage: '📋'
    }[level] || '🔄';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runStage(stageName, stageFunction) {
    const startTime = Date.now();
    this.log(`Starting stage: ${stageName}`, 'stage');
    
    try {
      const result = await stageFunction();
      const duration = Date.now() - startTime;
      
      this.results.stages[stageName] = {
        success: true,
        duration,
        result
      };
      
      this.log(`Stage completed: ${stageName} (${this.formatDuration(duration)})`, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.stages[stageName] = {
        success: false,
        duration,
        error: error.message
      };
      
      this.log(`Stage failed: ${stageName} (${error.message})`, 'error');
      throw error;
    }
  }

  async execute() {
    this.log(`Starting CI integration workflow (${this.environment})...`);
    
    try {
      // Stage 1: Environment Setup
      if (!this.skipSetup) {
        await this.runStage('environment_setup', () => this.setupEnvironment());
      }

      // Stage 2: Health Check
      await this.runStage('health_check', () => this.performHealthCheck());

      // Stage 3: Test Data Initialization
      await this.runStage('data_initialization', () => this.initializeTestData());

      // Stage 4: Test Execution
      await this.runStage('test_execution', () => this.executeTests());

      // Stage 5: Results Collection
      await this.runStage('results_collection', () => this.collectResults());

      // Stage 6: Quality Analysis
      await this.runStage('quality_analysis', () => this.analyzeQuality());

      // Stage 7: Report Generation
      await this.runStage('report_generation', () => this.generateReports());

      // Stage 8: Cleanup
      if (!this.skipCleanup) {
        await this.runStage('cleanup', () => this.cleanup());
      }

      this.results.success = true;
      this.log('CI workflow completed successfully', 'success');
      
    } catch (error) {
      this.results.success = false;
      this.log(`CI workflow failed: ${error.message}`, 'error');
      
      // Attempt cleanup even on failure
      if (!this.skipCleanup) {
        try {
          await this.cleanup();
        } catch (cleanupError) {
          this.log(`Cleanup failed: ${cleanupError.message}`, 'warning');
        }
      }
      
      throw error;
    } finally {
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      // Save workflow results
      await this.saveWorkflowResults();
    }

    return this.results;
  }

  async setupEnvironment() {
    this.log('Setting up test environment...');
    
    const envManager = new TestEnvironmentManager({
      environment: this.environment,
      verbose: this.verbose
    });

    await envManager.setupEnvironment();
    return { environment: this.environment };
  }

  async performHealthCheck() {
    this.log('Performing health check...');
    
    const healthMonitor = new HealthMonitor({
      environment: this.environment,
      verbose: this.verbose
    });

    const healthResults = await healthMonitor.checkHealth();
    
    if (healthResults.overall !== 'healthy') {
      throw new Error(`Health check failed: ${healthResults.metrics.criticalFailures} critical services down`);
    }

    return healthResults;
  }

  async initializeTestData() {
    this.log('Initializing test data...');
    
    const dataAutomation = new TestDataAutomation({
      verbose: this.verbose
    });

    const dataResults = await dataAutomation.initializeTestData();
    return dataResults;
  }

  async executeTests() {
    this.log(`Executing ${this.testSuite} tests...`);
    
    const testResults = [];
    
    if (this.parallel && this.browsers.length > 1) {
      // Parallel execution across browsers
      const promises = this.browsers.map(browser => 
        this.runTestsForBrowser(browser)
      );
      
      const results = await Promise.allSettled(promises);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const browser = this.browsers[i];
        
        if (result.status === 'fulfilled') {
          testResults.push({ browser, ...result.value });
        } else {
          testResults.push({ 
            browser, 
            success: false, 
            error: result.reason.message 
          });
        }
      }
    } else {
      // Sequential execution
      for (const browser of this.browsers) {
        try {
          const result = await this.runTestsForBrowser(browser);
          testResults.push({ browser, ...result });
        } catch (error) {
          testResults.push({ 
            browser, 
            success: false, 
            error: error.message 
          });
        }
      }
    }

    // Check if any tests failed
    const failedBrowsers = testResults.filter(r => !r.success);
    if (failedBrowsers.length > 0) {
      throw new Error(`Tests failed for browsers: ${failedBrowsers.map(r => r.browser).join(', ')}`);
    }

    return testResults;
  }

  async runTestsForBrowser(browser) {
    this.log(`Running tests for ${browser}...`);
    
    const command = this.buildTestCommand(browser);
    
    try {
      const output = execSync(command, {
        cwd: path.join(__dirname, '../../..'),
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      return {
        success: true,
        browser,
        output: this.verbose ? null : output
      };
    } catch (error) {
      return {
        success: false,
        browser,
        error: error.message,
        output: error.stdout || error.stderr
      };
    }
  }

  buildTestCommand(browser) {
    let command = `npx playwright test --project=${browser}`;
    
    // Add test suite filter
    switch (this.testSuite) {
      case 'smoke':
        command += ' --grep="@smoke"';
        break;
      case 'regression':
        command += ' --grep="@regression"';
        break;
      case 'performance':
        command += ' specs/performance/';
        break;
      case 'visual':
        command += ' specs/visual/';
        break;
      case 'all':
      default:
        // Run all tests
        break;
    }

    // Add retries
    if (this.retries > 0) {
      command += ` --retries=${this.retries}`;
    }

    // Add reporters
    command += ' --reporter=html,json';

    return command;
  }

  async collectResults() {
    this.log('Collecting test results...');
    
    const sourceDirs = [
      path.join(__dirname, '../../playwright-report'),
      path.join(__dirname, '../../test-results')
    ];

    const collector = new TestResultsCollector({
      verbose: this.verbose,
      outputDir: path.join(__dirname, '../../ci-results')
    });

    const results = await collector.collectResults(sourceDirs);
    
    // Store artifacts paths
    this.results.artifacts.push(collector.outputDir);
    
    return results;
  }

  async analyzeQuality() {
    this.log('Analyzing test quality...');
    
    const resultsFile = path.join(__dirname, '../../ci-results/test-results.json');
    
    if (!fs.existsSync(resultsFile)) {
      this.log('No results file found for quality analysis', 'warning');
      return { skipped: true };
    }

    const qualityMonitor = new TestQualityMonitor({
      verbose: this.verbose,
      dataDir: path.join(__dirname, '../../quality-data')
    });

    const qualityMetrics = await qualityMonitor.analyzeTestResults(resultsFile);
    
    // Generate quality report
    await qualityMonitor.generateQualityReport();
    
    return qualityMetrics;
  }

  async generateReports() {
    this.log('Generating final reports...');
    
    const reportsDir = path.join(__dirname, '../../ci-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate workflow summary
    const workflowSummary = {
      workflow: 'CI Integration',
      timestamp: this.results.startTime.toISOString(),
      duration: this.results.duration,
      success: this.results.success,
      environment: this.environment,
      testSuite: this.testSuite,
      browsers: this.browsers,
      stages: Object.keys(this.results.stages).map(stageName => ({
        name: stageName,
        success: this.results.stages[stageName].success,
        duration: this.results.stages[stageName].duration,
        error: this.results.stages[stageName].error
      })),
      artifacts: this.results.artifacts
    };

    const summaryFile = path.join(reportsDir, 'workflow-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(workflowSummary, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(workflowSummary);
    const markdownFile = path.join(reportsDir, 'workflow-report.md');
    fs.writeFileSync(markdownFile, markdownReport);

    this.results.artifacts.push(reportsDir);
    
    return {
      summaryFile,
      markdownFile,
      reportsDir
    };
  }

  generateMarkdownReport(summary) {
    const statusIcon = summary.success ? '✅' : '❌';
    const durationStr = this.formatDuration(summary.duration);
    
    return `# CI Workflow Report

${statusIcon} **Status:** ${summary.success ? 'SUCCESS' : 'FAILED'}  
⏱️ **Duration:** ${durationStr}  
🌍 **Environment:** ${summary.environment}  
🧪 **Test Suite:** ${summary.testSuite}  
🌐 **Browsers:** ${summary.browsers.join(', ')}  
📅 **Timestamp:** ${new Date(summary.timestamp).toLocaleString()}

## Stage Results

| Stage | Status | Duration |
|-------|--------|----------|
${summary.stages.map(stage => {
  const stageIcon = stage.success ? '✅' : '❌';
  const stageDuration = this.formatDuration(stage.duration);
  return `| ${stage.name} | ${stageIcon} | ${stageDuration} |`;
}).join('\n')}

## Failed Stages

${summary.stages.filter(s => !s.success).map(stage => 
  `### ${stage.name}\n\n**Error:** ${stage.error}\n`
).join('\n') || 'No failed stages'}

## Artifacts

${summary.artifacts.map(artifact => `- \`${artifact}\``).join('\n')}

---
*Generated by CI Integration Script*
`;
  }

  async cleanup() {
    this.log('Cleaning up...');
    
    try {
      // Clean up test data
      const dataAutomation = new TestDataAutomation({
        verbose: this.verbose
      });
      await dataAutomation.connect();
      await dataAutomation.clearTestData();
      await dataAutomation.disconnect();
      
      // Clean up environment
      const envManager = new TestEnvironmentManager({
        environment: this.environment,
        verbose: this.verbose
      });
      await envManager.cleanup();
      
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'warning');
    }
  }

  async saveWorkflowResults() {
    const resultsFile = path.join(__dirname, '../../ci-workflow-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    this.log(`Workflow results saved to ${resultsFile}`, 'debug');
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
  
  const options = {
    environment: process.env.TEST_ENV || 'ci',
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipSetup: args.includes('--skip-setup'),
    skipCleanup: args.includes('--skip-cleanup'),
    testSuite: args.includes('--suite') ? args[args.indexOf('--suite') + 1] : 'all',
    browsers: args.includes('--browsers') ? 
      args[args.indexOf('--browsers') + 1].split(',') : 
      ['chromium', 'firefox', 'webkit'],
    parallel: !args.includes('--sequential'),
    retries: args.includes('--retries') ? 
      parseInt(args[args.indexOf('--retries') + 1]) : 2
  };

  const ci = new CIIntegration(options);

  try {
    const results = await ci.execute();
    
    console.log('\n' + '='.repeat(60));
    console.log('CI WORKFLOW SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${results.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Duration: ${ci.formatDuration(results.duration)}`);
    console.log(`Stages: ${Object.keys(results.stages).length}`);
    console.log(`Artifacts: ${results.artifacts.length}`);
    console.log('='.repeat(60));
    
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ CI workflow failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CIIntegration };