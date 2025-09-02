const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 开始运行边界条件测试...\n');

const testCommands = [
  {
    name: '输入验证边界测试',
    command: 'npx playwright test specs/boundary/input-validation-boundary.spec.ts --reporter=html --reporter=line',
    description: '测试各种输入验证边界条件，包括字符串长度、特殊字符、数值边界等'
  },
  {
    name: '数据边界测试',
    command: 'npx playwright test specs/boundary/data-boundary.spec.ts --reporter=html --reporter=line',
    description: '测试大数据量处理、分页、缓存溢出和内存管理等数据边界条件'
  },
  {
    name: '并发和竞态条件测试',
    command: 'npx playwright test specs/boundary/concurrency-race-conditions.spec.ts --reporter=html --reporter=line',
    description: '测试多用户并发操作、资源锁定、死锁检测和数据一致性'
  }
];

let allTestsPassed = true;
const results = [];

for (const test of testCommands) {
  console.log(`📋 运行: ${test.name}`);
  console.log(`📝 描述: ${test.description}`);
  console.log(`⚡ 命令: ${test.command}\n`);
  
  try {
    const startTime = Date.now();
    const output = execSync(test.command, { 
      cwd: path.resolve(__dirname),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
    console.log('输出:', output.slice(-200)); // 显示最后200个字符
    
    results.push({
      name: test.name,
      status: 'PASSED',
      duration: duration,
      output: output
    });
    
  } catch (error) {
    allTestsPassed = false;
    console.log(`❌ ${test.name} - 失败`);
    console.log('错误:', error.message);
    
    results.push({
      name: test.name,
      status: 'FAILED',
      error: error.message,
      output: error.stdout || error.stderr
    });
  }
  
  console.log('─'.repeat(80));
}

// 生成测试报告
console.log('\n📊 边界条件测试报告');
console.log('═'.repeat(80));

results.forEach(result => {
  const status = result.status === 'PASSED' ? '✅' : '❌';
  const duration = result.duration ? `(${result.duration}ms)` : '';
  console.log(`${status} ${result.name} ${duration}`);
  
  if (result.status === 'FAILED') {
    console.log(`   错误: ${result.error}`);
  }
});

console.log('═'.repeat(80));

if (allTestsPassed) {
  console.log('🎉 所有边界条件测试通过！');
  console.log('\n📋 测试覆盖范围:');
  console.log('   • 字符串长度边界测试');
  console.log('   • 特殊字符输入验证');
  console.log('   • 数值边界值测试');
  console.log('   • 文件上传安全测试');
  console.log('   • SQL注入防护测试');
  console.log('   • XSS攻击防护测试');
  console.log('   • Unicode字符处理测试');
  console.log('   • 输入长度极限测试');
  console.log('   • 大数据量处理测试');
  console.log('   • 数据库连接池测试');
  console.log('   • 缓存溢出测试');
  console.log('   • 并发操作测试');
  console.log('   • 竞态条件检测');
  console.log('   • 数据一致性验证');
  console.log('   • 事务隔离测试');
  
  console.log('\n🔒 安全测试要点:');
  console.log('   • 验证所有用户输入都经过适当的验证和清理');
  console.log('   • 确保SQL注入攻击被有效阻止');
  console.log('   • 验证XSS攻击载荷被正确转义');
  console.log('   • 检查文件上传的安全限制');
  console.log('   • 测试各种边界条件和极端输入');
  
  process.exit(0);
} else {
  console.log('💥 部分边界条件测试失败，请检查上述错误信息');
  console.log('\n🔧 故障排除建议:');
  console.log('   1. 检查测试环境是否正确启动');
  console.log('   2. 验证前端和后端服务是否正常运行');
  console.log('   3. 确认数据库连接正常');
  console.log('   4. 检查输入验证逻辑是否正确实现');
  console.log('   5. 验证安全防护机制是否启用');
  
  process.exit(1);
}