#!/usr/bin/env node

/**
 * 移动端兼容性测试运行器
 * 用于运行移动端和触摸交互测试套件
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

// 移动设备配置
const mobileDevices = {
  'ios-safari': {
    name: 'iOS Safari',
    project: 'Mobile Safari',
    description: 'iPhone 12 with Safari browser'
  },
  'android-chrome': {
    name: 'Android Chrome',
    project: 'Mobile Chrome',
    description: 'Pixel 5 with Chrome browser'
  },
  'tablet': {
    name: 'Tablet',
    project: 'Mobile Safari Tablet',
    description: 'iPad Pro simulation'
  }
};

// 测试套件配置
const testSuites = {
  'mobile-compatibility': {
    file: 'specs/compatibility/mobile-compatibility.spec.ts',
    description: '移动端兼容性测试'
  },
  'touch-gestures': {
    file: 'specs/compatibility/touch-gestures.spec.ts',
    description: '触摸手势和交互测试'
  },
  'mobile-specific-features': {
    file: 'specs/compatibility/mobile-specific-features.spec.ts',
    description: '移动端特定功能测试'
  },
  'mobile-performance': {
    file: 'specs/performance/mobile-performance.spec.ts',
    description: '移动端性能测试'
  }
};

function printHeader() {
  colorLog('cyan', '='.repeat(60));
  colorLog('cyan', '🔧 移动端兼容性测试运行器');
  colorLog('cyan', '='.repeat(60));
  console.log();
}

function printUsage() {
  colorLog('yellow', '使用方法:');
  console.log('  node run-mobile-compatibility-tests.cjs [选项]');
  console.log();
  colorLog('yellow', '选项:');
  console.log('  --device <device>     指定设备类型 (ios-safari, android-chrome, tablet, all)');
  console.log('  --suite <suite>       指定测试套件 (mobile-compatibility, touch-gestures, mobile-specific-features, mobile-performance, all)');
  console.log('  --headed              显示浏览器界面');
  console.log('  --debug               启用调试模式');
  console.log('  --workers <number>    并行工作进程数');
  console.log('  --help                显示帮助信息');
  console.log();
  colorLog('yellow', '示例:');
  console.log('  node run-mobile-compatibility-tests.cjs --device ios-safari --suite mobile-compatibility');
  console.log('  node run-mobile-compatibility-tests.cjs --device all --suite all --headed');
  console.log();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    device: 'all',
    suite: 'all',
    headed: false,
    debug: false,
    workers: 2,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--device':
        options.device = args[++i];
        break;
      case '--suite':
        options.suite = args[++i];
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--workers':
        options.workers = parseInt(args[++i]) || 2;
        break;
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

function validateOptions(options) {
  if (options.device !== 'all' && !mobileDevices[options.device]) {
    colorLog('red', `❌ 无效的设备类型: ${options.device}`);
    colorLog('yellow', `可用设备: ${Object.keys(mobileDevices).join(', ')}, all`);
    return false;
  }

  if (options.suite !== 'all' && !testSuites[options.suite]) {
    colorLog('red', `❌ 无效的测试套件: ${options.suite}`);
    colorLog('yellow', `可用套件: ${Object.keys(testSuites).join(', ')}, all`);
    return false;
  }

  return true;
}

function buildPlaywrightCommand(options) {
  let cmd = 'npx playwright test';
  
  // 添加测试文件
  if (options.suite === 'all') {
    cmd += ' specs/compatibility/mobile-compatibility.spec.ts specs/compatibility/touch-gestures.spec.ts specs/compatibility/mobile-specific-features.spec.ts specs/performance/mobile-performance.spec.ts';
  } else {
    cmd += ` ${testSuites[options.suite].file}`;
  }

  // 添加项目配置
  if (options.device !== 'all') {
    const device = mobileDevices[options.device];
    cmd += ` --project="${device.project}"`;
  } else {
    cmd += ' --project="Mobile Safari" --project="Mobile Chrome"';
  }

  // 添加其他选项
  if (options.headed) {
    cmd += ' --headed';
  }

  if (options.debug) {
    cmd += ' --debug';
  }

  cmd += ` --workers=${options.workers}`;
  cmd += ' --reporter=html,line';

  return cmd;
}

function runTests(options) {
  colorLog('blue', '🚀 开始运行移动端兼容性测试...');
  console.log();

  // 显示测试配置
  colorLog('yellow', '测试配置:');
  console.log(`  设备: ${options.device}`);
  console.log(`  套件: ${options.suite}`);
  console.log(`  显示界面: ${options.headed ? '是' : '否'}`);
  console.log(`  调试模式: ${options.debug ? '是' : '否'}`);
  console.log(`  工作进程: ${options.workers}`);
  console.log();

  const command = buildPlaywrightCommand(options);
  colorLog('cyan', `执行命令: ${command}`);
  console.log();

  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    colorLog('green', '✅ 移动端兼容性测试完成!');
    
    // 显示报告位置
    const reportPath = path.join(process.cwd(), 'playwright-report');
    if (fs.existsSync(reportPath)) {
      colorLog('cyan', `📊 测试报告: ${reportPath}/index.html`);
    }
    
  } catch (error) {
    colorLog('red', '❌ 测试执行失败!');
    console.error(error.message);
    process.exit(1);
  }
}

function printDeviceInfo() {
  colorLog('yellow', '支持的移动设备:');
  Object.entries(mobileDevices).forEach(([key, device]) => {
    console.log(`  ${key}: ${device.description}`);
  });
  console.log();
}

function printSuiteInfo() {
  colorLog('yellow', '可用的测试套件:');
  Object.entries(testSuites).forEach(([key, suite]) => {
    console.log(`  ${key}: ${suite.description}`);
  });
  console.log();
}

function main() {
  printHeader();
  
  const options = parseArgs();
  console.log('Parsed options:', options);
  
  if (options.help) {
    printUsage();
    printDeviceInfo();
    printSuiteInfo();
    return;
  }

  if (!validateOptions(options)) {
    process.exit(1);
  }

  runTests(options);
}

// 运行主函数
console.log('Script loaded, require.main === module:', require.main === module);
if (require.main === module) {
  console.log('Running main function...');
  main();
}