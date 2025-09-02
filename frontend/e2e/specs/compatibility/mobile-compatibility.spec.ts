import { test, expect, devices } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { TestDataManager } from '../../utils/test-data-manager';

// 移动端兼容性测试套件
test.describe('移动端兼容性测试', () => {
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

  // iOS Safari兼容性测试
  test.describe('iOS Safari兼容性', () => {

    test('iOS Safari - 基础功能验证', async ({ page }) => {
      await page.goto('/');
      
      // 检测iOS Safari环境
      const deviceInfo = await page.evaluate(() => {
        const ua = navigator.userAgent;
        return {
          isIOS: /iPad|iPhone|iPod/.test(ua),
          isSafari: ua.includes('Safari') && !ua.includes('Chrome'),
          userAgent: ua,
          platform: navigator.platform,
          touchSupport: 'ontouchstart' in window,
          standalone: 'standalone' in navigator
        };
      });

      console.log('iOS Safari设备信息:', deviceInfo);
      
      // 验证触摸支持
      expect(deviceInfo.touchSupport).toBe(true);
      
      // 验证基础导航
      const header = page.locator('header');
      expect(await header.isVisible()).toBe(true);
      
      // 验证移动端菜单
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await page.waitForTimeout(500); // 等待动画完成
      }
    });

    test('iOS Safari - 触摸交互测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      
      await authPage.goToLogin();
      
      // 测试触摸输入
      const emailInput = page.locator('input[type="email"]');
      await emailInput.tap();
      await emailInput.fill(testUser.email);
      
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.tap();
      await passwordInput.fill(testUser.password);
      
      // 测试触摸按钮点击
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.tap();
      
      // 验证登录成功
      await page.waitForURL('**/pets', { timeout: 10000 });
      expect(page.url()).toContain('/pets');
    });

    test('iOS Safari - 文件上传测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.goToLogin();
      await authPage.login(testUser.email, testUser.password);
      
      await page.goto('/analysis');
      
      // 测试iOS文件选择
      const fileInput = page.locator('input[type="file"]');
      expect(await fileInput.isVisible()).toBe(true);
      
      // 在iOS上，文件输入可能有特殊行为
      const inputType = await fileInput.getAttribute('accept');
      expect(inputType).toContain('image');
      
      // 测试拖拽区域的触摸交互
      const dropZone = page.locator('[data-testid="drop-zone"]');
      if (await dropZone.isVisible()) {
        await dropZone.tap();
        await page.waitForTimeout(500);
      }
    });

    test('iOS Safari - 视口和缩放测试', async ({ page }) => {
      await page.goto('/');
      
      // 获取初始视口信息
      const initialViewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        orientation: screen.orientation?.type || 'unknown'
      }));

      console.log('iOS初始视口:', initialViewport);
      
      // 验证视口设置
      expect(initialViewport.width).toBeGreaterThan(0);
      expect(initialViewport.height).toBeGreaterThan(0);
      expect(initialViewport.devicePixelRatio).toBeGreaterThan(1);
      
      // 测试页面缩放限制
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toContain('user-scalable=no');
    });

    test('iOS Safari - PWA功能测试', async ({ page }) => {
      await page.goto('/');
      
      // 检查PWA相关功能
      const pwaSupport = await page.evaluate(() => {
        return {
          serviceWorker: 'serviceWorker' in navigator,
          manifest: document.querySelector('link[rel="manifest"]') !== null,
          standalone: window.matchMedia('(display-mode: standalone)').matches,
          addToHomeScreen: 'BeforeInstallPromptEvent' in window
        };
      });

      console.log('iOS PWA支持:', pwaSupport);
      
      // iOS Safari对PWA的支持有限
      expect(pwaSupport.serviceWorker).toBe(true);
      expect(pwaSupport.manifest).toBe(true);
    });
  });

  // Android Chrome兼容性测试
  test.describe('Android Chrome兼容性', () => {

    test('Android Chrome - 基础功能验证', async ({ page }) => {
      await page.goto('/');
      
      // 检测Android Chrome环境
      const deviceInfo = await page.evaluate(() => {
        const ua = navigator.userAgent;
        return {
          isAndroid: ua.includes('Android'),
          isChrome: ua.includes('Chrome'),
          userAgent: ua,
          platform: navigator.platform,
          touchSupport: 'ontouchstart' in window,
          vibrate: 'vibrate' in navigator
        };
      });

      console.log('Android Chrome设备信息:', deviceInfo);
      
      // 验证Android特性
      expect(deviceInfo.touchSupport).toBe(true);
      
      // 验证页面加载
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // 验证响应式布局
      const container = page.locator('.container, main');
      expect(await container.isVisible()).toBe(true);
    });

    test('Android Chrome - 触摸手势测试', async ({ page }) => {
      await page.goto('/pets');
      
      // 测试滑动手势
      const petsList = page.locator('[data-testid="pets-list"]');
      if (await petsList.isVisible()) {
        const box = await petsList.boundingBox();
        if (box) {
          // 模拟向下滑动
          await page.touchscreen.tap(box.x + box.width / 2, box.y + 50);
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 50);
        }
      }
      
      // 测试长按手势
      const firstPet = page.locator('[data-testid="pet-item"]').first();
      if (await firstPet.isVisible()) {
        const box = await firstPet.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(1000); // 长按效果
        }
      }
    });

    test('Android Chrome - 相机和文件访问', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.goToLogin();
      await authPage.login(testUser.email, testUser.password);
      
      await page.goto('/analysis');
      
      // 测试相机访问权限
      const cameraButton = page.locator('[data-testid="camera-button"]');
      if (await cameraButton.isVisible()) {
        // 在测试环境中，相机权限可能被拒绝，这是正常的
        await cameraButton.tap();
        await page.waitForTimeout(1000);
      }
      
      // 测试文件选择
      const fileInput = page.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('image');
      
      // 测试capture属性（Android特有）
      const captureAttr = await fileInput.getAttribute('capture');
      console.log('Android文件输入capture属性:', captureAttr);
    });

    test('Android Chrome - 网络状态检测', async ({ page }) => {
      await page.goto('/');
      
      // 测试网络状态API
      const networkInfo = await page.evaluate(() => {
        return {
          onLine: navigator.onLine,
          connection: 'connection' in navigator ? {
            effectiveType: (navigator as any).connection?.effectiveType,
            downlink: (navigator as any).connection?.downlink,
            rtt: (navigator as any).connection?.rtt
          } : null,
          serviceWorker: 'serviceWorker' in navigator
        };
      });

      console.log('Android网络信息:', networkInfo);
      
      expect(networkInfo.onLine).toBe(true);
      expect(networkInfo.serviceWorker).toBe(true);
      
      // Android Chrome通常支持Network Information API
      if (networkInfo.connection) {
        expect(networkInfo.connection.effectiveType).toBeTruthy();
      }
    });

    test('Android Chrome - 振动API测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试振动API支持
      const vibrationSupport = await page.evaluate(() => {
        return {
          vibrate: 'vibrate' in navigator,
          canVibrate: typeof navigator.vibrate === 'function'
        };
      });

      console.log('Android振动支持:', vibrationSupport);
      
      if (vibrationSupport.canVibrate) {
        // 测试振动功能（在测试环境中可能无效果）
        const vibrateResult = await page.evaluate(() => {
          try {
            return navigator.vibrate(100);
          } catch (error) {
            return false;
          }
        });
        
        console.log('振动测试结果:', vibrateResult);
      }
    });
  });

  // 通用移动端测试
  test.describe('通用移动端功能', () => {
    // 测试不同移动设备
    const mobileDevices = [
      { name: 'iPhone 12', device: devices['iPhone 12'] },
      { name: 'iPhone SE', device: devices['iPhone SE'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] },
      { name: 'Galaxy S21', device: devices['Galaxy S21'] }
    ];

    mobileDevices.forEach(({ name, device }) => {
      test(`${name} - 响应式布局测试`, async ({ page, browser }) => {
        const context = await browser.newContext(device);
        const mobilePage = await context.newPage();
        
        try {
          await mobilePage.goto('/');
          
          // 验证移动端布局
          const viewport = mobilePage.viewportSize();
          expect(viewport?.width).toBeLessThan(768); // 移动端宽度
          
          // 检查关键元素可见性
          const header = mobilePage.locator('header');
          expect(await header.isVisible()).toBe(true);
          
          const navigation = mobilePage.locator('nav');
          expect(await navigation.isVisible()).toBe(true);
          
          // 检查移动端特定元素
          const mobileMenu = mobilePage.locator('[data-testid="mobile-menu"]');
          if (await mobileMenu.isVisible()) {
            await mobileMenu.tap();
            await mobilePage.waitForTimeout(500);
          }
          
          console.log(`${name} 布局测试通过`);
        } finally {
          await mobilePage.close();
          await context.close();
        }
      });
    });

    test('移动端 - 触摸交互一致性', async ({ page }) => {
      // 使用默认移动设备配置
      await page.goto('/');
      
      // 测试触摸事件支持
      const touchSupport = await page.evaluate(() => {
        return {
          touchstart: 'ontouchstart' in window,
          touchmove: 'ontouchmove' in window,
          touchend: 'ontouchend' in window,
          touchcancel: 'ontouchcancel' in window
        };
      });

      expect(touchSupport.touchstart).toBe(true);
      expect(touchSupport.touchmove).toBe(true);
      expect(touchSupport.touchend).toBe(true);
      
      // 测试触摸目标大小
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const box = await button.boundingBox();
          if (box) {
            // 触摸目标应该至少44x44px（iOS指南）
            expect(box.height).toBeGreaterThanOrEqual(40);
            expect(box.width).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });

    test('移动端 - 表单输入优化', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      
      await authPage.goToRegister();
      
      // 检查输入类型优化
      const emailInput = page.locator('input[type="email"]');
      const emailType = await emailInput.getAttribute('type');
      expect(emailType).toBe('email');
      
      const passwordInput = page.locator('input[type="password"]');
      const passwordType = await passwordInput.getAttribute('type');
      expect(passwordType).toBe('password');
      
      // 检查自动完成属性
      const emailAutocomplete = await emailInput.getAttribute('autocomplete');
      const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
      
      console.log('表单自动完成属性:', {
        email: emailAutocomplete,
        password: passwordAutocomplete
      });
      
      // 测试虚拟键盘优化
      await emailInput.tap();
      await page.waitForTimeout(500);
      
      // 填写表单
      await emailInput.fill(testUser.email);
      await passwordInput.tap();
      await passwordInput.fill(testUser.password);
      
      // 验证输入值
      expect(await emailInput.inputValue()).toBe(testUser.email);
      expect(await passwordInput.inputValue()).toBe(testUser.password);
    });

    test('移动端 - 性能和加载优化', async ({ page }) => {
      // 开始性能监控
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // 获取性能指标
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });

      console.log('移动端性能指标:', performanceMetrics);
      
      // 移动端性能要求
      expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3秒内DOM加载完成
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2500); // 2.5秒内首次内容绘制
      
      // 检查资源加载
      const resourceCount = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });
      
      expect(resourceCount).toBeGreaterThan(0);
      console.log(`加载资源数量: ${resourceCount}`);
    });

    test('移动端 - 离线功能测试', async ({ page, context }) => {
      await page.goto('/');
      
      // 检查Service Worker注册
      const swRegistration = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            return {
              registered: !!registration,
              active: !!registration?.active,
              scope: registration?.scope
            };
          } catch (error) {
            return { error: error.message };
          }
        }
        return { supported: false };
      });

      console.log('Service Worker状态:', swRegistration);
      
      if (swRegistration.registered) {
        // 测试离线模式
        await context.setOffline(true);
        
        // 尝试导航到缓存页面
        await page.goto('/', { waitUntil: 'networkidle' });
        
        // 验证离线页面或缓存内容
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        
        // 恢复在线状态
        await context.setOffline(false);
      }
    });
  });

  // 设备特定功能测试
  test.describe('设备特定功能', () => {
    test('设备方向变化测试', async ({ page, browser }) => {
      // 创建移动设备上下文
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      });
      
      const mobilePage = await context.newPage();
      
      try {
        await mobilePage.goto('/');
        
        // 获取初始方向
        const initialOrientation = await mobilePage.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
          orientation: screen.orientation?.type || 'unknown'
        }));

        console.log('初始方向:', initialOrientation);
        
        // 模拟设备旋转（横屏）
        await mobilePage.setViewportSize({ width: 844, height: 390 });
        await mobilePage.waitForTimeout(1000);
        
        const rotatedOrientation = await mobilePage.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
          orientation: screen.orientation?.type || 'unknown'
        }));

        console.log('旋转后方向:', rotatedOrientation);
        
        // 验证布局适应
        expect(rotatedOrientation.width).toBeGreaterThan(rotatedOrientation.height);
        
        // 检查关键元素仍然可见
        const header = mobilePage.locator('header');
        expect(await header.isVisible()).toBe(true);
        
      } finally {
        await mobilePage.close();
        await context.close();
      }
    });

    test('设备像素比测试', async ({ page }) => {
      await page.goto('/');
      
      const devicePixelInfo = await page.evaluate(() => ({
        devicePixelRatio: window.devicePixelRatio,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      }));

      console.log('设备像素信息:', devicePixelInfo);
      
      // 移动设备通常有高像素密度
      expect(devicePixelInfo.devicePixelRatio).toBeGreaterThan(1);
      
      // 验证高DPI图片支持
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        const firstImage = images.first();
        const srcset = await firstImage.getAttribute('srcset');
        console.log('图片srcset支持:', !!srcset);
      }
    });
  });
});