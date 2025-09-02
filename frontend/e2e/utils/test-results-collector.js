#!/usr/bin/env node

/**
 * Test Results Collector
 * Collects and aggregates test results from multiple sources
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestResultsCollector {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(__dirname, '../test-results-aggregated');
    this.verbose = options.verbose || false;
    this.includeArtifacts = options.includeArtifacts !== false;
    
    this.results = {
      metadata: {
        collectedAt: new Date().toISOString(),
        environment: process.env.TEST_ENV || 'unknown',
        branch: this.getBranch(),
        commit: this.getCommit(),
        buildId: process.env.GITHUB_RUN_ID || process.env.BUILD_ID || 'local'
      },
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        success: false
      },
      suites: [],
      browsers: [],
      performance: {},
      visual: {},
      coverage: {},
      artifacts: []
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
      debug: '🔍'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  getBranch() {
    try {
      return process.env.GITHUB_REF_NAME || 
             execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getCommit() {
    try {
      return process.env.GITHUB_SHA || 
             execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  async collectResults(sourceDirs) {
    this.log('Starting test results collection...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    for (const sourceDir of sourceDirs) {
      if (fs.existsSync(sourceDir)) {
        await this.processSourceDirectory(sourceDir);
      } else {
        this.log(`Source directory not found: ${sourceDir}`, 'warning');
      }
    }

    // Calculate final summary
    this.calculateSummary();
    
    // Generate reports
    await this.generateReports();
    
    this.log(`Results collection completed. Output: ${this.outputDir}`, 'success');
    return this.results;
  }

  async processSourceDirectory(sourceDir) {
    this.log(`Processing source directory: ${sourceDir}`, 'debug');
    
    // Look for Playwright results
    const playwrightResults = path.join(sourceDir, 'results.json');
    if (fs.existsSync(playwrightResults)) {
      await this.processPlaywrightResults(playwrightResults);
    }

    // Look for JUnit XML results
    const junitResults = this.findFiles(sourceDir, '*.xml');
    for (const junitFile of junitResults) {
      await this.processJUnitResults(junitFile);
    }

    // Look for performance results
    const perfResults = path.join(sourceDir, 'performance-results.json');
    if (fs.existsSync(perfResults)) {
      await this.processPerformanceResults(perfResults);
    }

    // Look for visual test results
    const visualResults = path.join(sourceDir, 'visual-results.json');
    if (fs.existsSync(visualResults)) {
      await this.processVisualResults(visualResults);
    }

    // Look for coverage results
    const coverageResults = path.join(sourceDir, 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageResults)) {
      await this.processCoverageResults(coverageResults);
    }

    // Collect artifacts
    if (this.includeArtifacts) {
      await this.collectArtifacts(sourceDir);
    }
  }

  async processPlaywrightResults(resultsFile) {
    this.log(`Processing Playwright results: ${resultsFile}`, 'debug');
    
    try {
      const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      // Extract browser information from file path or data
      const browserName = this.extractBrowserName(resultsFile) || 'unknown';
      
      const browserResult = {
        name: browserName,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        suites: []
      };

      if (data.suites) {
        this.processSuites(data.suites, browserResult);
      }

      if (data.stats) {
        browserResult.total = data.stats.total || browserResult.total;
        browserResult.passed = data.stats.passed || browserResult.passed;
        browserResult.failed = data.stats.failed || browserResult.failed;
        browserResult.skipped = data.stats.skipped || browserResult.skipped;
        browserResult.duration = data.stats.duration || browserResult.duration;
      }

      this.results.browsers.push(browserResult);
      this.log(`Processed ${browserResult.total} tests for ${browserName}`, 'debug');
    } catch (error) {
      this.log(`Error processing Playwright results: ${error.message}`, 'error');
    }
  }

  processSuites(suites, browserResult) {
    for (const suite of suites) {
      const suiteResult = {
        title: suite.title,
        file: suite.file,
        tests: [],
        duration: 0
      };

      if (suite.specs) {
        for (const spec of suite.specs) {
          if (spec.tests) {
            for (const test of spec.tests) {
              const testResult = {
                title: test.title,
                status: this.getTestStatus(test),
                duration: this.getTestDuration(test),
                error: this.getTestError(test)
              };

              suiteResult.tests.push(testResult);
              suiteResult.duration += testResult.duration;

              // Update browser counts
              switch (testResult.status) {
                case 'passed':
                  browserResult.passed++;
                  break;
                case 'failed':
                  browserResult.failed++;
                  break;
                case 'skipped':
                  browserResult.skipped++;
                  break;
              }
              browserResult.total++;
            }
          }
        }
      }

      if (suite.suites) {
        this.processSuites(suite.suites, browserResult);
      }

      browserResult.suites.push(suiteResult);
      browserResult.duration += suiteResult.duration;
    }
  }

  getTestStatus(test) {
    if (test.results && test.results.length > 0) {
      const lastResult = test.results[test.results.length - 1];
      return lastResult.status || 'unknown';
    }
    return 'unknown';
  }

  getTestDuration(test) {
    if (test.results && test.results.length > 0) {
      return test.results.reduce((sum, result) => sum + (result.duration || 0), 0);
    }
    return 0;
  }

  getTestError(test) {
    if (test.results && test.results.length > 0) {
      const failedResult = test.results.find(result => result.status === 'failed');
      if (failedResult && failedResult.error) {
        return {
          message: failedResult.error.message,
          stack: failedResult.error.stack
        };
      }
    }
    return null;
  }

  async processJUnitResults(junitFile) {
    this.log(`Processing JUnit results: ${junitFile}`, 'debug');
    
    try {
      const xml = fs.readFileSync(junitFile, 'utf8');
      // Simple XML parsing for JUnit format
      // In a real implementation, you'd use a proper XML parser
      const testcaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*>/g;
      const failureRegex = /<failure[^>]*>(.*?)<\/failure>/gs;
      
      let match;
      const tests = [];
      
      while ((match = testcaseRegex.exec(xml)) !== null) {
        const testName = match[1];
        const duration = parseFloat(match[2]) * 1000; // Convert to ms
        
        tests.push({
          name: testName,
          duration,
          status: xml.includes(`<failure`) ? 'failed' : 'passed'
        });
      }

      this.results.suites.push({
        name: path.basename(junitFile, '.xml'),
        source: 'junit',
        tests
      });
    } catch (error) {
      this.log(`Error processing JUnit results: ${error.message}`, 'error');
    }
  }

  async processPerformanceResults(perfFile) {
    this.log(`Processing performance results: ${perfFile}`, 'debug');
    
    try {
      const data = JSON.parse(fs.readFileSync(perfFile, 'utf8'));
      this.results.performance = {
        ...this.results.performance,
        ...data
      };
    } catch (error) {
      this.log(`Error processing performance results: ${error.message}`, 'error');
    }
  }

  async processVisualResults(visualFile) {
    this.log(`Processing visual results: ${visualFile}`, 'debug');
    
    try {
      const data = JSON.parse(fs.readFileSync(visualFile, 'utf8'));
      this.results.visual = {
        ...this.results.visual,
        ...data
      };
    } catch (error) {
      this.log(`Error processing visual results: ${error.message}`, 'error');
    }
  }

  async processCoverageResults(coverageFile) {
    this.log(`Processing coverage results: ${coverageFile}`, 'debug');
    
    try {
      const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      this.results.coverage = data;
    } catch (error) {
      this.log(`Error processing coverage results: ${error.message}`, 'error');
    }
  }

  async collectArtifacts(sourceDir) {
    this.log(`Collecting artifacts from: ${sourceDir}`, 'debug');
    
    const artifactPatterns = [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.webm',
      '**/*.mp4',
      '**/trace.zip',
      '**/*.har'
    ];

    for (const pattern of artifactPatterns) {
      const files = this.findFiles(sourceDir, pattern);
      for (const file of files) {
        const relativePath = path.relative(sourceDir, file);
        const stats = fs.statSync(file);
        
        this.results.artifacts.push({
          path: relativePath,
          fullPath: file,
          size: stats.size,
          type: this.getArtifactType(file),
          createdAt: stats.mtime.toISOString()
        });
      }
    }
  }

  findFiles(dir, pattern) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...this.findFiles(fullPath, pattern));
        } else if (entry.isFile()) {
          if (this.matchesPattern(entry.name, pattern)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${dir}: ${error.message}`, 'warning');
    }
    
    return files;
  }

  matchesPattern(filename, pattern) {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filename);
  }

  getArtifactType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.png': 'screenshot',
      '.jpg': 'screenshot',
      '.jpeg': 'screenshot',
      '.gif': 'screenshot',
      '.webm': 'video',
      '.mp4': 'video',
      '.zip': 'trace',
      '.har': 'network'
    };
    
    return typeMap[ext] || 'unknown';
  }

  extractBrowserName(filePath) {
    const match = filePath.match(/(?:playwright-report-|results-)([^-/\\]+)/);
    return match ? match[1] : null;
  }

  calculateSummary() {
    this.log('Calculating summary statistics...', 'debug');
    
    // Aggregate from browsers
    for (const browser of this.results.browsers) {
      this.results.summary.totalTests += browser.total;
      this.results.summary.passed += browser.passed;
      this.results.summary.failed += browser.failed;
      this.results.summary.skipped += browser.skipped;
      this.results.summary.duration += browser.duration;
    }

    // Aggregate from other suites
    for (const suite of this.results.suites) {
      if (suite.tests) {
        this.results.summary.totalTests += suite.tests.length;
        this.results.summary.passed += suite.tests.filter(t => t.status === 'passed').length;
        this.results.summary.failed += suite.tests.filter(t => t.status === 'failed').length;
        this.results.summary.skipped += suite.tests.filter(t => t.status === 'skipped').length;
        this.results.summary.duration += suite.tests.reduce((sum, t) => sum + (t.duration || 0), 0);
      }
    }

    this.results.summary.success = this.results.summary.failed === 0;
    
    this.log(`Summary: ${this.results.summary.passed}/${this.results.summary.totalTests} passed`, 'debug');
  }

  async generateReports() {
    this.log('Generating reports...', 'debug');
    
    // Generate JSON report
    const jsonReport = path.join(this.outputDir, 'test-results.json');
    fs.writeFileSync(jsonReport, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    await this.generateHTMLReport();
    
    // Generate JUnit XML report
    await this.generateJUnitReport();
    
    // Generate summary report
    await this.generateSummaryReport();
    
    this.log('Reports generated successfully', 'success');
  }

  async generateHTMLReport() {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .browsers { margin-bottom: 30px; }
        .browser { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .browser h4 { margin: 0 0 10px 0; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #ffc107, #dc3545); }
        .artifacts { margin-top: 30px; }
        .artifact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .artifact { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .metadata dt { font-weight: bold; }
        .metadata dd { margin: 0 0 5px 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Results Report</h1>
            <p>Generated on ${new Date(this.results.metadata.collectedAt).toLocaleString()}</p>
        </div>

        <div class="metadata">
            <dl>
                <dt>Environment:</dt><dd>${this.results.metadata.environment}</dd>
                <dt>Branch:</dt><dd>${this.results.metadata.branch}</dd>
                <dt>Commit:</dt><dd>${this.results.metadata.commit.substring(0, 8)}</dd>
                <dt>Build ID:</dt><dd>${this.results.metadata.buildId}</dd>
            </dl>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${this.results.summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value success">${this.results.summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failure">${this.results.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Skipped</h3>
                <div class="value warning">${this.results.summary.skipped}</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${this.formatDuration(this.results.summary.duration)}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value ${this.results.summary.success ? 'success' : 'failure'}">
                    ${this.results.summary.totalTests > 0 ? 
                      Math.round((this.results.summary.passed / this.results.summary.totalTests) * 100) : 0}%
                </div>
            </div>
        </div>

        <div class="browsers">
            <h2>Browser Results</h2>
            ${this.results.browsers.map(browser => `
                <div class="browser">
                    <h4>${browser.name}</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${browser.total > 0 ? (browser.passed / browser.total) * 100 : 0}%"></div>
                    </div>
                    <p>${browser.passed}/${browser.total} passed (${browser.total > 0 ? Math.round((browser.passed / browser.total) * 100) : 0}%) - ${this.formatDuration(browser.duration)}</p>
                </div>
            `).join('')}
        </div>

        ${this.results.artifacts.length > 0 ? `
        <div class="artifacts">
            <h2>Artifacts (${this.results.artifacts.length})</h2>
            <div class="artifact-grid">
                ${this.results.artifacts.slice(0, 20).map(artifact => `
                    <div class="artifact">
                        <strong>${artifact.type}</strong><br>
                        ${artifact.path}<br>
                        <small>${this.formatBytes(artifact.size)} - ${new Date(artifact.createdAt).toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
            ${this.results.artifacts.length > 20 ? `<p>... and ${this.results.artifacts.length - 20} more artifacts</p>` : ''}
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    const htmlReport = path.join(this.outputDir, 'test-results.html');
    fs.writeFileSync(htmlReport, htmlTemplate);
  }

  async generateJUnitReport() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites tests="${this.results.summary.totalTests}" failures="${this.results.summary.failed}" time="${this.results.summary.duration / 1000}">\n`;

    for (const browser of this.results.browsers) {
      xml += `  <testsuite name="${browser.name}" tests="${browser.total}" failures="${browser.failed}" time="${browser.duration / 1000}">\n`;
      
      for (const suite of browser.suites) {
        for (const test of suite.tests) {
          xml += `    <testcase name="${test.title}" classname="${suite.title}" time="${test.duration / 1000}">`;
          
          if (test.status === 'failed' && test.error) {
            xml += `\n      <failure message="${this.escapeXml(test.error.message)}">${this.escapeXml(test.error.stack || '')}</failure>\n    `;
          } else if (test.status === 'skipped') {
            xml += `\n      <skipped/>\n    `;
          }
          
          xml += `</testcase>\n`;
        }
      }
      
      xml += `  </testsuite>\n`;
    }

    xml += '</testsuites>';

    const junitReport = path.join(this.outputDir, 'junit-results.xml');
    fs.writeFileSync(junitReport, xml);
  }

  async generateSummaryReport() {
    const summary = {
      timestamp: this.results.metadata.collectedAt,
      environment: this.results.metadata.environment,
      branch: this.results.metadata.branch,
      commit: this.results.metadata.commit,
      buildId: this.results.metadata.buildId,
      success: this.results.summary.success,
      total: this.results.summary.totalTests,
      passed: this.results.summary.passed,
      failed: this.results.summary.failed,
      skipped: this.results.summary.skipped,
      duration: this.results.summary.duration,
      successRate: this.results.summary.totalTests > 0 ? 
        Math.round((this.results.summary.passed / this.results.summary.totalTests) * 100) : 0,
      browsers: this.results.browsers.map(browser => ({
        name: browser.name,
        success: browser.failed === 0,
        passed: browser.passed,
        total: browser.total,
        duration: browser.duration
      })),
      failedTests: this.getFailedTests(),
      artifacts: this.results.artifacts.length
    };

    const summaryReport = path.join(this.outputDir, 'test-summary.json');
    fs.writeFileSync(summaryReport, JSON.stringify(summary, null, 2));
  }

  getFailedTests() {
    const failedTests = [];
    
    for (const browser of this.results.browsers) {
      for (const suite of browser.suites) {
        for (const test of suite.tests) {
          if (test.status === 'failed') {
            failedTests.push(`[${browser.name}] ${suite.title} > ${test.title}`);
          }
        }
      }
    }
    
    return failedTests;
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-results-collector.js <source-dir1> [source-dir2] ... [--verbose] [--output-dir <dir>]');
    process.exit(1);
  }

  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    outputDir: args.includes('--output-dir') ? args[args.indexOf('--output-dir') + 1] : undefined
  };

  const sourceDirs = args.filter(arg => 
    !arg.startsWith('--') && 
    arg !== options.outputDir
  );

  const collector = new TestResultsCollector(options);

  try {
    const results = await collector.collectResults(sourceDirs);
    console.log('✅ Test results collection completed');
    console.log(`📊 Summary: ${results.summary.passed}/${results.summary.totalTests} passed`);
    console.log(`📁 Output: ${collector.outputDir}`);
    
    process.exit(results.summary.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Collection failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TestResultsCollector };