const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
let authToken = '';
let testPostId = '';
let testCommentId = '';

async function testCommunityInteraction() {
  try {
    console.log('🧪 开始测试社区互动功能...\n');

    // 1. 登录获取token
    console.log('1. 登录用户...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.tokens.accessToken;
      console.log('✅ 登录成功');
    } else {
      throw new Error('登录失败');
    }

    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 2. 获取帖子列表
    console.log('\n2. 获取帖子列表...');
    const postsResponse = await axios.get(`${API_BASE_URL}/community/posts`, {
      params: { limit: 5 }
    });

    if (postsResponse.data.success && postsResponse.data.data.posts.length > 0) {
      const firstPost = postsResponse.data.data.posts[0];
      testPostId = firstPost._id || firstPost.id;
      console.log('✅ 获取帖子列表成功');
      console.log(`   找到 ${postsResponse.data.data.posts.length} 个帖子`);
      console.log(`   测试帖子ID: ${testPostId}`);
      console.log(`   帖子结构:`, JSON.stringify(firstPost, null, 2));
    } else {
      throw new Error('没有找到帖子');
    }

    // 3. 测试帖子点赞
    console.log('\n3. 测试帖子点赞...');
    const likeResponse = await axios.post(`${API_BASE_URL}/community/posts/${testPostId}/like`, {}, { headers });

    if (likeResponse.data.success) {
      console.log('✅ 帖子点赞成功');
      console.log(`   点赞状态: ${likeResponse.data.data.isLiked ? '已点赞' : '未点赞'}`);
      console.log(`   点赞数量: ${likeResponse.data.data.likesCount}`);
    } else {
      throw new Error('帖子点赞失败');
    }

    // 4. 再次点赞（取消点赞）
    console.log('\n4. 测试取消点赞...');
    const unlikeResponse = await axios.post(`${API_BASE_URL}/community/posts/${testPostId}/like`, {}, { headers });

    if (unlikeResponse.data.success) {
      console.log('✅ 取消点赞成功');
      console.log(`   点赞状态: ${unlikeResponse.data.data.isLiked ? '已点赞' : '未点赞'}`);
      console.log(`   点赞数量: ${unlikeResponse.data.data.likesCount}`);
    } else {
      throw new Error('取消点赞失败');
    }

    // 5. 发表评论
    console.log('\n5. 测试发表评论...');
    const commentResponse = await axios.post(`${API_BASE_URL}/community/posts/${testPostId}/comments`, {
      content: '这是一个测试评论，用于验证评论功能是否正常工作。'
    }, { headers });

    if (commentResponse.data.success) {
      testCommentId = commentResponse.data.data.id;
      console.log('✅ 发表评论成功');
      console.log(`   评论ID: ${testCommentId}`);
      console.log(`   评论内容: ${commentResponse.data.data.content}`);
    } else {
      throw new Error('发表评论失败');
    }

    // 6. 获取评论列表
    console.log('\n6. 获取评论列表...');
    const commentsResponse = await axios.get(`${API_BASE_URL}/community/posts/${testPostId}/comments`);

    if (commentsResponse.data.success) {
      console.log('✅ 获取评论列表成功');
      console.log(`   评论数量: ${commentsResponse.data.data.comments.length}`);
      console.log(`   总评论数: ${commentsResponse.data.data.pagination.totalItems}`);
    } else {
      throw new Error('获取评论列表失败');
    }

    // 7. 测试评论点赞
    console.log('\n7. 测试评论点赞...');
    const commentLikeResponse = await axios.post(`${API_BASE_URL}/community/comments/${testCommentId}/like`, {}, { headers });

    if (commentLikeResponse.data.success) {
      console.log('✅ 评论点赞成功');
      console.log(`   点赞状态: ${commentLikeResponse.data.data.isLiked ? '已点赞' : '未点赞'}`);
      console.log(`   点赞数量: ${commentLikeResponse.data.data.likesCount}`);
    } else {
      throw new Error('评论点赞失败');
    }

    // 8. 发表回复评论
    console.log('\n8. 测试回复评论...');
    const replyResponse = await axios.post(`${API_BASE_URL}/community/posts/${testPostId}/comments`, {
      content: '这是一个回复评论，测试回复功能。',
      parentId: testCommentId
    }, { headers });

    if (replyResponse.data.success) {
      console.log('✅ 回复评论成功');
      console.log(`   回复ID: ${replyResponse.data.data.id}`);
      console.log(`   父评论ID: ${replyResponse.data.data.parentId}`);
    } else {
      throw new Error('回复评论失败');
    }

    // 9. 再次获取评论列表（包含回复）
    console.log('\n9. 获取包含回复的评论列表...');
    const finalCommentsResponse = await axios.get(`${API_BASE_URL}/community/posts/${testPostId}/comments`);

    if (finalCommentsResponse.data.success) {
      console.log('✅ 获取评论列表成功');
      console.log(`   评论数量: ${finalCommentsResponse.data.data.comments.length}`);
      
      // 检查是否有回复
      const commentWithReplies = finalCommentsResponse.data.data.comments.find(c => c.replies && c.replies.length > 0);
      if (commentWithReplies) {
        console.log(`   找到 ${commentWithReplies.replies.length} 个回复`);
      }
    } else {
      throw new Error('获取评论列表失败');
    }

    console.log('\n🎉 所有测试通过！社区互动功能正常工作。');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('   错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testCommunityInteraction();