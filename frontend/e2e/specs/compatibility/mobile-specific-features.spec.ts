import { test, expect, devices } from '@playwright/test';
import { TestDataManager } from '../../utils/test-data-manager';
import { AuthPage } from '../../page-objects/auth-page';
import { AnalysisPage } from '../../page-objects/analysis-page';

// 移动端特定功能测试
test.describe('移动端特定功能测试', () => {
  let testDataManager: TestDataManager;
  let authPage: AuthPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    testDataManager = new TestDataManager();
    authPage = new AuthPage(page);
    analysisPage = new AnalysisPage(page);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  // iOS Safari特定功能测试
  test.describe('iOS Safari特定功能', () => {

    test('iOS - PWA安装和独立模式测试', async ({ page }) => {
      await page.goto('/');
      
      // 检查PWA manifest
      const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifestLink).toBeTruthy();
      
      // 检查PWA相关meta标签
      const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').count();
      expect(appleTouchIcon).toBeGreaterThan(0);
      
      const appleWebAppCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
      expect(appleWebAppCapable).toBe('yes');
      
      const appleWebAppStatusBar = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content');
      expect(appleWebAppStatusBar).toBeTruthy();
      
      // 检查独立模式检测
      const standaloneMode = await page.evaluate(() => {
        return {
          isStandalone: window.matchMedia('(display-mode: standalone)').matches,
          isFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
          navigatorStandalone: 'standalone' in navigator && (navigator as any).standalone
        };
      });
      
      console.log('iOS PWA模式检测:', standaloneMode);
      
      // 在测试环境中通常不是独立模式
      expect(typeof standaloneMode.isStandalone).toBe('boolean');
    });

    test('iOS - 安全区域和刘海屏适配测试', async ({ page }) => {
      await page.goto('/');
      
      // 检查安全区域CSS变量
      const safeAreaSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.paddingTop = 'env(safe-area-inset-top)';
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const paddingTop = computedStyle.paddingTop;
        
        document.body.removeChild(testElement);
        
        return {
          supportsSafeArea: paddingTop !== '0px' && paddingTop !== '',
          paddingTop: paddingTop,
          viewportHeight: window.innerHeight,
          screenHeight: screen.height
        };
      });
      
      console.log('iOS安全区域支持:', safeAreaSupport);
      
      // 检查页面布局是否考虑了安全区域
      const header = page.locator('header');
      if (await header.isVisible()) {
        const headerStyles = await header.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            paddingTop: styles.paddingTop,
            marginTop: styles.marginTop,
            top: styles.top
          };
        });
        
        console.log('iOS头部安全区域样式:', headerStyles);
      }
    });

    test('iOS - 触觉反馈测试', async ({ page }) => {
      await page.goto('/');
      
      // 检查触觉反馈API支持
      const hapticSupport = await page.evaluate(() => {
        return {
          vibrate: 'vibrate' in navigator,
          deviceMotion: 'DeviceMotionEvent' in window,
          deviceOrientation: 'DeviceOrientationEvent' in window
        };
      });
      
      console.log('iOS触觉反馈支持:', hapticSupport);
      
      // iOS通常不支持vibrate API，但支持设备运动事件
      expect(hapticSupport.deviceMotion).toBe(true);
      expect(hapticSupport.deviceOrientation).toBe(true);
      
      // 测试按钮点击时的触觉反馈（如果有实现）
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        await button.tap();
        
        // 检查是否有触觉反馈相关的类或属性
        const hasHapticClass = await button.evaluate(el => {
          return el.classList.contains('haptic') || 
                 el.hasAttribute('data-haptic') ||
                 el.style.webkitTapHighlightColor !== '';
        });
        
        console.log('iOS按钮触觉反馈实现:', hasHapticClass);
      }
    });

    test('iOS - 相机和媒体访问测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.goToLogin();
      await authPage.login(testUser.email, testUser.password);
      
      await page.goto('/analysis');
      
      // 检查相机访问相关的input属性
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        const inputAttributes = await fileInput.evaluate(el => ({
          accept: el.getAttribute('accept'),
          capture: el.getAttribute('capture'),
          multiple: el.hasAttribute('multiple')
        }));
        
        console.log('iOS文件输入属性:', inputAttributes);
        
        // iOS Safari对capture属性的支持
        expect(inputAttributes.accept).toContain('image');
        
        // 测试相机按钮（如果存在）
        const cameraButton = page.locator('[data-testid="camera-button"], button[aria-label*="相机"], button[aria-label*="camera"]');
        if (await cameraButton.isVisible()) {
          // 点击相机按钮（在测试环境中可能会被拒绝权限）
          await cameraButton.tap();
          await page.waitForTimeout(1000);
          
          // 检查权限请求或错误处理
          const permissionDialog = page.locator('[role="dialog"], .permission-dialog, .error-message');
          const hasPermissionDialog = await permissionDialog.isVisible();
          
          console.log('iOS相机权限对话框:', hasPermissionDialog);
        }
      }
    });

    test('iOS - 键盘和输入优化测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.goToRegister();
      
      // 测试不同输入类型的键盘优化
      const inputTests = [
        { selector: 'input[type="email"]', expectedType: 'email', description: '邮箱输入' },
        { selector: 'input[type="tel"]', expectedType: 'tel', description: '电话输入' },
        { selector: 'input[type="number"]', expectedType: 'number', description: '数字输入' },
        { selector: 'input[type="password"]', expectedType: 'password', description: '密码输入' }
      ];
      
      for (const inputTest of inputTests) {
        const input = page.locator(inputTest.selector);
        if (await input.isVisible()) {
          // 检查输入类型
          const inputType = await input.getAttribute('type');
          expect(inputType).toBe(inputTest.expectedType);
          
          // 检查iOS特定属性
          const iosAttributes = await input.evaluate(el => ({
            autocomplete: el.getAttribute('autocomplete'),
            autocorrect: el.getAttribute('autocorrect'),
            autocapitalize: el.getAttribute('autocapitalize'),
            spellcheck: el.getAttribute('spellcheck')
          }));
          
          console.log(`iOS ${inputTest.description} 属性:`, iosAttributes);
          
          // 测试输入焦点
          await input.tap();
          const isFocused = await input.evaluate(el => document.activeElement === el);
          expect(isFocused).toBe(true);
          
          await page.waitForTimeout(500); // 等待键盘弹出
        }
      }
    });
  });

  // Android Chrome特定功能测试
  test.describe('Android Chrome特定功能', () => {

    test('Android - PWA安装和Web App Manifest测试', async ({ page }) => {
      await page.goto('/');
      
      // 检查Web App Manifest
      const manifestResponse = await page.request.get('/manifest.json');
      expect(manifestResponse.status()).toBe(200);
      
      const manifest = await manifestResponse.json();
      console.log('Android PWA Manifest:', manifest);
      
      // 验证manifest必要字段
      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.start_url).toBeTruthy();
      expect(manifest.display).toBeTruthy();
      expect(manifest.theme_color).toBeTruthy();
      expect(manifest.background_color).toBeTruthy();
      expect(manifest.icons).toBeTruthy();
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);
      
      // 检查PWA安装条件
      const pwaInstallability = await page.evaluate(() => {
        return new Promise((resolve) => {
          let installPrompt = null;
          
          window.addEventListener('beforeinstallprompt', (e) => {
            installPrompt = e;
            resolve({
              canInstall: true,
              hasInstallPrompt: true
            });
          });
          
          // 如果没有立即触发，等待一段时间
          setTimeout(() => {
            resolve({
              canInstall: false,
              hasInstallPrompt: false,
              serviceWorkerReady: 'serviceWorker' in navigator
            });
          }, 2000);
        });
      });
      
      console.log('Android PWA安装能力:', pwaInstallability);
    });

    test('Android - 网络状态和连接信息测试', async ({ page }) => {
      await page.goto('/');
      
      // 获取Android网络连接信息
      const networkInfo = await page.evaluate(() => {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        
        return {
          onLine: navigator.onLine,
          connection: connection ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            downlinkMax: connection.downlinkMax,
            rtt: connection.rtt,
            saveData: connection.saveData,
            type: connection.type
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
        expect(typeof networkInfo.connection.downlink).toBe('number');
        expect(typeof networkInfo.connection.rtt).toBe('number');
        
        // 测试网络状态变化监听
        const networkChangeSupport = await page.evaluate(() => {
          return new Promise((resolve) => {
            const connection = (navigator as any).connection;
            if (connection) {
              const originalHandler = connection.onchange;
              connection.onchange = () => {
                resolve(true);
                connection.onchange = originalHandler;
              };
              
              // 模拟网络状态变化（实际测试中可能不会触发）
              setTimeout(() => resolve(false), 1000);
            } else {
              resolve(false);
            }
          });
        });
        
        console.log('Android网络状态变化监听支持:', networkChangeSupport);
      }
    });

    test('Android - 振动和设备API测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试振动API
      const vibrationSupport = await page.evaluate(() => {
        return {
          vibrate: 'vibrate' in navigator,
          canVibrate: typeof navigator.vibrate === 'function'
        };
      });
      
      console.log('Android振动API支持:', vibrationSupport);
      
      if (vibrationSupport.canVibrate) {
        // 测试不同振动模式
        const vibrationTests = [
          { pattern: 100, description: '短振动' },
          { pattern: [100, 50, 100], description: '节奏振动' },
          { pattern: 200, description: '长振动' }
        ];
        
        for (const test of vibrationTests) {
          const vibrateResult = await page.evaluate((pattern) => {
            try {
              return navigator.vibrate(pattern);
            } catch (error) {
              return false;
            }
          }, test.pattern);
          
          console.log(`Android ${test.description} 测试结果:`, vibrateResult);
        }
      }
      
      // 测试设备方向API
      const orientationSupport = await page.evaluate(() => {
        return {
          deviceOrientation: 'DeviceOrientationEvent' in window,
          deviceMotion: 'DeviceMotionEvent' in window,
          screenOrientation: 'orientation' in screen,
          orientationAngle: screen.orientation?.angle || window.orientation
        };
      });
      
      console.log('Android设备方向API支持:', orientationSupport);
      expect(orientationSupport.deviceOrientation).toBe(true);
      expect(orientationSupport.deviceMotion).toBe(true);
    });

    test('Android - 文件系统和存储访问测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.goToLogin();
      await authPage.login(testUser.email, testUser.password);
      
      await page.goto('/analysis');
      
      // 测试文件选择器
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        const fileInputCapabilities = await fileInput.evaluate(el => ({
          accept: el.getAttribute('accept'),
          capture: el.getAttribute('capture'),
          multiple: el.hasAttribute('multiple'),
          webkitdirectory: el.hasAttribute('webkitdirectory')
        }));
        
        console.log('Android文件输入能力:', fileInputCapabilities);
        
        // Android Chrome支持capture属性
        expect(fileInputCapabilities.accept).toContain('image');
      }
      
      // 测试存储API
      const storageSupport = await page.evaluate(() => {
        return {
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          indexedDB: 'indexedDB' in window,
          webSQL: 'openDatabase' in window,
          fileSystemAccess: 'showOpenFilePicker' in window,
          persistentStorage: 'storage' in navigator && 'persist' in navigator.storage
        };
      });
      
      console.log('Android存储API支持:', storageSupport);
      
      expect(storageSupport.localStorage).toBe(true);
      expect(storageSupport.sessionStorage).toBe(true);
      expect(storageSupport.indexedDB).toBe(true);
      
      // 测试存储配额
      if (storageSupport.persistentStorage) {
        const storageEstimate = await page.evaluate(async () => {
          try {
            const estimate = await navigator.storage.estimate();
            return {
              quota: estimate.quota,
              usage: estimate.usage,
              usageDetails: estimate.usageDetails
            };
          } catch (error) {
            return { error: error.message };
          }
        });
        
        console.log('Android存储配额:', storageEstimate);
      }
    });

    test('Android - 通知和后台同步测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试通知API支持
      const notificationSupport = await page.evaluate(() => {
        return {
          notification: 'Notification' in window,
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
          permission: 'Notification' in window ? Notification.permission : 'not-supported'
        };
      });
      
      console.log('Android通知API支持:', notificationSupport);
      
      expect(notificationSupport.notification).toBe(true);
      expect(notificationSupport.serviceWorker).toBe(true);
      
      if (notificationSupport.notification) {
        // 测试通知权限请求（在测试环境中通常会被拒绝）
        const permissionResult = await page.evaluate(async () => {
          try {
            if (Notification.permission === 'default') {
              const permission = await Notification.requestPermission();
              return permission;
            }
            return Notification.permission;
          } catch (error) {
            return 'error';
          }
        });
        
        console.log('Android通知权限结果:', permissionResult);
      }
      
      // 测试后台同步API
      const backgroundSyncSupport = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            return {
              hasServiceWorker: !!registration,
              backgroundSync: registration && 'sync' in registration,
              periodicBackgroundSync: registration && 'periodicSync' in registration
            };
          } catch (error) {
            return { error: error.message };
          }
        }
        return { supported: false };
      });
      
      console.log('Android后台同步支持:', backgroundSyncSupport);
    });
  });

  // 通用移动端特定功能测试
  test.describe('通用移动端特定功能', () => {
    const mobileDevices = [
      { name: 'iPhone 12', device: devices['iPhone 12'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] }
    ];

    mobileDevices.forEach(({ name, device }) => {
      test(`${name} - 设备传感器访问测试`, async ({ page, browser }) => {
        const context = await browser.newContext(device);
        const mobilePage = await context.newPage();
        
        try {
          await mobilePage.goto('/');
          
          // 测试设备传感器API
          const sensorSupport = await mobilePage.evaluate(() => {
            return {
              deviceOrientation: 'DeviceOrientationEvent' in window,
              deviceMotion: 'DeviceMotionEvent' in window,
              geolocation: 'geolocation' in navigator,
              battery: 'getBattery' in navigator,
              gamepad: 'getGamepads' in navigator,
              mediaDevices: 'mediaDevices' in navigator
            };
          });
          
          console.log(`${name} 传感器API支持:`, sensorSupport);
          
          // 基本传感器应该被支持
          expect(sensorSupport.deviceOrientation).toBe(true);
          expect(sensorSupport.deviceMotion).toBe(true);
          expect(sensorSupport.geolocation).toBe(true);
          
          // 测试地理位置权限（在测试环境中通常会被拒绝）
          if (sensorSupport.geolocation) {
            const geoPermission = await mobilePage.evaluate(() => {
              return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  (position) => resolve({ success: true, coords: position.coords }),
                  (error) => resolve({ success: false, error: error.message }),
                  { timeout: 5000 }
                );
              });
            });
            
            console.log(`${name} 地理位置权限测试:`, geoPermission);
          }
          
        } finally {
          await mobilePage.close();
          await context.close();
        }
      });

      test(`${name} - 移动端手势识别测试`, async ({ page, browser }) => {
        const context = await browser.newContext(device);
        const mobilePage = await context.newPage();
        
        try {
          await mobilePage.goto('/');
          
          // 测试手势识别能力
          const gestureSupport = await mobilePage.evaluate(() => {
            return {
              touchEvents: 'ontouchstart' in window,
              pointerEvents: 'onpointerdown' in window,
              gestureEvents: 'ongesturestart' in window, // iOS Safari特有
              touchAction: CSS.supports('touch-action', 'manipulation'),
              userSelect: CSS.supports('user-select', 'none')
            };
          });
          
          console.log(`${name} 手势识别支持:`, gestureSupport);
          
          expect(gestureSupport.touchEvents).toBe(true);
          expect(gestureSupport.pointerEvents).toBe(true);
          
          // 测试复杂手势处理
          const gestureArea = mobilePage.locator('body');
          const box = await gestureArea.boundingBox();
          
          if (box) {
            // 模拟复杂手势序列
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            
            // 捏合手势模拟
            await mobilePage.touchscreen.tap(centerX - 50, centerY);
            await mobilePage.touchscreen.tap(centerX + 50, centerY);
            await mobilePage.waitForTimeout(100);
            
            // 旋转手势模拟
            const rotationPoints = [
              { x: centerX + 30, y: centerY },
              { x: centerX, y: centerY + 30 },
              { x: centerX - 30, y: centerY },
              { x: centerX, y: centerY - 30 }
            ];
            
            for (const point of rotationPoints) {
              await mobilePage.touchscreen.tap(point.x, point.y);
              await mobilePage.waitForTimeout(50);
            }
            
            console.log(`${name} 复杂手势测试完成`);
          }
          
        } finally {
          await mobilePage.close();
          await context.close();
        }
      });
    });

    test('移动端 - 电池状态和性能监控', async ({ page }) => {
      await page.goto('/');
      
      // 测试电池API（如果支持）
      const batteryInfo = await page.evaluate(async () => {
        try {
          if ('getBattery' in navigator) {
            const battery = await (navigator as any).getBattery();
            return {
              supported: true,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime,
              level: battery.level
            };
          }
          return { supported: false };
        } catch (error) {
          return { supported: false, error: error.message };
        }
      });
      
      console.log('移动端电池信息:', batteryInfo);
      
      // 测试性能监控API
      const performanceInfo = await page.evaluate(() => {
        return {
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null,
          timing: performance.timing ? {
            navigationStart: performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd,
            domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
          } : null,
          navigation: performance.getEntriesByType('navigation').length > 0
        };
      });
      
      console.log('移动端性能监控信息:', performanceInfo);
      expect(performanceInfo.navigation).toBe(true);
    });

    test('移动端 - 离线存储和缓存策略测试', async ({ page, context }) => {
      await page.goto('/');
      
      // 测试Service Worker注册
      const swInfo = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            return {
              registered: !!registration,
              active: !!registration?.active,
              waiting: !!registration?.waiting,
              installing: !!registration?.installing,
              scope: registration?.scope
            };
          } catch (error) {
            return { error: error.message };
          }
        }
        return { supported: false };
      });
      
      console.log('移动端Service Worker信息:', swInfo);
      
      if (swInfo.registered) {
        // 测试离线功能
        await context.setOffline(true);
        
        try {
          await page.reload({ waitUntil: 'networkidle' });
          
          // 检查页面是否仍然可用
          const pageTitle = await page.title();
          expect(pageTitle).toBeTruthy();
          
          // 检查离线指示器
          const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-indicator');
          const hasOfflineIndicator = await offlineIndicator.isVisible();
          
          console.log('移动端离线指示器:', hasOfflineIndicator);
          
        } finally {
          await context.setOffline(false);
        }
      }
      
      // 测试本地存储策略
      const storageTest = await page.evaluate(() => {
        const testKey = 'mobile-test-key';
        const testValue = 'mobile-test-value';
        
        try {
          // 测试localStorage
          localStorage.setItem(testKey, testValue);
          const localStorageValue = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          
          // 测试sessionStorage
          sessionStorage.setItem(testKey, testValue);
          const sessionStorageValue = sessionStorage.getItem(testKey);
          sessionStorage.removeItem(testKey);
          
          return {
            localStorage: localStorageValue === testValue,
            sessionStorage: sessionStorageValue === testValue,
            indexedDB: 'indexedDB' in window
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('移动端存储测试结果:', storageTest);
      expect(storageTest.localStorage).toBe(true);
      expect(storageTest.sessionStorage).toBe(true);
      expect(storageTest.indexedDB).toBe(true);
    });
  });
});