import { devices, PlaywrightTestConfig } from '@playwright/test';

/**
 * 浏览器配置接口
 */
export interface BrowserConfig {
  name: string;
  use: any;
  testDir?: string;
  testIgnore?: string[];
  dependencies?: string[];
}

/**
 * 桌面浏览器配置
 */
export const desktopBrowsers: BrowserConfig[] = [
  {
    name: 'Desktop Chrome',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      launchOptions: {
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      }
    }
  },
  {
    name: 'Desktop Firefox',
    use: {
      ...devices['Desktop Firefox'],
      viewport: { width: 1920, height: 1080 },
      launchOptions: {
        firefoxUserPrefs: {
          'media.navigator.streams.fake': true,
          'media.navigator.permission.disabled': true
        }
      }
    }
  },
  {
    name: 'Desktop Safari',
    use: {
      ...devices['Desktop Safari'],
      viewport: { width: 1920, height: 1080 }
    }
  },
  {
    name: 'Desktop Edge',
    use: {
      ...devices['Desktop Edge'],
      viewport: { width: 1920, height: 1080 },
      channel: 'msedge'
    }
  }
];

/**
 * 移动端浏览器配置
 */
export const mobileBrowsers: BrowserConfig[] = [
  {
    name: 'Mobile Chrome',
    use: {
      ...devices['Pixel 5'],
      launchOptions: {
        args: [
          '--disable-web-security',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      }
    }
  },
  {
    name: 'Mobile Safari',
    use: {
      ...devices['iPhone 12']
    }
  },
  {
    name: 'Mobile Chrome Tablet',
    use: {
      ...devices['iPad Pro'],
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1'
    }
  },
  {
    name: 'Mobile Safari Tablet',
    use: {
      ...devices['iPad Pro']
    }
  }
];

/**
 * 特殊测试场景浏览器配置
 */
export const specialBrowsers: BrowserConfig[] = [
  {
    name: 'High DPI Desktop',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2
    }
  },
  {
    name: 'Low Resolution Desktop',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1366, height: 768 }
    }
  },
  {
    name: 'Ultra Wide Desktop',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 2560, height: 1440 }
    }
  },
  {
    name: 'Slow Network Chrome',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      launchOptions: {
        args: [
          '--disable-web-security',
          '--no-sandbox',
          '--throttling.cpuSlowdownMultiplier=4',
          '--throttling.requestLatencyMs=500'
        ]
      }
    }
  }
];

/**
 * 可访问性测试浏览器配置
 */
export const accessibilityBrowsers: BrowserConfig[] = [
  {
    name: 'Chrome with Screen Reader',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      launchOptions: {
        args: [
          '--force-renderer-accessibility',
          '--enable-accessibility-logging'
        ]
      }
    }
  },
  {
    name: 'High Contrast Mode',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      colorScheme: 'dark',
      reducedMotion: 'reduce'
    }
  }
];

/**
 * 性能测试浏览器配置
 */
export const performanceBrowsers: BrowserConfig[] = [
  {
    name: 'Performance Chrome',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      launchOptions: {
        args: [
          '--enable-precise-memory-info',
          '--enable-memory-info',
          '--js-flags=--expose-gc'
        ]
      }
    }
  },
  {
    name: 'Performance Mobile',
    use: {
      ...devices['Pixel 5'],
      launchOptions: {
        args: [
          '--enable-precise-memory-info',
          '--enable-memory-info'
        ]
      }
    }
  }
];

/**
 * 根据环境获取浏览器配置
 */
