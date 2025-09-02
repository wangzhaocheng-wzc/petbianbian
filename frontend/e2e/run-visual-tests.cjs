#!/usr/bin/env node

/**
 * 视觉回归测试运行器
 * 提供便捷的命令行接口来运行各种视觉测试
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

// 测试套件配置
const testSuites = {
  'full-page': {
    name: '全页面截图测试',
    file: 'specs/visual/full-page-screenshots.spec.ts',
    description: '测试所有主要页面的视觉一致性'
  },
  'components': {
    name: 'UI组件视觉测试',
    file: 'specs/visual/component-visual.spec.ts',
    description: '测试单个UI组件的视觉一致性'
  },
  'themes': {
    name: '主题和样式测试',
    file: 'specs/visual/theme-visual.spec.ts',
    description: '测试主题切换和样式变更'
  },
  'animations': {
    name: '动画效果测试',
    file: 'specs/visual/animation-visual.spec.ts',
    description: '测试动画和过渡效果'
  },
  'cross-platform': {
    name: '跨平台一致性测试',
    file: 'specs/visual/cross-platform-visual.spec.ts',
    description: '测试不同平台和浏览器的一致性'
  }
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: 'all',
    browsers: ['chromium'],
    updateBaselines: false,
    headed: false,
    debug: false,
    workers: 1,
    retries: 1,
    timeout: 30000,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--suite':
      case '-s':
        options.suite = args[++i];
        break;
      case '--browsers':
      case '-b':
        options.browsers = args[++i].split(',');
        break;
      case '--update-baselines':
      case '-u':
        options.updateBaselines = true;
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--workers':
      case '-w':
        options.workers = parseInt(args[++i]);
        break;
      case '--retries':
      case '-r':
        options.retries = parseInt(args[++i]);
        break;
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i]);
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!arg.startsWith('--')) {
          options.suite = arg;
        }
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  colorLog('cyan', '\n🎨 视觉回归测试运行器\n');
  
  console.log('用法:');
  console.log('  npm run test:visual [选项] [测试套件]\n');
  
  console.log('测试套件:');
  Object.entries(testSuites).forEach(([key, suite]) => {
    console.log(`  ${key.padEnd(15)} ${suite.description}`);
  });
  console.log(`  all${' '.repeat(12)} 运行所有视觉测试\n`);
  
  console.log('选项:');
  console.log('  -s, --suite <name>        指定测试套件 (默认: all)');
  console.log('  -b, --browsers <list>     指定浏览器，逗号分隔 (默认: chromium)');
  console.log('  -u, --update-baselines    更新基准图片');
  console.log('  --headed                  显示浏览器窗口');
  console.log('  --debug                   启用调试模式');
  console.log('  -w, --workers <num>       并行工作进程数 (默认: 1)');
  console.log('  -r, --retries <num>       重试次数 (默认: 1)');
  console.log('  -t, --timeout <ms>        超时时间 (默认: 30000)');
  console.log('  -h, --help                显示帮助信息\n');
  
  console.log('示例:');
  console.log('  npm run test:visual                    # 运行所有视觉测试');
  console.log('  npm run test:visual full-page          # 运行全页面截图测试');
  console.log('  npm run test:visual -b chromium,firefox # 在多个浏览器中运行');
  console.log('  npm run test:visual -u                 # 更新基准图片');
  console.log('  npm run test:visual --headed --debug   # 调试模式运行\n');
}

// 构建Playwright命令
function buildPlaywrightCommand(options) {
  const cmd = ['npx playwright test'];
  
  // 指定测试文件
  if (options.suite !== 'all') {
    if (testSuites[options.suite]) {
      cmd.push(testSuites[options.suite].file);
    } else {
      throw new Error(`未知的测试套件: ${options.suite}`);
    }
  } else {
    cmd.push('specs/visual/');
  }
  
  // 浏览器配置
  if (options.browsers.length === 1) {
    cmd.push(`--project=${options.browsers[0]}`);
  } else {
    // 多浏览器需要在配置中处理
    process.env.PWTEST_BROWSERS = options.browsers.join(',');
  }
  
  // 其他选项
  if (options.headed) cmd.push('--headed');
  if (options.debug) cmd.push('--debug');
  if (options.updateBaselines) cmd.push('--update-snapshots');
  
  cmd.push(`--workers=${options.workers}`);
  cmd.push(`--retries=${options.retries}`);
  cmd.push(`--timeout=${options.timeout}`);
  
  // 输出配置
  cmd.push('--reporter=html,line');
  
  return cmd.join(' ');
}

// 检查环境
function checkEnvironment() {
  // 检查是否在正确的目录
  if (!fs.existsSync('playwright.config.ts')) {
    colorLog('red', '❌ 错误: 请在frontend目录中运行此脚本');
    process.exit(1);
  }
  
  // 检查Playwright是否安装
  try {
    execSync('npx playwright --version', { stdio: 'ignore' });
  } catch (error) {
    colorLog('red', '❌ 错误: Playwright未安装，请运行 npm install');
    process.exit(1);
  }
}

// 运行前准备
function prepareTestRun(options) {
  colorLog('blue', '🔧 准备测试环境...');
  
  // 确保测试结果目录存在
  const dirs = [
    'test-results',
    'test-results/visual-baselines',
    'test-results/visual-actual',
    'test-results/visual-diff'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      colorLog('green', `✅ 创建目录: ${dir}`);
    }
  });
  
  // 设置环境变量
  process.env.PWTEST_VISUAL_MODE = 'true';
  if (options.updateBaselines) {
    process.env.PWTEST_UPDATE_BASELINES = 'true';
  }
}

// 运行测试后处理
function postTestRun(options) {
  colorLog('blue', '📊 生成测试报告...');
  
  // 检查是否有测试报告
  const reportPath = 'test-results/html-report/index.html';
  if (fs.existsSync(reportPath)) {
    colorLog('green', `✅ 测试报告已生成: ${reportPath}`);
  }
  
  // 检查基准更新
  if (options.updateBaselines) {
    colorLog('yellow', '⚠️  基准图片已更新，请检查并提交更改');
  }
  
  // 显示有用的命令
  colorLog('cyan', '\n📋 有用的命令:');
  console.log('  查看测试报告: npx playwright show-report');
  console.log('  更新基准图片: npm run baseline update');
  console.log('  清理测试文件: npm run baseline cleanup');
  console.log('  生成基准报告: npm run baseline report\n');
}

// 主函数
async function main() {
  try {
    const options = parseArgs();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    checkEnvironment();
    
    colorLog('cyan', '🎨 启动视觉回归测试\n');
    
    // 显示配置信息
    colorLog('blue', '📋 测试配置:');
    console.log(`  测试套件: ${options.suite}`);
    console.log(`  浏览器: ${options.browsers.join(', ')}`);
    console.log(`  工作进程: ${options.workers}`);
    console.log(`  重试次数: ${options.retries}`);
    console.log(`  更新基准: ${options.updateBaselines ? '是' : '否'}`);
    console.log(`  显示浏览器: ${options.headed ? '是' : '否'}\n`);
    
    prepareTestRun(options);
    
    // 构建并执行命令
    const command = buildPlaywrightCommand(options);
    colorLog('yellow', `🚀 执行命令: ${command}\n`);
    
    const startTime = Date.now();
    
    try {
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      colorLog('green', `\n✅ 测试完成! 耗时: ${duration}秒`);
      
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      colorLog('red', `\n❌ 测试失败! 耗时: ${duration}秒`);
      
      if (error.status) {
        process.exit(error.status);
      }
    }
    
    postTestRun(options);
    
  } catch (error) {
    colorLog('red', `❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  testSuites,
  parseArgs,
  buildPlaywrightCommand
};