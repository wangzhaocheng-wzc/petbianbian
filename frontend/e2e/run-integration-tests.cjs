const { execSync } = require('child_process');
const path = require('path');

/**
 * 数据流集成测试运行器
 * 运行所有数据流相关的集成测试
 */

console.log('🚀 开始运行数据流集成测试...\n');

const testFiles = [
  'specs/integration/end-to-end-dataflow.spec.ts',
  'specs/integration/api-integration.spec.ts', 
  'specs/integration/database-integration.spec.ts'
];

const runTests = () => {
  try {
    console.log('📋 测试文件列表:');
    testFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log('');

    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
    
    console.log('🔧 测试环境配置:');
    console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  API_BASE_URL: ${process.env.API_BASE_URL}`);
    console.log('');

    // 构建Playwright命令
    const playwrightCmd = [
      'npx playwright test',
      ...testFiles,
      '--config=playwright.config.ts',
      '--reporter=html',
      '--reporter=line',
      '--timeout=60000', // 60秒超时
      '--retries=2', // 重试2次
      '--workers=2' // 并行度为2
    ].join(' ');

    console.log('🎯 执行命令:', playwrightCmd);
    console.log('');

    // 运行测试
    execSync(playwrightCmd, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname),
      env: { ...process.env }
    });

    console.log('\n✅ 数据流集成测试完成!');
    console.log('📊 查看详细报告: npx playwright show-report');

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    
    console.log('\n🔍 故障排除建议:');
    console.log('1. 确保后端服务正在运行 (npm run dev:backend)');
    console.log('2. 确保数据库连接正常');
    console.log('3. 检查测试环境配置');
    console.log('4. 查看测试报告了解具体失败原因');
    console.log('5. 运行 npx playwright show-report 查看详细报告');
    
    process.exit(1);
  }
};

// 检查必要的依赖
const checkDependencies = () => {
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('✅ Playwright 已安装');
  } catch (error) {
    console.error('❌ Playwright 未安装，请运行: npm install @playwright/test');
    process.exit(1);
  }
};

// 主执行流程
const main = () => {
  console.log('🔍 检查依赖...');
  checkDependencies();
  console.log('');
  
  runTests();
};

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { runTests, testFiles };