/**
 * 跨平台视觉一致性测试
 * 测试不同操作系统、浏览器和设备上的视觉一致性
 */

import { test, expect, devices } from '@playwright/test';
import { VisualTesting, VisualTestHelper } from '../../utils/visual-testing';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';

test.describe('跨平台视觉一致性测试', () => {
  let visualTesting: VisualTesting;
  let testDataManager: TestDataManager;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    visualTesting = new VisualTesting(page, 'cross-platform');
    testDataManager = new TestDataManager(page);
    authPage = new AuthPage(page);

    // 设置固定的动态值
    await VisualTestHelper.mockDynamicValues(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  // 桌面浏览器跨平台测试
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`桌面端首页 - ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `跳过非${browserName}浏览器`);

      await page.goto('/');
      await VisualTestHelper.waitForPageStable(page);
      await VisualTestHelper.waitForFonts(page);

      // 隐藏动态内容
      await VisualTestHelper.hideDynamicContent(page, [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]);

      await visualTesting.captureFullPage({
        name: `homepage-desktop-${browserName}`,
        fullPage: true,
        animations: 'disabled'
      });

      const result = await visualTesting.compareScreenshots({
        name: `homepage-desktop-${browserName}`,
        threshold: browserName === 'webkit' ? 0.25 : 0.15 // Safari可能有更大差异
      });

      expect(result.matches).toBe(true);
    });
  });

  // 移动设备跨平台测试
  test('移动端跨设备一致性测试', async ({ page, browserName }) => {
    const mobileDevices = [
      { name: 'iPhone-12', config: devices['iPhone 12'] },
      { name: 'iPhone-SE', config: devices['iPhone SE'] },
      { name: 'Pixel-5', config: devices['Pixel 5'] },
      { name: 'Galaxy-S21', config: devices['Galaxy S21'] }
    ];

    for (const device of mobileDevices) {
      // 设置设备配置
      await page.setViewportSize(device.config.viewport);
      if (device.config.userAgent) {
        await page.setExtraHTTPHeaders({
          'User-Agent': device.config.userAgent
        });
      }

      await page.goto('/');
      await VisualTestHelper.waitForPageStable(page);
      await VisualTestHelper.waitForFonts(page);

      await VisualTestHelper.hideDynamicContent(page, [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]);

      await visualTesting.captureFullPage({
        name: `homepage-${device.name}-${browserName}`,
        fullPage: true,
        animations: 'disabled'
      });

      const result = await visualTesting.compareScreenshots({
        name: `homepage-${device.name}-${browserName}`,
        threshold: 0.2 // 移动设备间可能有较大差异
      });

      expect(result.matches).toBe(true);
    }
  });

  // 平板设备跨平台测试
  test('平板端跨设备一致性测试', async ({ page, browserName }) => {
    const tabletDevices = [
      { name: 'iPad', config: devices['iPad'] },
      { name: 'iPad-Pro', config: devices['iPad Pro'] },
      { name: 'Galaxy-Tab', config: { viewport: { width: 800, height: 1280 } } }
    ];

    for (const device of tabletDevices) {
      await page.setViewportSize(device.config.viewport);
      if (device.config.userAgent) {
        await page.setExtraHTTPHeaders({
          'User-Agent': device.config.userAgent
        });
      }

      await page.goto('/');
      await VisualTestHelper.waitForPageStable(page);
      await VisualTestHelper.waitForFonts(page);

      await VisualTestHelper.hideDynamicContent(page, [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]);

      await visualTesting.captureFullPage({
        name: `homepage-${device.name}-${browserName}`,
        fullPage: true,
        animations: 'disabled'
      });

      const result = await visualTesting.compareScreenshots({
        name: `homepage-${device.name}-${browserName}`,
        threshold: 0.2
      });

      expect(result.matches).toBe(true);
    }
  });

  // 字体渲染跨平台测试
  test('字体渲染跨平台一致性测试', async ({ page, browserName }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 创建字体测试内容
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'font-rendering-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      container.innerHTML = `
        <div style="line-height: 1.6;">
          <h1 style="font-size: 32px; font-weight: 700;">标题字体渲染测试</h1>
          <h2 style="font-size: 24px; font-weight: 600;">Heading Font Rendering Test</h2>
          
          <p style="font-size: 16px; font-weight: 400;">
            这是正文字体渲染测试。包含中文字符和English characters的混合文本。
            测试不同字重和字号在各平台上的渲染效果。
          </p>
          
          <p style="font-size: 14px; font-weight: 300;">
            轻字重文本 Light weight text 123456789
          </p>
          
          <p style="font-size: 16px; font-weight: 500;">
            中等字重文本 Medium weight text 123456789
          </p>
          
          <p style="font-size: 18px; font-weight: 700;">
            粗字重文本 Bold weight text 123456789
          </p>
          
          <div style="font-family: monospace; background: #f5f5f5; padding: 10px; margin: 10px 0;">
            <code>等宽字体代码文本 Monospace code text 123456789</code>
          </div>
          
          <div style="display: flex; gap: 20px; margin-top: 20px;">
            <span style="font-size: 12px;">12px</span>
            <span style="font-size: 14px;">14px</span>
            <span style="font-size: 16px;">16px</span>
            <span style="font-size: 18px;">18px</span>
            <span style="font-size: 20px;">20px</span>
            <span style="font-size: 24px;">24px</span>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#font-rendering-test', { state: 'visible' });

    await visualTesting.captureComponent('#font-rendering-test', {
      name: `font-rendering-${browserName}`,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `font-rendering-${browserName}`,
      threshold: browserName === 'webkit' ? 0.3 : 0.2 // Safari字体渲染差异较大
    });

    expect(result.matches).toBe(true);
  });

  // 颜色显示跨平台测试
  test('颜色显示跨平台一致性测试', async ({ page, browserName }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建颜色测试内容
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'color-display-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
          <!-- 基础颜色 -->
          <div style="background: #ff0000; height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            #ff0000
          </div>
          <div style="background: #00ff00; height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold;">
            #00ff00
          </div>
          <div style="background: #0000ff; height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            #0000ff
          </div>
          <div style="background: #000000; height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            #000000
          </div>
          
          <!-- 渐变色 -->
          <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            渐变1
          </div>
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            渐变2
          </div>
          <div style="background: radial-gradient(circle, #ff9a9e, #fecfef); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold;">
            径向渐变
          </div>
          <div style="background: conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            锥形渐变
          </div>
          
          <!-- 透明度测试 -->
          <div style="background: rgba(255, 0, 0, 0.5); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold;">
            50% 透明
          </div>
          <div style="background: rgba(0, 255, 0, 0.3); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: black; font-weight: bold;">
            30% 透明
          </div>
          <div style="background: rgba(0, 0, 255, 0.7); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            70% 透明
          </div>
          <div style="background: hsla(300, 100%, 50%, 0.6); height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            HSL 透明
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#color-display-test', { state: 'visible' });

    await visualTesting.captureComponent('#color-display-test', {
      name: `color-display-${browserName}`,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `color-display-${browserName}`,
      threshold: 0.15 // 颜色渲染可能有轻微差异
    });

    expect(result.matches).toBe(true);
  });

  // 高DPI屏幕测试
  test('高DPI屏幕显示测试', async ({ page, browserName }) => {
    // 模拟高DPI屏幕
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 2
      });
    });

    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);
    await VisualTestHelper.waitForFonts(page);

    // 创建高DPI测试内容
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'high-dpi-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div>
          <h2>高DPI屏幕显示测试</h2>
          <p>当前设备像素比: <span id="dpr">${window.devicePixelRatio}</span></p>
          
          <div style="display: flex; gap: 20px; margin: 20px 0;">
            <!-- 矢量图标 -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <span>SVG图标</span>
            </div>
            
            <!-- 细线条测试 -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; border: 1px solid #333; position: relative;">
                <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #333;"></div>
                <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #333;"></div>
              </div>
              <span>1px线条</span>
            </div>
            
            <!-- 小字体测试 -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <div style="font-size: 10px; line-height: 1.2;">
                10px字体<br/>
                Small Text<br/>
                123456789
              </div>
              <span>小字体</span>
            </div>
          </div>
          
          <!-- 像素完美测试 -->
          <div style="margin-top: 20px;">
            <h3>像素完美测试</h3>
            <div style="display: grid; grid-template-columns: repeat(8, 20px); gap: 1px; margin: 10px 0;">
              ${Array.from({length: 64}, (_, i) => 
                `<div style="width: 20px; height: 20px; background: ${i % 2 === 0 ? '#000' : '#fff'}; border: 0.5px solid #ccc;"></div>`
              ).join('')}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#high-dpi-test', { state: 'visible' });

    await visualTesting.captureComponent('#high-dpi-test', {
      name: `high-dpi-${browserName}`,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `high-dpi-${browserName}`,
      threshold: 0.2 // 高DPI可能有较大差异
    });

    expect(result.matches).toBe(true);
  });

  // 缩放比例测试
  test('页面缩放比例测试', async ({ page, browserName }) => {
    const zoomLevels = [0.75, 1.0, 1.25, 1.5];

    for (const zoom of zoomLevels) {
      // 设置页面缩放
      await page.evaluate((zoomLevel) => {
        document.body.style.zoom = zoomLevel.toString();
      }, zoom);

      await page.goto('/');
      await VisualTestHelper.waitForPageStable(page);
      await VisualTestHelper.waitForFonts(page);

      await VisualTestHelper.hideDynamicContent(page, [
        '[data-testid="current-time"]',
        '[data-testid="random-tip"]'
      ]);

      await visualTesting.captureFullPage({
        name: `zoom-${zoom.toString().replace('.', '_')}-${browserName}`,
        fullPage: true,
        animations: 'disabled'
      });

      const result = await visualTesting.compareScreenshots({
        name: `zoom-${zoom.toString().replace('.', '_')}-${browserName}`,
        threshold: 0.25 // 缩放可能导致较大差异
      });

      expect(result.matches).toBe(true);
    }
  });

  // 操作系统特定UI测试
  test('操作系统UI元素测试', async ({ page, browserName }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建操作系统特定UI测试
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'os-ui-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <h3>表单控件</h3>
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
              <input type="text" placeholder="文本输入框" style="padding: 8px;">
              <input type="password" placeholder="密码输入框" style="padding: 8px;">
              <input type="email" placeholder="邮箱输入框" style="padding: 8px;">
              <input type="number" placeholder="数字输入框" style="padding: 8px;">
            </div>
          </div>
          
          <div>
            <h3>选择控件</h3>
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
              <select style="padding: 8px;">
                <option>选项1</option>
                <option>选项2</option>
                <option>选项3</option>
              </select>
              
              <label style="display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" checked>
                复选框
              </label>
              
              <label style="display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="radio-test" checked>
                单选框1
              </label>
              
              <label style="display: flex; align-items: center; gap: 5px;">
                <input type="radio" name="radio-test">
                单选框2
              </label>
            </div>
          </div>
          
          <div>
            <h3>按钮样式</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button style="padding: 8px 16px;">默认按钮</button>
              <button style="padding: 8px 16px; background: #2196f3; color: white; border: none;">主要按钮</button>
              <button style="padding: 8px 16px;" disabled>禁用按钮</button>
              <input type="submit" value="提交按钮" style="padding: 8px 16px;">
              <input type="reset" value="重置按钮" style="padding: 8px 16px;">
            </div>
          </div>
          
          <div>
            <h3>滑块和进度条</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <input type="range" min="0" max="100" value="50" style="width: 200px;">
              <progress value="70" max="100" style="width: 200px;">70%</progress>
              <meter value="0.6" style="width: 200px;">60%</meter>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#os-ui-test', { state: 'visible' });

    await visualTesting.captureComponent('#os-ui-test', {
      name: `os-ui-elements-${browserName}`,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `os-ui-elements-${browserName}`,
      threshold: browserName === 'webkit' ? 0.4 : 0.3 // 操作系统UI差异较大
    });

    expect(result.matches).toBe(true);
  });

  // 滚动条样式跨平台测试
  test('滚动条样式跨平台测试', async ({ page, browserName }) => {
    await page.goto('/');
    await VisualTestHelper.waitForPageStable(page);

    // 创建滚动条测试内容
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'scrollbar-test';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.innerHTML = `
        <div style="display: flex; gap: 20px;">
          <!-- 垂直滚动条 -->
          <div style="width: 200px; height: 150px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px;">
            <h4>垂直滚动</h4>
            <p>这是一段很长的文本内容，用来测试垂直滚动条的显示效果。</p>
            <p>第二段文本内容。</p>
            <p>第三段文本内容。</p>
            <p>第四段文本内容。</p>
            <p>第五段文本内容。</p>
            <p>第六段文本内容。</p>
            <p>第七段文本内容。</p>
          </div>
          
          <!-- 水平滚动条 -->
          <div style="width: 200px; height: 100px; overflow-x: scroll; border: 1px solid #ccc; padding: 10px;">
            <div style="width: 400px; white-space: nowrap;">
              这是一行很长的文本内容，用来测试水平滚动条的显示效果，内容会超出容器宽度。
            </div>
          </div>
          
          <!-- 双向滚动条 -->
          <div style="width: 150px; height: 100px; overflow: scroll; border: 1px solid #ccc; padding: 10px;">
            <div style="width: 300px; height: 200px; background: linear-gradient(45deg, #f0f0f0, #e0e0e0);">
              双向滚动内容区域
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });

    await page.waitForSelector('#scrollbar-test', { state: 'visible' });

    await visualTesting.captureComponent('#scrollbar-test', {
      name: `scrollbar-styles-${browserName}`,
      animations: 'disabled'
    });

    const result = await visualTesting.compareScreenshots({
      name: `scrollbar-styles-${browserName}`,
      threshold: 0.3 // 滚动条样式差异较大
    });

    expect(result.matches).toBe(true);
  });
});