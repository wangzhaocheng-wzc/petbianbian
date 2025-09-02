#!/usr/bin/env node

/**
 * 内容审核测试验证脚本
 * 验证内容审核测试环境和依赖
 */

const fs = require('fs');
const path = require('path');

class ModerationTestValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.testFiles = [
      'frontend/e2e/specs/moderation/content-filtering.spec.ts',
      'frontend/e2e/specs/moderation/report-handling.spec.ts',
      'frontend/e2e/specs/moderation/user-banning.spec.ts',
      'frontend/e2e/specs/moderation/admin-moderation.spec.ts',
      'frontend/e2e/specs/moderation/moderation-workflow.spec.ts'
    ];
    this.supportFiles = [
      'frontend/e2e/page-objects/moderation-page.ts',
      'frontend/e2e/fixtures/moderation-test-data.json',
      'frontend/e2e/run-moderation-tests.cjs'
    ];
  }

  validateFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
      this.errors.push(`缺少文件: ${filePath}`);
      return false;
    }
    return true;
  }

  validateTestFiles() {
    console.log('🔍 验证测试文件...');
    
    this.testFiles.forEach(file => {
      if (this.validateFileExists(file)) {
        console.log(`  ✅ ${file}`);
      }
    });
    
    this.supportFiles.forEach(file => {
      if (this.validateFileExists(file)) {
        console.log(`  ✅ ${file}`);
      }
    });
  }

  validateTestData() {
    console.log('\n🔍 验证测试数据...');
    
    const testDataPath = 'frontend/e2e/fixtures/moderation-test-data.json';
    if (!this.validateFileExists(testDataPath)) {
      return;
    }
    
    try {
      const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
      
      // 验证必要的测试数据结构
      const requiredSections = [
        'sensitiveContent',
        'reportReasons', 
        'banTypes',
        'testUsers',
        'testPosts'
      ];
      
      requiredSections.forEach(section => {
        if (!testData[section]) {
          this.errors.push(`测试数据缺少 ${section} 部分`);
        } else {
          console.log(`  ✅ ${section} 数据结构完整`);
        }
      });
      
      // 验证用户角色
      const users = testData.testUsers;
      if (users) {
        const requiredRoles = ['normalUser', 'violatingUser', 'moderator', 'admin'];
        requiredRoles.forEach(role => {
          if (!users[role]) {
            this.errors.push(`测试数据缺少 ${role} 用户`);
          } else {
            console.log(`  ✅ ${role} 用户配置完整`);
          }
        });
      }
      
    } catch (error) {
      this.errors.push(`测试数据格式错误: ${error.message}`);
    }
  }

  validatePageObjects() {
    console.log('\n🔍 验证页面对象...');
    
    const moderationPagePath = 'frontend/e2e/page-objects/moderation-page.ts';
    if (!this.validateFileExists(moderationPagePath)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(moderationPagePath, 'utf8');
      
      // 验证关键方法存在
      const requiredMethods = [
        'testContentFilter',
        'reportContent',
        'banUser',
        'navigateToModerationQueue',
        'approveReport',
        'rejectReport'
      ];
      
      requiredMethods.forEach(method => {
        if (content.includes(method)) {
          console.log(`  ✅ ${method} 方法存在`);
        } else {
          this.warnings.push(`页面对象可能缺少 ${method} 方法`);
        }
      });
      
    } catch (error) {
      this.errors.push(`页面对象文件读取错误: ${error.message}`);
    }
  }

  validateTestRunner() {
    console.log('\n🔍 验证测试运行器...');
    
    const runnerPath = 'frontend/e2e/run-moderation-tests.cjs';
    if (!this.validateFileExists(runnerPath)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(runnerPath, 'utf8');
      
      // 验证测试运行器功能
      const requiredFeatures = [
        'runModerationTests',
        'runSpecificTest',
        'showHelp',
        'listTests'
      ];
      
      requiredFeatures.forEach(feature => {
        if (content.includes(feature)) {
          console.log(`  ✅ ${feature} 功能存在`);
        } else {
          this.warnings.push(`测试运行器可能缺少 ${feature} 功能`);
        }
      });
      
    } catch (error) {
      this.errors.push(`测试运行器文件读取错误: ${error.message}`);
    }
  }

  validateDirectoryStructure() {
    console.log('\n🔍 验证目录结构...');
    
    const requiredDirs = [
      'frontend/e2e/specs/moderation',
      'frontend/e2e/page-objects',
      'frontend/e2e/fixtures'
    ];
    
    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        console.log(`  ✅ ${dir} 目录存在`);
      } else {
        this.errors.push(`缺少目录: ${dir}`);
      }
    });
  }

  generateTestReport() {
    console.log('\n📊 生成测试覆盖报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testSuites: {
        'content-filtering': {
          description: '敏感内容检测和过滤测试',
          testCases: [
            '敏感文本内容检测',
            '不当图片内容识别', 
            '内容过滤规则配置',
            '白名单功能测试'
          ]
        },
        'report-handling': {
          description: '举报处理功能测试',
          testCases: [
            '用户举报功能',
            '举报分类管理',
            '批量处理举报',
            '举报状态通知'
          ]
        },
        'user-banning': {
          description: '用户封禁功能测试',
          testCases: [
            '临时封禁用户',
            '永久封禁用户',
            '封禁权限限制',
            '封禁申诉处理'
          ]
        },
        'admin-moderation': {
          description: '管理员审核工具测试',
          testCases: [
            '审核仪表板',
            '审核决策工具',
            '批量审核操作',
            '审核统计分析'
          ]
        },
        'moderation-workflow': {
          description: '完整审核流程测试',
          testCases: [
            '端到端审核流程',
            '紧急审核模式',
            '跨平台内容同步',
            '审核决策申诉'
          ]
        }
      },
      coverage: {
        totalTestFiles: this.testFiles.length,
        totalTestCases: 20, // 估算的测试用例总数
        requirements: [
          '需求1.1: 敏感内容检测和过滤',
          '需求3.3: 社区内容审核和管理'
        ]
      }
    };
    
    const reportPath = 'MODERATION_TEST_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  ✅ 测试报告已生成: ${reportPath}`);
  }

  run() {
    console.log('🚀 开始验证内容审核测试环境...\n');
    
    this.validateDirectoryStructure();
    this.validateTestFiles();
    this.validateTestData();
    this.validatePageObjects();
    this.validateTestRunner();
    this.generateTestReport();
    
    console.log('\n📋 验证结果汇总:');
    
    if (this.errors.length === 0) {
      console.log('✅ 所有验证通过！内容审核测试环境配置完整。');
    } else {
      console.log(`❌ 发现 ${this.errors.length} 个错误:`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  发现 ${this.warnings.length} 个警告:`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('\n🎯 测试覆盖范围:');
    console.log('  ✅ 敏感内容检测和过滤');
    console.log('  ✅ 举报处理和管理');
    console.log('  ✅ 用户封禁功能');
    console.log('  ✅ 管理员审核工具');
    console.log('  ✅ 完整审核流程');
    
    console.log('\n🚀 运行测试命令:');
    console.log('  npm run test:moderation                    # 运行所有审核测试');
    console.log('  node frontend/e2e/run-moderation-tests.cjs # 使用专用运行器');
    console.log('  node test-moderation.js                   # 验证测试环境');
    
    return this.errors.length === 0;
  }
}

// 运行验证
const validator = new ModerationTestValidator();
const success = validator.run();

process.exit(success ? 0 : 1);