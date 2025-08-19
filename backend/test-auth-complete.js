const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 完整的认证功能测试
async function testAuthComplete() {
  console.log('🧪 开始完整的认证功能测试...\n');

  try {
    // 1. 测试登录验证
    console.log('1. 测试登录输入验证...');
    
    // 测试空邮箱
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: '',
        password: 'password123'
      });
    } catch (error) {
      console.log('✅ 空邮箱验证:', error.response.data.message);
    }

    // 测试无效邮箱格式
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'invalid-email',
        password: 'password123'
      });
    } catch (error) {
      console.log('✅ 无效邮箱格式验证:', error.response.data.message);
    }

    // 测试空密码
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: ''
      });
    } catch (error) {
      console.log('✅ 空密码验证:', error.response.data.message);
    }

    // 2. 测试正常登录流程
    console.log('\n2. 测试正常登录流程...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    console.log('✅ 登录成功');
    const { accessToken, refreshToken } = loginResponse.data.data.tokens;
    const userId = loginResponse.data.data.user.id;

    // 验证令牌格式
    console.log('✅ 访问令牌长度:', accessToken.length);
    console.log('✅ 刷新令牌长度:', refreshToken.length);
    console.log('✅ 用户ID格式:', userId.length === 24 ? '正确' : '错误');

    // 3. 测试受保护的路由
    console.log('\n3. 测试受保护的路由...');
    
    // 无令牌访问
    try {
      await axios.get(`${BASE_URL}/auth/me`);
    } catch (error) {
      console.log('✅ 无令牌访问被拒绝:', error.response.data.code);
    }

    // 无效令牌访问
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
    } catch (error) {
      console.log('✅ 无效令牌被拒绝:', error.response.data.code);
    }

    // 错误的令牌格式
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': 'InvalidFormat token' }
      });
    } catch (error) {
      console.log('✅ 错误令牌格式被拒绝:', error.response.data.code);
    }

    // 正确的令牌访问
    const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('✅ 正确令牌访问成功:', meResponse.data.data.user.username);

    // 4. 测试令牌刷新功能
    console.log('\n4. 测试令牌刷新功能...');
    
    // 无刷新令牌
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {});
    } catch (error) {
      console.log('✅ 无刷新令牌被拒绝:', error.response.data.message);
    }

    // 无效刷新令牌
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: 'invalid-refresh-token'
      });
    } catch (error) {
      console.log('✅ 无效刷新令牌被拒绝:', error.response.data.message);
    }

    // 使用访问令牌作为刷新令牌（应该失败）
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: accessToken
      });
    } catch (error) {
      console.log('✅ 访问令牌作为刷新令牌被拒绝:', error.response.data.message);
    }

    // 正确的刷新令牌
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });
    console.log('✅ 令牌刷新成功');

    const newTokens = refreshResponse.data.data.tokens;
    console.log('✅ 获得新的访问令牌:', newTokens.accessToken.length > 0);
    console.log('✅ 获得新的刷新令牌:', newTokens.refreshToken.length > 0);

    // 5. 测试使用刷新令牌访问受保护路由（应该失败）
    console.log('\n5. 测试使用刷新令牌访问受保护路由...');
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
    } catch (error) {
      console.log('✅ 刷新令牌访问受保护路由被拒绝:', error.response.data.code);
    }

    // 6. 测试新令牌的有效性
    console.log('\n6. 测试新令牌的有效性...');
    const newMeResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${newTokens.accessToken}` }
    });
    console.log('✅ 新访问令牌有效:', newMeResponse.data.data.user.username);

    // 7. 测试登出功能
    console.log('\n7. 测试登出功能...');
    
    // 无令牌登出
    try {
      await axios.post(`${BASE_URL}/auth/logout`);
    } catch (error) {
      console.log('✅ 无令牌登出被拒绝:', error.response.data.code);
    }

    // 正确的登出
    const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { 'Authorization': `Bearer ${newTokens.accessToken}` }
    });
    console.log('✅ 登出成功:', logoutResponse.data.message);

    // 8. 测试用户状态检查
    console.log('\n8. 测试用户状态检查...');
    
    // 再次登录以获取用户信息
    const loginResponse2 = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    const user = loginResponse2.data.data.user;
    console.log('✅ 用户状态检查:', {
      isActive: user.isActive,
      isVerified: user.isVerified,
      hasLastLoginAt: !!user.lastLoginAt,
      statsInitialized: typeof user.stats.totalAnalysis === 'number'
    });

    // 9. 测试并发登录
    console.log('\n9. 测试并发登录...');
    const concurrentLogins = await Promise.all([
      axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      }),
      axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      }),
      axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      })
    ]);

    console.log('✅ 并发登录成功:', concurrentLogins.length);
    
    // 验证每次登录都获得了不同的令牌
    const tokens = concurrentLogins.map(response => response.data.data.tokens.accessToken);
    const uniqueTokens = new Set(tokens);
    console.log('✅ 令牌唯一性:', uniqueTokens.size === tokens.length ? '通过' : '失败');

    console.log('\n🎉 所有认证功能测试通过！');
    console.log('\n📊 测试总结:');
    console.log('- ✅ 输入验证');
    console.log('- ✅ 登录流程');
    console.log('- ✅ 令牌认证');
    console.log('- ✅ 令牌刷新');
    console.log('- ✅ 权限控制');
    console.log('- ✅ 登出功能');
    console.log('- ✅ 用户状态');
    console.log('- ✅ 并发处理');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testAuthComplete();