#!/usr/bin/env node

/**
 * 帖子管理测试运行器
 * 专门运行社区帖子管理相关的测试用例
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 开始运行帖子管理测试...\n');

const testFiles = [
  'specs/community/post-management.spec.ts'
];

const playwrightConfig = path.join(__dirname, '..', 'playwright.config.ts');

const args = [
  'playwright',
  'test',
  '--config',
  playwrightConfig,
  '--reporter=html',
  '--reporter=line',
  ...testFiles
];

console.log('执行命令:', 'npx', args.join(' '));
console.log('测试文件:');
testFiles.forEach(file => console.log(`  - ${file}`));
console.log('');

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ 帖子管理测试完成！');
    console.log('📊 测试报告已生成到 playwright-report/ 目录');
  } else {
    console.log(`\n❌ 测试失败，退出码: ${code}`);
    process.exit(code);
  }
});

child.on('error', (error) => {
  console.error('❌ 启动测试时出错:', error.message);
  process.exit(1);
});