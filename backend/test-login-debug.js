const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('测试登录功能...');
    
    // 首先测试服务器是否运行
    const healthCheck = await axios.get('http://localhost:5000/api/health').catch(() => null);
    if (!healthCheck) {
      console.log('后端服务器未运行');
      return;
    }
    
    console.log('服务器运行正常，尝试登录...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('登录成功:', response.data);
    
  } catch (error) {
    console.log('登录失败:');
    console.log('状态码:', error.response?.status);
    console.log('错误信息:', error.response?.data);
    console.log('完整错误:', error.message);
  }
};

testLogin();