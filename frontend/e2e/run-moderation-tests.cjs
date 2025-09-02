#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * 内容审核测试运行器
 * 运行所有内容审核相关的测试用例
 */

const testSpecs = [
  'frontend/e2e/specs/moderation/content-filtering.spec.ts',
  'frontend/e2e/specs/moderation/report-handling.spec.ts', 
  'frontend/e2e/specs/moderation/user-banning.spec.ts',
  'frontend/e2e/specs/moderation/admin-moderation.spec.ts',
  'frontend/e2e/specs/moderation/moderation-workflow.spec.ts'
];

const testConfig = {
  // 测试配置
  timeout: 60000,
  retries: 2,
  workers: 2,
  reporter: 'html',
  outputDir: 'frontend/e2e/test-results/moderation'
};

function runModerationTests() {
  console.log('🚀 开始运行内容审核测试套件...\n');
  
  try {
    // 构建测试命令
    const baseCommand = 'npx playwright test';
    const configArgs = [
      `--timeout=${testConfig.timeout}`,
      `--retries=${testConfig.retries}`,
      `--workers=${testConfig.workers}`,
      `--reporter=${testConfig.reporter}`,
      `--output-dir=${testConfig.outputDir}`
    ];
    
    const specArgs = testSpecs.join(' ');
    const fullCommand = `${baseCommand} ${configArgs.join(' ')} ${specArgs}`;
    
    console.log('执行命令:', fullCommand);
    console.log('测试文件:');
    testSpecs.forEach((spec, index) => {
      console.log(`  ${index + 1}. ${spec}`);
    });
    console.log('');
    
    // 运行测试
    execSync(fullCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n✅ 内容审核测试套件运行完成！');
    console.log(`📊 测试报告已生成到: ${testConfig.outputDir}`);
    
  } catch (error) {
    console.error('\n❌ 测试运行失败:', error.message);
    process.exit(1);
  }
}

function runSpecificTest(testName) {
  const testMap = {
    'filtering': 'frontend/e2e/specs/moderation/content-filtering.spec.ts',
    'reporting': 'frontend/e2e/specs/moderation/report-handling.spec.ts',
    'banning': 'frontend/e2e/specs/moderation/user-banning.spec.ts',
    'admin': 'frontend/e2e/specs/moderation/admin-moderation.spec.ts',
    'workflow': 'frontend/e2e/specs/moderation/moderation-workflow.spec.ts'
  };
  
  const testFile = testMap[testName];
  if (!testFile) {
    console.error(`❌ 未找到测试: ${testName}`);
    console.log('可用的测试:');
    Object.keys(testMap).forEach(key => {
      console.log(`  - ${key}: ${testMap[key]}`);
    });
    process.exit(1);
  }
  
  console.log(`🚀 运行特定测试: ${testName}`);
  
  try {
    const command = `npx playwright test ${testFile} --timeout=${testConfig.timeout} --retries=${testConfig.retries}`;
    execSync(command, { stdio: 'inherit' });
    console.log(`\n✅ 测试 ${testName} 运行完成！`);
  } catch (error) {
    console.error(`\n❌ 测试 ${testName} 运行失败:`, error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
内容审核测试运行器

用法:
  node run-moderation-tests.cjs [选项] [测试名称]

选项:
  --help, -h     显示帮助信息
  --list, -l     列出所有可用测试

测试名称:
  filtering      敏感内容检测和过滤测试
  reporting      举报处理功能测试
  banning        用户封禁功能测试
  admin          管理员审核工具测试
  workflow       完整审核流程测试

示例:
  node run-moderation-tests.cjs                    # 运行所有审核测试
  node run-moderation-tests.cjs filtering         # 只运行内容过滤测试
  node run-moderation-tests.cjs --list            # 列出所有测试
`);
}

function listTests() {
  console.log('📋 可用的内容审核测试:');
  console.log('');
  console.log('1. content-filtering.spec.ts - 敏感内容检测和过滤测试');
  console.log('   - 敏感文本内容检测');
  console.log('   - 不当图片内容识别');
  console.log('   - 内容过滤规则配置');
  console.log('');
  console.log('2. report-handling.spec.ts - 举报处理功能测试');
  console.log('   - 用户举报功能');
  console.log('   - 举报分类和优先级');
  console.log('   - 批量处理举报');
  console.log('');
  console.log('3. user-banning.spec.ts - 用户封禁功能测试');
  console.log('   - 临时和永久封禁');
  console.log('   - 封禁权限限制');
  console.log('   - 封禁申诉处理');
  console.log('');
  console.log('4. admin-moderation.spec.ts - 管理员审核工具测试');
  console.log('   - 审核仪表板');
  console.log('   - 审核决策工具');
  console.log('   - 审核统计分析');
  console.log('');
  console.log('5. moderation-workflow.spec.ts - 完整审核流程测试');
  console.log('   - 端到端审核流程');
  console.log('   - 紧急审核模式');
  console.log('   - 跨平台内容同步');
}

// 主程序
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
} else if (args.includes('--list') || args.includes('-l')) {
  listTests();
} else if (args.length === 1) {
  runSpecificTest(args[0]);
} else if (args.length === 0) {
  runModerationTests();
} else {
  console.error('❌ 无效的参数');
  showHelp();
  process.exit(1);
}