import { test, expect, BrowserContext } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { APIMocker } from '../../utils/api-mocker';

test.describe('增强登录功能测试', () => {
  let authPage: AuthPage;
  let testDataManager: TestDataManager;
  let apiMocker: APIMocker;
  let testUser: any;

  test.beforeEach(async ({ page, request }) => {
    authPage = new AuthPage(page);
    testDataManager = new TestDataManager(request);
    apiMocker = new APIMocker(page);
    
    await testDataManager.init();
    
    // 创建测试用户
    testUser = await testDataManager.createTestUser({
      username: 'logintest',
      email: 'logintest@example.com',
      password: 'TestPass123!'
    });
    
    await authPage.goToLogin();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
    await testDataManager.dispose();
  });

  test.describe('记住登录状态测试', () => {
    test('应该支持记住登录状态功能', async ({ context }) => {
      // 使用记住我选项登录
      await authPage.login(testUser.email, testUser.password, true);
      
      // 验证登录成功
      await authPage.verifySessionState(true);
      
      // 验证记住我功能是否设置了持久化cookie
      const isRemembered = await authPage.verifyRememberMeFunction();
      expect(isRemembered).toBe(true);
    });

    test('应该在新会话中保持登录状态', async ({ browser }) => {
      // 使用记住我选项登录
      await authPage.login(testUser.email, testUser.password, true);
      await authPage.verifySessionState(true);
      
      // 创建新的浏览器上下文（模拟重新打开浏览器）
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      const newAuthPage = new AuthPage(newPage);
      
      // 访问应用
      await newAuthPage.goto('/');
      
      // 验证用户仍然登录
      await newAuthPage.verifySessionState(true);
      
      await newContext.close();
    });

    test('应该在不选择记住我时不保持登录状态', async ({ browser }) => {
      // 不使用记住我选项登录
      await authPage.login(testUser.email, testUser.password, false);
      await authPage.verifySessionState(true);
      
      // 创建新的浏览器上下文
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      const newAuthPage = new AuthPage(newPage);
      
      // 访问应用
      await newAuthPage.goto('/');
      
      // 验证用户未登录
      await newAuthPage.verifySessionState(false);
      
      await newContext.close();
    });

    test('应该支持记住我状态的过期', async ({ page }) => {
      // 模拟过期的记住我token
      await apiMocker.mockExpiredToken();
      
      // 尝试访问需要认证的页面
      await authPage.goto('/dashboard');
      
      // 验证被重定向到登录页面
      await expect(page).toHaveURL(/.*login/);
      
      // 验证显示会话过期提示
      const expiredMessage = authPage.page.locator('[data-testid="session-expired"]');
      await expect(expiredMessage).toContainText('会话已过期，请重新登录');
    });
  });

  test.describe('自动登录测试', () => {
    test('应该支持页面刷新后自动登录', async () => {
      // 登录
      await authPage.login(testUser.email, testUser.password, true);
      await authPage.verifySessionState(true);
      
      // 刷新页面
      await authPage.page.reload();
      
      // 验证自动登录成功
      await authPage.verifySessionState(true);
    });

    test('应该在token有效期内自动续期', async () => {
      // 登录
      await authPage.login(testUser.email, testUser.password, true);
      
      // 模拟接近过期的token
      await apiMocker.mockTokenNearExpiry();
      
      // 执行需要认证的操作
      await authPage.page.goto('/pets');
      
      // 验证token自动续期
      const renewalIndicator = authPage.page.locator('[data-testid="token-renewed"]');
      if (await renewalIndicator.isVisible()) {
        await expect(renewalIndicator).toContainText('会话已自动续期');
      }
      
      // 验证仍然登录
      await authPage.verifySessionState(true);
    });

    test('应该处理自动登录失败情况', async () => {
      // 设置无效的认证信息
      await authPage.page.context().addCookies([{
        name: 'auth_token',
        value: 'invalid_token',
        domain: 'localhost',
        path: '/'
      }]);
      
      // 访问需要认证的页面
      await authPage.goto('/dashboard');
      
      // 验证被重定向到登录页面
      await expect(authPage.page).toHaveURL(/.*login/);
      
      // 验证显示需要重新登录的提示
      const loginPrompt = authPage.page.locator('[data-testid="login-required"]');
      await expect(loginPrompt).toContainText('请登录以继续');
    });
  });

  test.describe('登录失败重试和账户锁定测试', () => {
    test('应该记录登录失败次数', async () => {
      const maxAttempts = 3;
      
      for (let i = 1; i <= maxAttempts; i++) {
        await authPage.login(testUser.email, 'wrongpassword');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toContain('邮箱或密码错误');
        
        // 检查剩余尝试次数提示
        if (i < maxAttempts) {
          const attemptsLeft = authPage.page.locator('[data-testid="attempts-left"]');
          await expect(attemptsLeft).toContainText(`还有 ${maxAttempts - i} 次尝试机会`);
        }
        
        // 清空表单准备下次尝试
        await authPage.page.fill('[data-testid="login-password"]', '');
      }
    });

    test('应该在达到最大失败次数后锁定账户', async () => {
      const maxAttempts = 5;
      
      // 连续失败登录
      for (let i = 0; i < maxAttempts; i++) {
        await authPage.login(testUser.email, 'wrongpassword');
        await authPage.page.fill('[data-testid="login-password"]', '');
      }
      
      // 再次尝试登录
      await authPage.login(testUser.email, 'wrongpassword');
      
      // 验证账户锁定提示
      const lockoutMessage = await authPage.getAuthError();
      expect(lockoutMessage).toContain('账户已被锁定');
    });

    test('应该显示账户锁定倒计时', async () => {
      // 模拟账户被锁定
      await apiMocker.mockAccountLocked(testUser.email, 300); // 5分钟锁定
      
      await authPage.login(testUser.email, testUser.password);
      
      // 验证锁定倒计时显示
      const countdown = authPage.page.locator('[data-testid="lockout-countdown"]');
      await expect(countdown).toBeVisible();
      
      const countdownText = await countdown.textContent();
      expect(countdownText).toMatch(/\d+:\d+/); // 格式：MM:SS
    });

    test('应该支持账户解锁后正常登录', async () => {
      // 模拟账户锁定然后解锁
      await apiMocker.mockAccountLocked(testUser.email, 1); // 1秒锁定
      
      // 等待锁定期过期
      await authPage.page.waitForTimeout(2000);
      
      // 尝试正常登录
      await authPage.login(testUser.email, testUser.password);
      
      // 验证登录成功
      await authPage.verifySessionState(true);
    });

    test('应该支持管理员解锁账户', async () => {
      // 模拟账户被锁定
      await apiMocker.mockAccountLocked(testUser.email, 3600); // 1小时锁定
      
      await authPage.login(testUser.email, testUser.password);
      
      // 验证显示联系管理员的选项
      const contactAdmin = authPage.page.locator('[data-testid="contact-admin"]');
      await expect(contactAdmin).toBeVisible();
      await expect(contactAdmin).toContainText('联系管理员解锁');
    });

    test('应该支持通过邮箱验证解锁账户', async () => {
      // 模拟账户被锁定
      await apiMocker.mockAccountLocked(testUser.email, 3600);
      
      await authPage.login(testUser.email, testUser.password);
      
      // 点击邮箱验证解锁
      const emailUnlock = authPage.page.locator('[data-testid="email-unlock"]');
      if (await emailUnlock.isVisible()) {
        await emailUnlock.click();
        
        // 验证发送解锁邮件的提示
        const emailSent = authPage.page.locator('[data-testid="unlock-email-sent"]');
        await expect(emailSent).toContainText('解锁邮件已发送');
      }
    });
  });

  test.describe('多设备登录和会话管理测试', () => {
    test('应该支持多设备同时登录', async ({ browser }) => {
      // 第一个设备登录
      await authPage.login(testUser.email, testUser.password);
      await authPage.verifySessionState(true);
      
      // 创建第二个浏览器上下文（模拟另一个设备）
      const secondContext = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      });
      const secondPage = await secondContext.newPage();
      const secondAuthPage = new AuthPage(secondPage);
      
      // 第二个设备登录
      await secondAuthPage.login(testUser.email, testUser.password);
      await secondAuthPage.verifySessionState(true);
      
      // 验证两个设备都保持登录状态
      await authPage.verifySessionState(true);
      await secondAuthPage.verifySessionState(true);
      
      await secondContext.close();
    });

    test('应该显示活跃会话列表', async ({ browser }) => {
      // 多设备登录
      await authPage.login(testUser.email, testUser.password);
      
      const contexts = [];
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        const authPageInstance = new AuthPage(page);
        await authPageInstance.login(testUser.email, testUser.password);
        contexts.push(context);
      }
      
      // 访问账户设置页面
      await authPage.page.goto('/settings/security');
      
      // 验证活跃会话列表
      const sessionsList = authPage.page.locator('[data-testid="active-sessions"]');
      await expect(sessionsList).toBeVisible();
      
      const sessionItems = authPage.page.locator('[data-testid="session-item"]');
      const sessionCount = await sessionItems.count();
      expect(sessionCount).toBeGreaterThanOrEqual(4); // 包括当前会话
      
      // 清理
      for (const context of contexts) {
        await context.close();
      }
    });

    test('应该支持远程登出其他设备', async ({ browser }) => {
      // 创建第二个设备会话
      const secondContext = await browser.newContext();
      const secondPage = await secondContext.newPage();
      const secondAuthPage = new AuthPage(secondPage);
      await secondAuthPage.login(testUser.email, testUser.password);
      
      // 在第一个设备上登录并访问安全设置
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/security');
      
      // 登出其他设备
      const logoutOthersButton = authPage.page.locator('[data-testid="logout-other-devices"]');
      await logoutOthersButton.click();
      
      // 确认操作
      const confirmButton = authPage.page.locator('[data-testid="confirm-logout-others"]');
      await confirmButton.click();
      
      // 验证成功提示
      const successMessage = authPage.page.locator('[data-testid="logout-success"]');
      await expect(successMessage).toContainText('已登出其他设备');
      
      // 验证第二个设备被登出
      await secondPage.reload();
      await secondAuthPage.verifySessionState(false);
      
      await secondContext.close();
    });

    test('应该支持单个会话登出', async ({ browser }) => {
      // 创建多个设备会话
      const contexts = [];
      for (let i = 0; i < 2; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        const authPageInstance = new AuthPage(page);
        await authPageInstance.login(testUser.email, testUser.password);
        contexts.push({ context, authPage: authPageInstance });
      }
      
      // 在主设备上访问会话管理
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/security');
      
      // 登出特定会话
      const firstSessionLogout = authPage.page.locator('[data-testid="session-item"]').first()
        .locator('[data-testid="logout-session"]');
      await firstSessionLogout.click();
      
      // 验证该会话被登出
      await contexts[0].authPage.page.reload();
      await contexts[0].authPage.verifySessionState(false);
      
      // 验证其他会话仍然活跃
      await contexts[1].authPage.verifySessionState(true);
      
      // 清理
      for (const { context } of contexts) {
        await context.close();
      }
    });

    test('应该显示会话详细信息', async () => {
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/security');
      
      // 检查会话信息显示
      const sessionInfo = authPage.page.locator('[data-testid="session-info"]').first();
      
      // 验证显示的信息
      await expect(sessionInfo.locator('[data-testid="device-type"]')).toBeVisible();
      await expect(sessionInfo.locator('[data-testid="browser-info"]')).toBeVisible();
      await expect(sessionInfo.locator('[data-testid="ip-address"]')).toBeVisible();
      await expect(sessionInfo.locator('[data-testid="last-activity"]')).toBeVisible();
      await expect(sessionInfo.locator('[data-testid="login-time"]')).toBeVisible();
    });

    test('应该支持可疑登录检测', async ({ browser }) => {
      // 模拟从不同地理位置登录
      const suspiciousContext = await browser.newContext({
        locale: 'zh-CN',
        timezoneId: 'America/New_York', // 不同时区
        geolocation: { latitude: 40.7128, longitude: -74.0060 } // 纽约
      });
      
      const suspiciousPage = await suspiciousContext.newPage();
      const suspiciousAuthPage = new AuthPage(suspiciousPage);
      
      // 模拟可疑登录
      await apiMocker.mockSuspiciousLogin(testUser.email);
      
      await suspiciousAuthPage.login(testUser.email, testUser.password);
      
      // 验证安全验证提示
      const securityChallenge = suspiciousPage.locator('[data-testid="security-challenge"]');
      await expect(securityChallenge).toBeVisible();
      await expect(securityChallenge).toContainText('检测到异常登录');
      
      await suspiciousContext.close();
    });

    test('应该支持会话超时自动登出', async () => {
      await authPage.login(testUser.email, testUser.password);
      
      // 模拟会话即将超时
      await apiMocker.mockSessionTimeout(60); // 60秒后超时
      
      // 验证超时警告显示
      const timeoutWarning = authPage.page.locator('[data-testid="session-timeout-warning"]');
      await expect(timeoutWarning).toBeVisible();
      await expect(timeoutWarning).toContainText('会话即将过期');
      
      // 验证延长会话选项
      const extendSession = authPage.page.locator('[data-testid="extend-session"]');
      await expect(extendSession).toBeVisible();
      
      // 点击延长会话
      await extendSession.click();
      
      // 验证会话延长成功
      const extendedMessage = authPage.page.locator('[data-testid="session-extended"]');
      await expect(extendedMessage).toContainText('会话已延长');
    });
  });

  test.describe('登录安全功能测试', () => {
    test('应该支持两步验证登录', async () => {
      // 模拟启用了两步验证的用户
      await apiMocker.mockTwoFactorEnabled(testUser.email);
      
      await authPage.login(testUser.email, testUser.password);
      
      // 验证跳转到两步验证页面
      await expect(authPage.page).toHaveURL(/.*two-factor/);
      
      // 验证两步验证码输入框
      const twoFactorInput = authPage.page.locator('[data-testid="two-factor-code"]');
      await expect(twoFactorInput).toBeVisible();
      
      // 输入验证码
      await twoFactorInput.fill('123456');
      await authPage.page.click('[data-testid="verify-code"]');
      
      // 验证登录成功
      await authPage.verifySessionState(true);
    });

    test('应该支持验证码重新发送', async () => {
      await apiMocker.mockTwoFactorEnabled(testUser.email);
      await authPage.login(testUser.email, testUser.password);
      
      // 点击重新发送验证码
      const resendButton = authPage.page.locator('[data-testid="resend-code"]');
      await resendButton.click();
      
      // 验证重发成功提示
      const resendMessage = authPage.page.locator('[data-testid="code-resent"]');
      await expect(resendMessage).toContainText('验证码已重新发送');
      
      // 验证重发按钮暂时禁用
      await expect(resendButton).toBeDisabled();
    });

    test('应该支持备用验证码登录', async () => {
      await apiMocker.mockTwoFactorEnabled(testUser.email);
      await authPage.login(testUser.email, testUser.password);
      
      // 点击使用备用验证码
      const backupCodeLink = authPage.page.locator('[data-testid="use-backup-code"]');
      await backupCodeLink.click();
      
      // 输入备用验证码
      const backupCodeInput = authPage.page.locator('[data-testid="backup-code"]');
      await backupCodeInput.fill('backup-code-123');
      await authPage.page.click('[data-testid="verify-backup-code"]');
      
      // 验证登录成功
      await authPage.verifySessionState(true);
    });

    test('应该记录登录历史', async () => {
      await authPage.login(testUser.email, testUser.password);
      
      // 访问账户设置
      await authPage.page.goto('/settings/security');
      
      // 验证登录历史记录
      const loginHistory = authPage.page.locator('[data-testid="login-history"]');
      await expect(loginHistory).toBeVisible();
      
      const historyItems = authPage.page.locator('[data-testid="login-history-item"]');
      const itemCount = await historyItems.count();
      expect(itemCount).toBeGreaterThan(0);
      
      // 验证历史记录包含必要信息
      const firstItem = historyItems.first();
      await expect(firstItem.locator('[data-testid="login-time"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="login-ip"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="login-device"]')).toBeVisible();
    });

    test('应该支持登录通知', async () => {
      // 模拟启用登录通知的用户
      await apiMocker.mockLoginNotificationEnabled(testUser.email);
      
      await authPage.login(testUser.email, testUser.password);
      
      // 验证登录通知发送
      const notificationSent = authPage.page.locator('[data-testid="login-notification-sent"]');
      if (await notificationSent.isVisible()) {
        await expect(notificationSent).toContainText('登录通知已发送到您的邮箱');
      }
    });
  });

  test.describe('登录用户体验测试', () => {
    test('应该支持社交媒体登录', async () => {
      // 测试Google登录
      const googleLoginButton = authPage.page.locator('[data-testid="google-login"]');
      if (await googleLoginButton.isVisible()) {
        await googleLoginButton.click();
        
        // 验证跳转到Google OAuth页面
        await authPage.page.waitForURL(/accounts\.google\.com/);
      }
      
      // 测试微信登录
      await authPage.goToLogin();
      const wechatLoginButton = authPage.page.locator('[data-testid="wechat-login"]');
      if (await wechatLoginButton.isVisible()) {
        await wechatLoginButton.click();
        
        // 验证显示微信二维码
        const qrCode = authPage.page.locator('[data-testid="wechat-qr"]');
        await expect(qrCode).toBeVisible();
      }
    });

    test('应该支持快速登录选项', async () => {
      // 检查是否有保存的登录信息
      const savedAccounts = authPage.page.locator('[data-testid="saved-accounts"]');
      if (await savedAccounts.isVisible()) {
        const accountItems = authPage.page.locator('[data-testid="saved-account-item"]');
        const itemCount = await accountItems.count();
        
        if (itemCount > 0) {
          // 点击第一个保存的账户
          await accountItems.first().click();
          
          // 验证邮箱自动填充
          const emailInput = authPage.page.locator('[data-testid="login-email"]');
          const emailValue = await emailInput.inputValue();
          expect(emailValue).toBeTruthy();
        }
      }
    });

    test('应该支持登录表单自动完成', async () => {
      // 验证表单字段的自动完成属性
      const emailInput = authPage.page.locator('[data-testid="login-email"]');
      const passwordInput = authPage.page.locator('[data-testid="login-password"]');
      
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    test('应该支持登录状态保存提示', async () => {
      await authPage.login(testUser.email, testUser.password, true);
      
      // 验证保存登录状态的提示
      const saveLoginPrompt = authPage.page.locator('[data-testid="save-login-prompt"]');
      if (await saveLoginPrompt.isVisible()) {
        await expect(saveLoginPrompt).toContainText('是否保存登录信息');
        
        // 点击保存
        const saveButton = authPage.page.locator('[data-testid="save-login-info"]');
        await saveButton.click();
        
        // 验证保存成功提示
        const savedMessage = authPage.page.locator('[data-testid="login-info-saved"]');
        await expect(savedMessage).toContainText('登录信息已保存');
      }
    });
  });
});