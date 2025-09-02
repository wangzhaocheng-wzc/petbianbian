import { Page, expect } from '@playwright/test';
import { BasePage } from '../utils/base-page';
import { AccessibilityUtils } from '../utils/accessibility-utils';

/**
 * 认证页面对象类
 * 处理登录、注册、登出等认证相关操作
 */
export class AuthPage extends BasePage {
  // 页面选择器
  private readonly selectors = {
    // 登录表单
    loginForm: '[data-testid="login-form"]',
    loginEmailInput: '[data-testid="login-email"]',
    loginPasswordInput: '[data-testid="login-password"]',
    loginSubmitButton: '[data-testid="login-submit"]',
    loginRememberCheckbox: '[data-testid="remember-me"]',
    
    // 注册表单
    registerForm: '[data-testid="register-form"]',
    registerUsernameInput: '[data-testid="register-username"]',
    registerEmailInput: '[data-testid="register-email"]',
    registerPasswordInput: '[data-testid="register-password"]',
    registerConfirmPasswordInput: '[data-testid="register-confirm-password"]',
    registerSubmitButton: '[data-testid="register-submit"]',
    registerAgreementCheckbox: '[data-testid="agreement-checkbox"]',
    
    // 通用元素
    switchToRegisterLink: '[data-testid="switch-to-register"]',
    switchToLoginLink: '[data-testid="switch-to-login"]',
    forgotPasswordLink: '[data-testid="forgot-password"]',
    logoutButton: '[data-testid="logout-button"]',
    userMenuButton: '[data-testid="user-menu"]',
    userAvatar: '[data-testid="user-avatar"]',
    
    // 状态指示器
    loadingSpinner: '[data-testid="auth-loading"]',
    successMessage: '[data-testid="auth-success"]',
    errorMessage: '[data-testid="auth-error"]',
    
    // 用户信息
    userNameDisplay: '[data-testid="user-name"]',
    userEmailDisplay: '[data-testid="user-email"]',
    
    // 密码重置
    resetPasswordForm: '[data-testid="reset-password-form"]',
    resetEmailInput: '[data-testid="reset-email"]',
    resetSubmitButton: '[data-testid="reset-submit"]'
  };

  private accessibilityUtils: AccessibilityUtils;

  constructor(page: Page) {
    super(page);
    this.accessibilityUtils = new AccessibilityUtils(page);
  }

  /**
   * 导航到登录页面
   */
  async goToLogin(): Promise<void> {
    await this.goto('/login');
    await this.waitForElement(this.selectors.loginForm);
  }

  /**
   * 导航到注册页面
   */
  async goToRegister(): Promise<void> {
    await this.goto('/register');
    await this.waitForElement(this.selectors.registerForm);
  }

  /**
   * 执行登录操作
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    await this.goToLogin();
    
    // 填写登录表单
    await this.safeFill(this.selectors.loginEmailInput, email);
    await this.safeFill(this.selectors.loginPasswordInput, password);
    
    // 处理记住我选项
    if (rememberMe) {
      const checkbox = this.page.locator(this.selectors.loginRememberCheckbox);
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    }
    
    // 提交表单
    await this.safeClick(this.selectors.loginSubmitButton);
    
    // 等待登录完成
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    // 验证登录成功（等待页面跳转或用户菜单出现）
    await Promise.race([
      this.waitForNavigation(),
      this.waitForElement(this.selectors.userMenuButton)
    ]);
  }

  /**
   * 执行注册操作
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeToTerms?: boolean;
  }): Promise<void> {
    await this.goToRegister();
    
    // 填写注册表单
    await this.safeFill(this.selectors.registerUsernameInput, userData.username);
    await this.safeFill(this.selectors.registerEmailInput, userData.email);
    await this.safeFill(this.selectors.registerPasswordInput, userData.password);
    await this.safeFill(this.selectors.registerConfirmPasswordInput, userData.confirmPassword);
    
    // 同意条款
    if (userData.agreeToTerms !== false) {
      const checkbox = this.page.locator(this.selectors.registerAgreementCheckbox);
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    }
    
    // 提交表单
    await this.safeClick(this.selectors.registerSubmitButton);
    
    // 等待注册完成
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 执行登出操作
   */
  async logout(): Promise<void> {
    // 点击用户菜单
    await this.safeClick(this.selectors.userMenuButton);
    
    // 点击登出按钮
    await this.safeClick(this.selectors.logoutButton);
    
    // 等待登出完成
    await this.waitForNavigation();
    
    // 验证已登出（用户菜单消失）
    await expect(this.page.locator(this.selectors.userMenuButton)).not.toBeVisible();
  }

