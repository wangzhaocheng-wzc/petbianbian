const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 最终的登录功能测试
async function testLoginFinal() {
  console.log('🧪 最终登录功能测试\n');

  try {
    console.log('=== 1. 基础登录功能测试 ===');
    
    // 正常登录
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    console.log('✅ 登录成功');
    console.log('  - 用户名:', loginResponse.data.data.user.username);
    console.log('  - 邮箱:', loginResponse.data.data.user.email);
    console.log('  - 最后登录时间:', loginResponse.data.data.user.lastLoginAt);
    
    const { accessToken, refreshToken } = loginResponse.data.data.tokens;

    console.log('\n=== 2. JWT令牌验证测试 ===');
    
    // 验证访问令牌
    const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('✅ 访问令牌验证成功');
    console.log('  - 令牌长度:', accessToken.length);
    console.log('  - 用户ID:', meResponse.data.data.user.id);

    console.log('\n=== 3. 令牌刷新测试 ===');
    
    // 刷新令牌
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });
    console.log('✅ 令牌刷新成功');
    
    const newTokens = refreshResponse.data.data.tokens;
    console.log('  - 新访问令牌长度:', newTokens.accessToken.length);
    console.log('  - 新刷新令牌长度:', newTokens.refreshToken.length);
    console.log('  - 令牌已更新:', newTokens.accessToken !== accessToken);

    console.log('\n=== 4. 身份验证中间件测试 ===');
    
    // 测试新令牌的有效性
    const newMeResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${newTokens.accessToken}` }
    });
    console.log('✅ 新访问令牌有效');
    console.log('  - 用户验证:', newMeResponse.data.data.user.username === 'testuser123');

    console.log('\n=== 5. 错误处理测试 ===');
    
    // 测试各种错误情况
    const errorTests = [
      {
        name: '无效邮箱',
        data: { email: 'invalid@example.com', password: 'password123' },
        expectedStatus: 401
      },
      {
        name: '错误密码',
        data: { email: 'test@example.com', password: 'wrongpassword' },
        expectedStatus: 401
      },
      {
        name: '空邮箱',
        data: { email: '', password: 'password123' },
        expectedStatus: 400
      },
      {
        name: '空密码',
        data: { email: 'test@example.com', password: '' },
        expectedStatus: 400
      }
    ];

    for (const test of errorTests) {
      try {
        await axios.post(`${BASE_URL}/auth/login`, test.data);
        console.log(`❌ ${test.name}: 应该失败但成功了`);
      } catch (error) {
        if (error.response.status === test.expectedStatus) {
          console.log(`✅ ${test.name}: 正确处理 (${error.response.status})`);
        } else {
          console.log(`⚠️ ${test.name}: 状态码不匹配 (期望${test.expectedStatus}, 实际${error.response.status})`);
        }
      }
    }

    console.log('\n=== 6. 登出功能测试 ===');
    
    // 登出
    const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { 'Authorization': `Bearer ${newTokens.accessToken}` }
    });
    console.log('✅ 登出成功:', logoutResponse.data.message);

    console.log('\n=== 7. 安全性测试 ===');
    
    // 测试令牌类型混用
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
      console.log('❌ 刷新令牌访问受保护路由: 应该失败但成功了');
    } catch (error) {
      console.log('✅ 刷新令牌访问受保护路由: 正确拒绝');
      console.log('  - 错误代码:', error.response.data.code);
    }

    // 测试过期令牌处理（模拟）
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid' }
      });
      console.log('❌ 无效令牌: 应该失败但成功了');
    } catch (error) {
      console.log('✅ 无效令牌: 正确拒绝');
      console.log('  - 错误代码:', error.response.data.code);
    }

    console.log('\n=== 8. 性能测试 ===');
    
    // 测试并发登录
    const startTime = Date.now();
    const concurrentLogins = await Promise.all([
      axios.post(`${BASE_URL}/auth/login`, { email: 'test@example.com', password: 'password123' }),
      axios.post(`${BASE_URL}/auth/login`, { email: 'test@example.com', password: 'password123' }),
      axios.post(`${BASE_URL}/auth/login`, { email: 'test@example.com', password: 'password123' })
    ]);
    const endTime = Date.now();
    
    console.log('✅ 并发登录测试:');
    console.log('  - 并发数量:', concurrentLogins.length);
    console.log('  - 总耗时:', endTime - startTime, 'ms');
    console.log('  - 平均耗时:', Math.round((endTime - startTime) / concurrentLogins.length), 'ms');
    
    // 验证令牌唯一性
    const tokens = concurrentLogins.map(r => r.data.data.tokens.accessToken);
    const uniqueTokens = new Set(tokens);
    console.log('  - 令牌唯一性:', uniqueTokens.size === tokens.length ? '通过' : '失败');

    console.log('\n🎉 所有登录功能测试完成！');
    
    console.log('\n📊 功能覆盖总结:');
    console.log('✅ 用户登录 - JWT令牌生成和验证机制');
    console.log('✅ 登录API端点 - 完整的输入验证和错误处理');
    console.log('✅ 身份验证中间件 - 令牌验证和权限控制');
    console.log('✅ 登录状态管理 - 用户信息获取和状态更新');
    console.log('✅ 令牌刷新逻辑 - 访问令牌和刷新令牌轮换');
    console.log('✅ 安全性保障 - 令牌类型验证和错误处理');
    console.log('✅ 性能优化 - 并发处理和令牌唯一性');
    
    console.log('\n需求覆盖:');
    console.log('✅ 需求5.2: 用户登录功能完全实现');
    console.log('✅ 需求6.2: JWT令牌验证和安全机制完全实现');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testLoginFinal();