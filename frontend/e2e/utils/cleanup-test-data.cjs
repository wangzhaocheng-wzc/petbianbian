#!/usr/bin/env node

/**
 * 测试数据清理工具
 * 用于清理宠物权限测试产生的测试数据
 */

const { request } = require('@playwright/test');

/**
 * 测试数据清理器
 */
class TestDataCleaner {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:5000/api';
    this.apiContext = null;
  }

  /**
   * 初始化API上下文
   */
  async init() {
    this.apiContext = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 清理测试用户
   */
  async cleanupTestUsers() {
    console.log('🧹 清理测试用户...');
    
    try {
      // 获取所有测试用户
      const response = await this.apiContext.get('/test/users');
      
      if (response.ok()) {
        const users = await response.json();
        const testUsers = users.filter(user => 
          user.username.includes('test') || 
          user.email.includes('test') ||
          user.username.includes('concurrent') ||
          user.username.includes('privacy') ||
          user.username.includes('security')
        );
        
        console.log(`   找到 ${testUsers.length} 个测试用户`);
        
        // 批量删除测试用户
        for (const user of testUsers) {
          try {
            await this.apiContext.delete(`/users/${user.id}`);
            console.log(`   ✅ 删除用户: ${user.username}`);
          } catch (error) {
            console.log(`   ❌ 删除用户失败: ${user.username} - ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('   ❌ 清理测试用户失败:', error.message);
    }
  }

  /**
   * 清理测试宠物
   */
  async cleanupTestPets() {
    console.log('🐕 清理测试宠物...');
    
    try {
      const response = await this.apiContext.get('/test/pets');
      
      if (response.ok()) {
        const pets = await response.json();
        const testPets = pets.filter(pet => 
          pet.name.includes('Test') || 
          pet.name.includes('User') ||
          pet.name.includes('Concurrent') ||
          pet.name.includes('Privacy') ||
          pet.name.includes('Shared')
        );
        
        console.log(`   找到 ${testPets.length} 个测试宠物`);
        
        for (const pet of testPets) {
          try {
            await this.apiContext.delete(`/pets/${pet.id}`);
            console.log(`   ✅ 删除宠物: ${pet.name}`);
          } catch (error) {
            console.log(`   ❌ 删除宠物失败: ${pet.name} - ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('   ❌ 清理测试宠物失败:', error.message);
    }
  }

  /**
   * 清理测试分析记录
   */
  async cleanupTestAnalysisRecords() {
    console.log('📊 清理测试分析记录...');
    
    try {
      const response = await this.apiContext.get('/test/analysis-records');
      
      if (response.ok()) {
        const records = await response.json();
        const testRecords = records.filter(record => 
          record.notes.includes('测试') || 
          record.notes.includes('Test') ||
          record.imageUrl.includes('test')
        );
        
        console.log(`   找到 ${testRecords.length} 个测试分析记录`);
        
        for (const record of testRecords) {
          try {
            await this.apiContext.delete(`/analysis/records/${record.id}`);
            console.log(`   ✅ 删除分析记录: ${record.id}`);
          } catch (error) {
            console.log(`   ❌ 删除分析记录失败: ${record.id} - ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('   ❌ 清理测试分析记录失败:', error.message);
    }
  }

  /**
   * 清理测试文件上传
   */
  async cleanupTestUploads() {
    console.log('📁 清理测试上传文件...');
    
    try {
      const response = await this.apiContext.post('/test/cleanup-uploads');
      
      if (response.ok()) {
        const result = await response.json();
        console.log(`   ✅ 清理了 ${result.deletedFiles} 个测试文件`);
      }
    } catch (error) {
      console.error('   ❌ 清理测试上传文件失败:', error.message);
    }
  }

  /**
   * 清理测试会话和缓存
   */
  async cleanupTestSessions() {
    console.log('🔐 清理测试会话...');
    
    try {
      const response = await this.apiContext.post('/test/cleanup-sessions');
      
      if (response.ok()) {
        const result = await response.json();
        console.log(`   ✅ 清理了 ${result.deletedSessions} 个测试会话`);
      }
    } catch (error) {
      console.error('   ❌ 清理测试会话失败:', error.message);
    }
  }

  /**
   * 重置数据库到初始状态
   */
  async resetDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('数据库重置只能在测试环境中执行');
    }
    
    console.log('🗄️ 重置测试数据库...');
    
    try {
      const response = await this.apiContext.post('/test/reset-database');
      
      if (response.ok()) {
        console.log('   ✅ 数据库重置完成');
      } else {
        throw new Error(`重置失败: ${response.status()}`);
      }
    } catch (error) {
      console.error('   ❌ 数据库重置失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证清理结果
   */
  async validateCleanup() {
    console.log('✅ 验证清理结果...');
    
    try {
      // 检查测试用户
      const usersResponse = await this.apiContext.get('/test/users');
      if (usersResponse.ok()) {
        const users = await usersResponse.json();
        const remainingTestUsers = users.filter(user => 
          user.username.includes('test') || user.email.includes('test')
        );
        
        if (remainingTestUsers.length > 0) {
          console.log(`   ⚠️ 仍有 ${remainingTestUsers.length} 个测试用户未清理`);
        } else {
          console.log('   ✅ 所有测试用户已清理');
        }
      }
      
      // 检查测试宠物
      const petsResponse = await this.apiContext.get('/test/pets');
      if (petsResponse.ok()) {
        const pets = await petsResponse.json();
        const remainingTestPets = pets.filter(pet => 
          pet.name.includes('Test') || pet.name.includes('User')
        );
        
        if (remainingTestPets.length > 0) {
          console.log(`   ⚠️ 仍有 ${remainingTestPets.length} 个测试宠物未清理`);
        } else {
          console.log('   ✅ 所有测试宠物已清理');
        }
      }
      
    } catch (error) {
      console.error('   ❌ 验证清理结果失败:', error.message);
    }
  }

  /**
   * 执行完整清理
   */
  async performFullCleanup() {
    console.log('🚀 开始执行完整测试数据清理...\n');
    
    try {
      await this.init();
      
      // 按顺序清理各类数据
      await this.cleanupTestAnalysisRecords();
      await this.cleanupTestPets();
      await this.cleanupTestUsers();
      await this.cleanupTestUploads();
      await this.cleanupTestSessions();
      
      // 验证清理结果
      await this.validateCleanup();
      
      console.log('\n✅ 测试数据清理完成!');
      
    } catch (error) {
      console.error('\n❌ 测试数据清理失败:');
      console.error(error.message);
      throw error;
    } finally {
      if (this.apiContext) {
        await this.apiContext.dispose();
      }
    }
  }

  /**
   * 执行快速清理（仅清理最近的测试数据）
   */
  async performQuickCleanup() {
    console.log('⚡ 开始执行快速测试数据清理...\n');
    
    try {
      await this.init();
      
      // 只清理最近1小时内创建的测试数据
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const response = await this.apiContext.post('/test/cleanup-recent', {
        data: { since: oneHourAgo }
      });
      
      if (response.ok()) {
        const result = await response.json();
        console.log(`   ✅ 清理了 ${result.deletedUsers} 个用户`);
        console.log(`   ✅ 清理了 ${result.deletedPets} 个宠物`);
        console.log(`   ✅ 清理了 ${result.deletedRecords} 个分析记录`);
      }
      
      console.log('\n✅ 快速清理完成!');
      
    } catch (error) {
      console.error('\n❌ 快速清理失败:');
      console.error(error.message);
      throw error;
    } finally {
      if (this.apiContext) {
        await this.apiContext.dispose();
      }
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  
  const cleaner = new TestDataCleaner();
  
  try {
    switch (command) {
      case 'full':
        await cleaner.performFullCleanup();
        break;
        
      case 'quick':
        await cleaner.performQuickCleanup();
        break;
        
      case 'reset':
        await cleaner.init();
        await cleaner.resetDatabase();
        break;
        
      case 'validate':
        await cleaner.init();
        await cleaner.validateCleanup();
        break;
        
      default:
        console.log(`
🧹 测试数据清理工具

用法:
  node cleanup-test-data.cjs [命令]

命令:
  full      执行完整清理 (默认)
  quick     执行快速清理 (仅最近1小时数据)
  reset     重置数据库到初始状态
  validate  验证清理结果

示例:
  node cleanup-test-data.cjs full
  node cleanup-test-data.cjs quick
  node cleanup-test-data.cjs reset
        `);
        break;
    }
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = TestDataCleaner;