#!/usr/bin/env node

/**
 * 宠物权限管理测试运行器
 * 专门用于运行宠物权限相关的测试用例
 */

const { execSync } = require('child_process');
const path = require('path');

// 测试配置
const testConfig = {
  // 测试文件路径
  testFiles: [
    'e2e/specs/pets/pet-permissions.spec.ts'
  ],
  
  // 浏览器配置
  browsers: ['chromium', 'firefox', 'webkit'],
  
  // 测试环境配置
  environments: {
    development: {
      baseURL: 'http://localhost:3000',
      apiURL: 'http://localhost:5000/api'
    },
    staging: {
      baseURL: 'https://staging.pet-health.com',
      apiURL: 'https://staging-api.pet-health.com/api'
    }
  },
  
  // 测试选项
  options: {
    headed: false,
    workers: 2,
    retries: 2,
    timeout: 60000,
    reporter: 'html'
  }
};

/**
 * 运行宠物权限测试
 */
async function runPetPermissionTests() {
  console.log('🔐 开始运行宠物权限管理测试...\n');
  
  try {
    // 检查环境变量
    const environment = process.env.TEST_ENV || 'development';
    const config = testConfig.environments[environment];
    
    if (!config) {
      throw new Error(`未知的测试环境: ${environment}`);
    }
    
    console.log(`📋 测试配置:`);
    console.log(`   环境: ${environment}`);
    console.log(`   基础URL: ${config.baseURL}`);
    console.log(`   API URL: ${config.apiURL}`);
    console.log(`   浏览器: ${testConfig.browsers.join(', ')}`);
    console.log(`   并发数: ${testConfig.options.workers}`);
    console.log(`   重试次数: ${testConfig.options.retries}\n`);
    
    // 构建Playwright命令
    const playwrightCmd = [
      'npx playwright test',
      testConfig.testFiles.map(file => file.replace('frontend/', '')).join(' '),
      `--config=playwright.config.ts`,
      `--project=${testConfig.browsers.join(',')}`,
      `--workers=${testConfig.options.workers}`,
      `--retries=${testConfig.options.retries}`,
      `--timeout=${testConfig.options.timeout}`,
      `--reporter=${testConfig.options.reporter}`,
      testConfig.options.headed ? '--headed' : '',
      process.env.DEBUG ? '--debug' : ''
    ].filter(Boolean).join(' ');
    
    // 设置环境变量
    const env = {
      ...process.env,
      BASE_URL: config.baseURL,
      API_BASE_URL: config.apiURL,
      NODE_ENV: 'test'
    };
    
    console.log('🚀 执行测试命令...');
    console.log(`   ${playwrightCmd}\n`);
    
    // 执行测试
    execSync(playwrightCmd, {
      stdio: 'inherit',
      env,
      cwd: process.cwd()
    });
    
    console.log('\n✅ 宠物权限管理测试完成!');
    
    // 显示测试报告信息
    if (testConfig.options.reporter === 'html') {
      console.log('\n📊 测试报告已生成:');
      console.log('   HTML报告: playwright-report/index.html');
      console.log('   运行以下命令查看报告:');
      console.log('   npx playwright show-report');
    }
    
  } catch (error) {
    console.error('\n❌ 测试执行失败:');
    console.error(error.message);
    
    if (error.stdout) {
      console.error('\n标准输出:');
      console.error(error.stdout.toString());
    }
    
    if (error.stderr) {
      console.error('\n错误输出:');
      console.error(error.stderr.toString());
    }
    
    process.exit(1);
  }
}

/**
 * 运行特定的测试套件
 */
