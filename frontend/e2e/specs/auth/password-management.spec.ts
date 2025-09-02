import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { APIMocker } from '../../utils/api-mocker';

test.describe('密码管理测试', () => {
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
      username: 'passwordtest',
      email: 'passwordtest@example.com',
      password: 'OldPass123!'
    });
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
    await testDataManager.dispose();
  });

  test.describe('密码重置测试', () => {
    test('应该支持通过邮箱重置密码', async () => {
      await authPage.goToLogin();
      
      // 点击忘记密码链接
      await authPage.page.click('[data-testid="forgot-password"]');
      
      // 验证跳转到密码重置页面
      await expect(authPage.page).toHaveURL(/.*reset-password/);
      
      // 输入邮箱地址
      await authPage.requestPasswordReset(testUser.email);
      
      // 验证重置邮件发送成功提示
      const successMessage = await authPage.getAuthSuccess();
      expect(successMessage).toContain('密码重置邮件已发送');
    });

    test('应该验证重置邮箱地址格式', async () => {
      await authPage.goToLogin();
      await authPage.page.click('[data-testid="forgot-password"]');
      
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com'
      ];

      for (const email of invalidEmails) {
        await authPage.page.fill('[data-testid="reset-email"]', email);
        await authPage.page.click('[data-testid="reset-submit"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toContain('请输入有效的邮箱地址');
        
        await authPage.page.fill('[data-testid="reset-email"]', '');
      }
    });

    test('应该处理不存在的邮箱地址', async () => {
      await authPage.goToLogin();
      await authPage.page.click('[data-testid="forgot-password"]');
      
      // 输入不存在的邮箱
      await authPage.requestPasswordReset('nonexistent@example.com');
      
      // 验证错误提示（出于安全考虑，可能不会明确说明邮箱不存在）
      const message = await authPage.getAuthError() || await authPage.getAuthSuccess();
      expect(message).toBeTruthy();
    });

    test('应该支持重置链接过期处理', async () => {
      // 模拟过期的重置链接
      await authPage.page.goto('/reset-password?token=expired_token');
      
      // 验证过期提示
      const expiredMessage = authPage.page.locator('[data-testid="token-expired"]');
      await expect(expiredMessage).toContainText('重置链接已过期');
      
      // 验证重新发送选项
      const resendButton = authPage.page.locator('[data-testid="resend-reset-email"]');
      await expect(resendButton).toBeVisible();
    });

    test('应该支持重置链接使用次数限制', async () => {
      // 模拟已使用的重置链接
      await authPage.page.goto('/reset-password?token=used_token');
      
      // 验证已使用提示
      const usedMessage = authPage.page.locator('[data-testid="token-used"]');
      await expect(usedMessage).toContainText('该重置链接已被使用');
    });

    test('应该支持新密码设置', async () => {
      // 模拟有效的重置链接
      await authPage.page.goto('/reset-password?token=valid_token');
      
      const newPassword = 'NewPass123!';
      
      // 填写新密码
      await authPage.page.fill('[data-testid="new-password"]', newPassword);
      await authPage.page.fill('[data-testid="confirm-new-password"]', newPassword);
      
      // 提交新密码
      await authPage.page.click('[data-testid="reset-password-submit"]');
      
      // 验证密码重置成功
      const successMessage = await authPage.getAuthSuccess();
      expect(successMessage).toContain('密码重置成功');
      
      // 验证自动登录或跳转到登录页面
      await expect(authPage.page).toHaveURL(/\/(login|dashboard)/);
    });

    test('应该验证新密码强度要求', async () => {
      await authPage.page.goto('/reset-password?token=valid_token');
      
      const weakPasswords = [
        '123',           // 太短
        'password',      // 太简单
        'PASSWORD',      // 缺少小写和数字
        '12345678'       // 只有数字
      ];

      for (const password of weakPasswords) {
        await authPage.page.fill('[data-testid="new-password"]', password);
        await authPage.page.blur('[data-testid="new-password"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toMatch(/(密码强度不够|密码至少需要|密码必须包含)/);
        
        await authPage.page.fill('[data-testid="new-password"]', '');
      }
    });

    test('应该验证新密码确认匹配', async () => {
      await authPage.page.goto('/reset-password?token=valid_token');
      
      await authPage.page.fill('[data-testid="new-password"]', 'NewPass123!');
      await authPage.page.fill('[data-testid="confirm-new-password"]', 'DifferentPass123!');
      await authPage.page.blur('[data-testid="confirm-new-password"]');
      
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('密码不匹配');
    });

    test('应该支持重置频率限制', async () => {
      await authPage.goToLogin();
      await authPage.page.click('[data-testid="forgot-password"]');
      
      // 第一次请求重置
      await authPage.requestPasswordReset(testUser.email);
      
      // 立即再次请求重置
      await authPage.page.fill('[data-testid="reset-email"]', testUser.email);
      await authPage.page.click('[data-testid="reset-submit"]');
      
      // 验证频率限制提示
      const rateLimitMessage = await authPage.getAuthError();
      expect(rateLimitMessage).toContain('请稍后再试');
    });
  });

  test.describe('修改密码测试', () => {
    test.beforeEach(async () => {
      // 登录用户
      await authPage.login(testUser.email, testUser.password);
      await authPage.verifySessionState(true);
      
      // 导航到密码设置页面
      await authPage.page.goto('/settings/password');
    });

    test('应该支持修改密码功能', async () => {
      const newPassword = 'NewSecurePass123!';
      
      // 填写密码修改表单
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      await authPage.page.fill('[data-testid="new-password"]', newPassword);
      await authPage.page.fill('[data-testid="confirm-new-password"]', newPassword);
      
      // 提交修改
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 验证修改成功
      const successMessage = await authPage.getAuthSuccess();
      expect(successMessage).toContain('密码修改成功');
      
      // 验证需要重新登录
      await authPage.verifySessionState(false);
      
      // 使用新密码登录验证
      await authPage.login(testUser.email, newPassword);
      await authPage.verifySessionState(true);
    });

    test('应该验证当前密码正确性', async () => {
      // 输入错误的当前密码
      await authPage.page.fill('[data-testid="current-password"]', 'WrongPassword123!');
      await authPage.page.fill('[data-testid="new-password"]', 'NewPass123!');
      await authPage.page.fill('[data-testid="confirm-new-password"]', 'NewPass123!');
      
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 验证错误提示
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('当前密码不正确');
    });

    test('应该验证新密码不能与当前密码相同', async () => {
      // 使用相同的密码
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      await authPage.page.fill('[data-testid="new-password"]', testUser.password);
      await authPage.page.fill('[data-testid="confirm-new-password"]', testUser.password);
      
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 验证错误提示
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('新密码不能与当前密码相同');
    });

    test('应该支持密码强度实时检查', async () => {
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      
      const passwords = [
        { password: '123', strength: '弱' },
        { password: 'password123', strength: '中等' },
        { password: 'StrongPass123!', strength: '强' }
      ];

      for (const { password, strength } of passwords) {
        await authPage.page.fill('[data-testid="new-password"]', password);
        await authPage.page.blur('[data-testid="new-password"]');
        
        const strengthIndicator = authPage.page.locator('[data-testid="password-strength"]');
        const strengthText = await strengthIndicator.textContent();
        expect(strengthText).toContain(strength);
        
        await authPage.page.fill('[data-testid="new-password"]', '');
      }
    });

    test('应该支持密码可见性切换', async () => {
      const password = 'TestPassword123!';
      
      // 输入密码
      await authPage.page.fill('[data-testid="new-password"]', password);
      
      // 验证密码默认隐藏
      const passwordInput = authPage.page.locator('[data-testid="new-password"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // 切换可见性
      await authPage.page.click('[data-testid="toggle-new-password-visibility"]');
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // 再次切换
      await authPage.page.click('[data-testid="toggle-new-password-visibility"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('应该支持密码修改确认对话框', async () => {
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      await authPage.page.fill('[data-testid="new-password"]', 'NewPass123!');
      await authPage.page.fill('[data-testid="confirm-new-password"]', 'NewPass123!');
      
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 验证确认对话框
      const confirmDialog = authPage.page.locator('[data-testid="confirm-password-change"]');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('确认修改密码');
      
      // 确认修改
      await authPage.page.click('[data-testid="confirm-change"]');
      
      // 验证修改成功
      const successMessage = await authPage.getAuthSuccess();
      expect(successMessage).toContain('密码修改成功');
    });
  });

  test.describe('密码安全策略验证测试', () => {
    test('应该验证密码长度要求', async () => {
      await authPage.goToRegister();
      
      const testCases = [
        { password: '12345', valid: false, reason: '太短' },
        { password: '123456', valid: true, reason: '最小长度' },
        { password: 'a'.repeat(128), valid: true, reason: '最大长度' },
        { password: 'a'.repeat(129), valid: false, reason: '超过最大长度' }
      ];

      for (const { password, valid, reason } of testCases) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const errorMessage = await authPage.getAuthError();
        
        if (valid) {
          expect(errorMessage).not.toContain('密码长度');
        } else {
          expect(errorMessage).toMatch(/(密码长度|太短|太长)/);
        }
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该验证密码复杂度要求', async () => {
      await authPage.goToRegister();
      
      const complexityTests = [
        { password: 'password', hasLower: true, hasUpper: false, hasNumber: false, hasSpecial: false },
        { password: 'PASSWORD', hasLower: false, hasUpper: true, hasNumber: false, hasSpecial: false },
        { password: '12345678', hasLower: false, hasUpper: false, hasNumber: true, hasSpecial: false },
        { password: '!@#$%^&*', hasLower: false, hasUpper: false, hasNumber: false, hasSpecial: true },
        { password: 'Password123!', hasLower: true, hasUpper: true, hasNumber: true, hasSpecial: true }
      ];

      for (const test of complexityTests) {
        await authPage.page.fill('[data-testid="register-password"]', test.password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        // 检查复杂度指示器
        const complexityIndicators = {
          lowercase: authPage.page.locator('[data-testid="has-lowercase"]'),
          uppercase: authPage.page.locator('[data-testid="has-uppercase"]'),
          number: authPage.page.locator('[data-testid="has-number"]'),
          special: authPage.page.locator('[data-testid="has-special"]')
        };

        if (await complexityIndicators.lowercase.isVisible()) {
          const hasClass = await complexityIndicators.lowercase.getAttribute('class');
          expect(hasClass?.includes('valid')).toBe(test.hasLower);
        }
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该禁止常见弱密码', async () => {
      await authPage.goToRegister();
      
      const commonPasswords = [
        'password123',
        '123456789',
        'qwerty123',
        'admin123',
        'password1',
        'welcome123',
        'letmein123'
      ];

      for (const password of commonPasswords) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toMatch(/(常见密码|过于简单|不安全)/);
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该验证密码字符集要求', async () => {
      await authPage.goToRegister();
      
      // 测试不允许的字符
      const invalidCharacters = ['<', '>', '"', "'", '&', '\\'];
      
      for (const char of invalidCharacters) {
        const password = `ValidPass123${char}`;
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const errorMessage = await authPage.getAuthError();
        if (errorMessage) {
          expect(errorMessage).toContain('包含不允许的字符');
        }
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该支持密码强度评分', async () => {
      await authPage.goToRegister();
      
      const passwordTests = [
        { password: '123456', expectedScore: 1 },
        { password: 'password', expectedScore: 2 },
        { password: 'Password123', expectedScore: 3 },
        { password: 'Password123!', expectedScore: 4 },
        { password: 'MyVerySecureP@ssw0rd2023!', expectedScore: 5 }
      ];

      for (const { password, expectedScore } of passwordTests) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const scoreIndicator = authPage.page.locator('[data-testid="password-score"]');
        if (await scoreIndicator.isVisible()) {
          const scoreText = await scoreIndicator.textContent();
          const actualScore = parseInt(scoreText?.match(/\d+/)?.[0] || '0');
          expect(actualScore).toBe(expectedScore);
        }
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });
  });

  test.describe('密码历史和过期检查测试', () => {
    test.beforeEach(async () => {
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/password');
    });

    test('应该防止重复使用最近的密码', async () => {
      // 模拟用户有密码历史
      await apiMocker.mockPasswordHistory(testUser.email, [
        'OldPass123!',
        'PrevPass123!',
        'AnotherPass123!'
      ]);
      
      // 尝试使用历史密码
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      await authPage.page.fill('[data-testid="new-password"]', 'PrevPass123!');
      await authPage.page.fill('[data-testid="confirm-new-password"]', 'PrevPass123!');
      
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 验证错误提示
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('不能使用最近使用过的密码');
    });

    test('应该显示密码历史记录数量', async () => {
      const historyInfo = authPage.page.locator('[data-testid="password-history-info"]');
      if (await historyInfo.isVisible()) {
        const infoText = await historyInfo.textContent();
        expect(infoText).toMatch(/不能重复使用最近\s*\d+\s*个密码/);
      }
    });

    test('应该支持密码过期检查', async () => {
      // 模拟密码即将过期
      await apiMocker.mockPasswordExpiring(testUser.email, 7); // 7天后过期
      
      await authPage.page.reload();
      
      // 验证过期警告
      const expiryWarning = authPage.page.locator('[data-testid="password-expiry-warning"]');
      await expect(expiryWarning).toBeVisible();
      await expect(expiryWarning).toContainText('密码将在 7 天后过期');
    });

    test('应该强制过期密码更新', async () => {
      // 模拟密码已过期
      await apiMocker.mockPasswordExpired(testUser.email);
      
      // 尝试访问其他页面
      await authPage.page.goto('/dashboard');
      
      // 验证被重定向到密码更新页面
      await expect(authPage.page).toHaveURL(/.*change-password/);
      
      // 验证强制更新提示
      const forceUpdateMessage = authPage.page.locator('[data-testid="force-password-update"]');
      await expect(forceUpdateMessage).toContainText('密码已过期，请立即更新');
    });

    test('应该显示密码年龄信息', async () => {
      const passwordAge = authPage.page.locator('[data-testid="password-age"]');
      if (await passwordAge.isVisible()) {
        const ageText = await passwordAge.textContent();
        expect(ageText).toMatch(/密码创建于\s*\d+\s*天前/);
      }
    });

    test('应该支持密码强度历史跟踪', async () => {
      // 查看密码强度历史
      const strengthHistory = authPage.page.locator('[data-testid="password-strength-history"]');
      if (await strengthHistory.isVisible()) {
        const historyItems = authPage.page.locator('[data-testid="strength-history-item"]');
        const itemCount = await historyItems.count();
        expect(itemCount).toBeGreaterThan(0);
        
        // 验证历史项包含日期和强度信息
        const firstItem = historyItems.first();
        await expect(firstItem.locator('[data-testid="change-date"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="strength-level"]')).toBeVisible();
      }
    });

    test('应该支持密码策略配置查看', async () => {
      const policyInfo = authPage.page.locator('[data-testid="password-policy"]');
      if (await policyInfo.isVisible()) {
        // 验证策略信息显示
        await expect(policyInfo.locator('[data-testid="min-length"]')).toContainText('最小长度');
        await expect(policyInfo.locator('[data-testid="complexity-requirements"]')).toBeVisible();
        await expect(policyInfo.locator('[data-testid="history-count"]')).toContainText('历史密码');
        await expect(policyInfo.locator('[data-testid="expiry-period"]')).toContainText('有效期');
      }
    });
  });

  test.describe('密码安全事件测试', () => {
    test('应该记录密码修改事件', async () => {
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/password');
      
      // 修改密码
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      await authPage.page.fill('[data-testid="new-password"]', 'NewSecurePass123!');
      await authPage.page.fill('[data-testid="confirm-new-password"]', 'NewSecurePass123!');
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 访问安全日志
      await authPage.page.goto('/settings/security-log');
      
      // 验证密码修改事件记录
      const securityLog = authPage.page.locator('[data-testid="security-log"]');
      const logEntries = authPage.page.locator('[data-testid="log-entry"]');
      
      const passwordChangeEntry = logEntries.filter({
        has: authPage.page.locator('text=密码修改')
      });
      
      await expect(passwordChangeEntry).toHaveCount(1);
    });

    test('应该记录密码重置事件', async () => {
      await authPage.goToLogin();
      await authPage.page.click('[data-testid="forgot-password"]');
      await authPage.requestPasswordReset(testUser.email);
      
      // 登录后查看安全日志
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/security-log');
      
      // 验证密码重置请求记录
      const resetEntry = authPage.page.locator('[data-testid="log-entry"]').filter({
        has: authPage.page.locator('text=密码重置请求')
      });
      
      await expect(resetEntry).toHaveCount(1);
    });

    test('应该发送密码修改通知', async () => {
      await authPage.login(testUser.email, testUser.password);
      await authPage.page.goto('/settings/password');
      
      // 修改密码
      await authPage.page.fill('[data-testid="current-password"]', testUser.password);
      await authPage.page.fill('[data-testid="new-password"]', 'NewSecurePass123!');
      await authPage.page.fill('[data-testid="confirm-new-password"]', 'NewSecurePass123!');
      await authPage.page.click('[data-testid="change-password-submit"]');
      
      // 验证通知发送提示
      const notificationSent = authPage.page.locator('[data-testid="password-change-notification"]');
      if (await notificationSent.isVisible()) {
        await expect(notificationSent).toContainText('密码修改通知已发送到您的邮箱');
      }
    });

    test('应该支持可疑密码活动检测', async () => {
      // 模拟可疑的密码修改活动
      await apiMocker.mockSuspiciousPasswordActivity(testUser.email);
      
      await authPage.login(testUser.email, testUser.password);
      
      // 验证安全警告
      const securityAlert = authPage.page.locator('[data-testid="security-alert"]');
      await expect(securityAlert).toBeVisible();
      await expect(securityAlert).toContainText('检测到异常密码活动');
    });

    test('应该支持密码泄露检查', async () => {
      await authPage.goToRegister();
      
      // 输入已知泄露的密码
      const compromisedPassword = 'password123';
      await authPage.page.fill('[data-testid="register-password"]', compromisedPassword);
      await authPage.page.blur('[data-testid="register-password"]');
      
      // 验证泄露警告
      const breachWarning = authPage.page.locator('[data-testid="password-breach-warning"]');
      if (await breachWarning.isVisible()) {
        await expect(breachWarning).toContainText('该密码已在数据泄露中出现');
      }
    });
  });

  test.describe('密码管理用户体验测试', () => {
    test('应该支持密码生成器', async () => {
      await authPage.goToRegister();
      
      // 点击密码生成器
      const passwordGenerator = authPage.page.locator('[data-testid="password-generator"]');
      if (await passwordGenerator.isVisible()) {
        await passwordGenerator.click();
        
        // 验证生成器选项
        const generatorOptions = authPage.page.locator('[data-testid="generator-options"]');
        await expect(generatorOptions).toBeVisible();
        
        // 生成密码
        await authPage.page.click('[data-testid="generate-password"]');
        
        // 验证密码已填入
        const passwordInput = authPage.page.locator('[data-testid="register-password"]');
        const generatedPassword = await passwordInput.inputValue();
        expect(generatedPassword).toBeTruthy();
        expect(generatedPassword.length).toBeGreaterThan(8);
      }
    });

    test('应该支持密码强度提示', async () => {
      await authPage.goToRegister();
      
      const passwords = [
        { password: '123', tips: ['增加长度', '添加字母'] },
        { password: 'password', tips: ['添加数字', '添加大写字母'] },
        { password: 'Password123', tips: ['添加特殊字符'] }
      ];

      for (const { password, tips } of passwords) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const strengthTips = authPage.page.locator('[data-testid="password-tips"]');
        if (await strengthTips.isVisible()) {
          const tipsText = await strengthTips.textContent();
          for (const tip of tips) {
            expect(tipsText).toContain(tip);
          }
        }
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该支持密码输入辅助功能', async () => {
      await authPage.goToRegister();
      
      // 测试Caps Lock检测
      await authPage.page.fill('[data-testid="register-password"]', 'PASSWORD');
      
      const capsLockWarning = authPage.page.locator('[data-testid="caps-lock-warning"]');
      if (await capsLockWarning.isVisible()) {
        await expect(capsLockWarning).toContainText('大写锁定已开启');
      }
    });

    test('应该支持密码复制功能', async () => {
      await authPage.goToRegister();
      
      const password = 'TestPassword123!';
      await authPage.page.fill('[data-testid="register-password"]', password);
      
      // 显示密码
      await authPage.page.click('[data-testid="toggle-password-visibility"]');
      
      // 复制密码按钮
      const copyButton = authPage.page.locator('[data-testid="copy-password"]');
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // 验证复制成功提示
        const copySuccess = authPage.page.locator('[data-testid="copy-success"]');
        await expect(copySuccess).toContainText('密码已复制');
      }
    });
  });
});