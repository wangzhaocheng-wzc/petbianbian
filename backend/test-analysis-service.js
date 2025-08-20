const mongoose = require('mongoose');

// 测试分析服务功能
async function testAnalysisService() {
  try {
    console.log('开始测试分析服务...');
    
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/pet-health-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ 数据库连接成功');
    
    // 动态导入ES模块
    const { AnalysisService } = await import('./dist/services/analysisService.js');
    const { PoopRecord } = await import('./dist/models/PoopRecord.js');
    
    // 清理测试数据
    await PoopRecord.deleteMany({});
    console.log('✓ 清理测试数据完成');
    
    console.log('\n1. 测试创建分析记录...');
    const mockAnalysis = {
      shape: 'type4',
      healthStatus: 'healthy',
      confidence: 85,
      details: '便便形状正常，呈香肠状，表面光滑，颜色正常',
      recommendations: [
        '继续保持当前的饮食习惯',
        '确保充足的水分摄入'
      ],
      detectedFeatures: {
        color: '棕色',
        texture: '光滑',
        consistency: '正常',
        size: '正常'
      }
    };
    
    const recordData = {
      petId: new mongoose.Types.ObjectId().toString(),
      userId: new mongoose.Types.ObjectId().toString(),
      imageUrl: '/uploads/analysis/test-image.jpg',
      analysis: mockAnalysis,
      userNotes: '测试记录',
      symptoms: ['正常'],
      timestamp: new Date(),
      isShared: false
    };
    
    const savedRecord = await AnalysisService.createAnalysisRecord(recordData);
    console.log('✓ 分析记录创建成功');
    console.log(`  - 记录ID: ${savedRecord._id}`);
    console.log(`  - 健康状态: ${savedRecord.analysis.healthStatus}`);
    console.log(`  - 建议数量: ${savedRecord.analysis.recommendations.length}`);
    
    console.log('\n2. 测试获取分析记录...');
    const recordsResult = await AnalysisService.getAnalysisRecords({
      petId: recordData.petId,
      page: 1,
      limit: 10
    });
    console.log('✓ 获取分析记录成功');
    console.log(`  - 记录数量: ${recordsResult.records.length}`);
    console.log(`  - 总数: ${recordsResult.total}`);
    
    console.log('\n3. 测试获取单个记录...');
    const singleRecord = await AnalysisService.getAnalysisRecord(savedRecord._id.toString());
    console.log('✓ 获取单个记录成功');
    console.log(`  - 记录ID: ${singleRecord._id}`);
    console.log(`  - 用户备注: ${singleRecord.userNotes}`);
    
    console.log('\n4. 测试健康统计...');
    const statistics = await AnalysisService.getHealthStatistics(recordData.petId, 30);
    console.log('✓ 健康统计获取成功');
    console.log(`  - 总记录数: ${statistics.totalRecords}`);
    console.log(`  - 健康记录数: ${statistics.healthyCount}`);
    console.log(`  - 平均每周: ${statistics.averagePerWeek}`);
    
    console.log('\n5. 测试健康趋势...');
    const trends = await AnalysisService.getHealthTrends(recordData.petId, 7);
    console.log('✓ 健康趋势获取成功');
    console.log(`  - 趋势数据点: ${trends.length}`);
    console.log(`  - 今日数据: ${JSON.stringify(trends[trends.length - 1])}`);
    
    console.log('\n6. 测试健康评估...');
    const assessment = await AnalysisService.getHealthAssessment(recordData.petId);
    console.log('✓ 健康评估获取成功');
    console.log(`  - 当前状态: ${assessment.currentStatus}`);
    console.log(`  - 趋势: ${assessment.trend}`);
    console.log(`  - 风险等级: ${assessment.riskLevel}`);
    
    console.log('\n7. 测试删除记录...');
    const deleted = await AnalysisService.deleteAnalysisRecord(savedRecord._id.toString());
    console.log(`✓ 删除记录: ${deleted ? '成功' : '失败'}`);
    
    // 清理测试数据
    await PoopRecord.deleteMany({});
    console.log('✓ 清理测试数据完成');
    
    console.log('\n🎉 分析服务测试完成！');
    
  } catch (error) {
    console.error('❌ 分析服务测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✓ 数据库连接已关闭');
  }
}

// 运行测试
testAnalysisService();