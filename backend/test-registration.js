// 简单的注册功能测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testRegistration() {
  try {
    console.log('测试用户注册功能...');
    
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    
    console.log('注册成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 验证响应结构
    if (response.data.success && response.data.data.user && response.data.data.tokens) {
      console.log('✅ 注册功能测试通过');
      console.log('用户ID:', response.data.data.user.id);
      console.log('用户名:', response.data.data.user.username);
      console.log('邮箱:', response.data.data.user.email);
      console.log('访问令牌长度:', response.data.data.tokens.accessToken.length);
    } else {
      console.log('❌ 响应结构不正确');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ 注册失败');
      console.log('状态码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ 网络错误:', error.message);
      console.log('提示: 请确保后端服务器正在运行 (npm run dev)');
    }
  }
}

// 测试重复注册
async function testDuplicateRegistration() {
  try {
    console.log('\n测试重复注册...');
    
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    console.log('❌ 重复注册应该失败，但成功了');
    
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 重复注册正确被拒绝');
      console.log('错误信息:', error.response.data.message);
    } else {
      console.log('❌ 意外的错误:', error.message);
    }
  }
}

// 测试无效数据
async function testInvalidData() {
  try {
    console.log('\n测试无效数据验证...');
    
    const invalidUser = {
      username: 'a', // 太短
      email: 'invalid-email', // 无效邮箱
      password: '123', // 太短
      confirmPassword: '456' // 不匹配
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, invalidUser);
    console.log('❌ 无效数据应该被拒绝，但成功了');
    
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 无效数据正确被拒绝');
      console.log('验证错误:', error.response.data.errors);
    } else {
      console.log('❌ 意外的错误:', error.message);
    }
  }
}

async function runTests() {
  console.log('开始测试用户注册功能...\n');
  
  await testRegistration();
  await testDuplicateRegistration();
  await testInvalidData();
  
  console.log('\n测试完成!');
}

runTests();