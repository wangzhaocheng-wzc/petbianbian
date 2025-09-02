import { test, expect } from '@playwright/test';

// 浏览器版本兼容性测试矩阵
test.describe('浏览器版本兼容性测试矩阵', () => {
  
  // 定义支持的浏览器版本范围
  const browserVersionRequirements = {
    chrome: { min: 90, recommended: 120 },
    firefox: { min: 88, recommended: 115 },
    safari: { min: 14, recommended: 16 },
    edge: { min: 90, recommended: 120 }
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('检测当前浏览器版本', async ({ page, browserName }) => {
    const browserInfo = await page.evaluate(() => {
      const ua = navigator.userAgent;
      let browserName = 'unknown';
      let version = 'unknown';

      // Chrome检测
      const chromeMatch = ua.match(/Chrome\/(\d+)/);
      if (chromeMatch && !ua.includes('Edg/')) {
        browserName = 'chrome';
        version = chromeMatch[1];
      }

      // Firefox检测
      const firefoxMatch = ua.match(/Firefox\/(\d+)/);
      if (firefoxMatch) {
        browserName = 'firefox';
        version = firefoxMatch[1];
      }

      // Safari检测
      const safariMatch = ua.match(/Version\/(\d+).*Safari/);
      if (safariMatch && ua.includes('Safari') && !ua.includes('Chrome')) {
        browserName = 'safari';
        version = safariMatch[1];
      }

      // Edge检测
      const edgeMatch = ua.match(/Edg\/(\d+)/);
      if (edgeMatch) {
        browserName = 'edge';
        version = edgeMatch[1];
      }

      return {
        detectedBrowser: browserName,
        version: parseInt(version),
        userAgent: ua,
        playwrightBrowser: '${browserName}' // 这将被替换为实际的browserName
      };
    });

    console.log('浏览器信息:', browserInfo);
    
    // 验证版本信息
    expect(browserInfo.detectedBrowser).toBeTruthy();
    expect(browserInfo.version).toBeGreaterThan(0);
    
    // 检查版本兼容性
    const requirements = browserVersionRequirements[browserInfo.detectedBrowser as keyof typeof browserVersionRequirements];
    if (requirements) {
      const isSupported = browserInfo.version >= requirements.min;
      const isRecommended = browserInfo.version >= requirements.recommended;
      
      console.log(`版本兼容性检查:
        - 浏览器: ${browserInfo.detectedBrowser}
        - 当前版本: ${browserInfo.version}
        - 最低要求: ${requirements.min}
        - 推荐版本: ${requirements.recommended}
        - 是否支持: ${isSupported}
        - 是否推荐: ${isRecommended}`);
      
      expect(isSupported).toBe(true);
    }
  });

  test('验证现代JavaScript特性支持', async ({ page }) => {
    const jsFeatureSupport = await page.evaluate(() => {
      const features = {
        // ES6特性
        arrowFunctions: (() => {
          try {
            eval('(() => {})');
            return true;
          } catch { return false; }
        })(),
        
        classes: (() => {
          try {
            eval('class Test {}');
            return true;
          } catch { return false; }
        })(),
        
        templateLiterals: (() => {
          try {
            eval('`template ${1} literal`');
            return true;
          } catch { return false; }
        })(),
        
        destructuring: (() => {
          try {
            eval('const [a, b] = [1, 2]; const {x, y} = {x: 1, y: 2};');
            return true;
          } catch { return false; }
        })(),
        
        // ES2017特性
        asyncAwait: (() => {
          try {
            eval('async function test() { await Promise.resolve(); }');
            return true;
          } catch { return false; }
        })(),
        
        // ES2018特性
        objectSpread: (() => {
          try {
            eval('const obj = {...{a: 1}};');
            return true;
          } catch { return false; }
        })(),
        
        // ES2019特性
        optionalCatch: (() => {
          try {
            eval('try {} catch {}');
            return true;
          } catch { return false; }
        })(),
        
        // ES2020特性
        optionalChaining: (() => {
          try {
            eval('const obj = {}; obj?.prop?.subprop;');
            return true;
          } catch { return false; }
        })(),
        
        nullishCoalescing: (() => {
          try {
            eval('const value = null ?? "default";');
            return true;
          } catch { return false; }
        })(),
        
        // ES2021特性
        logicalAssignment: (() => {
          try {
            eval('let a = 1; a ||= 2; a &&= 3; a ??= 4;');
            return true;
          } catch { return false; }
        })(),
        
        // 模块支持
        modules: 'import' in document.createElement('script'),
        
        // 其他现代特性
        promises: 'Promise' in window,
        symbols: 'Symbol' in window,
        maps: 'Map' in window,
        sets: 'Set' in window,
        weakMaps: 'WeakMap' in window,
        weakSets: 'WeakSet' in window,
        proxy: 'Proxy' in window,
        reflect: 'Reflect' in window
      };

      return features;
    });

    console.log('JavaScript特性支持情况:', jsFeatureSupport);
    
    // 验证核心现代特性
    expect(jsFeatureSupport.arrowFunctions).toBe(true);
    expect(jsFeatureSupport.classes).toBe(true);
    expect(jsFeatureSupport.promises).toBe(true);
    expect(jsFeatureSupport.asyncAwait).toBe(true);
    
    // 统计支持的特性
    const supportedFeatures = Object.values(jsFeatureSupport).filter(Boolean).length;
    const totalFeatures = Object.keys(jsFeatureSupport).length;
    const supportPercentage = (supportedFeatures / totalFeatures) * 100;
    
    console.log(`JavaScript特性支持率: ${supportPercentage.toFixed(1)}% (${supportedFeatures}/${totalFeatures})`);
    
    // 现代浏览器应该支持至少80%的特性
    expect(supportPercentage).toBeGreaterThan(80);
  });

  test('验证CSS特性支持', async ({ page }) => {
    const cssFeatureSupport = await page.evaluate(() => {
      const testCSS = (property: string, value: string) => {
        try {
          return CSS.supports(property, value);
        } catch {
          return false;
        }
      };

      return {
        // 布局特性
        flexbox: testCSS('display', 'flex'),
        grid: testCSS('display', 'grid'),
        
        // 变换和动画
        transforms: testCSS('transform', 'translateX(0)'),
        transitions: testCSS('transition', 'all 0.3s'),
        animations: testCSS('animation', 'test 1s'),
        
        // 现代CSS特性
        customProperties: testCSS('--test', '1'),
        calc: testCSS('width', 'calc(100% - 10px)'),
        
        // 视觉效果
        borderRadius: testCSS('border-radius', '5px'),
        boxShadow: testCSS('box-shadow', '0 0 5px rgba(0,0,0,0.1)'),
        gradients: testCSS('background', 'linear-gradient(to right, red, blue)'),
        
        // 响应式特性
        mediaQueries: testCSS('@media', 'screen'),
        viewport: testCSS('width', '100vw'),
        
        // 文字特性
        webFonts: testCSS('font-family', 'Arial'),
        textShadow: testCSS('text-shadow', '1px 1px 1px black'),
        
        // 现代布局
        objectFit: testCSS('object-fit', 'cover'),
        aspectRatio: testCSS('aspect-ratio', '16/9'),
        
        // 滤镜和混合
        filters: testCSS('filter', 'blur(5px)'),
        mixBlendMode: testCSS('mix-blend-mode', 'multiply'),
        
        // 容器查询（较新特性）
        containerQueries: testCSS('@container', '(min-width: 300px)'),
        
        // 逻辑属性
        logicalProperties: testCSS('margin-inline-start', '10px')
      };
    });

    console.log('CSS特性支持情况:', cssFeatureSupport);
    
    // 验证核心CSS特性
    expect(cssFeatureSupport.flexbox).toBe(true);
    expect(cssFeatureSupport.transforms).toBe(true);
    expect(cssFeatureSupport.transitions).toBe(true);
    expect(cssFeatureSupport.borderRadius).toBe(true);
    expect(cssFeatureSupport.boxShadow).toBe(true);
    
    // 统计支持的CSS特性
    const supportedFeatures = Object.values(cssFeatureSupport).filter(Boolean).length;
    const totalFeatures = Object.keys(cssFeatureSupport).length;
    const supportPercentage = (supportedFeatures / totalFeatures) * 100;
    
    console.log(`CSS特性支持率: ${supportPercentage.toFixed(1)}% (${supportedFeatures}/${totalFeatures})`);
    
    // 现代浏览器应该支持至少70%的CSS特性
    expect(supportPercentage).toBeGreaterThan(70);
  });

  test('验证Web API支持', async ({ page }) => {
    const webAPISupport = await page.evaluate(() => {
      return {
        // 存储API
        localStorage: 'localStorage' in window,
        sessionStorage: 'sessionStorage' in window,
        indexedDB: 'indexedDB' in window,
        
        // 网络API
        fetch: 'fetch' in window,
        webSocket: 'WebSocket' in window,
        eventSource: 'EventSource' in window,
        
        // 文件API
        fileReader: 'FileReader' in window,
        blob: 'Blob' in window,
        formData: 'FormData' in window,
        
        // 媒体API
        getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        webRTC: 'RTCPeerConnection' in window,
        audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
        
        // 图形API
        canvas: 'HTMLCanvasElement' in window,
        webGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch {
            return false;
          }
        })(),
        
        // 性能API
        performance: 'performance' in window,
        performanceObserver: 'PerformanceObserver' in window,
        intersectionObserver: 'IntersectionObserver' in window,
        resizeObserver: 'ResizeObserver' in window,
        
        // PWA API
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notification: 'Notification' in window,
        
        // 设备API
        geolocation: 'geolocation' in navigator,
        deviceMotion: 'DeviceMotionEvent' in window,
        deviceOrientation: 'DeviceOrientationEvent' in window,
        
        // 安全API
        crypto: 'crypto' in window && 'subtle' in crypto,
        
        // 现代API
        broadcastChannel: 'BroadcastChannel' in window,
        messageChannel: 'MessageChannel' in window,
        sharedWorker: 'SharedWorker' in window,
        
        // 实验性API
        webAssembly: 'WebAssembly' in window,
        webXR: 'xr' in navigator
      };
    });

    console.log('Web API支持情况:', webAPISupport);
    
    // 验证核心Web API
    expect(webAPISupport.localStorage).toBe(true);
    expect(webAPISupport.fetch).toBe(true);
    expect(webAPISupport.fileReader).toBe(true);
    expect(webAPISupport.canvas).toBe(true);
    expect(webAPISupport.performance).toBe(true);
    
    // 统计API支持情况
    const supportedAPIs = Object.values(webAPISupport).filter(Boolean).length;
    const totalAPIs = Object.keys(webAPISupport).length;
    const supportPercentage = (supportedAPIs / totalAPIs) * 100;
    
    console.log(`Web API支持率: ${supportPercentage.toFixed(1)}% (${supportedAPIs}/${totalAPIs})`);
    
    // 现代浏览器应该支持至少60%的Web API
    expect(supportPercentage).toBeGreaterThan(60);
  });

  test('生成浏览器兼容性报告', async ({ page, browserName }) => {
    const compatibilityReport = await page.evaluate(() => {
      // 获取浏览器信息
      const ua = navigator.userAgent;
      const browserInfo = {
        userAgent: ua,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency
      };

      // 获取屏幕信息
      const screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      };

      // 获取窗口信息
      const windowInfo = {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      };

      return {
        timestamp: new Date().toISOString(),
        browser: browserInfo,
        screen: screenInfo,
        window: windowInfo
      };
    });

    console.log(`${browserName} 兼容性报告:`, JSON.stringify(compatibilityReport, null, 2));
    
    // 验证报告完整性
    expect(compatibilityReport.browser.userAgent).toBeTruthy();
    expect(compatibilityReport.screen.width).toBeGreaterThan(0);
    expect(compatibilityReport.window.innerWidth).toBeGreaterThan(0);
    
    // 保存报告到测试结果中
    test.info().attach(`${browserName}-compatibility-report.json`, {
      body: JSON.stringify(compatibilityReport, null, 2),
      contentType: 'application/json'
    });
  });
});