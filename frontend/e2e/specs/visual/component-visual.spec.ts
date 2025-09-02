/**
 * UI组件视觉回归测试
 * 测试单个组件的视觉一致性和不同状态下的外观
 */

import { test, expect } from '@playwright/test';
import { VisualTesting, VisualTestHelper } from '../../utils/visual-testing';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';

test.describe('UI组件视觉回归测试', () => {
  let visualTesting: VisualTesting;
  let testDataManager: TestDataManager;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    visualTesting = new VisualTesting(page, 'components');
    testDataManager = new TestDataManager(page);
    authPage = new AuthPage(page);

    // 设置固定的动态值
    await VisualTestHelper.mockDynamicValues(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test('导航栏组件视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 测试未登录状态的导航栏
    await visualTesting.captureComponent('[data-testid="main-navigation"]', {
      name: 'navigation-logged-out',
      animations: 'disabled'
    });

    let result = await visualTesting.compareScreenshots({
      name: 'navigation-logged-out',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);

    // 登录后测试导航栏
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    await visualTesting.captureComponent('[data-testid="main-navigation"]', {
      name: 'navigation-logged-in',
      animations: 'disabled',
      mask: ['[data-testid="user-avatar"]'] // 遮罩用户头像
    });

    result = await visualTesting.compareScreenshots({
      name: 'navigation-logged-in',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);
  });

  test('按钮组件不同状态视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建测试按钮容器
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'button-test-container';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px; width: 300px;">
          <button class="btn btn-primary" data-testid="btn-primary">主要按钮</button>
          <button class="btn btn-secondary" data-testid="btn-secondary">次要按钮</button>
          <button class="btn btn-success" data-testid="btn-success">成功按钮</button>
          <button class="btn btn-warning" data-testid="btn-warning">警告按钮</button>
          <button class="btn btn-danger" data-testid="btn-danger">危险按钮</button>
          <button class="btn btn-primary" disabled data-testid="btn-disabled">禁用按钮</button>
          <button class="btn btn-primary btn-loading" data-testid="btn-loading">
            <span class="loading-spinner"></span>加载中...
          </button>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#button-test-container', { state: 'visible' });

    // 捕获按钮组件截图
    await visualTesting.captureComponent('#button-test-container', {
      name: 'buttons-all-states',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'buttons-all-states',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('表单组件视觉测试', async ({ page }) => {
    await page.goto('/register');
    await VisualTestHelper.waitForPageStable(page);

    // 测试空表单状态
    await visualTesting.captureComponent('[data-testid="register-form"]', {
      name: 'form-empty-state',
      animations: 'disabled'
    });

    let result = await visualTesting.compareScreenshots({
      name: 'form-empty-state',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);

    // 测试填写表单状态
    await page.fill('input[name="username"]', '测试用户');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');

    await visualTesting.captureComponent('[data-testid="register-form"]', {
      name: 'form-filled-state',
      animations: 'disabled'
    });

    result = await visualTesting.compareScreenshots({
      name: 'form-filled-state',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);

    // 测试表单验证错误状态
    await page.fill('input[name="confirmPassword"]', 'different-password');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-message', { state: 'visible' });

    await visualTesting.captureComponent('[data-testid="register-form"]', {
      name: 'form-error-state',
      animations: 'disabled'
    });

    result = await visualTesting.compareScreenshots({
      name: 'form-error-state',
      threshold: 0.15
    });
    expect(result.matches).toBe(true);
  });

  test('卡片组件视觉测试', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    const testPet = await testDataManager.createTestPet(testUser.id);
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/pets');
    await VisualTestHelper.waitForPageStable(page);
    await page.waitForSelector('[data-testid="pet-card"]', { state: 'visible' });

    // 测试宠物卡片组件
    await visualTesting.captureComponent('[data-testid="pet-card"]:first-child', {
      name: 'pet-card-component',
      animations: 'disabled',
      mask: [
        '[data-testid="pet-created-date"]',
        '[data-testid="pet-last-updated"]'
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'pet-card-component',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);
  });

  test('模态框组件视觉测试', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/pets');
    await VisualTestHelper.waitForPageStable(page);

    // 打开添加宠物模态框
    await page.click('[data-testid="add-pet-button"]');
    await page.waitForSelector('[data-testid="pet-modal"]', { state: 'visible' });

    // 等待模态框动画完成
    await page.waitForTimeout(500);

    await visualTesting.captureComponent('[data-testid="pet-modal"]', {
      name: 'pet-modal-component',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'pet-modal-component',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);
  });

  test('下拉菜单组件视觉测试', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 点击用户菜单
    await page.click('[data-testid="user-menu-trigger"]');
    await page.waitForSelector('[data-testid="user-dropdown"]', { state: 'visible' });

    // 等待下拉动画完成
    await page.waitForTimeout(300);

    await visualTesting.captureComponent('[data-testid="user-dropdown"]', {
      name: 'user-dropdown-component',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'user-dropdown-component',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('文件上传组件视觉测试', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    const testPet = await testDataManager.createTestPet(testUser.id);
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/analysis');
    await VisualTestHelper.waitForPageStable(page);

    // 测试初始上传区域
    await visualTesting.captureComponent('[data-testid="upload-area"]', {
      name: 'upload-area-initial',
      animations: 'disabled'
    });

    let result = await visualTesting.compareScreenshots({
      name: 'upload-area-initial',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);

    // 模拟拖拽悬停状态
    await page.evaluate(() => {
      const uploadArea = document.querySelector('[data-testid="upload-area"]');
      if (uploadArea) {
        uploadArea.classList.add('drag-over');
      }
    });

    await visualTesting.captureComponent('[data-testid="upload-area"]', {
      name: 'upload-area-drag-over',
      animations: 'disabled'
    });

    result = await visualTesting.compareScreenshots({
      name: 'upload-area-drag-over',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);
  });

  test('通知组件视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建不同类型的通知
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'notification-test-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      container.innerHTML = `
        <div class="notification notification-success" data-testid="notification-success">
          <span class="notification-icon">✅</span>
          <span class="notification-message">操作成功！</span>
          <button class="notification-close">×</button>
        </div>
        <div class="notification notification-warning" data-testid="notification-warning">
          <span class="notification-icon">⚠️</span>
          <span class="notification-message">请注意检查输入内容</span>
          <button class="notification-close">×</button>
        </div>
        <div class="notification notification-error" data-testid="notification-error">
          <span class="notification-icon">❌</span>
          <span class="notification-message">操作失败，请重试</span>
          <button class="notification-close">×</button>
        </div>
        <div class="notification notification-info" data-testid="notification-info">
          <span class="notification-icon">ℹ️</span>
          <span class="notification-message">这是一条信息提示</span>
          <button class="notification-close">×</button>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#notification-test-container', { state: 'visible' });

    await visualTesting.captureComponent('#notification-test-container', {
      name: 'notifications-all-types',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'notifications-all-types',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('加载状态组件视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建不同的加载状态组件
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'loading-test-container';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 30px; align-items: center;">
          <div class="loading-spinner" data-testid="spinner-small"></div>
          <div class="loading-spinner loading-spinner-large" data-testid="spinner-large"></div>
          <div class="loading-skeleton" data-testid="skeleton-text">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
          <div class="loading-progress" data-testid="progress-bar">
            <div class="progress-bar" style="width: 60%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#loading-test-container', { state: 'visible' });

    // 禁用动画以获得一致的截图
    await page.addStyleTag({
      content: `
        .loading-spinner, .loading-spinner * {
          animation: none !important;
        }
        .skeleton-line {
          animation: none !important;
        }
      `
    });

    await visualTesting.captureComponent('#loading-test-container', {
      name: 'loading-states-components',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'loading-states-components',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('分页组件视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建分页组件
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'pagination-test-container';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div class="pagination" data-testid="pagination-component">
          <button class="pagination-btn pagination-prev" disabled>上一页</button>
          <button class="pagination-btn pagination-page active">1</button>
          <button class="pagination-btn pagination-page">2</button>
          <button class="pagination-btn pagination-page">3</button>
          <span class="pagination-ellipsis">...</span>
          <button class="pagination-btn pagination-page">10</button>
          <button class="pagination-btn pagination-next">下一页</button>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#pagination-test-container', { state: 'visible' });

    await visualTesting.captureComponent('#pagination-test-container', {
      name: 'pagination-component',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'pagination-component',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('标签组件视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建标签组件
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'tags-test-container';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 10px;" data-testid="tags-component">
          <span class="tag tag-primary">主要标签</span>
          <span class="tag tag-secondary">次要标签</span>
          <span class="tag tag-success">成功标签</span>
          <span class="tag tag-warning">警告标签</span>
          <span class="tag tag-danger">危险标签</span>
          <span class="tag tag-info">信息标签</span>
          <span class="tag tag-removable">
            可移除标签
            <button class="tag-remove">×</button>
          </span>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#tags-test-container', { state: 'visible' });

    await visualTesting.captureComponent('#tags-test-container', {
      name: 'tags-component',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'tags-component',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('工具提示组件视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建工具提示组件
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'tooltip-test-container';
      container.style.padding = '50px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; gap: 50px; justify-content: center;">
          <div class="tooltip-wrapper">
            <button class="btn btn-primary">悬停我</button>
            <div class="tooltip tooltip-top" data-testid="tooltip-top">
              这是顶部工具提示
            </div>
          </div>
          <div class="tooltip-wrapper">
            <button class="btn btn-secondary">点击我</button>
            <div class="tooltip tooltip-bottom" data-testid="tooltip-bottom">
              这是底部工具提示
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
      
      // 显示工具提示
      document.querySelectorAll('.tooltip').forEach(tooltip => {
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
      });
    });

    await page.waitForSelector('#tooltip-test-container', { state: 'visible' });

    await visualTesting.captureComponent('#tooltip-test-container', {
      name: 'tooltips-component',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'tooltips-component',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });
});