const axios = require('axios');

async function debugPetCreation() {
  console.log('🔍 调试宠物创建问题...\n');
  
  const API_BASE = 'http://localhost:5000/api';
  const timestamp = Date.now().toString().slice(-6);
  
  try {
    // 先注册用户
    const registerData = {
      username: `user${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'abc123456',
      confirmPassword: 'abc123456'
    };
    
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    const token = registerResponse.data.data.tokens.accessToken;
    console.log('✅ 用户注册成功，获取到令牌');
    
    // 创建宠物
    console.log('\n🐕 尝试创建宠物...');
    const petData = {
      name: '小黄',
      type: 'dog',
      breed: '金毛寻回犬',
      age: 2,
      weight: 25.5,
      gender: 'male',
      description: '活泼可爱的金毛犬'
    };
    
    console.log('宠物数据:', JSON.stringify(petData, null, 2));
    
    const petResponse = await axios.post(`${API_BASE}/pets`, petData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 宠物创建成功!');
    console.log('响应状态:', petResponse.status);
    console.log('响应数据:', JSON.stringify(petResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ 宠物创建失败!');
    console.log('状态码:', error.response?.status);
    console.log('错误信息:', error.response?.data?.message || error.message);
    console.log('完整错误响应:', JSON.stringify(error.response?.data, null, 2));
  }
}

debugPetCreation();