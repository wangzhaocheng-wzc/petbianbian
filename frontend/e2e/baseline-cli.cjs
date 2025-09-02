#!/usr/bin/env node

/**
 * 视觉基准管理CLI工具
 * 提供基准图片的管理、更新和维护功能
 */

const { BaselineCLI } = require('./utils/visual-baseline-manager');

async function main() {
  const cli = new BaselineCLI();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('请提供命令参数，使用 --help 查看帮助');
    process.exit(1);
  }
  
  try {
    await cli.handleCommand(args);
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}