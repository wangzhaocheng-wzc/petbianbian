const axios = require('axios');

async function testAPIDirect() {
  console.log('🧪 直接测试API端点...\n');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✓ 健康检查通过:', healthResponse.data);
    
    // 2. 测试登录
    console.log('\n2. 测试登录...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✓ 登录成功');
    
    // 3. 测试获取宠物列表
    console.log('\n3. 测试获取宠物列表...');
    const petsResponse = await axios.get(`${baseURL}/api/pets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ 宠物列表获取成功:', petsResponse.data.data.length, '只宠物');
    
    // 4. 如果有宠物，测试获取分析记录
    if (petsResponse.data.data.length > 0) {
      const petId = petsResponse.data.data[0].id;
      console.log('\n4. 测试获取分析记录...');
      const recordsResponse = await axios.get(`${baseURL}/api/analysis/records/${petId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✓ 分析记录获取成功:', recordsResponse.data.data.records.length, '条记录');
    }
    
    console.log('\n🎉 API端点测试完成！');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.response?.data || error.message);
    console.error('状态码:', error.response?.status);
  }
}

testAPIDirect().catch(console.error);