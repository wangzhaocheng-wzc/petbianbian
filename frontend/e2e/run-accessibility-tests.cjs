#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 运行可访问性测试套件...\n');

const testFiles = [
  'specs/accessibility/keyboard-navigation.spec.ts',
  'specs/accessibility/screen-reader-compatibility.spec.ts', 
  'specs/accessibility/color-contrast-visual.spec.ts'
];

const runTests = async () => {
  try {
    console.log('📋 测试文件列表:');
    testFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log('');

    // 运行所有可访问性测试
    const testPattern = testFiles.join(' ');
    
    console.log('🚀 开始执行测试...\n');
    
    const command = `npx playwright test ${testPattern} --reporter=html --reporter=line`;
    
    console.log(`执行命令: ${command}\n`);
    
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log('\n✅ 可访问性测试完成!');
    console.log('📊 查看详细报告: npx playwright show-report');
    
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    
    console.log('\n🔧 故障排除建议:');
    console.log('1. 确保应用服务器正在运行 (npm run dev)');
    console.log('2. 检查测试数据库连接');
    console.log('3. 验证测试用户数据是否存在');
    console.log('4. 查看浏览器控制台错误');
    
    process.exit(1);
  }
};

// 检查是否传入了特定的测试文件参数
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log(`🎯 运行指定测试: ${args.join(', ')}\n`);
  
  try {
    const command = `npx playwright test ${args.join(' ')} --reporter=html --reporter=line`;
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log('\n✅ 指定测试完成!');
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    process.exit(1);
  }
} else {
  runTests();
}