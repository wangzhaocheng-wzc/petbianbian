const axios = require('axios');

async function testNewUserRegister() {
  console.log('测试新用户注册...');
  
  const registerData = {
    username: "newuser" + Date.now(),
    email: "newuser" + Date.now() + "@example.com", 
    password: "abc123456",
    confirmPassword: "abc123456"
  };
  
  console.log('注册数据:', registerData);
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', registerData);
    console.log('注册成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 立即尝试登录
    console.log('\n尝试登录刚注册的用户...');
    const loginData = {
      email: registerData.email,
      password: registerData.password
    };
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', loginData);
    console.log('登录成功!');
    console.log('登录响应:', JSON.stringify(loginResponse.data, null, 2));
    
  } catch (error) {
    console.log('操作失败!');
    console.log('错误状态:', error.response?.status);
    console.log('错误信息:', JSON.stringify(error.response?.data, null, 2));
  }
}

testNewUserRegister();