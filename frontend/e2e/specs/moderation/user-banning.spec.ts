import { test, expect } from '@playwright/test';
import { ModerationPage } from '../../page-objects/moderation-page';
import { AuthPage } from '../../page-objects/auth-page';
import { CommunityPage } from '../../page-objects/community-page';
import testData from '../../fixtures/moderation-test-data.json' with { type: 'json' };

test.describe('用户封禁功能测试', () => {
  let moderationPage: ModerationPage;
  let authPage: AuthPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    moderationPage = new ModerationPage(page);
    authPage = new AuthPage(page);
    communityPage = new CommunityPage(page);
  });

  test('管理员应该能够临时封禁用户', async () => {
    await test.step('管理员登录', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
    });

    await test.step('导航到用户管理页面', async () => {
      await moderationPage.page.goto('/admin/users');
    });

    await test.step('执行临时封禁', async () => {
      // 找到要封禁的用户
      const userToban = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await userToban.locator('[data-testid="ban-user-button"]').click();
      
      await moderationPage.banUser(
        'temporary',
        '24h',
        '违反社区规定，临时封禁24小时'
      );
    });

    await test.step('验证封禁成功', async () => {
      await moderationPage.expectUserBanned(testData.testUsers.violatingUser.username);
    });
  });

  test('被封禁用户应该无法登录', async () => {
    await test.step('先封禁用户', async () => {
      // 管理员封禁用户
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
      const userToBan = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await userToBan.locator('[data-testid="ban-user-button"]').click();
      await moderationPage.banUser('temporary', '24h', '测试封禁');
    });

    await test.step('被封禁用户尝试登录', async () => {
      await authPage.logout();
      
      // 尝试以被封禁用户身份登录
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      // 应该显示封禁提示
      const banMessage = moderationPage.page.locator('[data-testid="ban-message"]');
      await expect(banMessage).toBeVisible();
      await expect(banMessage).toContainText('您的账户已被封禁');
    });
  });

  test('应该支持永久封禁用户', async () => {
    await test.step('管理员执行永久封禁', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
      
      const userToBan = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await userToBan.locator('[data-testid="ban-user-button"]').click();
      await moderationPage.banUser(
        'permanent',
        undefined,
        '严重违规，永久封禁'
      );
    });

    await test.step('验证永久封禁状态', async () => {
      const banStatus = moderationPage.page.locator(
        `[data-testid="ban-status-${testData.testUsers.violatingUser.username}"]`
      );
      await expect(banStatus).toContainText('永久封禁');
    });
  });

  test('应该支持解除用户封禁', async () => {
    await test.step('先封禁用户', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
      
      const userToBan = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await userToBan.locator('[data-testid="ban-user-button"]').click();
      await moderationPage.banUser('temporary', '7d', '临时封禁测试');
    });

    await test.step('解除封禁', async () => {
      const bannedUser = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      const unbanButton = bannedUser.locator('[data-testid="unban-user-button"]');
      await unbanButton.click();
      
      // 确认解除封禁
      const confirmUnbanButton = moderationPage.page.locator('[data-testid="confirm-unban-button"]');
      await confirmUnbanButton.click();
      
      // 验证解除封禁成功
      const unbanSuccessMessage = moderationPage.page.locator('[data-testid="unban-success-message"]');
      await expect(unbanSuccessMessage).toBeVisible();
    });

    await test.step('验证用户可以正常登录', async () => {
      await authPage.logout();
      
      await authPage.login(
        testData.testUsers.violatingUser.email,
        testData.testUsers.violatingUser.password
      );
      
      // 应该能够成功登录
      await expect(moderationPage.page.locator('[data-testid="user-dashboard"]')).toBeVisible();
    });
  });

  test('应该记录封禁历史和原因', async () => {
    await test.step('执行封禁操作', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
      
      const userToBan = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await userToBan.locator('[data-testid="ban-user-button"]').click();
      await moderationPage.banUser(
        'temporary',
        '24h',
        '发布垃圾内容，违反社区规定'
      );
    });

    await test.step('查看封禁历史', async () => {
      await moderationPage.page.goto('/admin/bans/history');
      
      const banHistory = moderationPage.page.locator('[data-testid="ban-history"]');
      await expect(banHistory).toContainText(testData.testUsers.violatingUser.username);
      await expect(banHistory).toContainText('发布垃圾内容，违反社区规定');
      await expect(banHistory).toContainText('24小时');
    });
  });

  test('应该支持不同封禁时长选项', async () => {
    const banDurations = ['1h', '24h', '7d', '30d'];
    
    await test.step('管理员登录', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
    });

    for (const duration of banDurations) {
      await test.step(`测试封禁时长: ${duration}`, async () => {
        const userToBan = moderationPage.page.locator(
          `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
        );
        
        await userToBan.locator('[data-testid="ban-user-button"]').click();
        
        // 验证时长选项存在
        const durationOption = moderationPage.banDurationSelect.locator(`option[value="${duration}"]`);
        await expect(durationOption).toBeVisible();
        
        // 取消操作以便测试下一个时长
        await moderationPage.page.locator('[data-testid="cancel-ban-button"]').click();
      });
    }
  });

  test('应该支持批量封禁用户', async () => {
    await test.step('管理员登录并选择多个用户', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
      
      // 选择多个用户进行批量封禁
      const userCheckboxes = moderationPage.page.locator('[data-testid="user-select-checkbox"]');
      await userCheckboxes.first().check();
      await userCheckboxes.nth(1).check();
    });

    await test.step('执行批量封禁', async () => {
      const batchBanButton = moderationPage.page.locator('[data-testid="batch-ban-button"]');
      await batchBanButton.click();
      
      // 设置批量封禁参数
      await moderationPage.banTypeSelect.selectOption('temporary');
      await moderationPage.banDurationSelect.selectOption('24h');
      await moderationPage.banReasonInput.fill('批量处理违规用户');
      
      await moderationPage.confirmBanButton.click();
      
      // 验证批量封禁成功
      const batchBanSuccessMessage = moderationPage.page.locator('[data-testid="batch-ban-success"]');
      await expect(batchBanSuccessMessage).toBeVisible();
    });
  });

  test('被封禁用户应该无法执行关键操作', async () => {
    await test.step('封禁用户', async () => {
      await authPage.goto();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/users');
      
      const userToBan = moderationPage.page.locator(
        `[data-testid="user-${testData.testUsers.violatingUser.username}"]`
      );
      
      await userToBan.locator('[data-testid="ban-user-button"]').click();
      await moderationPage.banUser('temporary', '24h', '测试权限限制');
    });

    await test.step('被封禁用户尝试执行操作', async () => {
      // 模拟被封禁用户的会话（通过API或直接访问）
      await moderationPage.page.goto('/community');
      
      // 尝试发布内容应该被阻止
      const createPostButton = moderationPage.page.locator('[data-testid="create-post-button"]');
      await expect(createPostButton).toBeDisabled();
      
      // 尝试评论应该被阻止
      const commentInput = moderationPage.page.locator('[data-testid="comment-input"]');
      await expect(commentInput).toBeDisabled();
    });
  });

  test('应该支持封禁申诉功能', async () => {
    await test.step('用户提交封禁申诉', async () => {
      // 模拟被封禁用户访问申诉页面
      await moderationPage.page.goto('/appeal');
      
      const appealForm = moderationPage.page.locator('[data-testid="appeal-form"]');
      await expect(appealForm).toBeVisible();
      
      // 填写申诉信息
      await moderationPage.page.locator('[data-testid="appeal-reason"]').fill(
        '我认为封禁是误判，请重新审核我的行为'
      );
      
      const submitAppealButton = moderationPage.page.locator('[data-testid="submit-appeal-button"]');
      await submitAppealButton.click();
      
      // 验证申诉提交成功
      const appealSuccessMessage = moderationPage.page.locator('[data-testid="appeal-success-message"]');
      await expect(appealSuccessMessage).toBeVisible();
    });

    await test.step('管理员处理申诉', async () => {
      await authPage.logout();
      await authPage.login(
        testData.testUsers.admin.email,
        testData.testUsers.admin.password
      );
      
      await moderationPage.page.goto('/admin/appeals');
      
      // 查看申诉列表
      const appealsList = moderationPage.page.locator('[data-testid="appeals-list"]');
      await expect(appealsList).toContainText('我认为封禁是误判');
      
      // 处理申诉
      const approveAppealButton = moderationPage.page.locator('[data-testid="approve-appeal-button"]');
      await approveAppealButton.click();
    });
  });
});