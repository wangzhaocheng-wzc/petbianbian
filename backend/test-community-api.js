const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试用户凭据
let authToken = '';
let testUserId = '';
let testPetId = '';
let testPostId = '';
let testCommentId = '';

// 测试数据
const testUser = {
  username: 'testuser_community',
  email: 'testuser_community@example.com',
  password: 'password123'
};

const testPet = {
  name: '测试宠物',
  type: 'dog',
  breed: '金毛',
  age: 24,
  weight: 25.5
};

const testPost = {
  title: '我家狗狗的健康分享',
  content: '今天带狗狗去体检，医生说很健康！分享一些心得...',
  category: 'health',
  tags: ['健康', '体检', '金毛'],
  images: []
};

const testComment = {
  content: '谢谢分享！我家狗狗也是金毛，很有用的信息。'
};

async function makeRequest(method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

async function testCommunityAPI() {
  console.log('🚀 开始测试社区API...\n');

  // 1. 注册测试用户
  console.log('1. 注册测试用户...');
  const registerResult = await makeRequest('POST', '/auth/register', testUser);
  if (registerResult.success) {
    authToken = registerResult.data.data.tokens.accessToken;
    testUserId = registerResult.data.data.user.id;
    console.log('✅ 用户注册成功');
  } else {
    // 如果用户已存在，尝试登录
    console.log('用户可能已存在，尝试登录...');
    const loginResult = await makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    if (loginResult.success) {
      authToken = loginResult.data.data.tokens.accessToken;
      testUserId = loginResult.data.data.user.id;
      console.log('✅ 用户登录成功');
    } else {
      console.log('❌ 用户认证失败:', loginResult.error);
      return;
    }
  }

  // 2. 创建测试宠物
  console.log('\n2. 创建测试宠物...');
  const petResult = await makeRequest('POST', '/pets', testPet, authToken);
  if (petResult.success) {
    testPetId = petResult.data.data.id;
    console.log('✅ 宠物创建成功');
  } else {
    console.log('❌ 宠物创建失败:', petResult.error);
    return;
  }

  // 3. 创建帖子
  console.log('\n3. 创建社区帖子...');
  const postData = { ...testPost, petId: testPetId };
  const createPostResult = await makeRequest('POST', '/community/posts', postData, authToken);
  if (createPostResult.success) {
    testPostId = createPostResult.data.data._id;
    console.log('✅ 帖子创建成功');
    console.log('   帖子ID:', testPostId);
    console.log('   标题:', createPostResult.data.data.title);
  } else {
    console.log('❌ 帖子创建失败:', createPostResult.error);
    return;
  }

  // 4. 获取帖子列表
  console.log('\n4. 获取帖子列表...');
  const postsResult = await makeRequest('GET', '/community/posts?page=1&limit=10');
  if (postsResult.success) {
    console.log('✅ 获取帖子列表成功');
    console.log('   总帖子数:', postsResult.data.data.pagination.totalItems);
    console.log('   分类统计:', postsResult.data.data.categories.map(c => `${c.label}: ${c.count}`).join(', '));
  } else {
    console.log('❌ 获取帖子列表失败:', postsResult.error);
  }

  // 5. 获取单个帖子详情
  console.log('\n5. 获取帖子详情...');
  const postDetailResult = await makeRequest('GET', `/community/posts/${testPostId}`);
  if (postDetailResult.success) {
    console.log('✅ 获取帖子详情成功');
    console.log('   浏览量:', postDetailResult.data.data.interactions.views);
    console.log('   点赞数:', postDetailResult.data.data.interactions.likes.length);
  } else {
    console.log('❌ 获取帖子详情失败:', postDetailResult.error);
  }

  // 6. 点赞帖子
  console.log('\n6. 点赞帖子...');
  const likeResult = await makeRequest('POST', `/community/posts/${testPostId}/like`, null, authToken);
  if (likeResult.success) {
    console.log('✅ 点赞成功');
    console.log('   点赞状态:', likeResult.data.data.isLiked);
    console.log('   点赞数:', likeResult.data.data.likesCount);
  } else {
    console.log('❌ 点赞失败:', likeResult.error);
  }

  // 7. 创建评论
  console.log('\n7. 创建评论...');
  const commentResult = await makeRequest('POST', `/community/posts/${testPostId}/comments`, testComment, authToken);
  if (commentResult.success) {
    testCommentId = commentResult.data.data._id;
    console.log('✅ 评论创建成功');
    console.log('   评论ID:', testCommentId);
    console.log('   评论内容:', commentResult.data.data.content);
  } else {
    console.log('❌ 评论创建失败:', commentResult.error);
  }

  // 8. 获取评论列表
  console.log('\n8. 获取评论列表...');
  const commentsResult = await makeRequest('GET', `/community/posts/${testPostId}/comments`);
  if (commentsResult.success) {
    console.log('✅ 获取评论列表成功');
    console.log('   评论数量:', commentsResult.data.data.pagination.totalItems);
  } else {
    console.log('❌ 获取评论列表失败:', commentsResult.error);
  }

  // 9. 点赞评论
  console.log('\n9. 点赞评论...');
  const likeCommentResult = await makeRequest('POST', `/community/comments/${testCommentId}/like`, null, authToken);
  if (likeCommentResult.success) {
    console.log('✅ 评论点赞成功');
    console.log('   点赞状态:', likeCommentResult.data.data.isLiked);
    console.log('   点赞数:', likeCommentResult.data.data.likesCount);
  } else {
    console.log('❌ 评论点赞失败:', likeCommentResult.error);
  }

  // 10. 按分类筛选帖子
  console.log('\n10. 按分类筛选帖子...');
  const categoryResult = await makeRequest('GET', '/community/posts?category=health&limit=5');
  if (categoryResult.success) {
    console.log('✅ 分类筛选成功');
    console.log('   健康分享帖子数:', categoryResult.data.data.pagination.totalItems);
  } else {
    console.log('❌ 分类筛选失败:', categoryResult.error);
  }

  // 11. 搜索帖子
  console.log('\n11. 搜索帖子...');
  const searchResult = await makeRequest('GET', '/community/posts?search=健康&limit=5');
  if (searchResult.success) {
    console.log('✅ 搜索成功');
    console.log('   搜索结果数:', searchResult.data.data.pagination.totalItems);
  } else {
    console.log('❌ 搜索失败:', searchResult.error);
  }

  // 12. 更新帖子
  console.log('\n12. 更新帖子...');
  const updateData = {
    title: '我家狗狗的健康分享 - 更新版',
    tags: ['健康', '体检', '金毛', '更新']
  };
  const updateResult = await makeRequest('PUT', `/community/posts/${testPostId}`, updateData, authToken);
  if (updateResult.success) {
    console.log('✅ 帖子更新成功');
    console.log('   新标题:', updateResult.data.data.title);
    console.log('   新标签:', updateResult.data.data.tags.join(', '));
  } else {
    console.log('❌ 帖子更新失败:', updateResult.error);
  }

  console.log('\n🎉 社区API测试完成！');
  console.log('\n📊 测试总结:');
  console.log(`- 测试用户ID: ${testUserId}`);
  console.log(`- 测试宠物ID: ${testPetId}`);
  console.log(`- 测试帖子ID: ${testPostId}`);
  console.log(`- 测试评论ID: ${testCommentId}`);
}

// 运行测试
testCommunityAPI().catch(console.error);