export function getBrowserConfigsForEnvironment(environment: string): BrowserConfig[] {
  switch (environment) {
    case 'development':
      return [
        desktopBrowsers[0], // Chrome only for development
        mobileBrowsers[0]   // Mobile Chrome
      ];
    
    case 'test':
      return [
        ...desktopBrowsers.slice(0, 2), // Chrome and Firefox
        ...mobileBrowsers.slice(0, 2)   // Mobile Chrome and Safari
      ];
    
    case 'ci':
      return [
        desktopBrowsers[0], // Chrome only for CI speed
        mobileBrowsers[0]   // Mobile Chrome
      ];
    
    case 'staging':
      return [
        ...desktopBrowsers,
        ...mobileBrowsers
      ];
    
    case 'performance':
      return performanceBrowsers;
    
    case 'accessibility':
      return accessibilityBrowsers;
    
    case 'visual':
      return [
        desktopBrowsers[0],
        mobileBrowsers[0],
        specialBrowsers[1] // Low resolution
      ];
    
    default:
      return desktopBrowsers;
  }
}

/**
 * 测试套件特定的浏览器配置
 */
export const testSuiteBrowserConfigs: Record<string, BrowserConfig[]> = {
  auth: [
    desktopBrowsers[0],
    mobileBrowsers[0]
  ],
  pets: [
    desktopBrowsers[0],
    desktopBrowsers[1],
    mobileBrowsers[0]
  ],
  analysis: [
    ...desktopBrowsers.slice(0, 2),
    ...mobileBrowsers.slice(0, 2)
  ],
  community: [
    desktopBrowsers[0],
    mobileBrowsers[0]
  ],
  performance: performanceBrowsers,
  accessibility: accessibilityBrowsers,
  visual: [
    desktopBrowsers[0],
    mobileBrowsers[0],
    specialBrowsers[0], // High DPI
    specialBrowsers[1]  // Low Resolution
  ]
};

/**
 * 获取测试套件的浏览器配置
 */
export function getBrowserConfigsForTestSuite(testSuite: string): BrowserConfig[] {
  return testSuiteBrowserConfigs[testSuite] || [desktopBrowsers[0]];
}

/**
 * 浏览器特定的测试配置
 */
export interface BrowserTestConfig {
  timeout: number;
  retries: number;
  screenshot: 'off' | 'on' | 'only-on-failure';
  video: 'off' | 'on' | 'retain-on-failure';
  trace: 'off' | 'on' | 'retain-on-failure';
}

/**
 * 各浏览器的测试配置
 */
export const browserTestConfigs: Record<string, BrowserTestConfig> = {
  'Desktop Chrome': {
    timeout: 30000,
    retries: 2,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  'Desktop Firefox': {
    timeout: 45000, // Firefox通常较慢
    retries: 3,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  'Desktop Safari': {
    timeout: 45000,
    retries: 3,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  'Mobile Chrome': {
    timeout: 45000, // 移动端通常较慢
    retries: 3,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  'Mobile Safari': {
    timeout: 60000, // iOS Safari最慢
    retries: 3,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  }
};

/**
 * 获取浏览器特定的测试配置
 */
export function getBrowserTestConfig(browserName: string): BrowserTestConfig {
  return browserTestConfigs[browserName] || browserTestConfigs['Desktop Chrome'];
}

/**
 * 创建完整的Playwright项目配置
 */
export function createPlaywrightProjects(
  browsers: BrowserConfig[],
  baseConfig: Partial<PlaywrightTestConfig> = {}
): any[] {
  return browsers.map(browser => ({
    name: browser.name,
    use: browser.use,
    testDir: browser.testDir,
    testIgnore: browser.testIgnore,
    dependencies: browser.dependencies,
    ...getBrowserTestConfig(browser.name),
    ...baseConfig
  }));
}

/**
 * 默认浏览器配置（用于快速测试）
 */
export const defaultBrowserConfig: BrowserConfig = desktopBrowsers[0];

/**
 * 完整浏览器配置（用于完整测试）
 */
export const fullBrowserConfigs: BrowserConfig[] = [
  ...desktopBrowsers,
  ...mobileBrowsers
];

/**
 * 最小浏览器配置（用于快速验证）
 */
export const minimalBrowserConfigs: BrowserConfig[] = [
  desktopBrowsers[0], // Chrome
  mobileBrowsers[0]   // Mobile Chrome
];