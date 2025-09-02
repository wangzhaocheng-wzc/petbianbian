#!/usr/bin/env node

/**
 * Test Results Aggregation Utility
 * Aggregates Playwright test results from multiple browser runs
 */

const fs = require('fs');
const path = require('path');

function aggregateTestResults(artifactsDir) {
  console.log('🔄 Aggregating test results from:', artifactsDir);
  
  const summary = {
    success: true,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    browsers: [],
    failedTests: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Find all playwright report directories
    const reportDirs = fs.readdirSync(artifactsDir)
      .filter(dir => dir.startsWith('playwright-report-'))
      .map(dir => path.join(artifactsDir, dir));

    console.log(`📊 Found ${reportDirs.length} test report directories`);

    for (const reportDir of reportDirs) {
      try {
        const resultsFile = path.join(reportDir, 'results.json');
        if (!fs.existsSync(resultsFile)) {
          console.log(`⚠️  No results.json found in ${reportDir}`);
          continue;
        }

        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        const browserName = extractBrowserName(reportDir);
        
        const browserSummary = {
          name: browserName,
          total: results.stats?.total || 0,
          passed: results.stats?.passed || 0,
          failed: results.stats?.failed || 0,
          skipped: results.stats?.skipped || 0,
          duration: results.stats?.duration || 0,
          success: (results.stats?.failed || 0) === 0
        };

        summary.browsers.push(browserSummary);
        summary.total += browserSummary.total;
        summary.passed += browserSummary.passed;
        summary.failed += browserSummary.failed;
        summary.skipped += browserSummary.skipped;
        summary.duration += browserSummary.duration;

        if (!browserSummary.success) {
          summary.success = false;
        }

        // Collect failed test names
        if (results.suites) {
          collectFailedTests(results.suites, summary.failedTests, browserName);
        }

        console.log(`✅ Processed ${browserName}: ${browserSummary.passed}/${browserSummary.total} passed`);
      } catch (error) {
        console.error(`❌ Error processing ${reportDir}:`, error.message);
        summary.success = false;
      }
    }

    // Calculate average duration
    if (summary.browsers.length > 0) {
      summary.duration = Math.round(summary.duration / summary.browsers.length);
    }

    // Remove duplicate failed tests
    summary.failedTests = [...new Set(summary.failedTests)];

    // Write summary to file
    const summaryPath = path.join(process.cwd(), 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\n📋 Test Results Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Skipped: ${summary.skipped}`);
    console.log(`   Success: ${summary.success ? '✅' : '❌'}`);
    console.log(`   Duration: ${formatDuration(summary.duration)}`);

    if (summary.failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      summary.failedTests.slice(0, 10).forEach(test => {
        console.log(`   - ${test}`);
      });
      if (summary.failedTests.length > 10) {
        console.log(`   ... and ${summary.failedTests.length - 10} more`);
      }
    }

    console.log(`\n💾 Summary saved to: ${summaryPath}`);
    
    return summary;
  } catch (error) {
    console.error('❌ Error aggregating test results:', error);
    process.exit(1);
  }
}

function extractBrowserName(reportDir) {
  const match = reportDir.match(/playwright-report-([^-]+)/);
  return match ? match[1] : 'unknown';
}

function collectFailedTests(suites, failedTests, browserName) {
  for (const suite of suites) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            if (test.results && test.results.some(result => result.status === 'failed')) {
              failedTests.push(`[${browserName}] ${suite.title} > ${test.title}`);
            }
          }
        }
      }
    }
    
    if (suite.suites) {
      collectFailedTests(suite.suites, failedTests, browserName);
    }
  }
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Run if called directly
if (require.main === module) {
  const artifactsDir = process.argv[2];
  if (!artifactsDir) {
    console.error('Usage: node aggregate-test-results.js <artifacts-directory>');
    process.exit(1);
  }
  
  aggregateTestResults(artifactsDir);
}

module.exports = { aggregateTestResults };