const axios = require('axios');

async function testRegister() {
  console.log('测试用户注册...');
  
  const registerData = {
    username: "testuser",
    email: "test@example.com", 
    password: "test123456",
    confirmPassword: "test123456"
  };
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', registerData);
    console.log('注册成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('注册失败!');
    console.log('错误状态:', error.response?.status);
    console.log('错误信息:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function testLogin() {
  console.log('\n测试用户登录...');
  
  const loginData = {
    email: "test@example.com",
    password: "test123456"
  };
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
    console.log('登录成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('登录失败!');
    console.log('错误状态:', error.response?.status);
    console.log('错误信息:', JSON.stringify(error.response?.data, null, 2));
  }
}

async function main() {
  await testRegister();
  await testLogin();
}

main();