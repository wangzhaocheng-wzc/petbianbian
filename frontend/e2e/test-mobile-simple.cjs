#!/usr/bin/env node

console.log('🔧 移动端兼容性测试');
console.log('运行简单的移动端测试...');

const { execSync } = require('child_process');

try {
  const command = 'npx playwright test specs/compatibility/mobile-compatibility.spec.ts --project="Mobile Chrome" --reporter=line --grep="Android Chrome - 基础功能验证"';
  console.log('执行命令:', command);
  
  execSync(command, { 
    stdio: 'inherit',
    cwd: require('path').join(process.cwd(), '..')
  });
  
  console.log('✅ 移动端测试完成!');
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}