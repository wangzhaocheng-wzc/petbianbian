const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始运行负载和压力测试...\n');

// 测试配置
const testConfigs = [
  {
    name: '轻负载测试',
    workers: 1,
    timeout: 120000, // 2分钟
    env: {
      LOAD_TEST_USERS: '3',
      LOAD_TEST_DURATION: '30000', // 30秒
      LOAD_TEST_RAMP_UP: '5000'    // 5秒
    }
  },
  {
    name: '中等负载测试',
    workers: 2,
    timeout: 180000, // 3分钟
    env: {
      LOAD_TEST_USERS: '5',
      LOAD_TEST_DURATION: '60000', // 1分钟
      LOAD_TEST_RAMP_UP: '10000'   // 10秒
    }
  },
  {
    name: '高负载测试',
    workers: 2,
    timeout: 300000, // 5分钟
    env: {
      LOAD_TEST_USERS: '8',
      LOAD_TEST_DURATION: '90000', // 1.5分钟
      LOAD_TEST_RAMP_UP: '15000'   // 15秒
    }
  }
];

async function runTests() {
  let allTestsPassed = true;
  const results = [];

  for (const config of testConfigs) {
    console.log(`\n📊 运行 ${config.name}...`);
    console.log(`   - 并发用户: ${config.env.LOAD_TEST_USERS}`);
    console.log(`   - 测试时长: ${parseInt(config.env.LOAD_TEST_DURATION) / 1000}秒`);
    console.log(`   - 启动时间: ${parseInt(config.env.LOAD_TEST_RAMP_UP) / 1000}秒`);

    try {
      const startTime = Date.now();
      
      // 设置环境变量
      const env = { ...process.env, ...config.env };
      
      // 运行测试
      const command = `npx playwright test frontend/e2e/specs/performance/load-stress-testing.spec.ts --workers=${config.workers} --timeout=${config.timeout}`;
      
      console.log(`\n执行命令: ${command}`);
      
      execSync(command, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: env,
        timeout: config.timeout
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`✅ ${config.name} 完成 (耗时: ${duration.toFixed(2)}秒)`);
      
      results.push({
        name: config.name,
        status: 'PASSED',
        duration: duration,
        config: config.env
      });

    } catch (error) {
      console.error(`❌ ${config.name} 失败:`);
      console.error(error.message);
      
      allTestsPassed = false;
      results.push({
        name: config.name,
        status: 'FAILED',
        error: error.message,
        config: config.env
      });
    }
  }

  // 生成测试报告
  console.log('\n' + '='.repeat(60));
  console.log('📋 负载和压力测试报告');
  console.log('='.repeat(60));

  results.forEach(result => {
    console.log(`\n${result.name}:`);
    console.log(`  状态: ${result.status}`);
    if (result.duration) {
      console.log(`  耗时: ${result.duration.toFixed(2)}秒`);
    }
    if (result.error) {
      console.log(`  错误: ${result.error}`);
    }
    console.log(`  配置: 用户=${result.config.LOAD_TEST_USERS}, 时长=${parseInt(result.config.LOAD_TEST_DURATION)/1000}s`);
  });

  const passedTests = results.filter(r => r.status === 'PASSED').length;
  const totalTests = results.length;

  console.log(`\n总结: ${passedTests}/${totalTests} 测试通过`);

  if (allTestsPassed) {
    console.log('\n🎉 所有负载和压力测试都通过了！');
    
    // 生成性能建议
    console.log('\n💡 性能优化建议:');
    console.log('- 监控系统资源使用情况，确保在高负载下保持稳定');
    console.log('- 考虑实施缓存策略以提高响应速度');
    console.log('- 定期进行负载测试以识别性能回归');
    console.log('- 考虑使用负载均衡器分散请求压力');
    
  } else {
    console.log('\n⚠️  部分测试失败，请检查系统性能和稳定性');
    process.exit(1);
  }
}

// 检查前置条件
function checkPrerequisites() {
  console.log('🔍 检查测试前置条件...');
  
  try {
    // 检查测试图片文件
    const fs = require('fs');
    const testImagePath = 'frontend/e2e/fixtures/images/test-poop.jpg';
    
    if (!fs.existsSync(testImagePath)) {
      console.log(`⚠️  测试图片不存在: ${testImagePath}`);
      console.log('创建测试图片目录和文件...');
      
      const imagesDir = path.dirname(testImagePath);
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      // 创建一个简单的测试图片文件（空文件用于测试）
      fs.writeFileSync(testImagePath, Buffer.alloc(1024)); // 1KB空文件
      console.log('✅ 测试图片文件已创建');
    }
    
    console.log('✅ 前置条件检查完成');
    return true;
  } catch (error) {
    console.error('❌ 前置条件检查失败:', error.message);
    return false;
  }
}

// 主执行流程
async function main() {
  try {
    if (!checkPrerequisites()) {
      process.exit(1);
    }
    
    await runTests();
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

main();