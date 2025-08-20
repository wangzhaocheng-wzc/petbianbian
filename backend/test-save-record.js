const mongoose = require('mongoose');

async function testSaveRecord() {
  console.log('🧪 测试保存分析记录...\n');
  
  try {
    // 连接数据库
    console.log('1. 连接数据库...');
    await mongoose.connect('mongodb://192.168.7.1:27017/pet-health');
    console.log('✓ 数据库连接成功');
    
    // 导入模型和服务
    const { AnalysisService } = require('./dist/services/analysisService');
    
    // 创建测试记录
    console.log('\n2. 创建测试分析记录...');
    const testRecord = {
      petId: '507f1f77bcf86cd799439011', // 假的ObjectId
      userId: '507f1f77bcf86cd799439012', // 假的ObjectId
      imageUrl: '/uploads/analysis/test-image.jpg',
      analysis: {
        shape: 'type4',
        healthStatus: 'healthy',
        confidence: 95,
        details: '便便呈光滑香肠状，形状和质地都很正常',
        recommendations: [
          '继续保持当前的饮食习惯',
          '确保充足的水分摄入',
          '定期观察宠物的排便情况',
          '保持适量运动'
        ],
        detectedFeatures: {
          color: '棕色',
          texture: '光滑',
          consistency: '正常',
          size: '正常'
        }
      },
      userNotes: '测试记录 - 宠物状态良好',
      symptoms: [],
      timestamp: new Date(),
      isShared: false
    };
    
    const savedRecord = await AnalysisService.createAnalysisRecord(testRecord);
    console.log('✓ 分析记录保存成功');
    console.log('记录ID:', savedRecord._id);
    
    // 查询记录
    console.log('\n3. 查询保存的记录...');
    const retrievedRecord = await AnalysisService.getAnalysisRecord(savedRecord._id);
    console.log('✓ 记录查询成功');
    console.log('记录详情:', {
      id: retrievedRecord._id,
      petId: retrievedRecord.petId,
      healthStatus: retrievedRecord.analysis.healthStatus,
      confidence: retrievedRecord.analysis.confidence
    });
    
    // 删除测试记录
    console.log('\n4. 删除测试记录...');
    await AnalysisService.deleteAnalysisRecord(savedRecord._id);
    console.log('✓ 测试记录删除成功');
    
    console.log('\n🎉 分析记录保存测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('✓ 数据库连接已关闭');
  }
}

testSaveRecord().catch(console.error);