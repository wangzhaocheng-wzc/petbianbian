#!/usr/bin/env node

/**
 * 多浏览器兼容性测试运行器
 * 用于运行跨浏览器兼容性测试套件
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 支持的浏览器配置
const browsers = [
  { name: 'chromium', displayName: 'Chrome/Chromium', project: 'chromium' },
  { name: 'firefox', displayName: 'Firefox', project: 'firefox' },
  { name: 'webkit', displayName: 'Safari/WebKit', project: 'webkit' }
];

// 测试套件配置
const testSuites = [
  {
    name: 'multi-browser-compatibility',
    file: 'specs/compatibility/multi-browser-compatibility.spec.ts',
    description: '多浏览器基础兼容性测试'
  },
  {
    name: 'browser-specific-features',
    file: 'specs/compatibility/browser-specific-features.spec.ts',
    description: '浏览器特定功能测试'
  },
  {
    name: 'browser-version-matrix',
    file: 'specs/compatibility/browser-version-matrix.spec.ts',
    description: '浏览器版本兼容性测试'
  }
];

function printHeader() {
  colorLog('cyan', '='.repeat(80));
  colorLog('cyan', '                    多浏览器兼容性测试套件');
  colorLog('cyan', '='.repeat(80));
  console.log();
}

function printBrowserInfo() {
  colorLog('blue', '支持的浏览器:');
  browsers.forEach(browser => {
    colorLog('yellow', `  • ${browser.displayName} (${browser.project})`);
  });
  console.log();
}

function printTestSuites() {
  colorLog('blue', '测试套件:');
  testSuites.forEach((suite, index) => {
    colorLog('yellow', `  ${index + 1}. ${suite.description}`);
    colorLog('reset', `     文件: ${suite.file}`);
  });
  console.log();
}

function runCommand(command, description) {
  try {
    colorLog('blue', `执行: ${description}`);
    colorLog('reset', `命令: ${command}`);
    console.log();
    
    execSync(command, { 
      stdio: 'inherit', 
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    colorLog('green', `✓ ${description} 完成`);
    console.log();
    return true;
  } catch (error) {
    colorLog('red', `✗ ${description} 失败`);
    colorLog('red', `错误: ${error.message}`);
    console.log();
    return false;
  }
}

function runSingleBrowserTest(browser, testFile = null) {
  const testPath = testFile || 'specs/compatibility';
  const command = `npx playwright test ${testPath} --project=${browser.project} --reporter=html`;
  const description = `${browser.displayName} - ${testFile ? path.basename(testFile) : '所有兼容性测试'}`;
  
  return runCommand(command, description);
}

function runAllBrowsersTest(testFile = null) {
  const testPath = testFile || 'specs/compatibility';
  const command = `npx playwright test ${testPath} --reporter=html`;
  const description = `所有浏览器 - ${testFile ? path.basename(testFile) : '所有兼容性测试'}`;
  
  return runCommand(command, description);
}

function runCompatibilityMatrix() {
  colorLog('magenta', '运行完整兼容性测试矩阵...');
  console.log();
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };
  
  // 为每个浏览器运行每个测试套件
  for (const browser of browsers) {
    colorLog('cyan', `测试浏览器: ${browser.displayName}`);
    console.log('-'.repeat(50));
    
    for (const suite of testSuites) {
      results.total++;
      const success = runSingleBrowserTest(browser, suite.file);
      
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
      
      results.details.push({
        browser: browser.displayName,
        suite: suite.name,
        success
      });
    }
    
    console.log();
  }
  
  return results;
}

function printResults(results) {
  colorLog('cyan', '='.repeat(80));
  colorLog('cyan', '                        测试结果汇总');
  colorLog('cyan', '='.repeat(80));
  console.log();
  
  colorLog('blue', `总测试数: ${results.total}`);
  colorLog('green', `通过: ${results.passed}`);
  colorLog('red', `失败: ${results.failed}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  colorLog('yellow', `成功率: ${successRate}%`);
  console.log();
  
  // 详细结果
  colorLog('blue', '详细结果:');
  results.details.forEach(detail => {
    const status = detail.success ? '✓' : '✗';
    const color = detail.success ? 'green' : 'red';
    colorLog(color, `  ${status} ${detail.browser} - ${detail.suite}`);
  });
  console.log();
  
  // 失败的测试
  const failures = results.details.filter(d => !d.success);
  if (failures.length > 0) {
    colorLog('red', '失败的测试:');
    failures.forEach(failure => {
      colorLog('red', `  • ${failure.browser} - ${failure.suite}`);
    });
    console.log();
  }
}

function generateCompatibilityReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: ((results.passed / results.total) * 100).toFixed(1)
    },
    browsers: browsers.map(browser => ({
      name: browser.displayName,
      project: browser.project,
      tests: results.details.filter(d => d.browser === browser.displayName)
    })),
    testSuites: testSuites.map(suite => ({
      name: suite.name,
      description: suite.description,
      results: results.details.filter(d => d.suite === suite.name)
    }))
  };
  
  const reportPath = path.join(__dirname, 'reports', 'compatibility-report.json');
  
  // 确保reports目录存在
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  colorLog('green', `兼容性报告已保存: ${reportPath}`);
}

function showUsage() {
  console.log();
  colorLog('yellow', '用法:');
  colorLog('reset', '  node run-multi-browser-tests.cjs [选项]');
  console.log();
  colorLog('yellow', '选项:');
  colorLog('reset', '  --browser <name>     运行指定浏览器的测试 (chromium|firefox|webkit)');
  colorLog('reset', '  --suite <name>       运行指定测试套件');
  colorLog('reset', '  --matrix             运行完整兼容性测试矩阵');
  colorLog('reset', '  --all                运行所有浏览器的所有测试');
  colorLog('reset', '  --help               显示帮助信息');
  console.log();
  colorLog('yellow', '示例:');
  colorLog('reset', '  node run-multi-browser-tests.cjs --browser chromium');
  colorLog('reset', '  node run-multi-browser-tests.cjs --suite multi-browser-compatibility');
  colorLog('reset', '  node run-multi-browser-tests.cjs --matrix');
  colorLog('reset', '  node run-multi-browser-tests.cjs --all');
  console.log();
}

function main() {
  const args = process.argv.slice(2);
  
  printHeader();
  
  if (args.includes('--help') || args.length === 0) {
    printBrowserInfo();
    printTestSuites();
    showUsage();
    return;
  }
  
  let results = null;
  
  if (args.includes('--matrix')) {
    results = runCompatibilityMatrix();
  } else if (args.includes('--all')) {
    colorLog('magenta', '运行所有浏览器的所有兼容性测试...');
    console.log();
    const success = runAllBrowsersTest();
    results = {
      total: 1,
      passed: success ? 1 : 0,
      failed: success ? 0 : 1,
      details: [{ browser: 'All', suite: 'All', success }]
    };
  } else if (args.includes('--browser')) {
    const browserIndex = args.indexOf('--browser');
    const browserName = args[browserIndex + 1];
    const browser = browsers.find(b => b.name === browserName || b.project === browserName);
    
    if (!browser) {
      colorLog('red', `错误: 不支持的浏览器 "${browserName}"`);
      colorLog('yellow', '支持的浏览器: ' + browsers.map(b => b.name).join(', '));
      return;
    }
    
    colorLog('magenta', `运行 ${browser.displayName} 兼容性测试...`);
    console.log();
    const success = runSingleBrowserTest(browser);
    results = {
      total: 1,
      passed: success ? 1 : 0,
      failed: success ? 0 : 1,
      details: [{ browser: browser.displayName, suite: 'All', success }]
    };
  } else if (args.includes('--suite')) {
    const suiteIndex = args.indexOf('--suite');
    const suiteName = args[suiteIndex + 1];
    const suite = testSuites.find(s => s.name === suiteName);
    
    if (!suite) {
      colorLog('red', `错误: 不支持的测试套件 "${suiteName}"`);
      colorLog('yellow', '支持的测试套件: ' + testSuites.map(s => s.name).join(', '));
      return;
    }
    
    colorLog('magenta', `运行测试套件: ${suite.description}`);
    console.log();
    const success = runAllBrowsersTest(suite.file);
    results = {
      total: 1,
      passed: success ? 1 : 0,
      failed: success ? 0 : 1,
      details: [{ browser: 'All', suite: suite.name, success }]
    };
  }
  
  if (results) {
    printResults(results);
    generateCompatibilityReport(results);
    
    // 如果有失败的测试，退出码为1
    if (results.failed > 0) {
      process.exit(1);
    }
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runSingleBrowserTest,
  runAllBrowsersTest,
  runCompatibilityMatrix,
  browsers,
  testSuites
};