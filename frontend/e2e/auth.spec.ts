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
    await page.getByRole('link', { name: '注册' }).click();
    
    // 等待注册页面加载
    await expect(page).toHaveURL(/.*register/);
    
    // 填写注册表单
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testUsername = `testuser${timestamp}`;
    
    await page.fill('#username', testUsername);
    await page.fill('#email', testEmail);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    
    // 提交注册表单
    await page.getByRole('button', { name: '注册' }).click();
    
    // 验证注册成功
    await expect(page).toHaveURL('/');
    await expect(page.getByText(testUsername, { exact: false })).toBeVisible();
  });

  test('用户登录流程', async ({ page }) => {
    // 点击登录按钮
    await page.getByRole('link', { name: '登录' }).click();
    
    // 等待登录页面加载
    await expect(page).toHaveURL(/.*login/);
    
    // 填写登录表单（使用预设的测试账户）
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    
    // 提交登录表单
    await page.getByRole('button', { name: '登录' }).click();
    
    // 验证登录成功
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: '退出' })).toBeVisible();
  });

  test('登录验证失败', async ({ page }) => {
    await page.getByRole('link', { name: '登录' }).click();
    await expect(page).toHaveURL(/.*login/);
    
    // 使用错误的凭据
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    
    await page.getByRole('button', { name: '登录' }).click();
    
    // 验证错误消息显示（兼容多种错误文案）
    await expect(page.getByText(/(邮箱或密码错误|登录失败)/)).toBeVisible();
  });

  test('用户登出流程', async ({ page }) => {
    // 先登录
    await page.getByRole('link', { name: '登录' }).click();
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: '登录' }).click();
    
    // 等待登录成功
    await expect(page).toHaveURL('/');
    
    // 点击登出
    await page.getByRole('button', { name: '退出' }).click();
    
    // 验证登出成功
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: '登录' })).toBeVisible();
  });

  test('表单验证', async ({ page }) => {
    await page.getByRole('link', { name: '注册' }).click();
    
    // 尝试提交空表单
    await page.getByRole('button', { name: '注册' }).click();
    
    // 验证浏览器原生必填校验触发
    const usernameMissing = await page.locator('#username').evaluate(el => (el as HTMLInputElement).validity.valueMissing);
    const emailMissing = await page.locator('#email').evaluate(el => (el as HTMLInputElement).validity.valueMissing);
    const passwordMissing = await page.locator('#password').evaluate(el => (el as HTMLInputElement).validity.valueMissing);
    
    expect(usernameMissing).toBeTruthy();
    expect(emailMissing).toBeTruthy();
    expect(passwordMissing).toBeTruthy();
  });

  test('密码强度验证', async ({ page }) => {
    await page.getByRole('link', { name: '注册' }).click();
    
    // 输入弱密码并尝试提交
    await page.fill('#username', 'weakpassuser');
    await page.fill('#email', `weak${Date.now()}@example.com`);
    await page.fill('#password', '123');
    await page.fill('#confirmPassword', '123');
    await page.getByRole('button', { name: '注册' }).click();
    
    // 验证密码强度提示（页面顶端错误文案）
    await expect(page.getByText('密码长度至少6位')).toBeVisible();
  });

  test('邮箱格式验证', async ({ page }) => {
    await page.getByRole('link', { name: '注册' }).click();
    
    // 输入无效邮箱并尝试提交
    await page.fill('#username', 'invalidemailuser');
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.getByRole('button', { name: '注册' }).click();
    
    // 验证原生邮箱格式校验触发
    const emailFormatInvalid = await page.locator('#email').evaluate(el => (el as HTMLInputElement).validity.typeMismatch);
    expect(emailFormatInvalid).toBeTruthy();
  });
});