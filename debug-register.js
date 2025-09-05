const axios = require('axios');

async function debugRegister() {
  console.log('🔍 调试用户注册问题...\n');
  
  const API_BASE = 'http://localhost:5000/api';
  const timestamp = Date.now();
  
  const registerData = {
    username: `testuser${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'test123456',
    confirmPassword: 'test123456'
  };
  
  console.log('注册数据:', JSON.stringify(registerData, null, 2));
  
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, registerData);
    console.log('✅ 注册成功!');
    console.log('响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ 注册失败!');
    console.log('状态码:', error.response?.status);
    console.log('错误详情:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.errors) {
      console.log('\n具体错误:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. 字段: ${err.field}, 错误: ${err.message}`);
      });
    }
  }
}

debugRegister();