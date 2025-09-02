/**
 * 动画和过渡效果视觉测试
 * 测试动画的关键帧、过渡效果的一致性和性能
 */

import { test, expect } from '@playwright/test';
import { VisualTesting, VisualTestHelper } from '../../utils/visual-testing';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';

test.describe('动画和过渡效果视觉测试', () => {
  let visualTesting: VisualTesting;
  let testDataManager: TestDataManager;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    visualTesting = new VisualTesting(page, 'animations');
    testDataManager = new TestDataManager(page);
    authPage = new AuthPage(page);

    // 设置固定的动态值
    await VisualTestHelper.mockDynamicValues(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test('按钮悬停动画测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建按钮动画测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'button-animation-test';
      container.style.padding = '40px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; gap: 20px; align-items: center;">
          <button class="btn btn-primary" data-testid="hover-button-1">悬停按钮 1</button>
          <button class="btn btn-secondary" data-testid="hover-button-2">悬停按钮 2</button>
          <button class="btn btn-success" data-testid="hover-button-3">悬停按钮 3</button>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#button-animation-test', { state: 'visible' });

    // 捕获初始状态
    await visualTesting.captureComponent('#button-animation-test', {
      name: 'buttons-initial-state',
      animations: 'disabled'
    });

    // 悬停第一个按钮并捕获
    await page.hover('[data-testid="hover-button-1"]');
    await page.waitForTimeout(200); // 等待悬停动画

    await visualTesting.captureComponent('#button-animation-test', {
      name: 'buttons-hover-state-1',
      animations: 'disabled'
    });

    // 悬停第二个按钮并捕获
    await page.hover('[data-testid="hover-button-2"]');
    await page.waitForTimeout(200);

    await visualTesting.captureComponent('#button-animation-test', {
      name: 'buttons-hover-state-2',
      animations: 'disabled'
    });

    // 验证截图
    const initialResult = await visualTesting.compareScreenshots({
      name: 'buttons-initial-state',
      threshold: 0.05
    });
    const hover1Result = await visualTesting.compareScreenshots({
      name: 'buttons-hover-state-1',
      threshold: 0.1
    });
    const hover2Result = await visualTesting.compareScreenshots({
      name: 'buttons-hover-state-2',
      threshold: 0.1
    });

    expect(initialResult.matches).toBe(true);
    expect(hover1Result.matches).toBe(true);
    expect(hover2Result.matches).toBe(true);
  });

  test('模态框动画关键帧测试', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/pets');
    await VisualTestHelper.waitForPageStable(page);

    // 捕获模态框打开前的状态
    await visualTesting.captureFullPage({
      name: 'modal-animation-before',
      fullPage: true,
      animations: 'disabled'
    });

    // 打开模态框
    await page.click('[data-testid="add-pet-button"]');
    
    // 捕获动画开始时的状态（模态框刚出现）
    await page.waitForSelector('[data-testid="pet-modal"]', { state: 'visible' });
    await page.waitForTimeout(50); // 动画开始

    await visualTesting.captureFullPage({
      name: 'modal-animation-start',
      fullPage: true,
      animations: 'disabled'
    });

    // 捕获动画中间状态
    await page.waitForTimeout(150); // 动画中间

    await visualTesting.captureFullPage({
      name: 'modal-animation-middle',
      fullPage: true,
      animations: 'disabled'
    });

    // 捕获动画完成状态
    await page.waitForTimeout(200); // 动画完成

    await visualTesting.captureFullPage({
      name: 'modal-animation-complete',
      fullPage: true,
      animations: 'disabled'
    });

    // 验证所有关键帧
    const beforeResult = await visualTesting.compareScreenshots({
      name: 'modal-animation-before',
      threshold: 0.05
    });
    const startResult = await visualTesting.compareScreenshots({
      name: 'modal-animation-start',
      threshold: 0.15
    });
    const middleResult = await visualTesting.compareScreenshots({
      name: 'modal-animation-middle',
      threshold: 0.15
    });
    const completeResult = await visualTesting.compareScreenshots({
      name: 'modal-animation-complete',
      threshold: 0.1
    });

    expect(beforeResult.matches).toBe(true);
    expect(startResult.matches).toBe(true);
    expect(middleResult.matches).toBe(true);
    expect(completeResult.matches).toBe(true);
  });

  test('加载动画状态测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建加载动画测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'loading-animation-test';
      container.style.padding = '40px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 30px; align-items: center;">
          <div class="loading-spinner" data-testid="spinner-1"></div>
          <div class="loading-dots" data-testid="dots-1">
            <span></span><span></span><span></span>
          </div>
          <div class="loading-bar" data-testid="bar-1">
            <div class="loading-bar-fill"></div>
          </div>
          <div class="loading-pulse" data-testid="pulse-1">加载中...</div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#loading-animation-test', { state: 'visible' });

    // 捕获不同时间点的加载动画状态
    const timePoints = [0, 250, 500, 750, 1000];
    
    for (let i = 0; i < timePoints.length; i++) {
      await page.waitForTimeout(timePoints[i]);
      
      await visualTesting.captureComponent('#loading-animation-test', {
        name: `loading-animation-frame-${i}`,
        animations: 'disabled' // 禁用动画以获得一致的截图
      });

      const result = await visualTesting.compareScreenshots({
        name: `loading-animation-frame-${i}`,
        threshold: 0.1
      });
      expect(result.matches).toBe(true);
    }
  });

  test('页面过渡动画测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 捕获首页状态
    await visualTesting.captureFullPage({
      name: 'page-transition-home',
      fullPage: true,
      animations: 'disabled'
    });

    // 导航到登录页面
    await page.click('a[href="/login"]');
    await page.waitForURL('**/login');
    await VisualTestHelper.waitForPageStable(page);

    // 捕获登录页面状态
    await visualTesting.captureFullPage({
      name: 'page-transition-login',
      fullPage: true,
      animations: 'disabled'
    });

    // 返回首页
    await page.click('a[href="/"]');
    await page.waitForURL('**/');
    await VisualTestHelper.waitForPageStable(page);

    // 捕获返回后的首页状态
    await visualTesting.captureFullPage({
      name: 'page-transition-home-return',
      fullPage: true,
      animations: 'disabled'
    });

    // 验证页面过渡
    const homeResult = await visualTesting.compareScreenshots({
      name: 'page-transition-home',
      threshold: 0.1
    });
    const loginResult = await visualTesting.compareScreenshots({
      name: 'page-transition-login',
      threshold: 0.1
    });
    const returnResult = await visualTesting.compareScreenshots({
      name: 'page-transition-home-return',
      threshold: 0.1
    });

    expect(homeResult.matches).toBe(true);
    expect(loginResult.matches).toBe(true);
    expect(returnResult.matches).toBe(true);
  });

  test('下拉菜单动画测试', async ({ page }) => {
    const testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 捕获菜单关闭状态
    await visualTesting.captureComponent('[data-testid="user-menu-area"]', {
      name: 'dropdown-closed',
      animations: 'disabled'
    });

    // 点击打开菜单
    await page.click('[data-testid="user-menu-trigger"]');
    
    // 捕获菜单动画的不同阶段
    await page.waitForTimeout(50); // 动画开始
    await visualTesting.captureComponent('[data-testid="user-menu-area"]', {
      name: 'dropdown-opening',
      animations: 'disabled'
    });

    await page.waitForTimeout(150); // 动画中间
    await visualTesting.captureComponent('[data-testid="user-menu-area"]', {
      name: 'dropdown-half-open',
      animations: 'disabled'
    });

    await page.waitForTimeout(200); // 动画完成
    await visualTesting.captureComponent('[data-testid="user-menu-area"]', {
      name: 'dropdown-fully-open',
      animations: 'disabled'
    });

    // 验证所有状态
    const closedResult = await visualTesting.compareScreenshots({
      name: 'dropdown-closed',
      threshold: 0.05
    });
    const openingResult = await visualTesting.compareScreenshots({
      name: 'dropdown-opening',
      threshold: 0.15
    });
    const halfOpenResult = await visualTesting.compareScreenshots({
      name: 'dropdown-half-open',
      threshold: 0.15
    });
    const fullyOpenResult = await visualTesting.compareScreenshots({
      name: 'dropdown-fully-open',
      threshold: 0.1
    });

    expect(closedResult.matches).toBe(true);
    expect(openingResult.matches).toBe(true);
    expect(halfOpenResult.matches).toBe(true);
    expect(fullyOpenResult.matches).toBe(true);
  });

  test('表单验证动画测试', async ({ page }) => {
    await page.goto('/register');
    await VisualTestHelper.waitForPageStable(page);

    // 捕获初始表单状态
    await visualTesting.captureComponent('[data-testid="register-form"]', {
      name: 'form-validation-initial',
      animations: 'disabled'
    });

    // 触发验证错误
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // 等待验证动画
    await page.waitForSelector('.error-message', { state: 'visible' });
    await page.waitForTimeout(300); // 等待错误动画完成

    await visualTesting.captureComponent('[data-testid="register-form"]', {
      name: 'form-validation-errors',
      animations: 'disabled'
    });

    // 修正错误并捕获成功状态
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'validpassword123');
    await page.fill('input[name="confirmPassword"]', 'validpassword123');

    // 等待验证成功动画
    await page.waitForTimeout(300);

    await visualTesting.captureComponent('[data-testid="register-form"]', {
      name: 'form-validation-success',
      animations: 'disabled'
    });

    // 验证所有状态
    const initialResult = await visualTesting.compareScreenshots({
      name: 'form-validation-initial',
      threshold: 0.05
    });
    const errorsResult = await visualTesting.compareScreenshots({
      name: 'form-validation-errors',
      threshold: 0.15
    });
    const successResult = await visualTesting.compareScreenshots({
      name: 'form-validation-success',
      threshold: 0.1
    });

    expect(initialResult.matches).toBe(true);
    expect(errorsResult.matches).toBe(true);
    expect(successResult.matches).toBe(true);
  });

  test('通知动画测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 触发通知显示
    await page.evaluate(() => {
      // 模拟显示通知
      const notification = document.createElement('div');
      notification.className = 'notification notification-success';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.zIndex = '9999';
      notification.innerHTML = '操作成功！';
      notification.setAttribute('data-testid', 'test-notification');
      document.body.appendChild(notification);

      // 添加动画类
      setTimeout(() => notification.classList.add('show'), 10);
    });

    // 捕获通知动画的不同阶段
    await page.waitForSelector('[data-testid="test-notification"]', { state: 'visible' });
    
    await page.waitForTimeout(50); // 动画开始
    await visualTesting.captureComponent('[data-testid="test-notification"]', {
      name: 'notification-appearing',
      animations: 'disabled'
    });

    await page.waitForTimeout(200); // 动画完成
    await visualTesting.captureComponent('[data-testid="test-notification"]', {
      name: 'notification-visible',
      animations: 'disabled'
    });

    // 触发消失动画
    await page.evaluate(() => {
      const notification = document.querySelector('[data-testid="test-notification"]');
      if (notification) {
        notification.classList.add('hide');
      }
    });

    await page.waitForTimeout(150); // 消失动画中间
    await visualTesting.captureComponent('[data-testid="test-notification"]', {
      name: 'notification-disappearing',
      animations: 'disabled'
    });

    // 验证通知动画
    const appearingResult = await visualTesting.compareScreenshots({
      name: 'notification-appearing',
      threshold: 0.1
    });
    const visibleResult = await visualTesting.compareScreenshots({
      name: 'notification-visible',
      threshold: 0.05
    });
    const disappearingResult = await visualTesting.compareScreenshots({
      name: 'notification-disappearing',
      threshold: 0.15
    });

    expect(appearingResult.matches).toBe(true);
    expect(visibleResult.matches).toBe(true);
    expect(disappearingResult.matches).toBe(true);
  });

  test('滚动动画效果测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建长页面内容以测试滚动动画
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'scroll-animation-test';
      container.innerHTML = `
        <div style="height: 200vh; padding: 20px;">
          <div class="scroll-reveal" data-testid="scroll-element-1" style="margin-top: 100vh; padding: 20px; background: #e3f2fd;">
            滚动显示元素 1
          </div>
          <div class="scroll-reveal" data-testid="scroll-element-2" style="margin-top: 50vh; padding: 20px; background: #f3e5f5;">
            滚动显示元素 2
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    // 捕获初始状态（元素不可见）
    await visualTesting.captureFullPage({
      name: 'scroll-animation-initial',
      fullPage: true,
      animations: 'disabled'
    });

    // 滚动到第一个元素
    await page.locator('[data-testid="scroll-element-1"]').scrollIntoView();
    await page.waitForTimeout(300); // 等待滚动动画

    await visualTesting.captureFullPage({
      name: 'scroll-animation-element-1',
      fullPage: true,
      animations: 'disabled'
    });

    // 滚动到第二个元素
    await page.locator('[data-testid="scroll-element-2"]').scrollIntoView();
    await page.waitForTimeout(300);

    await visualTesting.captureFullPage({
      name: 'scroll-animation-element-2',
      fullPage: true,
      animations: 'disabled'
    });

    // 验证滚动动画
    const initialResult = await visualTesting.compareScreenshots({
      name: 'scroll-animation-initial',
      threshold: 0.1
    });
    const element1Result = await visualTesting.compareScreenshots({
      name: 'scroll-animation-element-1',
      threshold: 0.15
    });
    const element2Result = await visualTesting.compareScreenshots({
      name: 'scroll-animation-element-2',
      threshold: 0.15
    });

    expect(initialResult.matches).toBe(true);
    expect(element1Result.matches).toBe(true);
    expect(element2Result.matches).toBe(true);
  });

  test('CSS变换动画测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建CSS变换动画测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'transform-animation-test';
      container.style.padding = '60px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;">
          <div class="transform-element" data-testid="rotate-element" 
               style="width: 80px; height: 80px; background: #2196f3; border-radius: 8px; transform: rotate(0deg); transition: transform 0.3s;">
            旋转
          </div>
          <div class="transform-element" data-testid="scale-element"
               style="width: 80px; height: 80px; background: #4caf50; border-radius: 8px; transform: scale(1); transition: transform 0.3s;">
            缩放
          </div>
          <div class="transform-element" data-testid="translate-element"
               style="width: 80px; height: 80px; background: #ff9800; border-radius: 8px; transform: translateX(0); transition: transform 0.3s;">
            平移
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#transform-animation-test', { state: 'visible' });

    // 捕获初始状态
    await visualTesting.captureComponent('#transform-animation-test', {
      name: 'transform-initial',
      animations: 'disabled'
    });

    // 应用变换
    await page.evaluate(() => {
      const rotateEl = document.querySelector('[data-testid="rotate-element"]') as HTMLElement;
      const scaleEl = document.querySelector('[data-testid="scale-element"]') as HTMLElement;
      const translateEl = document.querySelector('[data-testid="translate-element"]') as HTMLElement;

      if (rotateEl) rotateEl.style.transform = 'rotate(45deg)';
      if (scaleEl) scaleEl.style.transform = 'scale(1.2)';
      if (translateEl) translateEl.style.transform = 'translateX(20px)';
    });

    await page.waitForTimeout(350); // 等待变换动画完成

    await visualTesting.captureComponent('#transform-animation-test', {
      name: 'transform-applied',
      animations: 'disabled'
    });

    // 验证变换动画
    const initialResult = await visualTesting.compareScreenshots({
      name: 'transform-initial',
      threshold: 0.05
    });
    const appliedResult = await visualTesting.compareScreenshots({
      name: 'transform-applied',
      threshold: 0.1
    });

    expect(initialResult.matches).toBe(true);
    expect(appliedResult.matches).toBe(true);
  });
});