const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试用户登录功能
async function testLogin() {
  console.log('🧪 开始测试用户登录功能...\n');

  try {
    // 1. 测试登录 - 使用已注册的用户
    console.log('1. 测试用户登录...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    console.log('✅ 登录成功:', {
      success: loginResponse.data.success,
      message: loginResponse.data.message,
      user: loginResponse.data.data.user.username,
      hasTokens: !!loginResponse.data.data.tokens
    });

    const { accessToken, refreshToken } = loginResponse.data.data.tokens;

    // 2. 测试获取当前用户信息
    console.log('\n2. 测试获取当前用户信息...');
    const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ 获取用户信息成功:', {
      success: meResponse.data.success,
      username: meResponse.data.data.user.username,
      email: meResponse.data.data.user.email
    });

    // 3. 测试令牌刷新
    console.log('\n3. 测试令牌刷新...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });

    console.log('✅ 令牌刷新成功:', {
      success: refreshResponse.data.success,
      message: refreshResponse.data.message,
      hasNewTokens: !!refreshResponse.data.data.tokens
    });

    // 4. 测试登出
    console.log('\n4. 测试用户登出...');
    const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ 登出成功:', {
      success: logoutResponse.data.success,
      message: logoutResponse.data.message
    });

    // 5. 测试错误情况 - 无效邮箱
    console.log('\n5. 测试错误情况 - 无效邮箱...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'nonexistent@example.com',
        password: 'password123'
      });
    } catch (error) {
      console.log('✅ 正确处理无效邮箱:', {
        status: error.response.status,
        message: error.response.data.message
      });
    }

    // 6. 测试错误情况 - 错误密码
    console.log('\n6. 测试错误情况 - 错误密码...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ 正确处理错误密码:', {
        status: error.response.status,
        message: error.response.data.message
      });
    }

    // 7. 测试错误情况 - 无效令牌
    console.log('\n7. 测试错误情况 - 无效令牌...');
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
    } catch (error) {
      console.log('✅ 正确处理无效令牌:', {
        status: error.response.status,
        message: error.response.data.message
      });
    }

    console.log('\n🎉 所有登录功能测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testLogin();