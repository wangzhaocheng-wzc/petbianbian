import { test, expect, devices } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';
import { PetsPage } from '../page-objects/pets-page';
import { AnalysisPage } from '../page-objects/analysis-page';
import { TestDataManager } from '../utils/test-data-manager';

// 浏览器兼容性测试套件
test.describe('多浏览器兼容性测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let testDataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    testDataManager = new TestDataManager();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  // Chrome浏览器特定功能测试
  test.describe('Chrome浏览器兼容性', () => {
    test('Chrome - 基础功能验证', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', '仅在Chrome中运行');
      
      // 验证Chrome特定API支持
      const hasWebGL = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      });
      expect(hasWebGL).toBe(true);

      // 验证现代JavaScript特性
      const supportsES6 = await page.evaluate(() => {
        try {
          eval('const test = () => {}; class Test {}');
          return true;
        } catch {
          return false;
        }
      });
      expect(supportsES6).toBe(true);

      // 验证文件上传API
      await page.goto('/analysis');
      const fileInput = page.locator('input[type="file"]');
      expect(await fileInput.isVisible()).toBe(true);
    });

    test('Chrome - 高级Web API测试', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', '仅在Chrome中运行');
      
      await page.goto('/');
      
      // 测试Intersection Observer API
      const hasIntersectionObserver = await page.evaluate(() => {
        return 'IntersectionObserver' in window;
      });
      expect(hasIntersectionObserver).toBe(true);

      // 测试Service Worker支持
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(hasServiceWorker).toBe(true);

      // 测试Web Workers
      const hasWebWorkers = await page.evaluate(() => {
        return typeof Worker !== 'undefined';
      });
      expect(hasWebWorkers).toBe(true);
    });
  });

  // Firefox浏览器特定功能测试
  test.describe('Firefox浏览器兼容性', () => {
    test('Firefox - 基础功能验证', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', '仅在Firefox中运行');
      
      await page.goto('/');
      
      // 验证Firefox CSS支持
      const supportsCSSGrid = await page.evaluate(() => {
        return CSS.supports('display', 'grid');
      });
      expect(supportsCSSGrid).toBe(true);

      // 验证Firefox特定的用户代理
      const userAgent = await page.evaluate(() => navigator.userAgent);
      expect(userAgent).toContain('Firefox');

      // 测试Firefox的文件处理
      await page.goto('/analysis');
      const dropZone = page.locator('[data-testid="drop-zone"]');
      expect(await dropZone.isVisible()).toBe(true);
    });

    test('Firefox - 表单处理兼容性', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', '仅在Firefox中运行');
      
      const testUser = await testDataManager.createTestUser();
      
      await authPage.goToRegister();
      await authPage.fillRegistrationForm({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password
      });

      // 验证Firefox表单验证
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('invalid-email');
      
      const isValid = await emailInput.evaluate((input: HTMLInputElement) => {
        return input.validity.valid;
      });
      expect(isValid).toBe(false);
    });
  });

  // Safari浏览器特定功能测试
  test.describe('Safari浏览器兼容性', () => {
    test('Safari - WebKit引擎兼容性', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', '仅在Safari中运行');
      
      await page.goto('/');
      
      // 验证Safari CSS前缀支持
      const hasWebkitTransform = await page.evaluate(() => {
        const div = document.createElement('div');
        return 'webkitTransform' in div.style;
      });
      expect(hasWebkitTransform).toBe(true);

      // 测试Safari的触摸事件支持
      const hasTouchEvents = await page.evaluate(() => {
        return 'ontouchstart' in window;
      });
      // Safari桌面版可能不支持触摸事件，这是正常的
      console.log('Safari触摸事件支持:', hasTouchEvents);
    });

    test('Safari - 媒体处理兼容性', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', '仅在Safari中运行');
      
      await page.goto('/analysis');
      
      // 测试Safari的图片格式支持
      const supportsWebP = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      });
      console.log('Safari WebP支持:', supportsWebP);

      // 测试文件读取API
      const hasFileReader = await page.evaluate(() => {
        return 'FileReader' in window;
      });
      expect(hasFileReader).toBe(true);
    });
  });

  // 跨浏览器一致性测试
  test.describe('跨浏览器一致性验证', () => {
    test('所有浏览器 - 核心功能一致性', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      
      // 测试登录功能在所有浏览器中的一致性
      await authPage.goToLogin();
      await authPage.login(testUser.email, testUser.password);
      
      const isLoggedIn = await authPage.isLoggedIn();
      expect(isLoggedIn).toBe(true);

      // 测试导航在所有浏览器中的一致性
      await page.goto('/pets');
      expect(page.url()).toContain('/pets');
      
      await page.goto('/analysis');
      expect(page.url()).toContain('/analysis');
    });

    test('所有浏览器 - 响应式布局一致性', async ({ page }) => {
      await page.goto('/');
      
      // 测试不同视口大小下的布局
      const viewports = [
        { width: 1920, height: 1080 }, // 桌面
        { width: 1366, height: 768 },  // 笔记本
        { width: 768, height: 1024 },  // 平板
        { width: 375, height: 667 }    // 手机
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // 验证主要元素可见性
        const header = page.locator('header');
        expect(await header.isVisible()).toBe(true);
        
        const navigation = page.locator('nav');
        expect(await navigation.isVisible()).toBe(true);
        
        // 等待布局稳定
        await page.waitForTimeout(500);
      }
    });

    test('所有浏览器 - JavaScript API一致性', async ({ page }) => {
      await page.goto('/');
      
      // 测试基础API支持
      const apiSupport = await page.evaluate(() => {
        return {
          fetch: typeof fetch !== 'undefined',
          promise: typeof Promise !== 'undefined',
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          json: typeof JSON !== 'undefined',
          console: typeof console !== 'undefined'
        };
      });

      expect(apiSupport.fetch).toBe(true);
      expect(apiSupport.promise).toBe(true);
      expect(apiSupport.localStorage).toBe(true);
      expect(apiSupport.sessionStorage).toBe(true);
      expect(apiSupport.json).toBe(true);
      expect(apiSupport.console).toBe(true);
    });
  });

  // 浏览器版本兼容性测试
  test.describe('浏览器版本兼容性', () => {
    test('检测浏览器版本信息', async ({ page, browserName }) => {
      await page.goto('/');
      
      const browserInfo = await page.evaluate(() => {
        const ua = navigator.userAgent;
        const version = ua.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/);
        return {
          userAgent: ua,
          version: version ? version[1] : 'unknown',
          platform: navigator.platform,
          language: navigator.language
        };
      });

      console.log(`浏览器信息 (${browserName}):`, browserInfo);
      
      // 验证基本信息存在
      expect(browserInfo.userAgent).toBeTruthy();
      expect(browserInfo.platform).toBeTruthy();
      expect(browserInfo.language).toBeTruthy();
    });

    test('CSS特性支持检测', async ({ page }) => {
      await page.goto('/');
      
      const cssSupport = await page.evaluate(() => {
        const testFeatures = [
          'display: flex',
          'display: grid',
          'transform: translateX(0)',
          'transition: all 0.3s',
          'border-radius: 5px',
          'box-shadow: 0 0 5px rgba(0,0,0,0.1)',
          'background: linear-gradient(to right, red, blue)'
        ];

        return testFeatures.map(feature => {
          const [property, value] = feature.split(': ');
          return {
            feature,
            supported: CSS.supports(property, value)
          };
        });
      });

      // 验证现代CSS特性支持
      const flexSupport = cssSupport.find(f => f.feature.includes('flex'));
      expect(flexSupport?.supported).toBe(true);
      
      const gridSupport = cssSupport.find(f => f.feature.includes('grid'));
      expect(gridSupport?.supported).toBe(true);
      
      console.log('CSS特性支持情况:', cssSupport);
    });
  });
});