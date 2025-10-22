import { test, expect } from '@playwright/test';
import { ModerationPage } from '../../page-objects/moderation-page';
import { AuthPage } from '../../page-objects/auth-page';
import { CommunityPage } from '../../page-objects/community-page';
import testData from '../../fixtures/moderation-test-data.json' with { type: 'json' };

test.describe('举报处理功能测试', () => {
  let moderationPage: ModerationPage;
  let authPage: AuthPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    moderationPage = new ModerationPage(page);
    authPage = new AuthPage(page);
    communityPage = new CommunityPage(page);
  });

  test('用户应该能够举报不当内容', async () => {
    await test.step('准备测试环境', async () => {
      // 登录违规用户发布不当内容
      await authPage.goto();
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      await communityPage.goto();
      await communityPage.createPost(
        testData.testPosts.spamPost.title,
        testData.testPosts.spamPost.content,
        testData.testPosts.spamPost.tags
      );
    });

    await test.step('切换到普通用户进行举报', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
    });

    await test.step('举报不当内容', async () => {
      // 找到要举报的帖子并点击举报按钮
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      
      await moderationPage.reportContent(
        'spam',
        '这是垃圾广告内容，包含推广链接'
      );
    });

    await test.step('验证举报成功', async () => {
      await expect(moderationPage.reportSuccessMessage).toContainText('举报已提交');
    });
  });

  test('应该支持多种举报原因分类', async () => {
    await test.step('登录并准备举报', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
    });

    for (const reason of testData.reportReasons) {
      await test.step(`测试举报原因: ${reason.name}`, async () => {
        const postToReport = communityPage.postList.first();
        await postToReport.locator('[data-testid="post-report-button"]').click();
        
        // 选择举报原因
        await moderationPage.reportReasonSelect.selectOption(reason.id);
        
        // 验证原因描述显示正确
        const reasonDescription = moderationPage.page.locator('[data-testid="reason-description"]');
        await expect(reasonDescription).toContainText(reason.description);
        
        // 取消举报以便测试下一个原因
        await moderationPage.page.locator('[data-testid="cancel-report-button"]').click();
      });
    }
  });

  test('应该防止重复举报同一内容', async () => {
    await test.step('首次举报', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      
      await moderationPage.reportContent('inappropriate', '不当内容');
    });

    await test.step('尝试重复举报', async () => {
      // 刷新页面后再次尝试举报同一内容
      await moderationPage.page.reload();
      
      const postToReport = communityPage.postList.first();
      const reportButton = postToReport.locator('[data-testid="post-report-button"]');
      
      // 举报按钮应该被禁用或显示"已举报"
      await expect(reportButton).toBeDisabled();
      // 或者
      await expect(reportButton).toContainText('已举报');
    });
  });

  test('管理员应该能够查看和处理举报', async () => {
    await test.step('创建举报', async () => {
      // 普通用户创建举报
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      
      await moderationPage.reportContent('spam', '垃圾内容举报测试');
    });

    await test.step('管理员查看举报队列', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 验证举报出现在队列中
      await moderationPage.expectReportInQueue('垃圾内容举报测试');
    });

    await test.step('处理举报 - 批准', async () => {
      await moderationPage.approveReport(0);
      
      // 验证举报被处理
      const processedIndicator = moderationPage.page.locator('[data-testid="report-processed"]');
      await expect(processedIndicator).toBeVisible();
    });
  });

  test('应该支持举报优先级管理', async () => {
    await test.step('创建不同优先级的举报', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      // 创建高优先级举报（骚扰行为）
      const firstPost = communityPage.postList.first();
      await firstPost.locator('[data-testid="post-report-button"]').click();
      await moderationPage.reportContent('harassment', '严重骚扰行为');
      
      // 创建低优先级举报（垃圾信息）
      const secondPost = communityPage.postList.nth(1);
      await secondPost.locator('[data-testid="post-report-button"]').click();
      await moderationPage.reportContent('spam', '一般垃圾信息');
    });

    await test.step('验证举报优先级排序', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 高优先级举报应该排在前面
      const firstReportReason = moderationPage.pendingReports.first()
        .locator('[data-testid="report-reason"]');
      await expect(firstReportReason).toContainText('骚扰行为');
    });
  });

  test('应该支持批量处理举报', async () => {
    await test.step('创建多个举报', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      // 创建3个举报
      for (let i = 0; i < 3; i++) {
        const post = communityPage.postList.nth(i);
        await post.locator('[data-testid="post-report-button"]').click();
        await moderationPage.reportContent('spam', `批量测试举报 ${i + 1}`);
      }
    });

    await test.step('管理员批量处理举报', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      
      // 选择多个举报
      await moderationPage.selectMultipleReports([0, 1, 2]);
      
      // 执行批量批准操作
      await moderationPage.performBatchAction('approve');
      
      // 验证批量操作成功
      const batchSuccessMessage = moderationPage.page.locator('[data-testid="batch-success-message"]');
      await expect(batchSuccessMessage).toContainText('批量操作完成');
    });
  });

  test('应该记录举报处理历史', async () => {
    await test.step('创建并处理举报', async () => {
      // 创建举报
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      await moderationPage.reportContent('inappropriate', '历史记录测试');
      
      // 管理员处理举报
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      await moderationPage.approveReport(0);
    });

    await test.step('查看处理历史', async () => {
      await moderationPage.page.goto('/admin/moderation/history');
      
      // 验证处理历史记录
      const historyList = moderationPage.page.locator('[data-testid="moderation-history"]');
      await expect(historyList).toContainText('历史记录测试');
      await expect(historyList).toContainText('已批准');
    });
  });

  test('应该支持举报状态通知', async () => {
    await test.step('创建举报', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      await moderationPage.reportContent('fake', '虚假信息举报');
    });

    await test.step('管理员处理举报', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.navigateToModerationQueue();
      await moderationPage.approveReport(0);
    });

    await test.step('用户查看举报状态', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      // 导航到用户的举报历史页面
      await moderationPage.page.goto('/profile/reports');
      
      // 验证举报状态更新
      const reportStatus = moderationPage.page.locator('[data-testid="report-status"]');
      await expect(reportStatus).toContainText('已处理');
    });
  });
});