async function runSpecificTestSuite(suiteName) {
  const testSuites = {
    'access': '宠物访问权限测试',
    'sharing': '宠物共享功能测试', 
    'multi-user': '多用户宠物管理权限测试',
    'privacy': '宠物数据隐私保护测试',
    'security': '权限边界测试'
  };
  
  if (!testSuites[suiteName]) {
    console.error(`❌ 未知的测试套件: ${suiteName}`);
    console.log('\n可用的测试套件:');
    Object.entries(testSuites).forEach(([key, name]) => {
      console.log(`   ${key}: ${name}`);
    });
    process.exit(1);
  }
  
  console.log(`🎯 运行测试套件: ${testSuites[suiteName]}\n`);
  
  try {
    const grepPattern = testSuites[suiteName];
    const playwrightCmd = [
      'npx playwright test',
      testConfig.testFiles.join(' '),
      `--config=playwright.config.ts`,
      `--grep="${grepPattern}"`,
      `--workers=${testConfig.options.workers}`,
      `--retries=${testConfig.options.retries}`,
      `--reporter=${testConfig.options.reporter}`
    ].join(' ');
    
    execSync(playwrightCmd, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    console.log(`\n✅ 测试套件 "${testSuites[suiteName]}" 完成!`);
    
  } catch (error) {
    console.error(`\n❌ 测试套件 "${testSuites[suiteName]}" 执行失败:`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 运行性能测试
 */
async function runPerformanceTests() {
  console.log('⚡ 开始运行宠物权限性能测试...\n');
  
  try {
    const playwrightCmd = [
      'npx playwright test',
      testConfig.testFiles.join(' '),
      `--config=playwright.config.ts`,
      `--grep="并发用户操作"`,
      `--workers=1`, // 性能测试使用单线程
      `--retries=0`,
      `--reporter=json`
    ].join(' ');
    
    execSync(playwrightCmd, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PERFORMANCE_TEST: 'true'
      }
    });
    
    console.log('\n✅ 性能测试完成!');
    
  } catch (error) {
    console.error('\n❌ 性能测试失败:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('🧹 清理测试数据...\n');
  
  try {
    // 运行清理脚本
    execSync('node e2e/utils/cleanup-test-data.cjs', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    console.log('✅ 测试数据清理完成!');
    
  } catch (error) {
    console.error('❌ 测试数据清理失败:');
    console.error(error.message);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🔐 宠物权限管理测试运行器

用法:
  node run-pet-permissions-tests.cjs [选项] [命令]

命令:
  run                运行所有宠物权限测试 (默认)
  suite <name>       运行特定测试套件
  performance        运行性能测试
  cleanup            清理测试数据
  help               显示帮助信息

测试套件:
  access             宠物访问权限测试
  sharing            宠物共享功能测试
  multi-user         多用户宠物管理权限测试
  privacy            宠物数据隐私保护测试
  security           权限边界测试

选项:
  --env <env>        设置测试环境 (development|staging)
  --headed           在有头模式下运行测试
  --debug            启用调试模式
  --workers <num>    设置并发工作进程数
  --retries <num>    设置重试次数

环境变量:
  TEST_ENV           测试环境 (development|staging)
  BASE_URL           前端基础URL
  API_BASE_URL       后端API基础URL
  DEBUG              启用调试模式

示例:
  # 运行所有测试
  node run-pet-permissions-tests.cjs

  # 运行访问权限测试
  node run-pet-permissions-tests.cjs suite access

  # 在staging环境运行测试
  node run-pet-permissions-tests.cjs --env staging

  # 有头模式运行测试
  node run-pet-permissions-tests.cjs --headed

  # 运行性能测试
  node run-pet-permissions-tests.cjs performance

  # 清理测试数据
  node run-pet-permissions-tests.cjs cleanup
`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  const commands = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++; // 跳过下一个参数
      } else {
        options[key] = true;
      }
    } else {
      commands.push(arg);
    }
  }
  
  return { options, commands };
}

// 主函数
async function main() {
  const { options, commands } = parseArgs();
  
  // 处理选项
  if (options.env) {
    process.env.TEST_ENV = options.env;
  }
  
  if (options.headed) {
    testConfig.options.headed = true;
  }
  
  if (options.debug) {
    process.env.DEBUG = 'true';
  }
  
  if (options.workers) {
    testConfig.options.workers = parseInt(options.workers);
  }
  
  if (options.retries) {
    testConfig.options.retries = parseInt(options.retries);
  }
  
  // 处理命令
  const command = commands[0] || 'run';
  
  switch (command) {
    case 'run':
      await runPetPermissionTests();
      break;
      
    case 'suite':
      const suiteName = commands[1];
      if (!suiteName) {
        console.error('❌ 请指定测试套件名称');
        showHelp();
        process.exit(1);
      }
      await runSpecificTestSuite(suiteName);
      break;
      
    case 'performance':
      await runPerformanceTests();
      break;
      
    case 'cleanup':
      await cleanupTestData();
      break;
      
    case 'help':
      showHelp();
      break;
      
    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的Promise拒绝:');
  console.error(error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:');
  console.error(error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 执行失败:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runPetPermissionTests,
  runSpecificTestSuite,
  runPerformanceTests,
  cleanupTestData
};