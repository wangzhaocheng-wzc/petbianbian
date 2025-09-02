/**
 * 主题和样式视觉测试
 * 测试主题切换、样式变更和动画效果
 */

import { test, expect } from '@playwright/test';
import { VisualTesting, VisualTestHelper } from '../../utils/visual-testing';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';

test.describe('主题和样式视觉测试', () => {
  let visualTesting: VisualTesting;
  let testDataManager: TestDataManager;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    visualTesting = new VisualTesting(page, 'themes');
    testDataManager = new TestDataManager(page);
    authPage = new AuthPage(page);

    // 设置固定的动态值
    await VisualTestHelper.mockDynamicValues(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test('浅色主题视觉测试', async ({ page }) => {
    // 设置浅色主题
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
    });

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 等待主题应用
    await page.waitForSelector('body.light-theme, body:not(.dark-theme)', { state: 'attached' });

    await visualTesting.captureFullPage({
      name: 'light-theme-homepage',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'light-theme-homepage',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);
  });

  test('深色主题视觉测试', async ({ page }) => {
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
      name: 'dark-theme-homepage',
      fullPage: true,
      animations: 'disabled',
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]
    });

    const result = await visualTesting.compareScreenshots({
      name: 'dark-theme-homepage',
      threshold: 0.2 // 深色主题可能有更大差异
    });
    expect(result.matches).toBe(true);
  });

  test('主题切换过渡效果测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 初始浅色主题截图
    await visualTesting.captureFullPage({
      name: 'theme-transition-light',
      fullPage: true,
      animations: 'disabled'
    });

    // 切换到深色主题
    await page.click('[data-testid="theme-toggle"]');
    
    // 等待主题切换完成
    await page.waitForSelector('body.dark-theme', { state: 'attached' });
    await page.waitForTimeout(500); // 等待过渡动画完成

    await visualTesting.captureFullPage({
      name: 'theme-transition-dark',
      fullPage: true,
      animations: 'disabled'
    });

    // 验证两个主题的截图
    const lightResult = await visualTesting.compareScreenshots({
      name: 'theme-transition-light',
      threshold: 0.1
    });
    const darkResult = await visualTesting.compareScreenshots({
      name: 'theme-transition-dark',
      threshold: 0.2
    });

    expect(lightResult.matches).toBe(true);
    expect(darkResult.matches).toBe(true);
  });

  test('高对比度主题视觉测试', async ({ page }) => {
    // 设置高对比度主题
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'high-contrast');
    });

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 等待主题应用
    await page.waitForSelector('body.high-contrast-theme', { state: 'attached' });

    await visualTesting.captureFullPage({
      name: 'high-contrast-theme-homepage',
      fullPage: true,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'high-contrast-theme-homepage',
      threshold: 0.3 // 高对比度主题差异较大
    });
    expect(result.matches).toBe(true);
  });

  test('主题组件样式对比测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建主题对比测试容器
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'theme-components-test';
      container.style.padding = '20px';
      container.style.display = 'grid';
      container.style.gridTemplateColumns = '1fr 1fr';
      container.style.gap = '20px';
      container.innerHTML = `
        <div class="theme-section light-theme">
          <h3>浅色主题</h3>
          <button class="btn btn-primary">主要按钮</button>
          <button class="btn btn-secondary">次要按钮</button>
          <div class="card">
            <h4>卡片标题</h4>
            <p>这是卡片内容</p>
          </div>
          <div class="form-group">
            <label>输入框</label>
            <input type="text" value="示例文本" />
          </div>
        </div>
        <div class="theme-section dark-theme">
          <h3>深色主题</h3>
          <button class="btn btn-primary">主要按钮</button>
          <button class="btn btn-secondary">次要按钮</button>
          <div class="card">
            <h4>卡片标题</h4>
            <p>这是卡片内容</p>
          </div>
          <div class="form-group">
            <label>输入框</label>
            <input type="text" value="示例文本" />
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#theme-components-test', { state: 'visible' });

    await visualTesting.captureComponent('#theme-components-test', {
      name: 'theme-components-comparison',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'theme-components-comparison',
      threshold: 0.15
    });
    expect(result.matches).toBe(true);
  });

  test('颜色调色板视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建颜色调色板测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'color-palette-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;">
          <div class="color-swatch" style="background: var(--color-primary); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-secondary); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-success); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-warning); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-danger); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-info); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-light); height: 60px; border-radius: 4px; border: 1px solid #ccc;"></div>
          <div class="color-swatch" style="background: var(--color-dark); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-muted); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-accent); height: 60px; border-radius: 4px;"></div>
          <div class="color-swatch" style="background: var(--color-background); height: 60px; border-radius: 4px; border: 1px solid #ccc;"></div>
          <div class="color-swatch" style="background: var(--color-surface); height: 60px; border-radius: 4px; border: 1px solid #ccc;"></div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#color-palette-test', { state: 'visible' });

    await visualTesting.captureComponent('#color-palette-test', {
      name: 'color-palette',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'color-palette',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('字体和排版视觉测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 创建字体排版测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'typography-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.maxWidth = '600px';
      container.innerHTML = `
        <div style="line-height: 1.6;">
          <h1>一级标题 Heading 1</h1>
          <h2>二级标题 Heading 2</h2>
          <h3>三级标题 Heading 3</h3>
          <h4>四级标题 Heading 4</h4>
          <h5>五级标题 Heading 5</h5>
          <h6>六级标题 Heading 6</h6>
          
          <p>这是一段正文文本。Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          
          <p><strong>粗体文本</strong> 和 <em>斜体文本</em> 以及 <u>下划线文本</u></p>
          
          <blockquote>
            这是一个引用块。引用的内容通常会有特殊的样式。
          </blockquote>
          
          <ul>
            <li>无序列表项目 1</li>
            <li>无序列表项目 2</li>
            <li>无序列表项目 3</li>
          </ul>
          
          <ol>
            <li>有序列表项目 1</li>
            <li>有序列表项目 2</li>
            <li>有序列表项目 3</li>
          </ol>
          
          <code>内联代码示例</code>
          
          <pre><code>代码块示例
function hello() {
  console.log("Hello World!");
}</code></pre>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#typography-test', { state: 'visible' });

    await visualTesting.captureComponent('#typography-test', {
      name: 'typography-styles',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'typography-styles',
      threshold: 0.1
    });
    expect(result.matches).toBe(true);
  });

  test('响应式断点样式测试', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1200, height: 800 },
      { name: 'large', width: 1920, height: 1080 }
    ];

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('/');
      await VisualTestHelper.waitForPageStable(page);

      // 隐藏动态内容
      await VisualTestHelper.hideDynamicContent(page, [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]);

      await visualTesting.captureFullPage({
        name: `responsive-${breakpoint.name}`,
        fullPage: true,
        animations: 'disabled'
      });

      const result = await visualTesting.compareScreenshots({
        name: `responsive-${breakpoint.name}`,
        threshold: 0.15
      });
      expect(result.matches).toBe(true);
    }
  });

  test('CSS Grid和Flexbox布局测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建布局测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'layout-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h3>CSS Grid 布局</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; height: 200px;">
            <div style="background: #e3f2fd; padding: 20px; border-radius: 4px;">Grid Item 1</div>
            <div style="background: #f3e5f5; padding: 20px; border-radius: 4px;">Grid Item 2</div>
            <div style="background: #e8f5e8; padding: 20px; border-radius: 4px;">Grid Item 3</div>
            <div style="background: #fff3e0; padding: 20px; border-radius: 4px; grid-column: span 2;">Grid Item 4 (Span 2)</div>
            <div style="background: #fce4ec; padding: 20px; border-radius: 4px;">Grid Item 5</div>
          </div>
        </div>
        
        <div>
          <h3>Flexbox 布局</h3>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1; background: #e1f5fe; padding: 20px; border-radius: 4px;">Flex Item 1</div>
            <div style="flex: 2; background: #f1f8e9; padding: 20px; border-radius: 4px;">Flex Item 2 (Flex: 2)</div>
            <div style="flex: 1; background: #fef7e0; padding: 20px; border-radius: 4px;">Flex Item 3</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f5f5f5; padding: 20px; border-radius: 4px;">
            <div style="background: #2196f3; color: white; padding: 10px 20px; border-radius: 4px;">Left</div>
            <div style="background: #4caf50; color: white; padding: 10px 20px; border-radius: 4px;">Center</div>
            <div style="background: #ff9800; color: white; padding: 10px 20px; border-radius: 4px;">Right</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#layout-test', { state: 'visible' });

    await visualTesting.captureComponent('#layout-test', {
      name: 'css-layouts',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'css-layouts',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('阴影和边框效果测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建阴影和边框测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'effects-test';
      container.style.padding = '40px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
          <div style="padding: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-radius: 4px;">
            <h4>轻微阴影</h4>
            <p>box-shadow: 0 2px 4px rgba(0,0,0,0.1)</p>
          </div>
          
          <div style="padding: 20px; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.15); border-radius: 8px;">
            <h4>中等阴影</h4>
            <p>box-shadow: 0 4px 8px rgba(0,0,0,0.15)</p>
          </div>
          
          <div style="padding: 20px; background: white; box-shadow: 0 8px 16px rgba(0,0,0,0.2); border-radius: 12px;">
            <h4>深度阴影</h4>
            <p>box-shadow: 0 8px 16px rgba(0,0,0,0.2)</p>
          </div>
          
          <div style="padding: 20px; background: white; border: 1px solid #e0e0e0; border-radius: 4px;">
            <h4>细边框</h4>
            <p>border: 1px solid #e0e0e0</p>
          </div>
          
          <div style="padding: 20px; background: white; border: 2px solid #2196f3; border-radius: 8px;">
            <h4>彩色边框</h4>
            <p>border: 2px solid #2196f3</p>
          </div>
          
          <div style="padding: 20px; background: white; border: 3px dashed #ff9800; border-radius: 12px;">
            <h4>虚线边框</h4>
            <p>border: 3px dashed #ff9800</p>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#effects-test', { state: 'visible' });

    await visualTesting.captureComponent('#effects-test', {
      name: 'shadow-border-effects',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'shadow-border-effects',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });

  test('自定义CSS变量测试', async ({ page }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 测试CSS变量的应用
    await page.evaluate(() => {
      // 设置自定义CSS变量
      document.documentElement.style.setProperty('--test-primary-color', '#e91e63');
      document.documentElement.style.setProperty('--test-secondary-color', '#9c27b0');
      document.documentElement.style.setProperty('--test-border-radius', '16px');
      document.documentElement.style.setProperty('--test-spacing', '24px');

      const container = document.createElement('div');
      container.id = 'css-variables-test';
      container.style.padding = 'var(--test-spacing)';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--test-spacing);">
          <div style="padding: var(--test-spacing); background: var(--test-primary-color); color: white; border-radius: var(--test-border-radius);">
            <h4>主色调组件</h4>
            <p>使用CSS变量 --test-primary-color</p>
          </div>
          
          <div style="padding: var(--test-spacing); background: var(--test-secondary-color); color: white; border-radius: var(--test-border-radius);">
            <h4>次色调组件</h4>
            <p>使用CSS变量 --test-secondary-color</p>
          </div>
          
          <div style="padding: var(--test-spacing); border: 2px solid var(--test-primary-color); border-radius: var(--test-border-radius);">
            <h4>边框组件</h4>
            <p>边框颜色和圆角都使用CSS变量</p>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#css-variables-test', { state: 'visible' });

    await visualTesting.captureComponent('#css-variables-test', {
      name: 'css-variables-custom',
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: 'css-variables-custom',
      threshold: 0.05
    });
    expect(result.matches).toBe(true);
  });
});