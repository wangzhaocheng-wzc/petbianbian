import { test, expect } from '@playwright/test';
import { TestDataManager } from '../../utils/test-data-manager';

// 浏览器特定功能和API测试
test.describe('浏览器特定功能测试', () => {
  let testDataManager: TestDataManager;

  test.beforeEach(async () => {
    testDataManager = new TestDataManager();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  // Chrome特定功能测试
  test.describe('Chrome特定功能', () => {
    test('Chrome - DevTools协议支持', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', '仅在Chrome中运行');
      
      await page.goto('/');
      
      // 测试Performance API
      const performanceSupport = await page.evaluate(() => {
        return {
          performance: 'performance' in window,
          performanceObserver: 'PerformanceObserver' in window,
          performanceTiming: 'timing' in performance,
          performanceNavigation: 'navigation' in performance
        };
      });

      expect(performanceSupport.performance).toBe(true);
      expect(performanceSupport.performanceObserver).toBe(true);
      expect(performanceSupport.performanceTiming).toBe(true);
      expect(performanceSupport.performanceNavigation).toBe(true);
    });

    test('Chrome - 高级存储API', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', '仅在Chrome中运行');
      
      await page.goto('/');
      
      // 测试IndexedDB支持
      const storageSupport = await page.evaluate(async () => {
        const support = {
          indexedDB: 'indexedDB' in window,
          webSQL: 'openDatabase' in window,
          caches: 'caches' in window,
          storageEstimate: 'storage' in navigator && 'estimate' in navigator.storage
        };

        // 测试IndexedDB基本操作
        if (support.indexedDB) {
          try {
            const request = indexedDB.open('test-db', 1);
            await new Promise((resolve, reject) => {
              request.onsuccess = resolve;
              request.onerror = reject;
              request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                db.createObjectStore('test-store');
              };
            });
            support.indexedDB = true;
          } catch {
            support.indexedDB = false;
          }
        }

        return support;
      });

      expect(storageSupport.indexedDB).toBe(true);
      expect(storageSupport.caches).toBe(true);
      console.log('Chrome存储API支持:', storageSupport);
    });

    test('Chrome - WebRTC和媒体API', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', '仅在Chrome中运行');
      
      await page.goto('/analysis');
      
      const mediaSupport = await page.evaluate(() => {
        return {
          getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
          webRTC: 'RTCPeerConnection' in window,
          mediaRecorder: 'MediaRecorder' in window,
          imageCapture: 'ImageCapture' in window
        };
      });

      expect(mediaSupport.getUserMedia).toBe(true);
      expect(mediaSupport.webRTC).toBe(true);
      expect(mediaSupport.mediaRecorder).toBe(true);
      console.log('Chrome媒体API支持:', mediaSupport);
    });
  });

  // Firefox特定功能测试
  test.describe('Firefox特定功能', () => {
    test('Firefox - Gecko引擎特性', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', '仅在Firefox中运行');
      
      await page.goto('/');
      
      // 测试Firefox特有的CSS特性
      const firefoxFeatures = await page.evaluate(() => {
        const div = document.createElement('div');
        return {
          mozUserSelect: 'mozUserSelect' in div.style,
          mozTransform: 'mozTransform' in div.style,
          mozAppearance: 'mozAppearance' in div.style,
          scrollbarWidth: CSS.supports('scrollbar-width', 'thin')
        };
      });

      console.log('Firefox特有特性:', firefoxFeatures);
      
      // 测试Firefox的开发者工具API
      const devToolsSupport = await page.evaluate(() => {
        return {
          console: 'console' in window,
          consoleTable: 'table' in console,
          consoleGroup: 'group' in console
        };
      });

      expect(devToolsSupport.console).toBe(true);
      expect(devToolsSupport.consoleTable).toBe(true);
      expect(devToolsSupport.consoleGroup).toBe(true);
    });

    test('Firefox - 安全和隐私特性', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', '仅在Firefox中运行');
      
      await page.goto('/');
      
      // 测试Firefox的隐私保护特性
      const privacyFeatures = await page.evaluate(() => {
        return {
          doNotTrack: navigator.doNotTrack,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          hardwareConcurrency: navigator.hardwareConcurrency
        };
      });

      console.log('Firefox隐私特性:', privacyFeatures);
      expect(typeof privacyFeatures.cookieEnabled).toBe('boolean');
      expect(typeof privacyFeatures.onLine).toBe('boolean');
    });
  });

  // Safari特定功能测试
  test.describe('Safari特定功能', () => {
    test('Safari - WebKit引擎特性', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', '仅在Safari中运行');
      
      await page.goto('/');
      
      // 测试Safari特有的CSS前缀
      const webkitFeatures = await page.evaluate(() => {
        const div = document.createElement('div');
        return {
          webkitTransform: 'webkitTransform' in div.style,
          webkitTransition: 'webkitTransition' in div.style,
          webkitAnimation: 'webkitAnimation' in div.style,
          webkitAppearance: 'webkitAppearance' in div.style,
          webkitBackfaceVisibility: 'webkitBackfaceVisibility' in div.style
        };
      });

      console.log('Safari WebKit特性:', webkitFeatures);
      
      // 大多数现代Safari版本应该支持这些特性
      expect(webkitFeatures.webkitTransform).toBe(true);
      expect(webkitFeatures.webkitTransition).toBe(true);
    });

    test('Safari - iOS特定API检测', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', '仅在Safari中运行');
      
      await page.goto('/');
      
      const iosFeatures = await page.evaluate(() => {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        
        return {
          isIOS,
          touchEvents: 'ontouchstart' in window,
          deviceMotion: 'DeviceMotionEvent' in window,
          deviceOrientation: 'DeviceOrientationEvent' in window,
          standalone: 'standalone' in navigator,
          vibrate: 'vibrate' in navigator
        };
      });

      console.log('Safari iOS特性:', iosFeatures);
      
      // 这些特性在桌面Safari中可能不可用，这是正常的
      if (iosFeatures.isIOS) {
        expect(iosFeatures.touchEvents).toBe(true);
      }
    });
  });

  // Edge特定功能测试
  test.describe('Edge特定功能', () => {
    test('Edge - Chromium引擎兼容性', async ({ page, browserName }) => {
      // 注意：Playwright的Edge实际上使用的是Chromium引擎
      test.skip(browserName !== 'chromium', '仅在Edge中运行');
      
      await page.goto('/');
      
      const userAgent = await page.evaluate(() => navigator.userAgent);
      
      // 检查是否为Edge浏览器
      const isEdge = userAgent.includes('Edg/');
      
      if (isEdge) {
        console.log('检测到Edge浏览器');
        
        // 测试Edge特有的API
        const edgeFeatures = await page.evaluate(() => {
          return {
            msBrowser: 'msBrowser' in window,
            msCredentials: 'msCredentials' in navigator,
            webAuthentication: 'credentials' in navigator
          };
        });

        console.log('Edge特有特性:', edgeFeatures);
      }
    });
  });

  // 跨浏览器API兼容性矩阵测试
  test.describe('API兼容性矩阵', () => {
    test('Web API支持矩阵', async ({ page, browserName }) => {
      await page.goto('/');
      
      const apiMatrix = await page.evaluate(() => {
        const apis = {
          // 存储API
          localStorage: 'localStorage' in window,
          sessionStorage: 'sessionStorage' in window,
          indexedDB: 'indexedDB' in window,
          
          // 网络API
          fetch: 'fetch' in window,
          webSocket: 'WebSocket' in window,
          eventSource: 'EventSource' in window,
          
          // 媒体API
          getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
          webRTC: 'RTCPeerConnection' in window,
          audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
          
          // 图形API
          canvas: 'HTMLCanvasElement' in window,
          webGL: (() => {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          })(),
          
          // 文件API
          fileReader: 'FileReader' in window,
          blob: 'Blob' in window,
          formData: 'FormData' in window,
          
          // 现代JavaScript特性
          promises: 'Promise' in window,
          asyncAwait: (() => {
            try {
              eval('async function test() { await Promise.resolve(); }');
              return true;
            } catch {
              return false;
            }
          })(),
          modules: 'import' in document.createElement('script'),
          
          // PWA相关API
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
          notification: 'Notification' in window,
          
          // 设备API
          geolocation: 'geolocation' in navigator,
          deviceMotion: 'DeviceMotionEvent' in window,
          battery: 'getBattery' in navigator,
          
          // 性能API
          performance: 'performance' in window,
          performanceObserver: 'PerformanceObserver' in window,
          intersectionObserver: 'IntersectionObserver' in window
        };

        return apis;
      });

      console.log(`${browserName} API支持矩阵:`, apiMatrix);
      
      // 验证核心API支持
      expect(apiMatrix.localStorage).toBe(true);
      expect(apiMatrix.fetch).toBe(true);
      expect(apiMatrix.promises).toBe(true);
      expect(apiMatrix.canvas).toBe(true);
      expect(apiMatrix.fileReader).toBe(true);
      
      // 记录浏览器特定的API支持情况
      const supportedAPIs = Object.entries(apiMatrix)
        .filter(([, supported]) => supported)
        .map(([api]) => api);
      
      const unsupportedAPIs = Object.entries(apiMatrix)
        .filter(([, supported]) => !supported)
        .map(([api]) => api);
      
      console.log(`${browserName} 支持的API (${supportedAPIs.length}):`, supportedAPIs);
      console.log(`${browserName} 不支持的API (${unsupportedAPIs.length}):`, unsupportedAPIs);
    });
  });
});