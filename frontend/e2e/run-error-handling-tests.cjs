const { execSync } = require('child_process');
const path = require('path');

/**
 * 错误处理测试运行器
 * 运行所有错误处理相关的测试套件
 */

console.log('🚀 开始运行错误处理测试套件...\n');

const testSuites = [
  {
    name: '网络错误处理测试',
    file: 'specs/error-handling/network-error-handling.spec.ts',
    description: '测试网络中断、超时、DNS失败等网络错误的处理'
  },
  {
    name: '服务器错误处理测试',
    file: 'specs/error-handling/server-error-handling.spec.ts',
    description: '测试4xx和5xx HTTP错误响应的处理'
  },
  {
    name: '客户端错误处理测试',
    file: 'specs/error-handling/client-error-handling.spec.ts',
    description: '测试JavaScript错误、内存泄漏、性能问题的处理'
  }
];

let totalPassed = 0;
let totalFailed = 0;
let failedSuites = [];

for (const suite of testSuites) {
  console.log(`📋 运行测试套件: ${suite.name}`);
  console.log(`📄 描述: ${suite.description}`);
  console.log(`📁 文件: ${suite.file}\n`);
  
  try {
    const command = `npx playwright test ${suite.file} --reporter=line`;
    const output = execSync(command, { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(output);
    
    // 解析测试结果
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    totalPassed += passed;
    totalFailed += failed;
    
    if (failed > 0) {
      failedSuites.push(suite.name);
    }
    
    console.log(`✅ ${suite.name} 完成: ${passed} 通过, ${failed} 失败\n`);
    
  } catch (error) {
    console.error(`❌ ${suite.name} 执行失败:`);
    console.error(error.stdout || error.message);
    console.error('\n');
    
    totalFailed += 1;
    failedSuites.push(suite.name);
  }
}

// 输出总结
console.log('📊 错误处理测试总结');
console.log('='.repeat(50));
console.log(`总测试数: ${totalPassed + totalFailed}`);
console.log(`通过: ${totalPassed}`);
console.log(`失败: ${totalFailed}`);
console.log(`成功率: ${totalPassed + totalFailed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2) : 0}%`);

if (failedSuites.length > 0) {
  console.log('\n❌ 失败的测试套件:');
  failedSuites.forEach(suite => {
    console.log(`  - ${suite}`);
  });
}

console.log('\n🔍 测试覆盖的错误处理场景:');
console.log('  ✓ 网络中断和恢复');
console.log('  ✓ 连接超时处理');
console.log('  ✓ DNS解析失败');
console.log('  ✓ 网络不稳定');
console.log('  ✓ 慢网络连接');
console.log('  ✓ 离线模式和数据同步');
console.log('  ✓ HTTP 4xx/5xx错误');
console.log('  ✓ JavaScript运行时错误');
console.log('  ✓ Promise rejection错误');
console.log('  ✓ 资源加载错误');
console.log('  ✓ 内存泄漏检测');
console.log('  ✓ 性能问题检测');
console.log('  ✓ 错误报告和用户反馈');
console.log('  ✓ 错误恢复和降级策略');

console.log('\n📝 测试报告位置:');
console.log('  - HTML报告: playwright-report/index.html');
console.log('  - JSON报告: test-results/');

if (totalFailed === 0) {
  console.log('\n🎉 所有错误处理测试通过！');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查上述错误信息');
  process.exit(1);
}