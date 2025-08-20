const axios = require('axios');

async function testAuth() {
  console.log('🧪 测试认证功能...\n');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // 测试登录
    console.log('1. 测试登录...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('✓ 登录成功');
    console.log('响应数据:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✓ 获取到访问令牌');
    
    // 测试获取用户信息
    console.log('\n2. 测试获取用户信息...');
    const userResponse = await axios.get(`${baseURL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ 用户信息获取成功');
    console.log('用户信息:', JSON.stringify(userResponse.data, null, 2));
    
    console.log('\n🎉 认证测试通过！');
    
  } catch (error) {
    console.error('❌ 认证测试失败:', error.response?.data || error.message);
  }
}

testAuth().catch(console.error);