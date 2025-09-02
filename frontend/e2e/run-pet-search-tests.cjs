const { execSync } = require('child_process');
const path = require('path');

/**
 * 宠物搜索和筛选测试运行器 - 任务5.2
 * 
 * 运行所有与宠物搜索、筛选、分页、历史记录和收藏功能相关的测试
 */

const testSuites = [
  {
    name: '基础搜索测试',
    file: 'specs/pets/pet-search-basic.spec.ts',
    description: '测试基本的宠物搜索功能'
  },
  {
    name: '高级搜索和筛选测试',
    file: 'specs/pets/pet-search-advanced.spec.ts',
    description: '测试多条件搜索、高级筛选、排序等功能'
  },
  {
    name: '搜索筛选测试',
    file: 'specs/pets/pet-search-filter.spec.ts',
    description: '测试搜索和筛选的组合使用'
  },
  {
    name: '分页功能测试',
    file: 'specs/pets/pet-search-pagination.spec.ts',
    description: '测试搜索结果的分页显示和导航'
  },
  {
    name: '搜索历史和收藏测试',
    file: 'specs/pets/pet-search-history-favorites.spec.ts',
    description: '测试搜索历史记录和收藏功能'
  }
];

const testOptions = {
  // 测试配置选项
  headed: process.argv.includes('--headed'),
  debug: process.argv.includes('--debug'),
  trace: process.argv.includes('--trace'),
  video: process.argv.includes('--video'),
  screenshot: process.argv.includes('--screenshot'),
  parallel: !process.argv.includes('--serial'),
  retries: process.argv.includes('--no-retry') ? 0 : 2,
  timeout: 60000,
  
  // 浏览器选择
  browser: (() => {
    if (process.argv.includes('--chrome')) return 'chromium';
    if (process.argv.includes('--firefox')) return 'firefox';
    if (process.argv.includes('--safari')) return 'webkit';
    return 'chromium'; // 默认使用 Chromium
  })(),
  
  // 测试环境
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiURL: process.env.API_BASE_URL || 'http://localhost:5000/api'
};

function printHeader() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 宠物搜索和筛选功能测试套件 - 任务5.2');
  console.log('='.repeat(80));
  console.log(`📊 测试环境: ${testOptions.baseURL}`);
  console.log(`🌐 API地址: ${testOptions.apiURL}`);
  console.log(`🔧 浏览器: ${testOptions.browser}`);
  console.log(`⚡ 并行执行: ${testOptions.parallel ? '是' : '否'}`);
  console.log(`🔄 重试次数: ${testOptions.retries}`);
  console.log('='.repeat(80) + '\n');
}

function printTestSuite(suite, index) {
  console.log(`\n📋 测试套件 ${index + 1}/${testSuites.length}: ${suite.name}`);
  console.log(`📝 描述: ${suite.description}`);
  console.log(`📁 文件: ${suite.file}`);
  console.log('-'.repeat(60));
}

function buildPlaywrightCommand(testFile) {
  const baseCommand = 'npx playwright test';
  const options = [];
  
  // 添加测试文件
  options.push(testFile);
  
  // 添加浏览器选项
  options.push(`--project=${testOptions.browser}`);
  
  // 添加其他选项
  if (testOptions.headed) options.push('--headed');
  if (testOptions.debug) options.push('--debug');
  if (testOptions.trace) options.push('--trace=on');
  if (testOptions.video) options.push('--video=on');
  if (testOptions.screenshot) options.push('--screenshot=on');
  if (!testOptions.parallel) options.push('--workers=1');
  
  // 添加重试选项
  options.push(`--retries=${testOptions.retries}`);
  
  // 添加超时选项
  options.push(`--timeout=${testOptions.timeout}`);
  
  // 添加报告选项
  options.push('--reporter=html,line');
  
  return `${baseCommand} ${options.join(' ')}`;
}

