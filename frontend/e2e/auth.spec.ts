import { test, expect } from '@playwright/test';

/**
 * 基础用户认证流程测试
 * 
 * 注意：这是基础认证测试，更详细的测试请参考：
 * - specs/auth/registration-extended.spec.ts - 扩展注册流程测试
 * - specs/auth/login-enhanced.spec.ts - 增强登录功能测试  
 * - specs/auth/password-management.spec.ts - 密码管理测试
 */

test.describe('用户认证流程', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/');
  });

  test('用户注册流程', async ({ page }) => {
    // 点击注册按钮
    await page.click('text=注册');
    
    // 等待注册页面加载
    await expect(page).toHaveURL(/.*register/);
    
    // 填写注册表单
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testUsername = `testuser${timestamp}`;
    
    await page.fill('[data-testid="username-input"]', testUsername);
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    
    // 提交注册表单
    await page.click('[data-testid="register-submit"]');
    
    // 验证注册成功
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-welcome"]')).toContainText(testUsername);
  });

  test('用户登录流程', async ({ page }) => {
    // 点击登录按钮
    await page.click('text=登录');
    
    // 等待登录页面加载
    await expect(page).toHaveURL(/.*login/);
    
    // 填写登录表单（使用预设的测试账户）
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // 提交登录表单
    await page.click('[data-testid="login-submit"]');
    
    // 验证登录成功
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('登录验证失败', async ({ page }) => {
    await page.click('text=登录');
    await expect(page).toHaveURL(/.*login/);
    
    // 使用错误的凭据
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="login-submit"]');
    
    // 验证错误消息显示
    await expect(page.locator('[data-testid="error-message"]')).toContainText('邮箱或密码错误');
  });

  test('用户登出流程', async ({ page }) => {
    // 先登录
    await page.click('text=登录');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // 等待登录成功
    await expect(page).toHaveURL(/.*dashboard/);
    
    // 点击用户菜单
    await page.click('[data-testid="user-menu"]');
    
    // 点击登出
    await page.click('text=登出');
    
    // 验证登出成功
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=登录')).toBeVisible();
  });

  test('表单验证', async ({ page }) => {
    await page.click('text=注册');
    
    // 尝试提交空表单
    await page.click('[data-testid="register-submit"]');
    
    // 验证验证错误显示
    await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名是必需的');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('邮箱是必需的');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('密码是必需的');
  });

  test('密码强度验证', async ({ page }) => {
    await page.click('text=注册');
    
    // 输入弱密码
    await page.fill('[data-testid="password-input"]', '123');
    await page.blur('[data-testid="password-input"]');
    
    // 验证密码强度提示
    await expect(page.locator('[data-testid="password-error"]')).toContainText('密码至少需要6个字符');
  });

  test('邮箱格式验证', async ({ page }) => {
    await page.click('text=注册');
    
    // 输入无效邮箱
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.blur('[data-testid="email-input"]');
    
    // 验证邮箱格式提示
    await expect(page.locator('[data-testid="email-error"]')).toContainText('请输入有效的邮箱地址');
  });
});