  /**
   * 检查用户是否已登录
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.waitForElement(this.selectors.userMenuButton, 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前登录用户信息
   */
  async getCurrentUserInfo(): Promise<{ name: string; email: string } | null> {
    if (!(await this.isLoggedIn())) {
      return null;
    }
    
    // 打开用户菜单
    await this.safeClick(this.selectors.userMenuButton);
    
    try {
      const name = await this.getElementText(this.selectors.userNameDisplay);
      const email = await this.getElementText(this.selectors.userEmailDisplay);
      
      return { name, email };
    } catch {
      return null;
    }
  }

  /**
   * 切换到注册页面
   */
  async switchToRegister(): Promise<void> {
    await this.safeClick(this.selectors.switchToRegisterLink);
    await this.waitForElement(this.selectors.registerForm);
  }

  /**
   * 切换到登录页面
   */
  async switchToLogin(): Promise<void> {
    await this.safeClick(this.selectors.switchToLoginLink);
    await this.waitForElement(this.selectors.loginForm);
  }

  /**
   * 验证登录表单
   */
  async validateLoginForm(): Promise<{
    isEmailRequired: boolean;
    isPasswordRequired: boolean;
    errors: string[];
  }> {
    // 尝试提交空表单
    await this.safeClick(this.selectors.loginSubmitButton);
    
    // 等待验证错误出现
    await this.page.waitForTimeout(1000);
    
    const errors = await this.getFormErrors();
    
    return {
      isEmailRequired: errors.some(error => error.includes('邮箱') || error.includes('email')),
      isPasswordRequired: errors.some(error => error.includes('密码') || error.includes('password')),
      errors
    };
  }

  /**
   * 验证注册表单
   */
  async validateRegisterForm(): Promise<{
    requiredFields: string[];
    passwordMatch: boolean;
    errors: string[];
  }> {
    // 测试密码不匹配
    await this.safeFill(this.selectors.registerPasswordInput, 'password123');
    await this.safeFill(this.selectors.registerConfirmPasswordInput, 'different123');
    await this.safeClick(this.selectors.registerSubmitButton);
    
    await this.page.waitForTimeout(1000);
    const errors = await this.getFormErrors();
    
    const passwordMatch = !errors.some(error => 
      error.includes('密码不匹配') || error.includes('password') && error.includes('match')
    );
    
    // 清空表单并测试必填字段
    await this.page.locator(this.selectors.registerForm).locator('input').fill('');
    await this.safeClick(this.selectors.registerSubmitButton);
    
    await this.page.waitForTimeout(1000);
    const requiredFieldErrors = await this.getFormErrors();
    
    return {
      requiredFields: requiredFieldErrors,
      passwordMatch,
      errors: [...errors, ...requiredFieldErrors]
    };
  }

  /**
   * 获取认证错误消息
   */
  async getAuthError(): Promise<string> {
    try {
      return await this.waitForErrorMessage(this.selectors.errorMessage, 5000);
    } catch {
      return '';
    }
  }

  /**
   * 获取认证成功消息
   */
  async getAuthSuccess(): Promise<string> {
    try {
      return await this.waitForSuccessMessage(this.selectors.successMessage, 5000);
    } catch {
      return '';
    }
  }

  /**
   * 执行密码重置请求
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.safeClick(this.selectors.forgotPasswordLink);
    await this.waitForElement(this.selectors.resetPasswordForm);
    
    await this.safeFill(this.selectors.resetEmailInput, email);
    await this.safeClick(this.selectors.resetSubmitButton);
    
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 验证用户会话状态
   */
  async verifySessionState(expectedLoggedIn: boolean): Promise<void> {
    const isLoggedIn = await this.isLoggedIn();
    
    if (expectedLoggedIn) {
      expect(isLoggedIn).toBe(true);
      await expect(this.page.locator(this.selectors.userMenuButton)).toBeVisible();
    } else {
      expect(isLoggedIn).toBe(false);
      await expect(this.page.locator(this.selectors.userMenuButton)).not.toBeVisible();
    }
  }

