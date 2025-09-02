import { test, expect } from '@playwright/test';
import { ModerationPage } from '../../page-objects/moderation-page';
import { AuthPage } from '../../page-objects/auth-page';
import { CommunityPage } from '../../page-objects/community-page';
import testData from '../../fixtures/moderation-test-data.json';

test.describe('敏感内容检测和过滤测试', () => {
  let moderationPage: ModerationPage;
  let authPage: AuthPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    moderationPage = new ModerationPage(page);
    authPage = new AuthPage(page);
    communityPage = new CommunityPage(page);
    
    // 登录普通用户
    await authPage.goto();
    await authPage.login(
      testData.testUsers.normalUser.email,
      testData.testUsers.normalUser.password
    );
  });

  test('应该检测并阻止敏感文本内容', async () => {
    await test.step('导航到社区页面', async () => {
      await communityPage.goto();
    });

    await test.step('尝试发布包含敏感词汇的内容', async () => {
      const sensitiveText = testData.sensitiveContent.textSamples.inappropriate[0];
      
      await communityPage.createPost(
        '测试敏感内容',
        sensitiveText,
        ['测试']
      );
      
      // 应该显示敏感内容警告
      await moderationPage.expectSensitiveContentWarning();
    });

    await test.step('验证敏感内容被阻止发布', async () => {
      // 检查帖子列表中不应该包含敏感内容
      await expect(communityPage.postList).not.toContainText(
        testData.sensitiveContent.textSamples.inappropriate[0]
      );
    });
  });

  test('应该允许正常内容通过过滤', async () => {
    await test.step('导航到社区页面', async () => {
      await communityPage.goto();
    });

    await test.step('发布正常内容', async () => {
      const normalText = testData.sensitiveContent.textSamples.normal[0];
      
      await communityPage.createPost(
        '正常内容测试',
        normalText,
        ['健康']
      );
      
      // 应该成功发布
      await communityPage.expectPostCreated();
    });

    await test.step('验证正常内容成功发布', async () => {
      await expect(communityPage.postList).toContainText(
        testData.sensitiveContent.textSamples.normal[0]
      );
    });
  });

  test('应该检测不当图片内容', async () => {
    await test.step('导航到便便分析页面', async () => {
      await moderationPage.page.goto('/analysis');
    });

    await test.step('上传不当图片', async () => {
      // 模拟上传不当图片
      const inappropriateImagePath = testData.sensitiveContent.imagePaths.inappropriate[0];
      
      // 这里需要根据实际的图片上传组件进行测试
      const fileInput = moderationPage.page.locator('input[type="file"]');
      await fileInput.setInputFiles(inappropriateImagePath);
      
      // 应该显示内容警告
      await moderationPage.expectSensitiveContentWarning();
    });
  });

  test('应该对多种敏感内容类型进行检测', async () => {
    const sensitiveTexts = testData.sensitiveContent.textSamples.inappropriate;
    
    for (const [index, sensitiveText] of sensitiveTexts.entries()) {
      await test.step(`测试敏感内容 ${index + 1}`, async () => {
        await moderationPage.testContentFilter(sensitiveText);
        await moderationPage.expectSensitiveContentWarning();
      });
    }
  });

  test('应该记录敏感内容检测日志', async () => {
    await test.step('触发敏感内容检测', async () => {
      const sensitiveText = testData.sensitiveContent.textSamples.inappropriate[0];
      await moderationPage.testContentFilter(sensitiveText);
    });

    await test.step('验证检测日志记录', async () => {
      // 检查是否有相应的API调用记录敏感内容检测
      const response = await moderationPage.page.waitForResponse(
        response => response.url().includes('/api/moderation/log') && response.status() === 200
      );
      expect(response).toBeTruthy();
    });
  });

  test('应该支持内容过滤规则配置', async () => {
    // 登录管理员账户
    await authPage.logout();
    await authPage.login(
      testData.testUsers.admin.email,
      testData.testUsers.admin.password
    );

    await test.step('导航到管理员设置页面', async () => {
      await moderationPage.page.goto('/admin/settings');
    });

    await test.step('配置内容过滤规则', async () => {
      // 添加新的敏感词汇
      const newSensitiveWord = '测试敏感词';
      const addWordInput = moderationPage.page.locator('[data-testid="add-sensitive-word-input"]');
      const addWordButton = moderationPage.page.locator('[data-testid="add-sensitive-word-button"]');
      
      await addWordInput.fill(newSensitiveWord);
      await addWordButton.click();
      
      // 验证添加成功
      await expect(moderationPage.page.locator('[data-testid="sensitive-words-list"]'))
        .toContainText(newSensitiveWord);
    });

    await test.step('测试新规则生效', async () => {
      // 切换回普通用户测试新规则
      await authPage.logout();
      await authPage.login(
        testData.testUsers.normalUser.email,
        testData.testUsers.normalUser.password
      );
      
      await moderationPage.testContentFilter('这里包含测试敏感词');
      await moderationPage.expectSensitiveContentWarning();
    });
  });

  test('应该支持内容过滤白名单', async () => {
    await test.step('测试白名单功能', async () => {
      // 某些特殊情况下，管理员可以将内容加入白名单
      const whitelistedContent = '这是被加入白名单的特殊内容';
      
      // 模拟管理员将内容加入白名单的操作
      await moderationPage.page.evaluate((content) => {
        localStorage.setItem('contentWhitelist', JSON.stringify([content]));
      }, whitelistedContent);
      
      await moderationPage.testContentFilter(whitelistedContent);
      await moderationPage.expectContentApproved();
    });
  });
});