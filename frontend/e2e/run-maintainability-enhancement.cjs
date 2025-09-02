#!/usr/bin/env node

/**
 * 测试可维护性增强运行器
 * 简化的命令行接口，用于执行测试可维护性分析和改进
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置选项
const config = {
  testDirectory: 'frontend/e2e/specs',
  outputDirectory: 'frontend/e2e/maintainability-reports',
  scriptPath: 'frontend/e2e/scripts/enhance-test-maintainability.ts'
};

function showHelp() {
  console.log('🔧 测试可维护性增强工具');
  console.log('================================');
  console.log('');
  console.log('用法: node run-maintainability-enhancement.cjs [选项]');
  console.log('');
  console.log('选项:');
  console.log('  --analyze          执行完整分析（默认）');
  console.log('  --refactor         执行代码重构分析');
  console.log('  --quality          执行质量标准检查');
  console.log('  --docs             生成测试文档');
  console.log('  --apply            应用代码重构（谨慎使用）');
  console.log('  --quick            快速分析（跳过文档生成）');
  console.log('  --help, -h         显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node run-maintainability-enhancement.cjs');
  console.log('  node run-maintainability-enhancement.cjs --quality');
  console.log('  node run-maintainability-enhancement.cjs --apply');
  console.log('');
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建输出目录: ${dirPath}`);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 执行命令: ${command} ${args.join(' ')}`);
    console.log('');

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runMaintainabilityEnhancement(options = []) {
  try {
    // 确保输出目录存在
    ensureDirectoryExists(config.outputDirectory);

    // 构建命令参数
    const args = [
      config.scriptPath,
      config.testDirectory,
      config.outputDirectory,
      ...options
    ];

    // 执行TypeScript脚本
    await runCommand('npx', ['tsx', ...args]);

    console.log('');
    console.log('✅ 可维护性增强完成！');
    console.log(`📁 查看报告: ${config.outputDirectory}`);
    console.log('');

    // 显示生成的文件
    if (fs.existsSync(config.outputDirectory)) {
      console.log('📋 生成的文件:');
      const files = fs.readdirSync(config.outputDirectory);
      files.forEach(file => {
        const filePath = path.join(config.outputDirectory, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          console.log(`  - ${file}`);
        } else if (stats.isDirectory()) {
          console.log(`  - ${file}/ (目录)`);
        }
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // 显示帮助
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  console.log('🔧 测试可维护性增强工具');
  console.log('================================');
  console.log('');

  // 检查必要的依赖
  try {
    require.resolve('tsx');
  } catch (error) {
    console.log('📦 安装必要依赖...');
    await runCommand('npm', ['install', '-g', 'tsx']);
  }

  let options = [];

  // 解析命令行参数
  if (args.includes('--apply')) {
    options.push('--apply-refactoring');
    console.log('⚠️  警告: 将应用代码重构，请确保已备份代码！');
    console.log('');
  }

  if (args.includes('--quick')) {
    options.push('--no-docs');
    console.log('⚡ 快速模式: 跳过文档生成');
    console.log('');
  }

  if (args.includes('--refactor')) {
    options.push('--no-quality', '--no-docs');
    console.log('🔧 仅执行代码重构分析');
    console.log('');
  }

  if (args.includes('--quality')) {
    options.push('--no-refactoring', '--no-docs');
    console.log('🔍 仅执行质量标准检查');
    console.log('');
  }

  if (args.includes('--docs')) {
    options.push('--no-refactoring', '--no-quality');
    console.log('📚 仅生成测试文档');
    console.log('');
  }

  // 执行可维护性增强
  await runMaintainabilityEnhancement(options);
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runMaintainabilityEnhancement,
  config
};