  /**
   * 等待认证状态改变
   */
  async waitForAuthStateChange(expectedState: 'logged-in' | 'logged-out', timeout: number = 10000): Promise<void> {
    if (expectedState === 'logged-in') {
      await this.waitForElement(this.selectors.userMenuButton, timeout);
    } else {
      await expect(this.page.locator(this.selectors.userMenuButton)).not.toBeVisible({ timeout });
    }
  }

  /**
   * 检查记住登录状态功能
   */
  async verifyRememberMeFunction(): Promise<boolean> {
    // 这需要在新的浏览器上下文中测试
    // 返回是否存在持久化的认证信息
    const cookies = await this.page.context().cookies();
    return cookies.some(cookie => 
      cookie.name.includes('auth') || 
      cookie.name.includes('token') || 
      cookie.name.includes('session')
    );
  }

  /**
   * 使用测试用户登录（用于其他测试的前置条件）
   */
  async loginWithTestUser(): Promise<void> {
    await this.login('test@example.com', 'password123');
  }

  // ===== 可访问性相关方法 =====

  /**
   * 检查登录表单的可访问性
   */
  async checkLoginFormAccessibility() {
    await this.goToLogin();
    
    const emailInput = this.page.locator(this.selectors.loginEmailInput);
    const passwordInput = this.page.locator(this.selectors.loginPasswordInput);
    const submitButton = this.page.locator(this.selectors.loginSubmitButton);
    
    // 检查表单字段标签
    const emailLabeling = await this.accessibilityUtils.checkFormLabeling(emailInput);
    const passwordLabeling = await this.accessibilityUtils.checkFormLabeling(passwordInput);
    
    // 检查按钮可访问性
    const buttonAria = await this.accessibilityUtils.checkAriaLabels(submitButton);
    
    return {
      emailField: emailLabeling,
      passwordField: passwordLabeling,
      submitButton: buttonAria
    };
  }

  /**
   * 检查注册表单的可访问性
   */
  async checkRegisterFormAccessibility() {
    await this.goToRegister();
    
    const formFields = [
      this.selectors.registerUsernameInput,
      this.selectors.registerEmailInput,
      this.selectors.registerPasswordInput,
      this.selectors.registerConfirmPasswordInput
    ];
    
    const fieldAccessibility = [];
    
    for (const selector of formFields) {
      const field = this.page.locator(selector);
      const labeling = await this.accessibilityUtils.checkFormLabeling(field);
      const aria = await this.accessibilityUtils.checkAriaLabels(field);
      
      fieldAccessibility.push({
        selector,
        labeling,
        aria
      });
    }
    
    return fieldAccessibility;
  }

  /**
   * 测试认证表单的键盘导航
   */
  async testAuthFormKeyboardNavigation() {
    await this.goToLogin();
    
    // 获取表单内的可聚焦元素
    const focusableElements = await this.page.locator(this.selectors.loginForm)
      .locator('input, button, a, select, textarea, [tabindex]:not([tabindex="-1"])')
      .all();
    
    const navigationPath = [];
    
    // 模拟Tab键导航
    for (let i = 0; i < focusableElements.length; i++) {
      await this.page.keyboard.press('Tab');
      const focused = await this.page.locator(':focus').first();
      
      if (await focused.count() > 0) {
        const elementInfo = await focused.evaluate((el) => ({
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.id
        }));
        
        navigationPath.push(elementInfo);
      }
    }
    
    return navigationPath;
  }

  /**
   * 检查错误消息的可访问性
   */
  async checkErrorMessageAccessibility() {
    await this.goToLogin();
    
    // 触发验证错误
    await this.safeClick(this.selectors.loginSubmitButton);
    await this.page.waitForTimeout(1000);
    
    // 查找错误消息元素
    const errorElements = await this.page.locator('.error, [role="alert"], [aria-live]').all();
    
    const errorAccessibility = [];
    
    for (const errorElement of errorElements) {
      if (await errorElement.isVisible()) {
        const aria = await this.accessibilityUtils.checkAriaLabels(errorElement);
        const textContent = await errorElement.textContent();
        
        errorAccessibility.push({
          aria,
          textContent: textContent?.trim(),
          isVisible: true
        });
      }
    }
    
    return errorAccessibility;
  }
}