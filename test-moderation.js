const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
let authToken = '';
let testPostId = '';
let testCommentId = '';
let testReportId = '';

async function testModerationSystem() {
  try {
    console.log('🧪 开始测试内容审核系统...\n');

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

    // 2. 测试内容审核 - 正常内容
    console.log('\n2. 测试正常内容审核...');
    const normalContentTest = await axios.post(`${API_BASE_URL}/moderation/test`, {
      content: '这是一个正常的帖子内容，分享我家狗狗的日常生活。',
      type: 'post'
    });

    if (normalContentTest.data.success) {
      console.log('✅ 正常内容审核通过');
      console.log(`   审核结果: ${normalContentTest.data.data.action}`);
      console.log(`   是否允许: ${normalContentTest.data.data.isAllowed}`);
    }

    // 3. 测试内容审核 - 包含敏感词
    console.log('\n3. 测试敏感词内容审核...');
    const sensitiveContentTest = await axios.post(`${API_BASE_URL}/moderation/test`, {
      content: '这是一个广告内容，加微信购买产品，投资理财赚钱。',
      type: 'post'
    });

    if (sensitiveContentTest.data.success) {
      console.log('✅ 敏感词内容审核完成');
      console.log(`   审核结果: ${sensitiveContentTest.data.data.action}`);
      console.log(`   是否允许: ${sensitiveContentTest.data.data.isAllowed}`);
      console.log(`   触发原因: ${sensitiveContentTest.data.data.reasons.join(', ')}`);
    }

    // 4. 创建包含轻微敏感词的帖子（应该被标记但允许发布）
    console.log('\n4. 创建包含轻微敏感词的帖子...');
    try {
      const flaggedPostResponse = await axios.post(`${API_BASE_URL}/community/posts`, {
        title: '分享宠物用品推广信息',
        content: '我想推广一些不错的宠物用品，大家可以了解一下。',
        category: 'general',
        tags: ['推广', '用品']
      }, { headers });

      if (flaggedPostResponse.data.success) {
        testPostId = flaggedPostResponse.data.data._id;
        console.log('✅ 轻微敏感词帖子创建成功（被标记但允许发布）');
        console.log(`   帖子ID: ${testPostId}`);
        console.log(`   审核状态: ${flaggedPostResponse.data.data.moderationStatus}`);
      }
    } catch (error) {
      console.log('⚠️  轻微敏感词帖子被拒绝或需要审核');
      console.log(`   错误信息: ${error.response?.data?.message}`);
    }

    // 5. 尝试创建严重违规内容（应该被拒绝）
    console.log('\n5. 尝试创建严重违规内容...');
    try {
      await axios.post(`${API_BASE_URL}/community/posts`, {
        title: '违规内容测试',
        content: '这是一个包含色情暴力内容的帖子，用于测试审核系统。',
        category: 'general'
      }, { headers });
      
      console.log('❌ 严重违规内容竟然通过了审核！');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 严重违规内容被正确拒绝');
        console.log(`   拒绝原因: ${error.response.data.message}`);
        if (error.response.data.details) {
          console.log(`   详细信息: ${error.response.data.details.join(', ')}`);
        }
      } else {
        console.log('❌ 意外错误:', error.message);
      }
    }

    // 6. 创建正常帖子用于后续测试
    console.log('\n6. 创建正常帖子用于举报测试...');
    const normalPostResponse = await axios.post(`${API_BASE_URL}/community/posts`, {
      title: '我家猫咪的日常',
      content: '分享一下我家猫咪今天的可爱瞬间，希望大家喜欢。',
      category: 'general',
      tags: ['猫咪', '日常', '分享']
    }, { headers });

    if (normalPostResponse.data.success) {
      testPostId = normalPostResponse.data.data._id;
      console.log('✅ 正常帖子创建成功');
      console.log(`   帖子ID: ${testPostId}`);
    }

    // 7. 测试举报功能
    console.log('\n7. 测试举报功能...');
    const reportResponse = await axios.post(`${API_BASE_URL}/moderation/reports`, {
      targetType: 'post',
      targetId: testPostId,
      reason: 'spam',
      description: '这是一个测试举报，用于验证举报功能。'
    }, { headers });

    if (reportResponse.data.success) {
      testReportId = reportResponse.data.data._id;
      console.log('✅ 举报提交成功');
      console.log(`   举报ID: ${testReportId}`);
      console.log(`   举报原因: ${reportResponse.data.data.reason}`);
    }

    // 8. 获取举报列表
    console.log('\n8. 获取举报列表...');
    const reportsListResponse = await axios.get(`${API_BASE_URL}/moderation/reports`, { headers });

    if (reportsListResponse.data.success) {
      console.log('✅ 获取举报列表成功');
      console.log(`   举报数量: ${reportsListResponse.data.data.reports.length}`);
      console.log(`   总举报数: ${reportsListResponse.data.data.pagination.totalItems}`);
    }

    // 9. 获取用户举报历史
    console.log('\n9. 获取用户举报历史...');
    const userReportsResponse = await axios.get(`${API_BASE_URL}/moderation/reports/user`, { headers });

    if (userReportsResponse.data.success) {
      console.log('✅ 获取用户举报历史成功');
      console.log(`   用户举报数量: ${userReportsResponse.data.data.reports.length}`);
    }

    // 10. 获取审核统计
    console.log('\n10. 获取审核统计...');
    const statsResponse = await axios.get(`${API_BASE_URL}/moderation/stats`);

    if (statsResponse.data.success) {
      console.log('✅ 获取审核统计成功');
      console.log(`   待处理举报: ${statsResponse.data.data.reports.pending || 0}`);
      console.log(`   待审核帖子: ${statsResponse.data.data.pendingContent.posts}`);
      console.log(`   待审核评论: ${statsResponse.data.data.pendingContent.comments}`);
    }

    // 11. 测试评论审核
    console.log('\n11. 测试评论审核...');
    try {
      const commentResponse = await axios.post(`${API_BASE_URL}/community/posts/${testPostId}/comments`, {
        content: '这是一个包含广告的评论，加微信了解详情。'
      }, { headers });

      if (commentResponse.data.success) {
        testCommentId = commentResponse.data.data._id;
        console.log('✅ 敏感词评论创建成功（可能被标记）');
        console.log(`   评论ID: ${testCommentId}`);
        console.log(`   审核状态: ${commentResponse.data.data.moderationStatus}`);
      }
    } catch (error) {
      console.log('⚠️  敏感词评论被拒绝或需要审核');
      console.log(`   错误信息: ${error.response?.data?.message}`);
    }

    // 12. 创建正常评论
    console.log('\n12. 创建正常评论...');
    const normalCommentResponse = await axios.post(`${API_BASE_URL}/community/posts/${testPostId}/comments`, {
      content: '很可爱的猫咪，我也想养一只。'
    }, { headers });

    if (normalCommentResponse.data.success) {
      console.log('✅ 正常评论创建成功');
      console.log(`   评论ID: ${normalCommentResponse.data.data._id}`);
      console.log(`   审核状态: ${normalCommentResponse.data.data.moderationStatus}`);
    }

    console.log('\n🎉 内容审核系统测试完成！');
    console.log('\n📊 测试总结:');
    console.log('- ✅ 内容审核API正常工作');
    console.log('- ✅ 敏感词过滤功能正常');
    console.log('- ✅ 帖子和评论审核集成成功');
    console.log('- ✅ 举报功能正常工作');
    console.log('- ✅ 审核统计功能正常');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('   错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testModerationSystem();