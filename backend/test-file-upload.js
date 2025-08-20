const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// 测试用户凭据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createTestImage() {
  // 创建一个简单的测试图片文件
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  
  // 如果测试图片不存在，创建一个简单的文本文件作为测试
  if (!fs.existsSync(testImagePath)) {
    // 创建一个小的测试文件
    const testContent = Buffer.from('test image content');
    fs.writeFileSync(testImagePath, testContent);
  }
  
  return testImagePath;
}

async function testAnalysisUpload() {
  try {
    console.log('\n📤 测试便便分析图片上传...');
    
    const testImagePath = await createTestImage();
    const formData = new FormData();
    
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('petId', '507f1f77bcf86cd799439011'); // 测试宠物ID
    formData.append('notes', '测试上传便便图片');
    formData.append('symptoms', '无异常症状');
    
    const response = await axios.post(`${BASE_URL}/analysis/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 便便分析图片上传成功');
      console.log('📊 分析结果:', response.data.data.analysis);
      return response.data.data;
    } else {
      console.log('❌ 上传失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 上传请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testAvatarUpload() {
  try {
    console.log('\n📤 测试头像上传...');
    
    const testImagePath = await createTestImage();
    const formData = new FormData();
    
    formData.append('avatar', fs.createReadStream(testImagePath));
    
    const response = await axios.post(`${BASE_URL}/upload/avatar`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 头像上传成功');
      console.log('🖼️ 头像URL:', response.data.data.url);
      return response.data.data;
    } else {
      console.log('❌ 头像上传失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 头像上传请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testCommunityImagesUpload() {
  try {
    console.log('\n📤 测试社区图片上传...');
    
    const testImagePath = await createTestImage();
    const formData = new FormData();
    
    // 上传多张图片
    formData.append('images', fs.createReadStream(testImagePath));
    formData.append('images', fs.createReadStream(testImagePath));
    
    const response = await axios.post(`${BASE_URL}/upload/community`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 社区图片上传成功');
      console.log('📸 上传数量:', response.data.data.count);
      console.log('🖼️ 图片URLs:', response.data.data.files.map(f => f.url));
      return response.data.data;
    } else {
      console.log('❌ 社区图片上传失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 社区图片上传请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetAnalysisRecords() {
  try {
    console.log('\n📋 测试获取分析记录...');
    
    const petId = '507f1f77bcf86cd799439011';
    const response = await axios.get(`${BASE_URL}/analysis/records/${petId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取分析记录成功');
      console.log('📊 记录数量:', response.data.data.records.length);
      console.log('📈 统计信息:', response.data.data.statistics);
      return response.data.data;
    } else {
      console.log('❌ 获取记录失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 获取记录请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 开始文件上传功能测试...\n');
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 无法继续测试，登录失败');
    return;
  }
  
  // 测试各种上传功能
  await testAnalysisUpload();
  await testAvatarUpload();
  await testCommunityImagesUpload();
  await testGetAnalysisRecords();
  
  // 清理测试文件
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
  
  console.log('\n🎉 文件上传功能测试完成！');
}

// 运行测试
runTests().catch(console.error);