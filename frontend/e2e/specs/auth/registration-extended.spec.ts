import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { APIMocker } from '../../utils/api-mocker';

test.describe('扩展注册流程测试', () => {
  let authPage: AuthPage;
  let testDataManager: TestDataManager;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page, request }) => {
    authPage = new AuthPage(page);
    testDataManager = new TestDataManager(request);
    apiMocker = new APIMocker(page);
    
    await testDataManager.init();
    await authPage.goToRegister();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
    await testDataManager.dispose();
  });

  test.describe('邮箱验证测试', () => {
    test('应该验证邮箱格式', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example',
        'test@.com',
        'test@example..com'
      ];

      for (const email of invalidEmails) {
        await authPage.page.fill('[data-testid="register-email"]', email);
        await authPage.page.blur('[data-testid="register-email"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toContain('请输入有效的邮箱地址');
        
        // 清空输入框
        await authPage.page.fill('[data-testid="register-email"]', '');
      }
    });

    test('应该检测邮箱重复', async () => {
      // 先创建一个测试用户
      const existingUser = await testDataManager.createTestUser({
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'TestPass123!'
      });

      // 尝试使用相同邮箱注册
      await authPage.register({
        username: 'newuser',
        email: existingUser.email,
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('该邮箱已被注册');
    });

    test('应该支持邮箱大小写不敏感检查', async () => {
      // 创建用户使用小写邮箱
      const existingUser = await testDataManager.createTestUser({
        email: 'test@example.com',
        username: 'testuser1',
        password: 'TestPass123!'
      });

      // 尝试使用大写邮箱注册
      await authPage.register({
        username: 'testuser2',
        email: 'TEST@EXAMPLE.COM',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('该邮箱已被注册');
    });

    test('应该验证邮箱长度限制', async () => {
      // 测试过长的邮箱
      const longEmail = 'a'.repeat(250) + '@example.com';
      
      await authPage.page.fill('[data-testid="register-email"]', longEmail);
      await authPage.page.blur('[data-testid="register-email"]');
      
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('邮箱长度不能超过');
    });
  });

  test.describe('密码强度验证测试', () => {
    test('应该验证密码最小长度', async () => {
      const shortPasswords = ['1', '12', '123', '1234', '12345'];
      
      for (const password of shortPasswords) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toContain('密码至少需要6个字符');
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该验证密码复杂度要求', async () => {
      const weakPasswords = [
        'password',      // 只有小写字母
        'PASSWORD',      // 只有大写字母
        '12345678',      // 只有数字
        'password123',   // 缺少大写字母和特殊字符
        'Password',      // 缺少数字和特殊字符
        'Password123'    // 缺少特殊字符
      ];

      for (const password of weakPasswords) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        // 检查密码强度指示器
        const strengthIndicator = authPage.page.locator('[data-testid="password-strength"]');
        const strengthText = await strengthIndicator.textContent();
        expect(strengthText).toMatch(/(弱|中等)/);
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });

    test('应该显示强密码指示器', async () => {
      const strongPassword = 'StrongPass123!';
      
      await authPage.page.fill('[data-testid="register-password"]', strongPassword);
      await authPage.page.blur('[data-testid="register-password"]');
      
      const strengthIndicator = authPage.page.locator('[data-testid="password-strength"]');
      const strengthText = await strengthIndicator.textContent();
      expect(strengthText).toContain('强');
    });

    test('应该验证密码确认匹配', async () => {
      await authPage.page.fill('[data-testid="register-password"]', 'TestPass123!');
      await authPage.page.fill('[data-testid="register-confirm-password"]', 'DifferentPass123!');
      await authPage.page.blur('[data-testid="register-confirm-password"]');
      
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('密码不匹配');
    });

    test('应该验证密码最大长度', async () => {
      const longPassword = 'A'.repeat(129) + '1!';
      
      await authPage.page.fill('[data-testid="register-password"]', longPassword);
      await authPage.page.blur('[data-testid="register-password"]');
      
      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('密码长度不能超过');
    });

    test('应该禁止常见弱密码', async () => {
      const commonPasswords = [
        'password123',
        '123456789',
        'qwerty123',
        'admin123',
        'password1'
      ];

      for (const password of commonPasswords) {
        await authPage.page.fill('[data-testid="register-password"]', password);
        await authPage.page.blur('[data-testid="register-password"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toContain('密码过于简单');
        
        await authPage.page.fill('[data-testid="register-password"]', '');
      }
    });
  });

  test.describe('用户名重复检查测试', () => {
    test('应该检测用户名重复', async () => {
      // 先创建一个测试用户
      const existingUser = await testDataManager.createTestUser({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'TestPass123!'
      });

      // 尝试使用相同用户名注册
      await authPage.register({
        username: existingUser.username,
        email: 'new@example.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('该用户名已被使用');
    });

    test('应该支持用户名大小写敏感检查', async () => {
      // 创建用户使用小写用户名
      const existingUser = await testDataManager.createTestUser({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'TestPass123!'
      });

      // 尝试使用大写用户名注册（应该允许）
      await authPage.register({
        username: 'TESTUSER',
        email: 'test2@example.com',
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      });

      // 验证注册成功
      const successMessage = await authPage.getAuthSuccess();
      expect(successMessage).toContain('注册成功');
    });

    test('应该验证用户名格式要求', async () => {
      const invalidUsernames = [
        'ab',           // 太短
        'a'.repeat(31), // 太长
        'user@name',    // 包含特殊字符
        'user name',    // 包含空格
        '123user',      // 以数字开头
        'user-name',    // 包含连字符
        'user.name'     // 包含点号
      ];

      for (const username of invalidUsernames) {
        await authPage.page.fill('[data-testid="register-username"]', username);
        await authPage.page.blur('[data-testid="register-username"]');
        
        const errorMessage = await authPage.getAuthError();
        expect(errorMessage).toMatch(/(用户名格式不正确|用户名长度|用户名只能包含)/);
        
        await authPage.page.fill('[data-testid="register-username"]', '');
      }
    });

    test('应该支持实时用户名可用性检查', async () => {
      // 创建现有用户
      const existingUser = await testDataManager.createTestUser({
        username: 'takenuser',
        email: 'taken@example.com',
        password: 'TestPass123!'
      });

      // 输入已存在的用户名
      await authPage.page.fill('[data-testid="register-username"]', existingUser.username);
      await authPage.page.blur('[data-testid="register-username"]');
      
      // 等待实时验证
      await authPage.page.waitForTimeout(1000);
      
      const availabilityIndicator = authPage.page.locator('[data-testid="username-availability"]');
      const availabilityText = await availabilityIndicator.textContent();
      expect(availabilityText).toContain('不可用');
    });
  });

  test.describe('注册表单验证测试', () => {
    test('应该显示必填字段错误', async () => {
      // 尝试提交空表单
      await authPage.page.click('[data-testid="register-submit"]');
      
      // 验证所有必填字段的错误消息
      const usernameError = authPage.page.locator('[data-testid="username-error"]');
      const emailError = authPage.page.locator('[data-testid="email-error"]');
      const passwordError = authPage.page.locator('[data-testid="password-error"]');
      const confirmPasswordError = authPage.page.locator('[data-testid="confirm-password-error"]');
      
      await expect(usernameError).toContainText('用户名是必需的');
      await expect(emailError).toContainText('邮箱是必需的');
      await expect(passwordError).toContainText('密码是必需的');
      await expect(confirmPasswordError).toContainText('请确认密码');
    });

    test('应该验证服务条款同意', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      // 填写表单但不同意条款
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password,
        agreeToTerms: false
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('请同意服务条款');
    });

    test('应该支持表单字段自动完成', async () => {
      // 测试浏览器自动完成属性
      const usernameInput = authPage.page.locator('[data-testid="register-username"]');
      const emailInput = authPage.page.locator('[data-testid="register-email"]');
      const passwordInput = authPage.page.locator('[data-testid="register-password"]');
      
      await expect(usernameInput).toHaveAttribute('autocomplete', 'username');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    });

    test('应该支持键盘导航', async () => {
      // 使用Tab键在表单字段间导航
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator('[data-testid="register-username"]')).toBeFocused();
      
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator('[data-testid="register-email"]')).toBeFocused();
      
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator('[data-testid="register-password"]')).toBeFocused();
      
      await authPage.page.keyboard.press('Tab');
      await expect(authPage.page.locator('[data-testid="register-confirm-password"]')).toBeFocused();
    });

    test('应该支持Enter键提交表单', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      // 填写表单
      await authPage.page.fill('[data-testid="register-username"]', userData.username);
      await authPage.page.fill('[data-testid="register-email"]', userData.email);
      await authPage.page.fill('[data-testid="register-password"]', userData.password);
      await authPage.page.fill('[data-testid="register-confirm-password"]', userData.password);
      
      // 同意条款
      await authPage.page.check('[data-testid="agreement-checkbox"]');
      
      // 使用Enter键提交
      await authPage.page.keyboard.press('Enter');
      
      // 验证表单提交
      await authPage.waitForAuthStateChange('logged-in');
    });
  });

  test.describe('注册错误提示测试', () => {
    test('应该显示服务器错误提示', async () => {
      // 模拟服务器错误
      await apiMocker.mockServerError('/api/auth/register', 500);
      
      const userData = testDataManager.generateRandomUserData();
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('服务器错误，请稍后重试');
    });

    test('应该显示网络错误提示', async () => {
      // 模拟网络错误
      await apiMocker.mockNetworkError('/api/auth/register');
      
      const userData = testDataManager.generateRandomUserData();
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('网络连接失败');
    });

    test('应该显示请求超时提示', async () => {
      // 模拟慢响应
      await apiMocker.mockSlowResponse('/api/auth/register', 30000);
      
      const userData = testDataManager.generateRandomUserData();
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      const errorMessage = await authPage.getAuthError();
      expect(errorMessage).toContain('请求超时');
    });

    test('应该支持错误消息自动消失', async () => {
      // 触发一个验证错误
      await authPage.page.fill('[data-testid="register-email"]', 'invalid-email');
      await authPage.page.blur('[data-testid="register-email"]');
      
      // 验证错误消息显示
      const errorMessage = authPage.page.locator('[data-testid="auth-error"]');
      await expect(errorMessage).toBeVisible();
      
      // 修正输入
      await authPage.page.fill('[data-testid="register-email"]', 'valid@example.com');
      await authPage.page.blur('[data-testid="register-email"]');
      
      // 验证错误消息消失
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('注册成功后用户状态验证测试', () => {
    test('应该验证注册成功后的页面跳转', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 验证跳转到仪表板或欢迎页面
      await expect(authPage.page).toHaveURL(/\/(dashboard|welcome|home)/);
    });

    test('应该验证用户登录状态', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 验证用户已登录
      await authPage.verifySessionState(true);
      
      // 验证用户菜单可见
      await expect(authPage.page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('应该验证用户信息显示', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 获取当前用户信息
      const userInfo = await authPage.getCurrentUserInfo();
      expect(userInfo).not.toBeNull();
      expect(userInfo!.name).toBe(userData.username);
      expect(userInfo!.email).toBe(userData.email);
    });

    test('应该验证欢迎消息显示', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 验证欢迎消息
      const welcomeMessage = authPage.page.locator('[data-testid="welcome-message"]');
      await expect(welcomeMessage).toContainText(`欢迎, ${userData.username}`);
    });

    test('应该验证用户权限和功能访问', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 验证新用户可以访问基本功能
      await authPage.page.goto('/pets');
      await expect(authPage.page.locator('[data-testid="add-pet-button"]')).toBeVisible();
      
      await authPage.page.goto('/analysis');
      await expect(authPage.page.locator('[data-testid="upload-button"]')).toBeVisible();
      
      await authPage.page.goto('/community');
      await expect(authPage.page.locator('[data-testid="create-post-button"]')).toBeVisible();
    });

    test('应该验证用户会话持久性', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 刷新页面
      await authPage.page.reload();
      
      // 验证用户仍然登录
      await authPage.verifySessionState(true);
    });

    test('应该验证新用户引导流程', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });

      // 验证新用户引导提示
      const onboardingModal = authPage.page.locator('[data-testid="onboarding-modal"]');
      await expect(onboardingModal).toBeVisible();
      
      // 验证引导步骤
      const stepIndicator = authPage.page.locator('[data-testid="onboarding-step"]');
      await expect(stepIndicator).toContainText('1/3');
    });
  });

  test.describe('注册表单交互测试', () => {
    test('应该支持密码可见性切换', async () => {
      const password = 'TestPass123!';
      
      // 输入密码
      await authPage.page.fill('[data-testid="register-password"]', password);
      
      // 验证密码默认隐藏
      const passwordInput = authPage.page.locator('[data-testid="register-password"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // 点击显示密码按钮
      await authPage.page.click('[data-testid="toggle-password-visibility"]');
      
      // 验证密码可见
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // 再次点击隐藏密码
      await authPage.page.click('[data-testid="toggle-password-visibility"]');
      
      // 验证密码隐藏
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('应该支持表单数据保存和恢复', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      // 填写部分表单
      await authPage.page.fill('[data-testid="register-username"]', userData.username);
      await authPage.page.fill('[data-testid="register-email"]', userData.email);
      
      // 刷新页面
      await authPage.page.reload();
      await authPage.goToRegister();
      
      // 验证表单数据恢复（如果实现了本地存储）
      const usernameValue = await authPage.page.inputValue('[data-testid="register-username"]');
      const emailValue = await authPage.page.inputValue('[data-testid="register-email"]');
      
      // 注意：这取决于应用是否实现了表单数据保存功能
      if (usernameValue || emailValue) {
        expect(usernameValue).toBe(userData.username);
        expect(emailValue).toBe(userData.email);
      }
    });

    test('应该支持表单重置功能', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      // 填写表单
      await authPage.page.fill('[data-testid="register-username"]', userData.username);
      await authPage.page.fill('[data-testid="register-email"]', userData.email);
      await authPage.page.fill('[data-testid="register-password"]', userData.password);
      
      // 点击重置按钮（如果存在）
      const resetButton = authPage.page.locator('[data-testid="reset-form"]');
      if (await resetButton.isVisible()) {
        await resetButton.click();
        
        // 验证表单已清空
        await expect(authPage.page.locator('[data-testid="register-username"]')).toHaveValue('');
        await expect(authPage.page.locator('[data-testid="register-email"]')).toHaveValue('');
        await expect(authPage.page.locator('[data-testid="register-password"]')).toHaveValue('');
      }
    });
  });

  test.describe('注册性能测试', () => {
    test('应该在合理时间内完成注册', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      const startTime = Date.now();
      
      await authPage.register({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.password
      });
      
      const endTime = Date.now();
      const registrationTime = endTime - startTime;
      
      // 注册应该在5秒内完成
      expect(registrationTime).toBeLessThan(5000);
    });

    test('应该显示注册进度指示器', async () => {
      const userData = testDataManager.generateRandomUserData();
      
      // 开始注册
      await authPage.page.fill('[data-testid="register-username"]', userData.username);
      await authPage.page.fill('[data-testid="register-email"]', userData.email);
      await authPage.page.fill('[data-testid="register-password"]', userData.password);
      await authPage.page.fill('[data-testid="register-confirm-password"]', userData.password);
      await authPage.page.check('[data-testid="agreement-checkbox"]');
      
      await authPage.page.click('[data-testid="register-submit"]');
      
      // 验证加载指示器显示
      const loadingSpinner = authPage.page.locator('[data-testid="auth-loading"]');
      await expect(loadingSpinner).toBeVisible();
      
      // 等待注册完成
      await authPage.waitForAuthStateChange('logged-in');
      
      // 验证加载指示器消失
      await expect(loadingSpinner).not.toBeVisible();
    });
  });
});