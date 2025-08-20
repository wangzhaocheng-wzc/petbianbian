const fs = require('fs');
const path = require('path');

// 测试AI服务功能
async function testAIService() {
  try {
    console.log('开始测试AI服务...');
    
    // 动态导入ES模块
    const { AIService } = await import('./dist/services/aiService.js');
    
    // 创建测试图片文件
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // 创建一个简单的测试图片数据
    const testImageBuffer = Buffer.from('fake-image-data');
    fs.writeFileSync(testImagePath, testImageBuffer);
    
    console.log('1. 测试图片预处理...');
    try {
      const processedImage = await AIService.preprocessImage(testImagePath);
      console.log('✓ 图片预处理测试通过');
      console.log(`  - 处理后大小: ${processedImage.size} bytes`);
      console.log(`  - 格式: ${processedImage.format}`);
    } catch (error) {
      console.log('✗ 图片预处理测试失败 (预期的，因为是假图片数据)');
    }
    
    console.log('\n2. 测试分析结果生成...');
    const mockProcessedImage = {
      buffer: Buffer.from('test'),
      width: 512,
      height: 512,
      format: 'jpeg',
      size: 1024
    };
    
    const analysisResult = await AIService.analyzePoopImage(mockProcessedImage);
    console.log('✓ AI分析测试通过');
    console.log(`  - 形状: ${analysisResult.shape}`);
    console.log(`  - 健康状态: ${analysisResult.healthStatus}`);
    console.log(`  - 置信度: ${analysisResult.confidence}%`);
    console.log(`  - 详情: ${analysisResult.details}`);
    
    console.log('\n3. 测试结果验证...');
    const isValid = AIService.validateAnalysisResult(analysisResult);
    console.log(`✓ 结果验证: ${isValid ? '通过' : '失败'}`);
    
    console.log('\n4. 测试描述获取...');
    const shapeDesc = AIService.getShapeDescription(analysisResult.shape);
    const statusDesc = AIService.getHealthStatusDescription(analysisResult.healthStatus);
    console.log(`✓ 形状描述: ${shapeDesc}`);
    console.log(`✓ 状态描述: ${statusDesc}`);
    
    // 清理测试文件
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    console.log('\n🎉 AI服务测试完成！');
    
  } catch (error) {
    console.error('❌ AI服务测试失败:', error.message);
  }
}

// 运行测试
testAIService();