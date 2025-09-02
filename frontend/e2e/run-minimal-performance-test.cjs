#!/usr/bin/env node

/**
 * 最小化性能测试运行器
 * 用于验证性能测试框架是否正常工作
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始运行最小化性能测试...\n');

try {
  // 设置环境变量
  process.env.NODE_ENV = 'test';
  process.env.PWTEST_PERFORMANCE = 'true';
  
  const testCommand = [
    'npx playwright test',
    'e2e/specs/performance/interaction-performance-minimal.spec.ts',
    '--reporter=line',
    '--workers=1',
    '--timeout=30000',
    '--retries=0'
  ].join(' ');

  console.log('执行命令:', testCommand);
  console.log('工作目录:', path.resolve(__dirname, '..'));
  console.log('\n⚠️  注意: 请确保前端服务已经在运行');
  console.log('前端: http://localhost:5173 或 http://localhost:4173\n');

  execSync(testCommand, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: { 
      ...process.env,
      PWTEST_SKIP_WEBSERVER: 'true'
    }
  });

  console.log('\n✅ 最小化性能测试完成!');

} catch (error) {
  console.error('\n❌ 最小化性能测试失败:', error.message);
  console.log('\n🔧 请确保前端服务正在运行: npm run dev');
  process.exit(1);
}