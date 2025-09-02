#!/usr/bin/env node

/**
 * 服务器错误处理测试运行器
 * 专门用于运行服务器错误处理相关的测试
 */

const { execSync } = require('child_process');
const path = require('path');

// 测试配置
const config = {
  testFiles: [
    'frontend/e2e/specs/error-handling/server-error-handling.spec.ts'
  ],
  browsers: ['chromium', 'firefox'],
  workers: 2,
  timeout: 60000,
  retries: 2
};

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

function printHeader() {
  console.log('\n' + '='.repeat(80));
  colorLog('cyan', '                    服务器错误处理测试套件');
  console.log('='.repeat(80));
  colorLog('yellow', '测试范围：');
  console.log('  • 4xx 客户端错误处理 (400, 401, 403, 404, 409, 422, 429)');
  console.log('  • 5xx 服务器错误处理 (500, 502, 503, 504)');
  console.log('  • 错误页面显示和用户引导');
  console.log('  • 错误恢复和重试机制');
  console.log('  • 错误监控和分析');
  console.log('='.repeat(80) + '\n');
}

function printTestSummary() {
  colorLog('blue', '\n测试文件：');
  config.testFiles.forEach(file => {
    console.log(`  • ${file}`);
  });
  
  colorLog('blue', '\n浏览器：');
  config.browsers.forEach(browser => {
    console.log(`  • ${browser}`);
  });
  
  colorLog('blue', '\n配置：');
  console.log(`  • 并发数：${config.workers}`);
  console.log(`  • 超时时间：${config.timeout}ms`);
  console.log(`  • 重试次数：${config.retries}`);
  console.log('');
}

function runTests() {
  try {
    printHeader();
    printTestSummary();
    
    colorLog('green', '🚀 开始运行服务器错误处理测试...\n');
    
    // 构建测试命令
    const testCommand = [
      'npx playwright test',
      ...config.testFiles,
      `--workers=${config.workers}`,
      `--timeout=${config.timeout}`,
      `--retries=${config.retries}`,
      '--reporter=html,line',
      '--output=test-results/server-error-handling'
    ].join(' ');
    
    colorLog('yellow', `执行命令: ${testCommand}\n`);
    
    // 运行测试
    execSync(testCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    colorLog('green', '\n✅ 服务器错误处理测试完成！');
    
    // 显示报告位置
    colorLog('cyan', '\n📊 测试报告：');
    console.log('  • HTML报告: test-results/server-error-handling/index.html');
    console.log('  • 截图: test-results/server-error-handling/screenshots/');
    console.log('  • 错误上下文: test-results/error-contexts/');
    
  } catch (error) {
    colorLog('red', '\n❌ 测试执行失败！');
    console.error(error.message);
    
    colorLog('yellow', '\n🔍 故障排除建议：');
    console.log('  1. 检查后端服务是否正常运行');
    console.log('  2. 验证测试数据库连接');
    console.log('  3. 确认API模拟配置正确');
    console.log('  4. 查看详细错误日志');
    
    process.exit(1);
  }
}

// 处理命令行参数
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }
  
  if (args.includes('--debug')) {
    config.browsers = ['chromium']; // 调试模式只用一个浏览器
    config.workers = 1;
  }
  
  if (args.includes('--headed')) {
    process.env.HEADED = 'true';
  }
  
  if (args.includes('--chrome-only')) {
    config.browsers = ['chromium'];
  }
  
  if (args.includes('--firefox-only')) {
    config.browsers = ['firefox'];
  }
  
  const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
  if (timeoutArg) {
    config.timeout = parseInt(timeoutArg.split('=')[1]) || config.timeout;
  }
  
  const retriesArg = args.find(arg => arg.startsWith('--retries='));
  if (retriesArg) {
    config.retries = parseInt(retriesArg.split('=')[1]) || config.retries;
  }
}

function printUsage() {
  console.log(`
服务器错误处理测试运行器

用法:
  node run-server-error-tests.cjs [选项]

选项:
  --help, -h          显示帮助信息
  --debug             调试模式（单浏览器，单线程）
  --headed            显示浏览器窗口
  --chrome-only       仅在Chrome中运行
  --firefox-only      仅在Firefox中运行
  --timeout=<ms>      设置测试超时时间（默认：60000ms）
  --retries=<n>       设置重试次数（默认：2）

示例:
  node run-server-error-tests.cjs
  node run-server-error-tests.cjs --debug --headed
  node run-server-error-tests.cjs --chrome-only --timeout=30000
  node run-server-error-tests.cjs --retries=1
`);
}

// 主执行流程
function main() {
  try {
    parseArguments();
    runTests();
  } catch (error) {
    colorLog('red', `\n❌ 执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  config
};