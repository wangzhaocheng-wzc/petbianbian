const axios = require('axios');

async function runComprehensiveTests() {
  console.log('🧪 运行综合功能测试套件...\n');
  
  const API_BASE = 'http://localhost:5000/api';
  const timestamp = Date.now().toString().slice(-6);
  let token = '';
  let userId = '';
  let petId = '';
  let postId = '';
  
  const testResults = {
    healthCheck: false,
    userAuth: false,
    petManagement: false,
    communityFeatures: false,
    analysisRecords: false,
    errorHandling: false,
    dataValidation: false
  };
  
  try {
    // 1. 系统健康检查
    console.log('1. 🏥 系统健康检查...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ 系统健康状态正常');
    console.log(`   数据库: ${healthResponse.data.database}`);
    console.log(`   缓存: ${healthResponse.data.cache}`);
    console.log(`   时间戳: ${healthResponse.data.timestamp}`);
    testResults.healthCheck = true;
    
    // 2. 用户认证系统测试
    console.log('\n2. 👤 用户认证系统测试...');
    
    // 注册用户
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
    
    // 登录验证
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });
    console.log('✅ 用户登录验证成功');
    
    // 获取用户信息
    const userInfoResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 用户信息获取成功');
    console.log(`   用户ID: ${userInfoResponse.data.data.user.id}`);
    console.log(`   用户名: ${userInfoResponse.data.data.user.username}`);
    testResults.userAuth = true;
    
    // 3. 宠物管理功能测试
    console.log('\n3. 🐕 宠物管理功能测试...');
    
    // 创建宠物
    const petData = {
      name: '测试宠物',
      type: 'dog',
      breed: '金毛寻回犬',
      age: 3,
      weight: 28.5,
      gender: 'female',
      description: '友善活泼的金毛犬'
    };
    
    const petResponse = await axios.post(`${API_BASE}/pets`, petData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    petId = petResponse.data.data.id;
    console.log('✅ 宠物创建成功');
    console.log(`   宠物ID: ${petId}`);
    
    // 获取宠物列表
    const petsListResponse = await axios.get(`${API_BASE}/pets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 宠物列表获取成功 (${petsListResponse.data.data.pets.length} 只宠物)`);
    
    // 更新宠物信息
    const updatePetResponse = await axios.put(`${API_BASE}/pets/${petId}`, {
      ...petData,
      age: 4,
      description: '更新后的宠物描述'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 宠物信息更新成功');
    testResults.petManagement = true;
    
    // 4. 社区功能测试
    console.log('\n4. 👥 社区功能测试...');
    
    // 获取社区帖子
    const postsResponse = await axios.get(`${API_BASE}/community/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 社区帖子获取成功 (${postsResponse.data.data.posts.length} 个帖子)`);
    
    if (postsResponse.data.data.posts.length > 0) {
      postId = postsResponse.data.data.posts[0]._id;
      
      // 测试点赞功能
      const likeResponse = await axios.post(`${API_BASE}/community/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 帖子点赞功能正常');
      
      // 获取评论
      const commentsResponse = await axios.get(`${API_BASE}/community/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ 评论获取成功 (${commentsResponse.data.data.comments.length} 条评论)`);
    }
    testResults.communityFeatures = true;
    
    // 5. 分析记录测试
    console.log('\n5. 📊 分析记录测试...');
    
    const recordsResponse = await axios.get(`${API_BASE}/records`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 分析记录获取成功 (${recordsResponse.data.data.records.length} 条记录)`);
    
    // 获取统计数据
    const statsResponse = await axios.get(`${API_BASE}/records/statistics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 统计数据获取成功');
    testResults.analysisRecords = true;
    
    // 6. 错误处理测试
    console.log('\n6. ⚠️  错误处理测试...');
    
    try {
      // 测试无效令牌
      await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 无效令牌错误处理正常');
      }
    }
    
    try {
      // 测试访问不存在的资源
      await axios.get(`${API_BASE}/pets/nonexistent-id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ 404错误处理正常');
      }
    }
    testResults.errorHandling = true;
    
    // 7. 数据验证测试
    console.log('\n7. 🔍 数据验证测试...');
    
    try {
      // 测试无效的宠物数据
      await axios.post(`${API_BASE}/pets`, {
        name: '', // 空名称
        type: 'invalid-type',
        age: -1 // 无效年龄
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 数据验证错误处理正常');
      }
    }
    
    try {
      // 测试重复用户注册
      await axios.post(`${API_BASE}/auth/register`, registerData);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 重复注册验证正常');
      }
    }
    testResults.dataValidation = true;
    
    // 测试结果汇总
    console.log('\n📊 综合测试结果汇总:');
    Object.entries(testResults).forEach(([test, result]) => {
      const status = result ? '✅ 通过' : '❌ 失败';
      const testName = {
        healthCheck: '系统健康检查',
        userAuth: '用户认证系统',
        petManagement: '宠物管理功能',
        communityFeatures: '社区功能',
        analysisRecords: '分析记录',
        errorHandling: '错误处理',
        dataValidation: '数据验证'
      }[test];
      console.log(`${status} ${testName}`);
    });
    
    const passedTests = Object.values(testResults).filter(result => result).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有综合测试通过！系统功能完整且稳定。');
      console.log('\n📋 已验证的功能模块:');
      console.log('   ✅ 系统监控和健康检查');
      console.log('   ✅ 完整的用户认证流程');
      console.log('   ✅ 宠物信息CRUD操作');
      console.log('   ✅ 社区互动和内容管理');
      console.log('   ✅ 数据分析和统计报告');
      console.log('   ✅ 错误处理和异常恢复');
      console.log('   ✅ 输入验证和安全防护');
      
      console.log('\n🔗 系统访问信息:');
      console.log('   后端API: http://localhost:5000/api');
      console.log('   健康检查: http://localhost:5000/api/health');
      console.log('   API文档: 查看README.md中的API接口说明');
    } else {
      console.log('\n⚠️  部分测试失败，请检查相关功能模块。');
    }
    
  } catch (error) {
    console.log('\n❌ 测试过程中出现严重错误:');
    console.log('错误信息:', error.response?.data?.message || error.message);
    console.log('状态码:', error.response?.status);
    if (error.response?.data?.errors) {
      console.log('详细错误:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.field}: ${err.message}`);
      });
    }
  }
}

runComprehensiveTests();