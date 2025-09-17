const axios = require('axios');

async function testPostAPI() {
  try {
    console.log('🧪 开始测试帖子API...\n');

    // 1. 登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ 登录失败:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ 登录成功，获得token');
    
    // 2. 创建帖子
    console.log('\n2. 创建帖子...');
    const postResponse = await axios.post('http://localhost:5000/api/community/posts', {
      title: '测试帖子',
      content: '这是一个测试帖子的内容',
      category: 'general',
      tags: ['测试', '帖子']
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (postResponse.data.success) {
      console.log('✅ 帖子创建成功');
      console.log('帖子ID:', postResponse.data.data._id);
      console.log('帖子标题:', postResponse.data.data.title);
      console.log('帖子状态:', postResponse.data.data.status);
      console.log('审核状态:', postResponse.data.data.moderationStatus);
    } else {
      console.log('❌ 帖子创建失败:', postResponse.data.message);
    }
    
    // 3. 获取帖子列表验证
    console.log('\n3. 获取帖子列表验证...');
    const listResponse = await axios.get('http://localhost:5000/api/community/posts?limit=5');
    
    if (listResponse.data.success) {
      console.log('✅ 获取帖子列表成功');
      console.log('帖子总数:', listResponse.data.data.pagination.totalItems);
      console.log('当前页帖子数:', listResponse.data.data.posts.length);
    } else {
      console.log('❌ 获取帖子列表失败:', listResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPostAPI();