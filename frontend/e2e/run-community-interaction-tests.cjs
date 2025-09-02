#!/usr/bin/env node

/**
 * 社区互动功能测试运行脚本
 * 运行所有社区互动相关的测试用例
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始运行社区互动功能测试...\n');

const testCommand = `npx playwright test ${path.join(__dirname, 'specs/community/community-interaction.spec.ts')} --reporter=html --reporter=line`;

try {
  console.log('📋 测试范围：');
  console.log('  ✓ 点赞功能测试');
  console.log('  ✓ 评论功能测试');
  console.log('  ✓ 分享功能测试');
  console.log('  ✓ 用户关注功能测试');
  console.log('  ✓ 私信功能测试');
  console.log('  ✓ 社区活动测试');
  console.log('  ✓ 话题讨论测试\n');

  console.log('🔧 执行命令:', testCommand);
  console.log('⏳ 测试执行中，请稍候...\n');

  execSync(testCommand, { 
    stdio: 'inherit',
    cwd: __dirname
  });

  console.log('\n✅ 社区互动功能测试完成！');
  console.log('📊 详细报告请查看 playwright-report/index.html');

} catch (error) {
  console.error('\n❌ 测试执行失败:', error.message);
  console.log('\n🔍 故障排除建议:');
  console.log('  1. 确保后端服务正在运行');
  console.log('  2. 检查数据库连接是否正常');
  console.log('  3. 验证测试环境配置');
  console.log('  4. 查看详细错误日志');
  
  process.exit(1);
}