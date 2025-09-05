const axios = require('axios');

async function runSimpleTests() {
  console.log('🧪 运行简单的系统功能测试...\n');
  
  const API_BASE = 'http://localhost:5000/api';
  let testResults = {
    healthCheck: false,
    userRegistration: false,
    userLogin: false,
    petManagement: false,
    communityPosts: false
  };
  
  try {
    // 1. 健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    if (healthResponse.status === 200) {
      console.log('✅ 健康检查通过');
      console.log('   数据库状态:', healthResponse.data.database);
      console.log('   缓存状态:', healthResponse.data.cache);
      testResults.healthCheck = true;
    }
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
  }
  
  try {
    // 2. 用户注册
    console.log('\n2. 测试用户注册...');
    const timestamp = Date.now();
    const registerData = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'test123456',
      confirmPassword: 'test123456'
    };
    
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    if (registerResponse.status === 201) {
      console.log('✅ 用户注册成功');
      console.log('   用户ID:', registerResponse.data.data.user.id);
      testResults.userRegistration = true;
      
      // 3. 用户登录
      console.log('\n3. 测试用户登录...');
      const loginData = {
        email: registerData.email,
        password: registerData.password
      };
      
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
      if (loginResponse.status === 200) {
        console.log('✅ 用户登录成功');
        const token = loginResponse.data.data.tokens.accessToken;
        testResults.userLogin = true;
        
        // 4. 宠物管理测试
        console.log('\n4. 测试宠物管理...');
        const petData = {
          name: '测试宠物',
          type: 'dog',
          breed: '金毛',
          age: 2,
          weight: 25.5,
          description: '这是一只测试宠物'
        };
        
        const petResponse = await axios.post(`${API_BASE}/pets`, petData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (petResponse.status === 201) {
          console.log('✅ 宠物创建成功');
          console.log('   宠物ID:', petResponse.data.data.pet._id);
          testResults.petManagement = true;
        }
        
        // 5. 社区帖子测试
        console.log('\n5. 测试社区功能...');
        const postsResponse = await axios.get(`${API_BASE}/community/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (postsResponse.status === 200) {
          console.log('✅ 社区帖子获取成功');
          console.log('   帖子数量:', postsResponse.data.data.posts.length);
          testResults.communityPosts = true;
        }
      }
    }
  } catch (error) {
    console.log('❌ 测试失败:', error.response?.data?.message || error.message);
  }
  
  // 测试结果汇总
  console.log('\n📊 测试结果汇总:');
  console.log('健康检查:', testResults.healthCheck ? '✅ 通过' : '❌ 失败');
  console.log('用户注册:', testResults.userRegistration ? '✅ 通过' : '❌ 失败');
  console.log('用户登录:', testResults.userLogin ? '✅ 通过' : '❌ 失败');
  console.log('宠物管理:', testResults.petManagement ? '✅ 通过' : '❌ 失败');
  console.log('社区功能:', testResults.communityPosts ? '✅ 通过' : '❌ 失败');
  
  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有核心功能测试通过！系统运行正常。');
    console.log('\n📝 已验证功能:');
    console.log('   ✅ 后端API服务');
    console.log('   ✅ 数据库连接');
    console.log('   ✅ 用户认证系统');
    console.log('   ✅ 宠物管理功能');
    console.log('   ✅ 社区交互功能');
  } else {
    console.log('\n⚠️  部分功能测试失败，请检查相关服务。');
  }
}

runSimpleTests();