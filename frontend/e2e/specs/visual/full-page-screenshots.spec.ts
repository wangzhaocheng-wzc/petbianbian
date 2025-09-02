/**
 * 全页面截图视觉回归测试
 * 测试所有主要页面的视觉一致性
 */

import { test, expect } from '@playwright/test';
import { VisualTesting, VisualTestHelper } from '../../utils/visual-testing';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';

test.describe('全页面截图视觉回归测试', () => {
  let visualTesting: VisualTesting;
  let testDataManager: TestDataManager;
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    visualTesting = new VisualTesting(page, 'full-page');
    testDataManager = new TestDataManager(page);
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    communityPage = new CommunityPage(page);

    // 设置固定的动态值
    await VisualTestHelper.mockDynamicValues(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test('首页截图对比', async ({ page }) => {
    // 导航到首页
    await page.goto('/');
    
    // 等待页面稳定
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 隐藏动态内容
    await VisualTestHelper.hideDynamicContent(page, [
      '[data-testid="current-time"]',
      '[data-testid="random-tip"]',
      '.loading-spinner'
    ]);

    // 捕获全页面截图
    await visualTesting.captureFullPage({
      name: 'homepage',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="user-avatar"]', // 用户头像可能变化
        '[data-testid="notification-badge"]' // 通知数量可能变化
      ]
    });

    // 对比截图
    const result = await visualTesting.compareScreenshots({
      name: 'homepage',
      threshold: 0.1 // 首页使用更严格的阈值
    });

    expect(result.matches).toBe(true);
  });

  test('登录页面截图对比', async ({ page }) => {
    await page.goto('/login');
    await VisualTestHelper.waitForPageStable(page);

    // 确保表单处于初始状态
    await page.locator('input[type="email"]').clear();
    await page.locator('input[type="password"]').clear();

    await visualTesting.captureFullPage({
      name: 'login-page',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'login-page',
      threshold: 0.05
    });

    expect(result.matches).toBe(true);
  });

  test('注册页面截图对比', async ({ page }) => {
    await page.goto('/register');
    await VisualTestHelper.waitForPageStable(page);

    // 清空所有表单字段
    await page.locator('input[name="username"]').clear();
    await page.locator('input[name="email"]').clear();
    await page.locator('input[name="password"]').clear();
    await page.locator('input[name="confirmPassword"]').clear();

    await visualTesting.captureFullPage({
      name: 'register-page',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'register-page',
      threshold: 0.05
    });

    expect(result.matches).toBe(true);
  });

  test('宠物管理页面截图对比（已登录）', async ({ page }) => {
    // 创建测试用户并登录
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    // 创建测试宠物数据
    const testPet = await testDataManager.createTestPet(testUser.id);

    // 导航到宠物管理页面
    await page.goto('/pets');
    await VisualTestHelper.waitForPageStable(page);

    // 等待宠物列表加载
    await page.waitForSelector('[data-testid="pet-list"]', { state: 'visible' });

    await visualTesting.captureFullPage({
      name: 'pets-page-with-data',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="pet-created-date"]', // 创建日期可能变化
        '[data-testid="pet-last-updated"]' // 更新时间可能变化
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'pets-page-with-data',
      threshold: 0.15
    });

    expect(result.matches).toBe(true);
  });

  test('空宠物列表页面截图对比', async ({ page }) => {
    // 创建测试用户但不创建宠物
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/pets');
    await VisualTestHelper.waitForPageStable(page);

    // 等待空状态显示
    await page.waitForSelector('[data-testid="empty-pets-state"]', { state: 'visible' });

    await visualTesting.captureFullPage({
      name: 'pets-page-empty',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'pets-page-empty',
      threshold: 0.1
    });

    expect(result.matches).toBe(true);
  });

  test('便便分析页面截图对比', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    const testPet = await testDataManager.createTestPet(testUser.id);
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/analysis');
    await VisualTestHelper.waitForPageStable(page);

    // 确保页面处于初始状态
    await page.waitForSelector('[data-testid="upload-area"]', { state: 'visible' });

    await visualTesting.captureFullPage({
      name: 'analysis-page-initial',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'analysis-page-initial',
      threshold: 0.1
    });

    expect(result.matches).toBe(true);
  });

  test('分析结果页面截图对比', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    const testPet = await testDataManager.createTestPet(testUser.id);
    await authPage.login(testUser.email, testUser.password);

    // 模拟分析完成状态
    await page.goto('/analysis');
    await analysisPage.selectPet(testPet.id);
    
    // 使用测试图片
    const testImagePath = 'e2e/fixtures/images/test-poop.jpg';
    await analysisPage.uploadImage(testImagePath);
    
    // 等待分析完成（模拟）
    await page.evaluate(() => {
      // 模拟分析结果
      window.dispatchEvent(new CustomEvent('analysis-complete', {
        detail: {
          result: {
            healthStatus: 'healthy',
            confidence: 0.95,
            recommendations: ['保持当前饮食', '定期检查']
          }
        }
      }));
    });

    await page.waitForSelector('[data-testid="analysis-results"]', { state: 'visible' });
    await VisualTestHelper.waitForPageStable(page);

    await visualTesting.captureFullPage({
      name: 'analysis-results-page',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="analysis-timestamp"]', // 分析时间戳
        '[data-testid="analysis-id"]' // 分析ID
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'analysis-results-page',
      threshold: 0.2
    });

    expect(result.matches).toBe(true);
  });

  test('社区页面截图对比', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/community');
    await VisualTestHelper.waitForPageStable(page);

    // 等待帖子列表加载
    await page.waitForSelector('[data-testid="community-posts"]', { state: 'visible' });

    await visualTesting.captureFullPage({
      name: 'community-page',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="post-timestamp"]', // 帖子时间戳
        '[data-testid="online-users-count"]', // 在线用户数
        '[data-testid="post-like-count"]' // 点赞数可能变化
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'community-page',
      threshold: 0.2
    });

    expect(result.matches).toBe(true);
  });

  test('用户资料页面截图对比', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/profile');
    await VisualTestHelper.waitForPageStable(page);

    // 等待用户信息加载
    await page.waitForSelector('[data-testid="user-profile"]', { state: 'visible' });

    await visualTesting.captureFullPage({
      name: 'profile-page',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="user-avatar"]', // 用户头像
        '[data-testid="last-login-time"]', // 最后登录时间
        '[data-testid="member-since"]' // 注册时间
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'profile-page',
      threshold: 0.15
    });

    expect(result.matches).toBe(true);
  });

  test('404错误页面截图对比', async ({ page }) => {
    await page.goto('/non-existent-page');
    await VisualTestHelper.waitForPageStable(page);

    // 等待404页面显示
    await page.waitForSelector('[data-testid="error-404"]', { state: 'visible' });

    await visualTesting.captureFullPage({
      name: '404-error-page',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: '404-error-page',
      threshold: 0.05
    });

    expect(result.matches).toBe(true);
  });

  test('移动端首页截图对比', async ({ page, browserName }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 隐藏动态内容
    await VisualTestHelper.hideDynamicContent(page, [
      '[data-testid="current-time"]',
      '[data-testid="random-tip"]'
    ]);

    await visualTesting.captureFullPage({
      name: `homepage-mobile-${browserName}`,
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `homepage-mobile-${browserName}`,
      threshold: 0.15 // 移动端可能有更多差异
    });

    expect(result.matches).toBe(true);
  });

  test('平板端首页截图对比', async ({ page, browserName }) => {
    // 设置平板端视口
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    await VisualTestHelper.hideDynamicContent(page, [
      '[data-testid="current-time"]',
      '[data-testid="random-tip"]'
    ]);

    await visualTesting.captureFullPage({
      name: `homepage-tablet-${browserName}`,
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `homepage-tablet-${browserName}`,
      threshold: 0.15
    });

    expect(result.matches).toBe(true);
  });

  test('深色主题页面截图对比', async ({ page }) => {
    // 设置深色主题
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 等待主题应用
    await page.waitForSelector('body.dark-theme', { state: 'attached' });

    await visualTesting.captureFullPage({
      name: 'homepage-dark-theme',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'homepage-dark-theme',
      threshold: 0.2 // 主题切换可能有较大差异
    });

    expect(result.matches).toBe(true);
  });
});