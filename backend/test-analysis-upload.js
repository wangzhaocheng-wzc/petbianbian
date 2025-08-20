const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// 创建测试图片
function createTestImage() {
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
  
  const testImagePath = path.join(__dirname, 'test-analysis-upload.jpg');
  fs.writeFileSync(testImagePath, jpegData);
  return testImagePath;
}

async function testAnalysisUpload() {
  console.log('🧪 测试分析上传功能...\n');
  
  const baseURL = 'http://localhost:5000';
  let authToken = null;
  let testPetId = null;
  
  try {
    // 1. 登录获取令牌
    console.log('1. 用户登录...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    authToken = loginResponse.data.data.tokens.accessToken;
    console.log('✓ 登录成功');
    
    // 2. 创建测试宠物
    console.log('\n2. 创建测试宠物...');
    const petResponse = await axios.post(`${baseURL}/api/pets`, {
      name: '分析测试狗',
      type: 'dog',
      breed: '拉布拉多',
      age: 3,
      weight: 30.0,
      gender: 'female'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    testPetId = petResponse.data.data.id;
    console.log('✓ 测试宠物创建成功:', petResponse.data.data.name);
    
    // 3. 创建测试图片
    console.log('\n3. 创建测试图片...');
    const testImagePath = createTestImage();
    console.log('✓ 测试图片创建成功:', testImagePath);
    
    // 4. 测试分析上传
    console.log('\n4. 测试分析上传...');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('petId', testPetId);
    formData.append('notes', '测试上传 - 宠物状态正常');
    formData.append('symptoms', '无异常');
    
    console.log('发送分析请求...');
    const analysisResponse = await axios.post(`${baseURL}/api/analysis/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`
      },
      timeout: 30000 // 30秒超时
    });
    
    console.log('✓ 分析上传成功!');
    console.log('分析结果:', JSON.stringify(analysisResponse.data, null, 2));
    
    // 5. 清理
    console.log('\n5. 清理测试数据...');
    
    // 删除测试宠物
    await axios.delete(`${baseURL}/api/pets/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 测试宠物删除成功');
    
    // 删除测试图片
    fs.unlinkSync(testImagePath);
    console.log('✓ 测试图片删除成功');
    
    console.log('\n🎉 分析上传测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    console.error('错误详情:', error.response?.status, error.response?.statusText);
    
    // 清理
    if (authToken && testPetId) {
      try {
        await axios.delete(`${baseURL}/api/pets/${testPetId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✓ 清理测试宠物成功');
      } catch (cleanupError) {
        console.log('⚠️ 清理失败');
      }
    }
  }
}

testAnalysisUpload().catch(console.error);