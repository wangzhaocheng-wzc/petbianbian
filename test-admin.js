const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// 测试管理员功能
async function testAdminInterface() {
  try {
    console.log('🧪 测试管理员界面功能...\n');

    // 1. 测试用户注册（创建管理员用户）
    console.log('1. 创建管理员用户...');
    const adminData = {
      username: 'admin',
      email: 'admin@test.com',
      password: 'admin123',
      confirmPassword: 'admin123'
    };

    let adminToken;
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, adminData);
      console.log('✅ 管理员用户创建成功');
      adminToken = registerResponse.data.data.tokens.accessToken;
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('已存在')) {
        console.log('ℹ️  管理员用户已存在，尝试登录...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: adminData.email,
          password: adminData.password
        });
        adminToken = loginResponse.data.data.tokens.accessToken;
        console.log('✅ 管理员登录成功');
      } else {
        throw error;
      }
    }

    // 2. 手动设置用户为管理员（在实际应用中，这应该通过数据库直接操作）
    console.log('\n2. 设置用户角色为管理员...');
    // 注意：这里需要直接在数据库中设置用户角色为 'admin'
    console.log('⚠️  请在数据库中手动将用户角色设置为 admin');

    // 3. 测试获取用户列表
    console.log('\n3. 测试获取用户列表...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 获取用户列表成功');
      console.log(`   用户数量: ${usersResponse.data.data.users.length}`);
    } catch (error) {
      console.log('❌ 获取用户列表失败:', error.response?.data?.message || error.message);
    }

    // 4. 测试获取系统统计
    console.log('\n4. 测试获取系统统计...');
    try {
      const statsResponse = await axios.get(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 获取系统统计成功');
      console.log('   统计数据:', JSON.stringify(statsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ 获取系统统计失败:', error.response?.data?.message || error.message);
    }

    // 5. 测试审核统计
    console.log('\n5. 测试审核统计...');
    try {
      const moderationStatsResponse = await axios.get(`${API_BASE}/moderation/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 获取审核统计成功');
      console.log('   审核统计:', JSON.stringify(moderationStatsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ 获取审核统计失败:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 管理员界面测试完成！');
    console.log('\n📝 测试说明:');
    console.log('- 管理员界面包含用户管理、内容审核、举报处理等功能');
    console.log('- 需要管理员权限才能访问相关接口');
    console.log('- 前端界面提供了完整的管理后台功能');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.response?.data || error.message);
  }
}

// 运行测试
testAdminInterface();