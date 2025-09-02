import { test, expect } from '@playwright/test';
import { CommunityPage } from '../../page-objects/community-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';

/**
 * 社区互动功能测试套件
 * 测试点赞、评论、分享、用户关注、私信、社区活动和话题讨论功能
 */
test.describe('社区互动功能测试', () => {
  let communityPage: CommunityPage;
  let authPage: AuthPage;
  let dataManager: TestDataManager;
  let testUser1: any;
  let testUser2: any;
  let testPet: any;

  test.beforeEach(async ({ page, request }) => {
    communityPage = new CommunityPage(page);
    authPage = new AuthPage(page);
    dataManager = new TestDataManager(request);
    await dataManager.init();

    // 创建两个测试用户
    testUser1 = await dataManager.createTestUser({
      username: 'community_user1',
      email: 'user1@test.com',
      password: 'TestPass123!'
    });

    testUser2 = await dataManager.createTestUser({
      username: 'community_user2',
      email: 'user2@test.com',
      password: 'TestPass123!'
    });

    testPet = await dataManager.createTestPet(testUser1.id!, {
      name: 'InteractionPet',
      type: 'dog',
      breed: 'Golden Retriever',
      age: 4,
      weight: 28.0
    });

    // 登录第一个用户
    await authPage.login(testUser1.email, testUser1.password);
  });

  test.afterEach(async () => {
    await dataManager.cleanup();
  });

  test.describe('点赞功能测试', () => {
    test('应该能够点赞和取消点赞帖子', async () => {
      // 创建测试帖子
      const postData = {
        title: '点赞测试帖子',
        content: '这是一个测试点赞功能的帖子'
      };

      await communityPage.createPost(postData);

      // 获取帖子
      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);
      expect(testPost).toBeDefined();

      const initialLikeCount = testPost!.likeCount;

      // 点赞帖子
      await communityPage.likePost(testPost!.id);

      // 验证点赞数增加
      const updatedPosts = await communityPage.getPostsList();
      const likedPost = updatedPosts.find(p => p.id === testPost!.id);
      expect(likedPost!.likeCount).toBe(initialLikeCount + 1);

      // 验证点赞状态
      const likeButton = await communityPage.getLikeButtonState(testPost!.id);
      expect(likeButton.isLiked).toBe(true);

      // 取消点赞
      await communityPage.likePost(testPost!.id);

      // 验证点赞数恢复
      const finalPosts = await communityPage.getPostsList();
      const unlikedPost = finalPosts.find(p => p.id === testPost!.id);
      expect(unlikedPost!.likeCount).toBe(initialLikeCount);

      // 验证取消点赞状态
      const finalLikeButton = await communityPage.getLikeButtonState(testPost!.id);
      expect(finalLikeButton.isLiked).toBe(false);
    });

    test('应该防止重复点赞', async () => {
      const postData = {
        title: '防重复点赞测试',
        content: '测试防止重复点赞'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 快速连续点击点赞按钮
      await communityPage.likePost(testPost!.id);
      await communityPage.likePost(testPost!.id);
      await communityPage.likePost(testPost!.id);

      // 验证只计算一次点赞
      const finalPosts = await communityPage.getPostsList();
      const finalPost = finalPosts.find(p => p.id === testPost!.id);
      expect(finalPost!.likeCount).toBe(1);
    });

    test('应该显示点赞用户列表', async () => {
      const postData = {
        title: '点赞用户列表测试',
        content: '测试点赞用户列表功能'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 点赞帖子
      await communityPage.likePost(testPost!.id);

      // 查看点赞用户列表
      const likedUsers = await communityPage.getLikedUsersList(testPost!.id);
      expect(likedUsers.length).toBe(1);
      expect(likedUsers[0].username).toBe(testUser1.username);
    });
  });

  test.describe('评论功能测试', () => {
    test('应该能够发表评论', async () => {
      const postData = {
        title: '评论测试帖子',
        content: '这是一个测试评论功能的帖子'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      const commentText = '这是一条测试评论';
      await communityPage.commentOnPost(testPost!.id, commentText);

      // 验证评论已发表
      const comments = await communityPage.getPostComments(testPost!.id);
      expect(comments.length).toBe(1);
      expect(comments[0].content).toBe(commentText);
      expect(comments[0].author).toBe(testUser1.username);
    });

    test('应该能够回复评论', async () => {
      const postData = {
        title: '回复评论测试',
        content: '测试回复评论功能'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 发表原始评论
      await communityPage.commentOnPost(testPost!.id, '原始评论');

      const comments = await communityPage.getPostComments(testPost!.id);
      const originalComment = comments[0];

      // 回复评论
      const replyText = '这是对评论的回复';
      await communityPage.replyToComment(originalComment.id, replyText);

      // 验证回复已发表
      const updatedComments = await communityPage.getPostComments(testPost!.id);
      const commentWithReply = updatedComments.find(c => c.id === originalComment.id);
      expect(commentWithReply!.replies).toBe(1);

      const replies = await communityPage.getCommentReplies(originalComment.id);
      expect(replies.length).toBe(1);
      expect(replies[0].content).toBe(replyText);
    });

    test('应该支持评论分页', async () => {
      const postData = {
        title: '评论分页测试',
        content: '测试评论分页功能'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 发表多条评论
      for (let i = 1; i <= 25; i++) {
        await communityPage.commentOnPost(testPost!.id, `评论 ${i}`);
      }

      // 验证分页
      const firstPageComments = await communityPage.getPostComments(testPost!.id);
      expect(firstPageComments.length).toBeLessThanOrEqual(20); // 假设每页20条

      // 加载更多评论
      await communityPage.loadMoreComments(testPost!.id);
      const allComments = await communityPage.getPostComments(testPost!.id);
      expect(allComments.length).toBe(25);
    });

    test('应该能够删除自己的评论', async () => {
      const postData = {
        title: '删除评论测试',
        content: '测试删除评论功能'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 发表评论
      await communityPage.commentOnPost(testPost!.id, '待删除的评论');

      const comments = await communityPage.getPostComments(testPost!.id);
      const commentToDelete = comments[0];

      // 删除评论
      await communityPage.deleteComment(commentToDelete.id);

      // 验证评论已删除
      const remainingComments = await communityPage.getPostComments(testPost!.id);
      expect(remainingComments.length).toBe(0);
    });
  });

  test.describe('分享功能测试', () => {
    test('应该能够分享帖子到社交平台', async () => {
      const postData = {
        title: '分享测试帖子',
        content: '这是一个测试分享功能的帖子'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 分享到微信
      await communityPage.sharePost(testPost!.id, 'wechat');

      // 验证分享成功
      const shareResult = await communityPage.getShareResult();
      expect(shareResult.success).toBe(true);
      expect(shareResult.platform).toBe('wechat');

      // 验证分享计数增加
      const updatedPosts = await communityPage.getPostsList();
      const sharedPost = updatedPosts.find(p => p.id === testPost!.id);
      expect(sharedPost!.shareCount).toBeGreaterThan(0);
    });

    test('应该能够生成分享链接', async () => {
      const postData = {
        title: '分享链接测试',
        content: '测试生成分享链接'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 生成分享链接
      const shareLink = await communityPage.generateShareLink(testPost!.id);
      
      expect(shareLink.url).toBeTruthy();
      expect(shareLink.url).toContain(testPost!.id);
      expect(shareLink.expiryTime).toBeGreaterThan(Date.now());
    });

    test('应该能够复制分享链接', async () => {
      const postData = {
        title: '复制链接测试',
        content: '测试复制分享链接'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const testPost = posts.find(p => p.title === postData.title);

      // 复制分享链接
      await communityPage.copyShareLink(testPost!.id);

      // 验证复制成功提示
      const successMessage = await communityPage.getSuccessMessage();
      expect(successMessage).toContain('链接已复制到剪贴板');
    });
  });  test.de
scribe('用户关注功能测试', () => {
    test('应该能够关注和取消关注用户', async () => {
      // 切换到第二个用户登录
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      // 查看第一个用户的资料
      await communityPage.goToUserProfile(testUser1.id!);

      // 获取初始关注状态
      const initialFollowState = await communityPage.getFollowState(testUser1.id!);
      expect(initialFollowState.isFollowing).toBe(false);

      // 关注用户
      await communityPage.followUser(testUser1.id!);

      // 验证关注成功
      const followedState = await communityPage.getFollowState(testUser1.id!);
      expect(followedState.isFollowing).toBe(true);

      // 验证关注者数量增加
      const userStats = await communityPage.getUserStats(testUser1.id!);
      expect(userStats.followersCount).toBe(1);

      // 取消关注
      await communityPage.unfollowUser(testUser1.id!);

      // 验证取消关注成功
      const unfollowedState = await communityPage.getFollowState(testUser1.id!);
      expect(unfollowedState.isFollowing).toBe(false);

      // 验证关注者数量恢复
      const finalUserStats = await communityPage.getUserStats(testUser1.id!);
      expect(finalUserStats.followersCount).toBe(0);
    });

    test('应该显示关注者和关注列表', async () => {
      // 用户2关注用户1
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);
      await communityPage.followUser(testUser1.id!);

      // 切换到用户1查看关注者列表
      await authPage.logout();
      await authPage.login(testUser1.email, testUser1.password);

      // 查看关注者列表
      const followers = await communityPage.getFollowersList(testUser1.id!);
      expect(followers.length).toBe(1);
      expect(followers[0].username).toBe(testUser2.username);

      // 用户1关注用户2
      await communityPage.followUser(testUser2.id!);

      // 查看关注列表
      const following = await communityPage.getFollowingList(testUser1.id!);
      expect(following.length).toBe(1);
      expect(following[0].username).toBe(testUser2.username);
    });

    test('应该支持互相关注', async () => {
      // 用户1关注用户2
      await communityPage.followUser(testUser2.id!);

      // 切换到用户2
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      // 用户2关注用户1
      await communityPage.followUser(testUser1.id!);

      // 验证互相关注状态
      const user1FollowState = await communityPage.getFollowState(testUser1.id!);
      expect(user1FollowState.isFollowing).toBe(true);
      expect(user1FollowState.isMutualFollow).toBe(true);

      // 切换回用户1验证
      await authPage.logout();
      await authPage.login(testUser1.email, testUser1.password);

      const user2FollowState = await communityPage.getFollowState(testUser2.id!);
      expect(user2FollowState.isFollowing).toBe(true);
      expect(user2FollowState.isMutualFollow).toBe(true);
    });

    test('应该显示关注用户的动态', async () => {
      // 用户1关注用户2
      await communityPage.followUser(testUser2.id!);

      // 切换到用户2发布帖子
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      const postData = {
        title: '关注动态测试帖子',
        content: '这是用户2发布的帖子'
      };
      await communityPage.createPost(postData);

      // 切换回用户1查看动态
      await authPage.logout();
      await authPage.login(testUser1.email, testUser1.password);

      // 查看关注动态
      const followingFeed = await communityPage.getFollowingFeed();
      expect(followingFeed.length).toBeGreaterThan(0);
      
      const user2Post = followingFeed.find(post => post.author === testUser2.username);
      expect(user2Post).toBeDefined();
      expect(user2Post!.title).toBe(postData.title);
    });
  });

  test.describe('私信功能测试', () => {
    test('应该能够发送私信', async () => {
      const messageText = '你好，这是一条测试私信';

      // 发送私信给用户2
      await communityPage.sendMessage(testUser2.id!, messageText);

      // 验证发送成功
      const successMessage = await communityPage.getSuccessMessage();
      expect(successMessage).toContain('消息发送成功');

      // 切换到用户2查看收到的私信
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      const inbox = await communityPage.getMessagesInbox();
      expect(inbox.length).toBe(1);
      expect(inbox[0].content).toBe(messageText);
      expect(inbox[0].senderId).toBe(testUser1.id);
      expect(inbox[0].senderName).toBe(testUser1.username);
    });

    test('应该能够回复私信', async () => {
      // 用户1发送私信
      const originalMessage = '你好，请问有什么问题吗？';
      await communityPage.sendMessage(testUser2.id!, originalMessage);

      // 切换到用户2
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      // 查看私信并回复
      const inbox = await communityPage.getMessagesInbox();
      const message = inbox[0];

      const replyText = '谢谢，我想了解一下宠物护理的问题';
      await communityPage.replyToMessage(message.id, replyText);

      // 切换回用户1查看回复
      await authPage.logout();
      await authPage.login(testUser1.email, testUser1.password);

      const user1Inbox = await communityPage.getMessagesInbox();
      const replyMessage = user1Inbox.find(m => m.content === replyText);
      expect(replyMessage).toBeDefined();
      expect(replyMessage!.senderId).toBe(testUser2.id);
    });

    test('应该支持私信会话管理', async () => {
      // 发送多条私信形成会话
      const messages = [
        '第一条消息',
        '第二条消息',
        '第三条消息'
      ];

      for (const message of messages) {
        await communityPage.sendMessage(testUser2.id!, message);
        await communityPage.page.waitForTimeout(500); // 确保时间顺序
      }

      // 查看会话
      const conversation = await communityPage.getConversation(testUser2.id!);
      expect(conversation.messages.length).toBe(3);
      expect(conversation.messages[0].content).toBe('第一条消息');
      expect(conversation.messages[2].content).toBe('第三条消息');

      // 验证会话参与者
      expect(conversation.participants).toContain(testUser1.id);
      expect(conversation.participants).toContain(testUser2.id);
    });

    test('应该能够删除私信', async () => {
      // 发送私信
      const messageText = '这条消息将被删除';
      await communityPage.sendMessage(testUser2.id!, messageText);

      // 获取发送的消息
      const sentMessages = await communityPage.getSentMessages();
      const messageToDelete = sentMessages.find(m => m.content === messageText);
      expect(messageToDelete).toBeDefined();

      // 删除消息
      await communityPage.deleteMessage(messageToDelete!.id);

      // 验证消息已删除
      const remainingMessages = await communityPage.getSentMessages();
      const deletedMessage = remainingMessages.find(m => m.id === messageToDelete!.id);
      expect(deletedMessage).toBeUndefined();
    });

    test('应该显示未读消息数量', async () => {
      // 发送多条私信
      for (let i = 1; i <= 3; i++) {
        await communityPage.sendMessage(testUser2.id!, `未读消息 ${i}`);
      }

      // 切换到用户2
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      // 检查未读消息数量
      const unreadCount = await communityPage.getUnreadMessageCount();
      expect(unreadCount).toBe(3);

      // 查看一条消息
      const inbox = await communityPage.getMessagesInbox();
      await communityPage.markMessageAsRead(inbox[0].id);

      // 验证未读数量减少
      const updatedUnreadCount = await communityPage.getUnreadMessageCount();
      expect(updatedUnreadCount).toBe(2);
    });
  });

  test.describe('社区活动测试', () => {
    test('应该能够创建社区活动', async () => {
      const activityData = {
        title: '宠物健康讲座',
        description: '邀请专业兽医分享宠物健康知识',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 一周后
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 持续2小时
        location: '线上直播',
        maxParticipants: 100,
        tags: ['健康', '讲座', '兽医']
      };

      await communityPage.createActivity(activityData);

      // 验证活动已创建
      const activities = await communityPage.getActivitiesList();
      const createdActivity = activities.find(a => a.title === activityData.title);
      expect(createdActivity).toBeDefined();
      expect(createdActivity!.description).toBe(activityData.description);
      expect(createdActivity!.maxParticipants).toBe(activityData.maxParticipants);
    });

    test('应该能够参加社区活动', async () => {
      // 创建活动
      const activityData = {
        title: '宠物摄影大赛',
        description: '展示你家宠物的美丽瞬间',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        maxParticipants: 50
      };

      await communityPage.createActivity(activityData);

      const activities = await communityPage.getActivitiesList();
      const activity = activities.find(a => a.title === activityData.title);

      // 切换到用户2参加活动
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      await communityPage.joinActivity(activity!.id);

      // 验证参加成功
      const joinedActivities = await communityPage.getJoinedActivities();
      const joinedActivity = joinedActivities.find(a => a.id === activity!.id);
      expect(joinedActivity).toBeDefined();

      // 验证参与者数量增加
      const updatedActivity = await communityPage.getActivityDetails(activity!.id);
      expect(updatedActivity.participantCount).toBe(1);
      expect(updatedActivity.participants).toContain(testUser2.id);
    });

    test('应该能够取消参加活动', async () => {
      // 创建并参加活动
      const activityData = {
        title: '取消参加测试活动',
        description: '测试取消参加功能',
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
      };

      await communityPage.createActivity(activityData);

      const activities = await communityPage.getActivitiesList();
      const activity = activities.find(a => a.title === activityData.title);

      // 参加活动
      await communityPage.joinActivity(activity!.id);

      // 取消参加
      await communityPage.leaveActivity(activity!.id);

      // 验证取消成功
      const joinedActivities = await communityPage.getJoinedActivities();
      const leftActivity = joinedActivities.find(a => a.id === activity!.id);
      expect(leftActivity).toBeUndefined();

      // 验证参与者数量减少
      const updatedActivity = await communityPage.getActivityDetails(activity!.id);
      expect(updatedActivity.participantCount).toBe(0);
    });

    test('应该限制活动参与人数', async () => {
      // 创建限制人数的活动
      const activityData = {
        title: '限制人数测试活动',
        description: '测试人数限制功能',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        maxParticipants: 1
      };

      await communityPage.createActivity(activityData);

      const activities = await communityPage.getActivitiesList();
      const activity = activities.find(a => a.title === activityData.title);

      // 用户1参加活动
      await communityPage.joinActivity(activity!.id);

      // 切换到用户2尝试参加
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      // 尝试参加已满的活动
      await communityPage.joinActivity(activity!.id);

      // 验证显示活动已满提示
      const errorMessage = await communityPage.getErrorMessage();
      expect(errorMessage).toContain('活动人数已满');

      // 验证用户2未成功参加
      const joinedActivities = await communityPage.getJoinedActivities();
      const failedJoin = joinedActivities.find(a => a.id === activity!.id);
      expect(failedJoin).toBeUndefined();
    });

    test('应该能够搜索和筛选活动', async () => {
      // 创建多个不同类型的活动
      const activities = [
        {
          title: '宠物健康讲座',
          description: '专业兽医分享健康知识',
          tags: ['健康', '讲座'],
          startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        },
        {
          title: '宠物摄影比赛',
          description: '展示宠物美丽瞬间',
          tags: ['摄影', '比赛'],
          startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        },
        {
          title: '宠物训练课程',
          description: '基础训练技巧分享',
          tags: ['训练', '教育'],
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      ];

      for (const activity of activities) {
        await communityPage.createActivity(activity);
      }

      // 按关键词搜索
      const searchResults = await communityPage.searchActivities('健康');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].title).toContain('健康');

      // 按标签筛选
      const tagResults = await communityPage.filterActivitiesByTag('摄影');
      expect(tagResults.length).toBe(1);
      expect(tagResults[0].title).toContain('摄影');

      // 按时间筛选
      const timeResults = await communityPage.filterActivitiesByTime('本周');
      expect(timeResults.length).toBeGreaterThan(0);
    });
  });

  test.describe('话题讨论测试', () => {
    test('应该能够创建话题', async () => {
      const topicData = {
        title: '宠物营养搭配讨论',
        description: '分享和讨论宠物日常营养搭配经验',
        tags: ['营养', '饮食', '健康'],
        category: '健康护理'
      };

      await communityPage.createTopic(topicData);

      // 验证话题已创建
      const topics = await communityPage.getTopicsList();
      const createdTopic = topics.find(t => t.title === topicData.title);
      expect(createdTopic).toBeDefined();
      expect(createdTopic!.description).toBe(topicData.description);
      expect(createdTopic!.category).toBe(topicData.category);
    });

    test('应该能够参与话题讨论', async () => {
      // 创建话题
      const topicData = {
        title: '宠物行为问题讨论',
        description: '讨论常见的宠物行为问题及解决方案',
        category: '行为训练'
      };

      await communityPage.createTopic(topicData);

      const topics = await communityPage.getTopicsList();
      const topic = topics.find(t => t.title === topicData.title);

      // 发表讨论
      const discussionText = '我家狗狗总是乱咬东西，有什么好的训练方法吗？';
      await communityPage.postToTopic(topic!.id, discussionText);

      // 验证讨论已发表
      const discussions = await communityPage.getTopicDiscussions(topic!.id);
      expect(discussions.length).toBe(1);
      expect(discussions[0].content).toBe(discussionText);
      expect(discussions[0].author).toBe(testUser1.username);

      // 切换到用户2回复讨论
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      const replyText = '可以试试转移注意力的方法，给它一些咬胶玩具';
      await communityPage.replyToDiscussion(discussions[0].id, replyText);

      // 验证回复成功
      const updatedDiscussions = await communityPage.getTopicDiscussions(topic!.id);
      const originalDiscussion = updatedDiscussions.find(d => d.id === discussions[0].id);
      expect(originalDiscussion!.replyCount).toBe(1);

      const replies = await communityPage.getDiscussionReplies(discussions[0].id);
      expect(replies.length).toBe(1);
      expect(replies[0].content).toBe(replyText);
    });

    test('应该能够关注话题', async () => {
      // 创建话题
      const topicData = {
        title: '宠物疫苗接种讨论',
        description: '分享疫苗接种经验和注意事项',
        category: '健康护理'
      };

      await communityPage.createTopic(topicData);

      const topics = await communityPage.getTopicsList();
      const topic = topics.find(t => t.title === topicData.title);

      // 切换到用户2关注话题
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      await communityPage.followTopic(topic!.id);

      // 验证关注成功
      const followedTopics = await communityPage.getFollowedTopics();
      const followedTopic = followedTopics.find(t => t.id === topic!.id);
      expect(followedTopic).toBeDefined();

      // 验证话题关注者数量增加
      const topicDetails = await communityPage.getTopicDetails(topic!.id);
      expect(topicDetails.followerCount).toBe(1);
    });

    test('应该能够搜索话题和讨论', async () => {
      // 创建多个话题
      const topics = [
        {
          title: '狗狗训练技巧',
          description: '分享狗狗训练的各种技巧',
          category: '行为训练'
        },
        {
          title: '猫咪健康护理',
          description: '猫咪日常健康护理知识',
          category: '健康护理'
        }
      ];

      for (const topicData of topics) {
        await communityPage.createTopic(topicData);
      }

      // 搜索话题
      const searchResults = await communityPage.searchTopics('训练');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].title).toContain('训练');

      // 按分类筛选
      const categoryResults = await communityPage.filterTopicsByCategory('健康护理');
      expect(categoryResults.length).toBe(1);
      expect(categoryResults[0].category).toBe('健康护理');
    });

    test('应该显示热门话题', async () => {
      // 创建话题并增加互动
      const topicData = {
        title: '热门话题测试',
        description: '测试热门话题功能',
        category: '综合讨论'
      };

      await communityPage.createTopic(topicData);

      const topics = await communityPage.getTopicsList();
      const topic = topics.find(t => t.title === topicData.title);

      // 增加讨论和关注
      await communityPage.postToTopic(topic!.id, '第一条讨论');
      await communityPage.postToTopic(topic!.id, '第二条讨论');
      await communityPage.followTopic(topic!.id);

      // 切换用户增加更多互动
      await authPage.logout();
      await authPage.login(testUser2.email, testUser2.password);

      await communityPage.postToTopic(topic!.id, '第三条讨论');
      await communityPage.followTopic(topic!.id);

      // 检查热门话题列表
      const hotTopics = await communityPage.getHotTopics();
      const hotTopic = hotTopics.find(t => t.id === topic!.id);
      expect(hotTopic).toBeDefined();
      expect(hotTopic!.discussionCount).toBe(3);
      expect(hotTopic!.followerCount).toBe(2);
    });
  });
});