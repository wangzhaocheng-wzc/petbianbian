import { test, expect } from '@playwright/test';
import { ModerationPage } from '../../page-objects/moderation-page';
import { AuthPage } from '../../page-objects/auth-page';
import { CommunityPage } from '../../page-objects/community-page';
import testData from '../../fixtures/moderation-test-data.json';

test.describe('完整审核流程测试', () => {
  let moderationPage: ModerationPage;
  let authPage: AuthPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    moderationPage = new ModerationPage(page);
    authPage = new AuthPage(page);
    communityPage = new CommunityPage(page);
  });

  test('完整的内容审核流程：从发布到处理', async () => {
    await test.step('用户发布可疑内容', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      await communityPage.goto();
      
      // 发布包含敏感内容的帖子
      await communityPage.createPost(
        testData.testPosts.spamPost.title,
        testData.testPosts.spamPost.content,
        testData.testPosts.spamPost.tags
      );
    });

    await test.step('其他用户举报内容', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      // 举报可疑内容
      const suspiciousPost = communityPage.postList.first();
      await suspiciousPost.locator('[data-testid="post-report-button"]').click();
      
      await moderationPage.reportContent(
        'spam',
        '这是明显的垃圾广告内容，包含推广链接'
      );
    });

    await test.step('系统自动检测并标记', async () => {
      // 验证系统自动检测功能
      const autoDetectionResponse = await moderationPage.page.waitForResponse(
        response => response.url().includes('/api/moderation/auto-detect') && response.status() === 200
      );
      expect(autoDetectionResponse).toBeTruthy();
    });

    await test.step('管理员审核处理', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 查看举报详情
      const reportItem = moderationPage.pendingReports.first();
      await reportItem.locator('[data-testid="view-details-button"]').click();
      
      // 审核决策：批准举报并删除内容
      await moderationPage.approveButton.click();
      
      // 添加处理备注
      const moderationNote = moderationPage.page.locator('[data-testid="moderation-note"]');
      await moderationNote.fill('确认为垃圾广告，删除内容并警告用户');
      
      const confirmDecisionButton = moderationPage.page.locator('[data-testid="confirm-decision"]');
      await confirmDecisionButton.click();
    });

    await test.step('对违规用户采取行动', async () => {
      // 导航到用户管理页面
      await moderationPage.page.goto('/admin/users');
      
      // 找到违规用户并进行警告
      const violatingUser = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      const warnUserButton = violatingUser.locator('[data-testid="warn-user-button"]');
      await warnUserButton.click();
      
      // 发送警告
      const warningMessage = moderationPage.page.locator('[data-testid="warning-message"]');
      await warningMessage.fill('您发布的内容违反了社区规定，请注意遵守相关规则');
      
      const sendWarningButton = moderationPage.page.locator('[data-testid="send-warning-button"]');
      await sendWarningButton.click();
    });

    await test.step('验证处理结果', async () => {
      // 验证内容已被删除
      await communityPage.goto();
      await expect(communityPage.postList).not.toContainText(testData.testPosts.spamPost.title);
      
      // 验证举报状态更新
      await moderationPage.page.goto('/admin/moderation/history');
      const processedReports = moderationPage.page.locator('[data-testid="processed-reports"]');
      await expect(processedReports).toContainText('已批准');
      
      // 验证用户收到警告
      await authPage.logout();
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      const warningNotification = moderationPage.page.locator('[data-testid="warning-notification"]');
      await expect(warningNotification).toBeVisible();
    });
  });

  test('批量处理多个违规内容的工作流程', async () => {
    await test.step('创建多个违规内容', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      await communityPage.goto();
      
      // 创建多个垃圾内容
      const spamContents = [
        '超低价宠物用品！点击购买！',
        '加微信购买宠物食品，优惠多多！',
        '宠物医院推广，联系电话：123456789'
      ];
      
      for (const content of spamContents) {
        await communityPage.createPost('推广内容', content, ['广告']);
      }
    });

    await test.step('用户批量举报', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      // 举报所有垃圾内容
      const posts = await communityPage.postList.all();
      for (let i = 0; i < Math.min(posts.length, 3); i++) {
        await posts[i].locator('[data-testid="post-report-button"]').click();
        await moderationPage.reportContent('spam', `批量举报垃圾内容 ${i + 1}`);
      }
    });

    await test.step('管理员批量处理', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 选择所有待处理的举报
      await moderationPage.selectMultipleReports([0, 1, 2]);
      
      // 批量批准并删除内容
      await moderationPage.performBatchAction('approve_and_delete');
      
      // 验证批量处理成功
      const batchSuccessMessage = moderationPage.page.locator('[data-testid="batch-success-message"]');
      await expect(batchSuccessMessage).toContainText('已批量处理 3 个举报');
    });

    await test.step('对重复违规用户进行封禁', async () => {
      // 由于用户多次违规，进行临时封禁
      await moderationPage.page.goto('/admin/users');
      
      const violatingUser = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await violatingUser.locator('[data-testid="ban-user-button"]').click();
      await moderationPage.banUser(
        'temporary',
        '7d',
        '多次发布垃圾内容，临时封禁7天'
      );
    });
  });

  test('紧急情况下的快速审核流程', async () => {
    await test.step('启用紧急审核模式', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/moderation');
      
      // 启用紧急模式
      const emergencyModeToggle = moderationPage.page.locator('[data-testid="emergency-mode-toggle"]');
      await emergencyModeToggle.click();
      
      const confirmEmergencyButton = moderationPage.page.locator('[data-testid="confirm-emergency-mode"]');
      await confirmEmergencyButton.click();
    });

    await test.step('处理紧急举报', async () => {
      // 模拟收到紧急举报
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      const urgentPost = communityPage.postList.first();
      await urgentPost.locator('[data-testid="post-report-button"]').click();
      
      // 标记为紧急举报
      await moderationPage.reportReasonSelect.selectOption('harassment');
      await moderationPage.page.locator('[data-testid="urgent-report-checkbox"]').check();
      await moderationPage.reportDescriptionInput.fill('严重骚扰行为，需要紧急处理');
      
      await moderationPage.submitReportButton.click();
    });

    await test.step('管理员紧急响应', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 验证紧急举报优先显示
      const urgentReport = moderationPage.page.locator('[data-testid="urgent-report"]').first();
      await expect(urgentReport).toBeVisible();
      
      // 快速处理紧急举报
      await urgentReport.locator('[data-testid="quick-approve-button"]').click();
      
      // 立即封禁相关用户
      const emergencyBanButton = moderationPage.page.locator('[data-testid="emergency-ban-button"]');
      await emergencyBanButton.click();
      
      await moderationPage.banUser('permanent', undefined, '严重骚扰行为，紧急永久封禁');
    });
  });

  test('跨平台内容同步审核流程', async () => {
    await test.step('在多个平台发布相同违规内容', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      // 在社区发布
      await communityPage.goto();
      await communityPage.createPost(
        '跨平台垃圾内容',
        '这是在多个地方发布的垃圾广告内容',
        ['广告']
      );
      
      // 在分析页面发布评论
      await moderationPage.page.goto('/analysis');
      const commentInput = moderationPage.page.locator('[data-testid="analysis-comment-input"]');
      await commentInput.fill('这是在分析页面的垃圾广告内容');
      
      const submitCommentButton = moderationPage.page.locator('[data-testid="submit-comment-button"]');
      await submitCommentButton.click();
    });

    await test.step('系统检测跨平台重复内容', async () => {
      // 验证系统自动检测跨平台重复内容
      const crossPlatformDetection = await moderationPage.page.waitForResponse(
        response => response.url().includes('/api/moderation/cross-platform-detect') && response.status() === 200
      );
      expect(crossPlatformDetection).toBeTruthy();
    });

    await test.step('管理员统一处理跨平台违规', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/moderation/cross-platform');
      
      // 查看跨平台违规报告
      const crossPlatformReports = moderationPage.page.locator('[data-testid="cross-platform-reports"]');
      await expect(crossPlatformReports).toBeVisible();
      
      // 统一删除所有相关内容
      const deleteAllButton = moderationPage.page.locator('[data-testid="delete-all-related-content"]');
      await deleteAllButton.click();
      
      const confirmDeleteButton = moderationPage.page.locator('[data-testid="confirm-delete-all"]');
      await confirmDeleteButton.click();
    });
  });

  test('审核决策申诉和复审流程', async () => {
    await test.step('初始审核决策', async () => {
      // 管理员做出初始审核决策
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 假设有一个举报需要处理
      const reportItem = moderationPage.pendingReports.first();
      await reportItem.locator('[data-testid="reject-button"]').click();
      
      const rejectReason = moderationPage.page.locator('[data-testid="reject-reason"]');
      await rejectReason.fill('经审核认为内容正常，拒绝举报');
      
      const confirmRejectButton = moderationPage.page.locator('[data-testid="confirm-reject"]');
      await confirmRejectButton.click();
    });

    await test.step('用户提交申诉', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      // 用户对审核决策提出申诉
      await moderationPage.page.goto('/profile/reports');
      
      const rejectedReport = moderationPage.page.locator('[data-testid="rejected-report"]').first();
      await rejectedReport.locator('[data-testid="appeal-button"]').click();
      
      const appealReason = moderationPage.page.locator('[data-testid="appeal-reason"]');
      await appealReason.fill('我认为初次审核有误，该内容确实违规，请重新审核');
      
      const submitAppealButton = moderationPage.page.locator('[data-testid="submit-appeal-button"]');
      await submitAppealButton.click();
    });

    await test.step('高级管理员复审', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email, // 假设这是高级管理员
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/appeals');
      
      // 查看申诉并进行复审
      const appealItem = moderationPage.page.locator('[data-testid="appeal-item"]').first();
      await appealItem.locator('[data-testid="review-appeal-button"]').click();
      
      // 查看原始内容和初次审核决策
      const originalContent = moderationPage.page.locator('[data-testid="original-content"]');
      await expect(originalContent).toBeVisible();
      
      const originalDecision = moderationPage.page.locator('[data-testid="original-decision"]');
      await expect(originalDecision).toBeVisible();
      
      // 做出复审决策
      const upholdAppealButton = moderationPage.page.locator('[data-testid="uphold-appeal-button"]');
      await upholdAppealButton.click();
      
      const reviewNote = moderationPage.page.locator('[data-testid="review-note"]');
      await reviewNote.fill('经复审，用户申诉有理，推翻原决策，批准举报');
      
      const confirmReviewButton = moderationPage.page.locator('[data-testid="confirm-review"]');
      await confirmReviewButton.click();
    });

    await test.step('验证复审结果', async () => {
      // 验证申诉处理结果
      const appealResult = moderationPage.page.locator('[data-testid="appeal-result"]');
      await expect(appealResult).toContainText('申诉成功');
      
      // 验证原内容被删除
      await communityPage.goto();
      // 这里需要根据具体的内容来验证是否被删除
    });
  });

  test('自动化审核与人工审核结合的流程', async () => {
    await test.step('配置自动审核规则', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/moderation/automation');
      
      // 配置自动审核规则
      const addRuleButton = moderationPage.page.locator('[data-testid="add-automation-rule"]');
      await addRuleButton.click();
      
      await moderationPage.page.locator('[data-testid="rule-name"]').fill('自动删除明显垃圾内容');
      await moderationPage.page.locator('[data-testid="rule-trigger"]').selectOption('keyword_match');
      await moderationPage.page.locator('[data-testid="rule-keywords"]').fill('点击购买,加微信,联系电话');
      await moderationPage.page.locator('[data-testid="rule-action"]').selectOption('auto_delete');
      await moderationPage.page.locator('[data-testid="rule-confidence"]').fill('90');
      
      const saveRuleButton = moderationPage.page.locator('[data-testid="save-automation-rule"]');
      await saveRuleButton.click();
    });

    await test.step('测试自动审核', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      await communityPage.goto();
      
      // 发布触发自动审核的内容
      await communityPage.createPost(
        '自动审核测试',
        '点击购买宠物用品，加微信：test123',
        ['测试']
      );
      
      // 验证内容被自动删除
      const autoDeleteMessage = moderationPage.page.locator('[data-testid="auto-delete-message"]');
      await expect(autoDeleteMessage).toBeVisible();
    });

    await test.step('边缘案例转人工审核', async () => {
      // 发布需要人工判断的内容
      await communityPage.createPost(
        '边缘案例测试',
        '我的宠物生病了，有推荐的医院吗？可以私信我',
        ['求助']
      );
      
      // 验证内容被标记为需要人工审核
      const manualReviewFlag = moderationPage.page.locator('[data-testid="manual-review-flag"]');
      await expect(manualReviewFlag).toBeVisible();
    });

    await test.step('人工审核边缘案例', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 查看需要人工审核的内容
      const manualReviewQueue = moderationPage.page.locator('[data-testid="manual-review-queue"]');
      await expect(manualReviewQueue).toBeVisible();
      
      const reviewItem = manualReviewQueue.locator('[data-testid="review-item"]').first();
      await reviewItem.locator('[data-testid="approve-button"]').click();
      
      const approvalNote = moderationPage.page.locator('[data-testid="approval-note"]');
      await approvalNote.fill('经人工审核，这是正常的求助内容，批准发布');
      
      const confirmApprovalButton = moderationPage.page.locator('[data-testid="confirm-approval"]');
      await confirmApprovalButton.click();
    });
  });
});