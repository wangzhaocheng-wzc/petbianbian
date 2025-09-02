#!/usr/bin/env node

/**
 * 交互性能测试运行器
 * 专门用于运行交互性能测试套件
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始运行交互性能测试...\n');

try {
  // 设置环境变量
  process.env.NODE_ENV = 'test';
  process.env.PWTEST_PERFORMANCE = 'true';
  
  const testCommand = [
    'npx playwright test',
    'e2e/specs/performance/interaction-performance.spec.ts',
    '--config=playwright.config.ts',
    '--reporter=html,line',
    '--workers=1', // 性能测试使用单线程以获得准确结果
    '--timeout=60000', // 增加超时时间
    '--retries=0' // 性能测试不重试
  ].join(' ');

  console.log('执行命令:', testCommand);
  console.log('工作目录:', path.resolve(__dirname, '..'));
  console.log('测试配置:');
  console.log('- 工作线程: 1 (确保性能测试准确性)');
  console.log('- 超时时间: 60秒');
  console.log('- 重试次数: 0');
  console.log('- 报告格式: HTML + 命令行\n');

  execSync(testCommand, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'), // 从 frontend 目录运行
    env: { ...process.env }
  });

  console.log('\n✅ 交互性能测试完成!');
  console.log('\n📊 性能测试报告:');
  console.log('- HTML报告: playwright-report/index.html');
  console.log('- 性能指标已输出到控制台');
  console.log('\n💡 性能优化建议:');
  console.log('- 检查超过阈值的操作');
  console.log('- 关注内存使用趋势');
  console.log('- 监控并发操作性能');

} catch (error) {
  console.error('\n❌ 交互性能测试失败:', error.message);
  
  console.log('\n🔧 故障排除建议:');
  console.log('1. 检查测试环境是否正常运行');
  console.log('2. 确认测试数据是否正确创建');
  console.log('3. 验证性能阈值设置是否合理');
  console.log('4. 检查网络连接和服务器响应');
  
  process.exit(1);
}