const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// 创建一个简单的测试图片
function createTestImage() {
  // 创建一个最小的有效JPEG图片 (1x1像素的白色JPEG)
  const jpegData = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
    0xFF, 0xD9
  ]);
  
  const testImagePath = path.join(__dirname, 'test-poop.jpg');
  fs.writeFileSync(testImagePath, jpegData);
  return testImagePath;
}

async function testPoopAnalysisComplete() {
  console.log('🧪 开始完整便便分析功能测试...\n');
  
  const baseURL = 'http://localhost:5000';
  let authToken = null;
  let testPetId = null;
  
  try {
    // 1. 用户注册/登录
    console.log('1. 测试用户认证...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      authToken = loginResponse.data.data.tokens.accessToken;
      console.log('✓ 用户登录成功');
    } catch (error) {
      // 如果登录失败，尝试注册
      const registerResponse = await axios.post(`${baseURL}/api/auth/register`, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      authToken = registerResponse.data.data.tokens.accessToken;
      console.log('✓ 用户注册成功');
    }
    
    // 2. 创建测试宠物
    console.log('\n2. 创建测试宠物...');
    const petResponse = await axios.post(`${baseURL}/api/pets`, {
      name: '测试小狗',
      type: 'dog',
      breed: '金毛',
      age: 2,
      weight: 25.5,
      gender: 'male'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    testPetId = petResponse.data.data.id;
    console.log('✓ 测试宠物创建成功:', petResponse.data.data.name);
    
    // 3. 创建测试图片
    console.log('\n3. 准备测试图片...');
    const testImagePath = createTestImage();
    console.log('✓ 测试图片创建成功:', testImagePath);
    
    // 4. 测试便便分析上传
    console.log('\n4. 测试便便分析上传...');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('petId', testPetId);
    formData.append('notes', '测试分析 - 宠物今天精神状态良好');
    formData.append('symptoms', '无异常症状');
    
    const analysisResponse = await axios.post(`${baseURL}/api/analysis/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log('✓ 便便分析上传成功!');
    console.log('  分析结果:');
    console.log(`    - 形状: ${analysisResponse.data.data.analysis.shape}`);
    console.log(`    - 健康状态: ${analysisResponse.data.data.analysis.healthStatus}`);
    console.log(`    - 置信度: ${analysisResponse.data.data.analysis.confidence}%`);
    console.log(`    - 详情: ${analysisResponse.data.data.analysis.details}`);
    console.log(`    - 建议数量: ${analysisResponse.data.data.analysis.recommendations.length}`);
    
    const recordId = analysisResponse.data.data.id;
    
    // 5. 测试获取分析记录
    console.log('\n5. 测试获取分析记录...');
    const recordsResponse = await axios.get(`${baseURL}/api/analysis/records/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✓ 分析记录获取成功');
    console.log(`  - 总记录数: ${recordsResponse.data.data.records.length}`);
    console.log(`  - 健康统计: ${JSON.stringify(recordsResponse.data.data.statistics)}`);
    
    // 6. 测试获取单个记录
    console.log('\n6. 测试获取单个分析记录...');
    const singleRecordResponse = await axios.get(`${baseURL}/api/analysis/record/${recordId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✓ 单个记录获取成功');
    console.log(`  - 记录ID: ${singleRecordResponse.data.data._id}`);
    console.log(`  - 用户备注: ${singleRecordResponse.data.data.userNotes}`);
    
    // 7. 测试获取统计数据
    console.log('\n7. 测试获取统计数据...');
    const statsResponse = await axios.get(`${baseURL}/api/analysis/statistics/${testPetId}?period=month`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✓ 统计数据获取成功');
    console.log(`  - 分析周期: ${statsResponse.data.data.period}`);
    console.log(`  - 总分析次数: ${statsResponse.data.data.totalAnalysis}`);
    console.log(`  - 健康百分比: ${statsResponse.data.data.healthyPercentage}%`);
    
    // 8. 清理测试数据
    console.log('\n8. 清理测试数据...');
    
    // 删除分析记录
    await axios.delete(`${baseURL}/api/analysis/record/${recordId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 分析记录删除成功');
    
    // 删除测试宠物
    await axios.delete(`${baseURL}/api/pets/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 测试宠物删除成功');
    
    // 删除测试图片
    fs.unlinkSync(testImagePath);
    console.log('✓ 测试图片删除成功');
    
    console.log('\n🎉 便便分析功能完整测试通过！');
    console.log('\n✅ 测试覆盖功能:');
    console.log('  - 用户认证');
    console.log('  - 宠物管理');
    console.log('  - 图片上传');
    console.log('  - AI分析');
    console.log('  - 记录存储');
    console.log('  - 数据查询');
    console.log('  - 统计分析');
    console.log('  - 数据删除');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    // 尝试清理可能创建的数据
    if (authToken && testPetId) {
      try {
        await axios.delete(`${baseURL}/api/pets/${testPetId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✓ 清理测试宠物成功');
      } catch (cleanupError) {
        console.log('⚠️ 清理测试数据失败');
      }
    }
  }
}

// 运行测试
testPoopAnalysisComplete().catch(console.error);