function runTestSuite(suite, index) {
  try {
    printTestSuite(suite, index);
    
    const command = buildPlaywrightCommand(suite.file);
    console.log(`🚀 执行命令: ${command}\n`);
    
    const startTime = Date.now();
    
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname),
      env: {
        ...process.env,
        BASE_URL: testOptions.baseURL,
        API_BASE_URL: testOptions.apiURL
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ 测试套件 "${suite.name}" 执行成功 (耗时: ${duration}ms)`);
    
    return { success: true, duration, error: null };
    
  } catch (error) {
    console.error(`\n❌ 测试套件 "${suite.name}" 执行失败:`);
    console.error(error.message);
    
    return { success: false, duration: 0, error: error.message };
  }
}

function runAllTests() {
  printHeader();
  
  const results = [];
  const startTime = Date.now();
  
  // 检查是否指定了特定的测试套件
  const specificTest = process.argv.find(arg => arg.startsWith('--test='));
  let suitesToRun = testSuites;
  
  if (specificTest) {
    const testName = specificTest.split('=')[1];
    suitesToRun = testSuites.filter(suite => 
      suite.name.toLowerCase().includes(testName.toLowerCase()) ||
      suite.file.includes(testName)
    );
    
    if (suitesToRun.length === 0) {
      console.error(`❌ 未找到匹配的测试套件: ${testName}`);
      console.log('\n可用的测试套件:');
      testSuites.forEach((suite, index) => {
        console.log(`  ${index + 1}. ${suite.name} (${suite.file})`);
      });
      process.exit(1);
    }
  }
  
  console.log(`📊 将运行 ${suitesToRun.length} 个测试套件\n`);
  
  // 运行测试套件
  for (let i = 0; i < suitesToRun.length; i++) {
    const suite = suitesToRun[i];
    const result = runTestSuite(suite, i);
    results.push({ suite: suite.name, ...result });
    
    // 如果测试失败且不是在CI环境中，询问是否继续
    if (!result.success && !process.env.CI && i < suitesToRun.length - 1) {
      console.log('\n⚠️  测试套件执行失败，是否继续执行剩余测试？');
      console.log('按 Ctrl+C 退出，或按 Enter 继续...');
      
      // 在实际环境中，这里可以添加用户输入处理
      // 为了自动化，这里直接继续
    }
  }
  
  // 打印总结报告
  printSummaryReport(results, Date.now() - startTime);
}

function printSummaryReport(results, totalDuration) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试执行总结报告');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ 成功: ${successful} 个测试套件`);
  console.log(`❌ 失败: ${failed} 个测试套件`);
  console.log(`⏱️  总耗时: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}秒)`);
  
  if (failed > 0) {
    console.log('\n❌ 失败的测试套件:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  • ${result.suite}: ${result.error}`);
    });
  }
  
  if (successful > 0) {
    console.log('\n✅ 成功的测试套件:');
    results.filter(r => r.success).forEach(result => {
      console.log(`  • ${result.suite} (${result.duration}ms)`);
    });
  }
  
  console.log('\n📈 详细测试报告:');
  console.log('  HTML报告: playwright-report/index.html');
  console.log('  测试结果: test-results/');
  
  if (testOptions.trace) {
    console.log('  执行轨迹: test-results/*/trace.zip');
  }
  
  if (testOptions.video) {
    console.log('  测试视频: test-results/*/video.webm');
  }
  
  console.log('='.repeat(80));
  
  // 设置退出码
  process.exit(failed > 0 ? 1 : 0);
}

function printUsage() {
  console.log('\n🔍 宠物搜索和筛选测试运行器使用说明\n');
  console.log('用法: node run-pet-search-tests.cjs [选项]\n');
  
  console.log('选项:');
  console.log('  --headed          在有头模式下运行测试（显示浏览器窗口）');
  console.log('  --debug           启用调试模式');
  console.log('  --trace           启用执行轨迹记录');
  console.log('  --video           录制测试视频');
  console.log('  --screenshot      在失败时截图');
  console.log('  --serial          串行执行测试（不并行）');
  console.log('  --no-retry        禁用测试重试');
  console.log('  --chrome          使用 Chrome 浏览器');
  console.log('  --firefox         使用 Firefox 浏览器');
  console.log('  --safari          使用 Safari 浏览器');
  console.log('  --test=<name>     只运行指定的测试套件');
  console.log('  --help            显示此帮助信息\n');
  
  console.log('环境变量:');
  console.log('  BASE_URL          前端应用地址 (默认: http://localhost:3000)');
  console.log('  API_BASE_URL      后端API地址 (默认: http://localhost:5000/api)\n');
  
  console.log('示例:');
  console.log('  node run-pet-search-tests.cjs');
  console.log('  node run-pet-search-tests.cjs --headed --debug');
  console.log('  node run-pet-search-tests.cjs --test=advanced');
  console.log('  node run-pet-search-tests.cjs --chrome --trace --video\n');
  
  console.log('可用的测试套件:');
  testSuites.forEach((suite, index) => {
    console.log(`  ${index + 1}. ${suite.name}`);
    console.log(`     ${suite.description}`);
    console.log(`     文件: ${suite.file}\n`);
  });
}

// 主程序入口
function main() {
  // 检查帮助选项
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }
  
  // 检查 Playwright 是否已安装
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Playwright 未安装或配置不正确');
    console.log('请运行以下命令安装 Playwright:');
    console.log('  npm install @playwright/test');
    console.log('  npx playwright install');
    process.exit(1);
  }
  
  // 检查测试文件是否存在
  const fs = require('fs');
  const missingFiles = testSuites.filter(suite => {
    const filePath = path.resolve(__dirname, suite.file);
    return !fs.existsSync(filePath);
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ 以下测试文件不存在:');
    missingFiles.forEach(suite => {
      console.error(`  • ${suite.file}`);
    });
    process.exit(1);
  }
  
  // 运行测试
  runAllTests();
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('\n❌ 未捕获的异常:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n\n⚠️  测试被用户中断');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  测试被系统终止');
  process.exit(143);
});

// 运行主程序
main();