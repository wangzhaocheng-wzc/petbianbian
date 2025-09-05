const axios = require('axios');

async function runCompleteTest() {
  console.log('🚀 运行完整的系统功能测试...\n');
  
  const API_BASE = 'http://localhost:5000/api';
  const timestamp = Date.now().toString().slice(-6);
  let token = '';
  let userId = '';
  let petId = '';
  
  try {
    // 1. 健康检查
    console.log('1. 🏥 健康检查...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ 系统健康状态正常');
    console.log(`   数据库: ${healthResponse.data.database}`);
    console.log(`   缓存: ${healthResponse.data.cache}`);
    
    // 2. 用户注册
    console.log('\n2. 👤 用户注册...');
    const registerData = {
      username: `user${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'abc123456',
      confirmPassword: 'abc123456'
    };
    
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    token = registerResponse.data.data.tokens.accessToken;
    userId = registerResponse.data.data.user.id;
    console.log('✅ 用户注册成功');
    console.log(`   用户ID: ${userId}`);
    console.log(`   用户名: ${registerResponse.data.data.user.username}`);
    
    // 3. 用户登录
    console.log('\n3. 🔐 用户登录...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });
    console.log('✅ 用户登录成功');
    console.log(`   最后登录: ${loginResponse.data.data.user.lastLoginAt}`);
    
    // 4. 宠物管理
    console.log('\n4. 🐕 宠物管理...');
    const petData = {
      name: '小黄',
      type: 'dog',
      breed: '金毛寻回犬',
      age: 2,
      weight: 25.5,
      gender: 'male',
      description: '活泼可爱的金毛犬'
    };
    
    const petResponse = await axios.post(`${API_BASE}/pets`, petData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    petId = petResponse.data.data.id;
    console.log('✅ 宠物创建成功');
    console.log(`   宠物ID: ${petId}`);
    console.log(`   宠物名称: ${petResponse.data.data.name}`);
    
    // 获取宠物列表
    const petsListResponse = await axios.get(`${API_BASE}/pets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 宠物列表获取成功 (${petsListResponse.data.data.pets.length} 只宠物)`);
    
    // 5. 分析记录
    console.log('\n5. 📊 分析记录...');
    const recordsResponse = await axios.get(`${API_BASE}/records`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 分析记录获取成功');
    console.log(`   记录数量: ${recordsResponse.data.data.records.length}`);
    
    // 6. 社区功能
    console.log('\n6. 👥 社区功能...');
    const postsResponse = await axios.get(`${API_BASE}/community/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 社区帖子获取成功');
    console.log(`   帖子数量: ${postsResponse.data.data.posts.length}`);
    
    // 7. 统计数据
    console.log('\n7. 📈 统计数据...');
    const statsResponse = await axios.get(`${API_BASE}/records/statistics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 统计数据获取成功');
    console.log(`   总用户数: ${statsResponse.data.data.totalUsers}`);
    console.log(`   总宠物数: ${statsResponse.data.data.totalPets}`);
    console.log(`   总分析数: ${statsResponse.data.data.totalAnalysis}`);
    
    // 8. 用户信息
    console.log('\n8. ℹ️  用户信息...');
    const userInfoResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 用户信息获取成功');
    console.log(`   用户状态: ${userInfoResponse.data.data.user.isActive ? '活跃' : '非活跃'}`);
    console.log(`   验证状态: ${userInfoResponse.data.data.user.isVerified ? '已验证' : '未验证'}`);
    
    console.log('\n🎉 所有功能测试通过！');
    console.log('\n📋 已验证功能列表:');
    console.log('   ✅ 系统健康检查');
    console.log('   ✅ 用户注册和登录');
    console.log('   ✅ JWT令牌认证');
    console.log('   ✅ 宠物信息管理');
    console.log('   ✅ 分析记录查询');
    console.log('   ✅ 社区帖子浏览');
    console.log('   ✅ 统计数据获取');
    console.log('   ✅ 用户信息管理');
    
    console.log('\n🔗 系统访问地址:');
    console.log('   后端API: http://localhost:5000/api');
    console.log('   前端应用: http://localhost:3000 (如果已启动)');
    console.log('   健康检查: http://localhost:5000/api/health');
    
  } catch (error) {
    console.log('\n❌ 测试过程中出现错误:');
    console.log('状态码:', error.response?.status);
    console.log('错误信息:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('详细错误:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.field}: ${err.message}`);
      });
    }
  }
}

runCompleteTest();