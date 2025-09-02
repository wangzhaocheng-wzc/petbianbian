#!/usr/bin/env node

/**
 * 测试环境验证脚本
 * 验证宠物权限管理测试的环境配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证宠物权限管理测试环境...\n');

// 检查必要文件
const requiredFiles = [
  'frontend/e2e/run-pet-permissions-tests.cjs',
  'frontend/e2e/utils/cleanup-test-data.cjs',
  'frontend/e2e/specs/pets/pet-permissions.spec.ts',
  'frontend/e2e/page-objects/pets-page.ts',
  'frontend/e2e/page-objects/auth-page.ts',
  'frontend/e2e/utils/test-data-manager.ts',
  'frontend/e2e/fixtures/test-pet-permissions.json',
  'run-pet-permissions-tests.bat',
  'run-pet-permissions-tests.ps1',
  'PET_PERMISSIONS_TEST_GUIDE.md'
];

let allFilesExist = true;

console.log('📁 检查必要文件:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log();

// 检查package.json脚本
console.log('📦 检查npm脚本:');
try {
  const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredFrontendScripts = [
    'test:pet-permissions',
    'test:pet-permissions:access',
    'test:pet-permissions:sharing',
    'test:pet-permissions:privacy',
    'cleanup:test-data'
  ];
  
  const requiredRootScripts = [
    'test:pet-permissions',
    'cleanup:test-data'
  ];
  
  requiredFrontendScripts.forEach(script => {
    const exists = frontendPackage.scripts && frontendPackage.scripts[script];
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} frontend: ${script}`);
    if (!exists) allFilesExist = false;
  });
  
  requiredRootScripts.forEach(script => {
    const exists = rootPackage.scripts && rootPackage.scripts[script];
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} root: ${script}`);
    if (!exists) allFilesExist = false;
  });
  
} catch (error) {
  console.log('   ❌ 无法读取package.json文件');
  allFilesExist = false;
}

console.log();

// 检查依赖
console.log('📚 检查依赖:');
try {
  const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  
  const requiredDeps = [
    '@playwright/test',
    '@faker-js/faker'
  ];
  
  requiredDeps.forEach(dep => {
    const exists = (frontendPackage.dependencies && frontendPackage.dependencies[dep]) ||
                   (frontendPackage.devDependencies && frontendPackage.devDependencies[dep]);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${dep}`);
    if (!exists) allFilesExist = false;
  });
  
} catch (error) {
  console.log('   ❌ 无法检查依赖');
  allFilesExist = false;
}

console.log();

// 检查目录结构
console.log('📂 检查目录结构:');
const requiredDirs = [
  'frontend/e2e/specs/pets',
  'frontend/e2e/page-objects',
  'frontend/e2e/utils',
  'frontend/e2e/fixtures'
];

requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${dir}/`);
  if (!exists) allFilesExist = false;
});

console.log();

// 显示使用说明
if (allFilesExist) {
  console.log('✅ 环境验证通过! 可以开始运行测试。\n');
  
  console.log('🚀 快速开始:');
  console.log('   # 从项目根目录运行所有测试');
  console.log('   npm run test:pet-permissions\n');
  
  console.log('   # 从frontend目录运行');
  console.log('   cd frontend');
  console.log('   npm run test:pet-permissions\n');
  
  console.log('   # 使用Windows脚本');
  console.log('   run-pet-permissions-tests.bat');
  console.log('   .\\run-pet-permissions-tests.ps1\n');
  
  console.log('📖 详细说明请查看: PET_PERMISSIONS_TEST_GUIDE.md');
  
} else {
  console.log('❌ 环境验证失败! 请检查缺失的文件和配置。\n');
  
  console.log('🔧 修复建议:');
  console.log('   1. 确保所有必要文件都已创建');
  console.log('   2. 检查package.json中的脚本配置');
  console.log('   3. 安装必要的依赖: npm install');
  console.log('   4. 重新运行此验证脚本');
}

console.log();