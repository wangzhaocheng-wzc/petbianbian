#!/usr/bin/env node

/**
 * 测试图片清理工具
 * 用于清理便便分析测试产生的测试图片文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 测试图片清理器
 */
class TestImageCleaner {
  constructor() {
    this.testImageDirs = [
      path.join(__dirname, '../fixtures/test-images'),
      path.join(__dirname, '../temp-images'),
      path.join(__dirname, '../generated-images')
    ];
  }

  /**
   * 清理所有测试图片目录
   */
  async cleanupAllTestImages() {
    console.log('🖼️ 开始清理测试图片...\n');
    
    let totalDeleted = 0;
    
    for (const dir of this.testImageDirs) {
      if (fs.existsSync(dir)) {
        const deleted = await this.cleanupDirectory(dir);
        totalDeleted += deleted;
      }
    }
    
    console.log(`\n✅ 测试图片清理完成! 共删除 ${totalDeleted} 个文件`);
  }

  /**
   * 清理指定目录
   */
  async cleanupDirectory(dirPath) {
    console.log(`📁 清理目录: ${dirPath}`);
    
    let deletedCount = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          // 检查是否为测试图片文件
          if (this.isTestImageFile(file)) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`   ✅ 删除文件: ${file}`);
          }
        } else if (stat.isDirectory()) {
          // 递归清理子目录
          const subDeleted = await this.cleanupDirectory(filePath);
          deletedCount += subDeleted;
          
          // 如果子目录为空，删除它
          const remainingFiles = fs.readdirSync(filePath);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(filePath);
            console.log(`   ✅ 删除空目录: ${file}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`   ❌ 清理目录失败: ${error.message}`);
    }
    
    return deletedCount;
  }

  /**
   * 检查是否为测试图片文件
   */
  isTestImageFile(filename) {
    const testPatterns = [
      /^test-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^.*-test\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^drag-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^batch-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^progress-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^cancel-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^consistency-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^history-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^trend-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^save-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^export-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^concurrent-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^performance-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^network-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^server-error-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^corrupt\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^large-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^small-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^low-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^rotated\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^exif-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^healthy-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^unhealthy-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i,
      /^warning-.*\.(jpg|jpeg|png|webp|heic|gif|bmp|tiff)$/i
    ];
    
    return testPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * 清理过期的测试图片（超过指定天数）
   */
  async cleanupExpiredImages(days = 7) {
    console.log(`🗓️ 清理 ${days} 天前的测试图片...\n`);
    
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const dir of this.testImageDirs) {
      if (fs.existsSync(dir)) {
        deletedCount += await this.cleanupExpiredInDirectory(dir, cutoffTime);
      }
    }
    
    console.log(`\n✅ 过期图片清理完成! 共删除 ${deletedCount} 个文件`);
  }

  /**
   * 在指定目录中清理过期图片
   */
  async cleanupExpiredInDirectory(dirPath, cutoffTime) {
    let deletedCount = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && this.isTestImageFile(file)) {
          if (stat.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`   ✅ 删除过期文件: ${file}`);
          }
        } else if (stat.isDirectory()) {
          deletedCount += await this.cleanupExpiredInDirectory(filePath, cutoffTime);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ 清理过期图片失败: ${error.message}`);
    }
    
    return deletedCount;
  }

  /**
   * 获取测试图片统计信息
   */
  async getTestImageStats() {
    console.log('📊 统计测试图片信息...\n');
    
    let totalFiles = 0;
    let totalSize = 0;
    const stats = {};
    
    for (const dir of this.testImageDirs) {
      if (fs.existsSync(dir)) {
        const dirStats = await this.getDirectoryStats(dir);
        stats[dir] = dirStats;
        totalFiles += dirStats.fileCount;
        totalSize += dirStats.totalSize;
      }
    }
    
    console.log('📈 统计结果:');
    console.log(`   总文件数: ${totalFiles}`);
    console.log(`   总大小: ${this.formatFileSize(totalSize)}`);
    
    for (const [dir, dirStats] of Object.entries(stats)) {
      console.log(`\n📁 ${dir}:`);
      console.log(`   文件数: ${dirStats.fileCount}`);
      console.log(`   大小: ${this.formatFileSize(dirStats.totalSize)}`);
      console.log(`   最新文件: ${dirStats.newestFile || '无'}`);
      console.log(`   最旧文件: ${dirStats.oldestFile || '无'}`);
    }
    
    return { totalFiles, totalSize, directoryStats: stats };
  }

  /**
   * 获取目录统计信息
   */
  async getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;
    let newestTime = 0;
    let oldestTime = Infinity;
    let newestFile = '';
    let oldestFile = '';
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && this.isTestImageFile(file)) {
          fileCount++;
          totalSize += stat.size;
          
          if (stat.mtime.getTime() > newestTime) {
            newestTime = stat.mtime.getTime();
            newestFile = file;
          }
          
          if (stat.mtime.getTime() < oldestTime) {
            oldestTime = stat.mtime.getTime();
            oldestFile = file;
          }
        } else if (stat.isDirectory()) {
          const subStats = await this.getDirectoryStats(filePath);
          fileCount += subStats.fileCount;
          totalSize += subStats.totalSize;
          
          if (subStats.newestTime > newestTime) {
            newestTime = subStats.newestTime;
            newestFile = subStats.newestFile;
          }
          
          if (subStats.oldestTime < oldestTime) {
            oldestTime = subStats.oldestTime;
            oldestFile = subStats.oldestFile;
          }
        }
      }
      
    } catch (error) {
      console.error(`   ❌ 统计目录失败: ${error.message}`);
    }
    
    return {
      fileCount,
      totalSize,
      newestTime: newestTime > 0 ? newestTime : null,
      oldestTime: oldestTime < Infinity ? oldestTime : null,
      newestFile,
      oldestFile
    };
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 创建测试图片目录
   */
  async createTestImageDirectories() {
    console.log('📁 创建测试图片目录...\n');
    
    for (const dir of this.testImageDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ 创建目录: ${dir}`);
      } else {
        console.log(`   ℹ️ 目录已存在: ${dir}`);
      }
    }
    
    console.log('\n✅ 测试图片目录创建完成!');
  }

  /**
   * 验证测试图片目录
   */
  async validateTestImageDirectories() {
    console.log('🔍 验证测试图片目录...\n');
    
    const results = {};
    
    for (const dir of this.testImageDirs) {
      const exists = fs.existsSync(dir);
      let writable = false;
      let readable = false;
      
      if (exists) {
        try {
          fs.accessSync(dir, fs.constants.W_OK);
          writable = true;
        } catch {}
        
        try {
          fs.accessSync(dir, fs.constants.R_OK);
          readable = true;
        } catch {}
      }
      
      results[dir] = { exists, writable, readable };
      
      const status = exists ? (writable && readable ? '✅' : '⚠️') : '❌';
      console.log(`   ${status} ${dir}`);
      
      if (exists) {
        console.log(`      可读: ${readable ? '是' : '否'}`);
        console.log(`      可写: ${writable ? '是' : '否'}`);
      }
    }
    
    return results;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'cleanup';
  
  const cleaner = new TestImageCleaner();
  
  try {
    switch (command) {
      case 'cleanup':
        await cleaner.cleanupAllTestImages();
        break;
        
      case 'expired':
        const days = parseInt(args[1]) || 7;
        await cleaner.cleanupExpiredImages(days);
        break;
        
      case 'stats':
        await cleaner.getTestImageStats();
        break;
        
      case 'create':
        await cleaner.createTestImageDirectories();
        break;
        
      case 'validate':
        await cleaner.validateTestImageDirectories();
        break;
        
      default:
        console.log(`
🖼️ 测试图片清理工具

用法:
  node cleanup-test-images.cjs [命令] [选项]

命令:
  cleanup           清理所有测试图片 (默认)
  expired [days]    清理过期测试图片 (默认7天)
  stats             显示测试图片统计信息
  create            创建测试图片目录
  validate          验证测试图片目录权限

示例:
  node cleanup-test-images.cjs cleanup
  node cleanup-test-images.cjs expired 3
  node cleanup-test-images.cjs stats
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

module.exports = TestImageCleaner;