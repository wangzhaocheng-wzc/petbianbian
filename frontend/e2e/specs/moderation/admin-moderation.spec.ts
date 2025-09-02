import { test, expect } from '@playwright/test';
import { ModerationPage } from '../../page-objects/moderation-page';
import { AuthPage } from '../../page-objects/auth-page';
import { CommunityPage } from '../../page-objects/community-page';
import testData from '../../fixtures/moderation-test-data.json';

test.describe('管理员审核工具测试', () => {
  let moderationPage: ModerationPage;
  let authPage: AuthPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    moderationPage = new ModerationPage(page);
    authPage = new AuthPage(page);
    communityPage = new CommunityPage(page);
    
    // 管理员登录
    await authPage.goto();
    await authPage.login(
      testData.testUsers.admin.email,
      testData.testUsers.admin.password
    );
  });

  test('管理员应该能够访问审核仪表板', async () => {
    await test.step('导航到审核仪表板', async () => {
      await moderationPage.page.goto('/admin/moderation');
    });

    await test.step('验证仪表板组件', async () => {
      // 验证关键组件存在
      await expect(moderationPage.moderationQueue).toBeVisible();
      await expect(moderationPage.pendingReports).toBeVisible();
      
      // 验证统计信息
      const statsPanel = moderationPage.page.locator('[data-testid="moderation-stats"]');
      await expect(statsPanel).toBeVisible();
      
      // 验证快速操作按钮
      const quickActions = moderationPage.page.locator('[data-testid="quick-actions"]');
      await expect(quickActions).toBeVisible();
    });
  });

  test('应该显示待审核内容队列', async () => {
    await test.step('准备待审核内容', async () => {
      // 切换到普通用户创建需要审核的内容
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      // 创建举报
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      await moderationPage.reportContent('spam', '测试审核队列');
      
      // 切换回管理员
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
    });

    await test.step('查看审核队列', async () => {
      await moderationPage.navigateToModerationQueue();
      
      // 验证队列中有待审核内容
      await moderationPage.expectReportInQueue('测试审核队列');
      
      // 验证队列项目包含必要信息
      const queueItem = moderationPage.pendingReports.first();
      await expect(queueItem.locator('[data-testid="report-timestamp"]')).toBeVisible();
      await expect(queueItem.locator('[data-testid="report-priority"]')).toBeVisible();
      await expect(queueItem.locator('[data-testid="reporter-info"]')).toBeVisible();
    });
  });

  test('应该支持内容审核决策', async () => {
    await test.step('准备审核内容', async () => {
      // 创建测试举报
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      const postToReport = communityPage.postList.first();
      await postToReport.locator('[data-testid="post-report-button"]').click();
      await moderationPage.reportContent('inappropriate', '审核决策测试');
      
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
    });

    await test.step('执行审核决策 - 批准', async () => {
      await moderationPage.navigateToModerationQueue();
      
      // 查看详细信息
      const reportItem = moderationPage.pendingReports.first();
      await reportItem.locator('[data-testid="view-details-button"]').click();
      
      // 验证详细信息显示
      const detailsModal = moderationPage.page.locator('[data-testid="report-details-modal"]');
      await expect(detailsModal).toBeVisible();
      
      // 批准举报
      await moderationPage.approveButton.click();
      
      // 添加审核备注
      const moderationNote = moderationPage.page.locator('[data-testid="moderation-note"]');
      await moderationNote.fill('经审核确认为不当内容，批准举报');
      
      const confirmDecisionButton = moderationPage.page.locator('[data-testid="confirm-decision"]');
      await confirmDecisionButton.click();
    });

    await test.step('验证决策结果', async () => {
      // 验证举报状态更新
      const processedReports = moderationPage.page.locator('[data-testid="processed-reports"]');
      await expect(processedReports).toContainText('审核决策测试');
      await expect(processedReports).toContainText('已批准');
    });
  });

  test('应该支持批量审核操作', async () => {
    await test.step('准备多个审核项目', async () => {
      // 创建多个举报
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await communityPage.goto();
      
      for (let i = 0; i < 3; i++) {
        const post = communityPage.postList.nth(i);
        await post.locator('[data-testid="post-report-button"]').click();
        await moderationPage.reportContent('spam', `批量审核测试 ${i + 1}`);
      }
      
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
    });

    await test.step('执行批量审核', async () => {
      await moderationPage.navigateToModerationQueue();
      
      // 选择多个项目
      await moderationPage.selectMultipleReports([0, 1, 2]);
      
      // 执行批量批准
      await moderationPage.performBatchAction('approve');
      
      // 验证批量操作成功
      const batchSuccessMessage = moderationPage.page.locator('[data-testid="batch-success-message"]');
      await expect(batchSuccessMessage).toContainText('已批量处理 3 个项目');
    });
  });

  test('应该提供审核统计和分析', async () => {
    await test.step('查看审核统计', async () => {
      await moderationPage.page.goto('/admin/moderation/analytics');
      
      // 验证统计图表
      const statsCharts = moderationPage.page.locator('[data-testid="moderation-charts"]');
      await expect(statsCharts).toBeVisible();
      
      // 验证关键指标
      const keyMetrics = moderationPage.page.locator('[data-testid="key-metrics"]');
      await expect(keyMetrics.locator('[data-testid="total-reports"]')).toBeVisible();
      await expect(keyMetrics.locator('[data-testid="pending-reports"]')).toBeVisible();
      await expect(keyMetrics.locator('[data-testid="processed-reports"]')).toBeVisible();
      await expect(keyMetrics.locator('[data-testid="response-time"]')).toBeVisible();
    });

    await test.step('查看趋势分析', async () => {
      // 验证时间范围选择器
      const timeRangeSelector = moderationPage.page.locator('[data-testid="time-range-selector"]');
      await timeRangeSelector.selectOption('7d');
      
      // 验证图表更新
      const trendChart = moderationPage.page.locator('[data-testid="trend-chart"]');
      await expect(trendChart).toBeVisible();
    });
  });

  test('应该支持审核规则配置', async () => {
    await test.step('导航到规则配置页面', async () => {
      await moderationPage.page.goto('/admin/moderation/rules');
    });

    await test.step('配置自动审核规则', async () => {
      // 添加新的自动审核规则
      const addRuleButton = moderationPage.page.locator('[data-testid="add-rule-button"]');
      await addRuleButton.click();
      
      const ruleModal = moderationPage.page.locator('[data-testid="rule-modal"]');
      await expect(ruleModal).toBeVisible();
      
      // 配置规则参数
      await moderationPage.page.locator('[data-testid="rule-name"]').fill('自动垃圾内容检测');
      await moderationPage.page.locator('[data-testid="rule-condition"]').selectOption('contains_keywords');
      await moderationPage.page.locator('[data-testid="rule-keywords"]').fill('垃圾,广告,推广');
      await moderationPage.page.locator('[data-testid="rule-action"]').selectOption('auto_reject');
      
      const saveRuleButton = moderationPage.page.locator('[data-testid="save-rule-button"]');
      await saveRuleButton.click();
    });

    await test.step('验证规则生效', async () => {
      // 验证规则出现在列表中
      const rulesList = moderationPage.page.locator('[data-testid="rules-list"]');
      await expect(rulesList).toContainText('自动垃圾内容检测');
      
      // 验证规则状态为启用
      const ruleStatus = moderationPage.page.locator('[data-testid="rule-status"]');
      await expect(ruleStatus).toContainText('启用');
    });
  });

  test('应该支持审核员权限管理', async () => {
    await test.step('导航到审核员管理页面', async () => {
      await moderationPage.page.goto('/admin/moderators');
    });

    await test.step('添加新审核员', async () => {
      const addModeratorButton = moderationPage.page.locator('[data-testid="add-moderator-button"]');
      await addModeratorButton.click();
      
      const moderatorModal = moderationPage.page.locator('[data-testid="moderator-modal"]');
      await expect(moderatorModal).toBeVisible();
      
      // 填写审核员信息
      await moderationPage.page.locator('[data-testid="moderator-email"]').fill('new.moderator@test.com');
      
      // 设置权限
      const permissions = ['view_reports', 'approve_reports', 'ban_users'];
      for (const permission of permissions) {
        await moderationPage.page.locator(`[data-testid="permission-${permission}"]`).check();
      }
      
      const saveModerator = moderationPage.page.locator('[data-testid="save-moderator-button"]');
      await saveModerator.click();
    });

    await test.step('验证审核员添加成功', async () => {
      const moderatorsList = moderationPage.page.locator('[data-testid="moderators-list"]');
      await expect(moderatorsList).toContainText('new.moderator@test.com');
    });
  });

  test('应该支持审核日志和审计', async () => {
    await test.step('查看审核日志', async () => {
      await moderationPage.page.goto('/admin/moderation/logs');
      
      // 验证日志列表
      const auditLogs = moderationPage.page.locator('[data-testid="audit-logs"]');
      await expect(auditLogs).toBeVisible();
      
      // 验证日志包含关键信息
      const logEntry = auditLogs.locator('[data-testid="log-entry"]').first();
      await expect(logEntry.locator('[data-testid="log-timestamp"]')).toBeVisible();
      await expect(logEntry.locator('[data-testid="log-action"]')).toBeVisible();
      await expect(logEntry.locator('[data-testid="log-moderator"]')).toBeVisible();
    });

    await test.step('筛选审核日志', async () => {
      // 按操作类型筛选
      const actionFilter = moderationPage.page.locator('[data-testid="action-filter"]');
      await actionFilter.selectOption('approve');
      
      // 按时间范围筛选
      const dateFilter = moderationPage.page.locator('[data-testid="date-filter"]');
      await dateFilter.fill('2024-01-01');
      
      const applyFiltersButton = moderationPage.page.locator('[data-testid="apply-filters"]');
      await applyFiltersButton.click();
      
      // 验证筛选结果
      const filteredLogs = moderationPage.page.locator('[data-testid="filtered-logs"]');
      await expect(filteredLogs).toBeVisible();
    });
  });

  test('应该支持紧急审核模式', async () => {
    await test.step('启用紧急审核模式', async () => {
      await moderationPage.page.goto('/admin/moderation');
      
      const emergencyModeToggle = moderationPage.page.locator('[data-testid="emergency-mode-toggle"]');
      await emergencyModeToggle.click();
      
      // 确认启用紧急模式
      const confirmEmergencyButton = moderationPage.page.locator('[data-testid="confirm-emergency-mode"]');
      await confirmEmergencyButton.click();
    });

    await test.step('验证紧急模式功能', async () => {
      // 验证紧急模式指示器
      const emergencyIndicator = moderationPage.page.locator('[data-testid="emergency-mode-indicator"]');
      await expect(emergencyIndicator).toBeVisible();
      
      // 验证所有新内容需要预审核
      const preApprovalNotice = moderationPage.page.locator('[data-testid="pre-approval-notice"]');
      await expect(preApprovalNotice).toContainText('紧急模式：所有内容需要预先审核');
      
      // 验证快速审核工具可用
      const quickApprovalTools = moderationPage.page.locator('[data-testid="quick-approval-tools"]');
      await expect(quickApprovalTools).toBeVisible();
    });
  });

  test('应该支持审核模板和快速回复', async () => {
    await test.step('创建审核模板', async () => {
      await moderationPage.page.goto('/admin/moderation/templates');
      
      const addTemplateButton = moderationPage.page.locator('[data-testid="add-template-button"]');
      await addTemplateButton.click();
      
      // 填写模板信息
      await moderationPage.page.locator('[data-testid="template-name"]').fill('垃圾内容拒绝');
      await moderationPage.page.locator('[data-testid="template-content"]').fill(
        '您的内容因包含垃圾信息被拒绝，请遵守社区规定。'
      );
      
      const saveTemplateButton = moderationPage.page.locator('[data-testid="save-template-button"]');
      await saveTemplateButton.click();
    });

    await test.step('使用审核模板', async () => {
      await moderationPage.navigateToModerationQueue();
      
      // 选择一个待审核项目
      const reportItem = moderationPage.pendingReports.first();
      await reportItem.locator('[data-testid="reject-button"]').click();
      
      // 选择模板
      const templateSelector = moderationPage.page.locator('[data-testid="template-selector"]');
      await templateSelector.selectOption('垃圾内容拒绝');
      
      // 验证模板内容自动填充
      const rejectReason = moderationPage.page.locator('[data-testid="reject-reason"]');
      await expect(rejectReason).toHaveValue('您的内容因包含垃圾信息被拒绝，请遵守社区规定。');
    });
  });
});