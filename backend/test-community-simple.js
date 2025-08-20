const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 简化的测试，只测试不需要认证的端点
async function testCommunityBasic() {
  console.log('🚀 开始测试社区基础API...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    if (healthResponse.status === 200) {
      console.log('✅ 健康检查通过');
    }

    // 2. 测试获取帖子列表（不需要认证）
    console.log('\n2. 测试获取帖子列表...');
    const postsResponse = await axios.get(`${BASE_URL}/community/posts`);
    if (postsResponse.status === 200) {
      console.log('✅ 获取帖子列表成功');
      console.log('   响应数据结构:', Object.keys(postsResponse.data));
      if (postsResponse.data.data) {
        console.log('   帖子数量:', postsResponse.data.data.posts?.length || 0);
        console.log('   分页信息:', postsResponse.data.data.pagination);
      }
    }

    console.log('\n🎉 基础API测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCommunityBasic();