// 快速测试脚本 - 假设服务器已经在运行
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function quickTest() {
  try {
    console.log('测试服务器健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 服务器正常运行');
    console.log('健康检查响应:', healthResponse.data);

    console.log('\n测试用户注册...');
    const testUser = {
      username: 'quicktest' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    console.log('✅ 注册成功!');
    console.log('用户信息:', {
      id: registerResponse.data.data.user.id,
      username: registerResponse.data.data.user.username,
      email: registerResponse.data.data.user.email,
      hasToken: !!registerResponse.data.data.tokens.accessToken
    });

    console.log('\n✅ 所有测试通过! 用户注册功能正常工作。');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ 无法连接到服务器');
      console.log('请先运行: npm run dev');
    } else if (error.response) {
      console.log('❌ API 错误:', error.response.status);
      console.log('错误详情:', error.response.data);
    } else {
      console.log('❌ 未知错误:', error.message);
    }
  }
}

quickTest();