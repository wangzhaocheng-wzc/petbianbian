const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试用户凭据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

async function testLogin() {
  try {
    console.log('🔐 测试登录...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    
    console.log('登录响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ 登录成功');
      console.log('Token:', authToken ? 'exists' : 'missing');
      if (authToken) {
        console.log('Token前缀:', authToken.substring(0, 20) + '...');
      }
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

async function testRecordsEndpoint() {
  try {
    console.log('\n📋 测试记录端点...');
    const response = await axios.get(`${BASE_URL}/records`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 记录端点测试成功');
    console.log('响应状态:', response.status);
    console.log('记录数量:', response.data.data?.records?.length || 0);
    return true;
    
  } catch (error) {
    console.log('❌ 记录端点测试失败');
    console.log('状态码:', error.response?.status);
    console.log('错误信息:', error.response?.data?.message || error.message);
    console.log('错误代码:', error.response?.data?.code);
    return false;
  }
}

async function testStatisticsEndpoint() {
  try {
    console.log('\n📊 测试统计端点...');
    const response = await axios.get(`${BASE_URL}/records/statistics/overview`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 统计端点测试成功');
    console.log('统计数据:', response.data.data);
    return true;
    
  } catch (error) {
    console.log('❌ 统计端点测试失败');
    console.log('状态码:', error.response?.status);
    console.log('错误信息:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runSimpleTest() {
  console.log('🚀 开始简单记录API测试\n');
  
  // 测试登录
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('❌ 登录失败，终止测试');
    return;
  }
  
  // 测试记录端点
  await testRecordsEndpoint();
  
  // 测试统计端点
  await testStatisticsEndpoint();
  
  console.log('\n✅ 简单测试完成');
}

// 运行测试
runSimpleTest().catch(error => {
  console.error('❌ 测试运行失败:', error.message);
});