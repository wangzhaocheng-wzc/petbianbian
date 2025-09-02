// E2E测试配置
export const testConfig = {
  // 测试用户账户
  testUsers: {
    regular: {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    },
    admin: {
      email: 'admin@example.com',
      password: 'admin123',
      username: 'admin'
    }
  },
  
  // 测试数据
  testData: {
    pets: [
      {
        name: '小白',
        type: 'dog',
        breed: '金毛',
        gender: 'male',
        age: 24,
        weight: 25.5,
        description: '一只可爱的金毛犬'
      },
      {
        name: '小黑',
        type: 'cat',
        breed: '英短',
        gender: 'female',
        age: 18,
        weight: 4.2,
        description: '一只温顺的英短猫'
      }
    ],
    
    posts: [
      {
        title: '分享我家狗狗的健康经验',
        content: '经过一年的观察，我总结了一些关于狗狗健康的经验...',
        category: 'health',
        tags: ['健康', '经验分享', '狗狗']
      },
      {
        title: '求助：猫咪最近食欲不振',
        content: '我家猫咪最近几天食欲不太好，想请教大家有什么建议...',
        category: 'help',
        tags: ['求助', '猫咪', '食欲']
      }
    ]
  },
  
  // 性能基准
  performanceBenchmarks: {
    pageLoadTime: 3000, // 页面加载时间（毫秒）
    apiResponseTime: 1000, // API响应时间（毫秒）
    firstContentfulPaint: 1500, // FCP时间（毫秒）
    memoryGrowthLimit: 50, // 内存增长限制（MB）
  },
  
  // 超时设置
  timeouts: {
    default: 30000, // 默认超时30秒
    analysis: 60000, // 分析超时60秒
    upload: 45000, // 上传超时45秒
  },
  
  // 测试环境URL
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  apiURL: process.env.E2E_API_URL || 'http://localhost:5000',
  
  // 测试文件路径
  fixtures: {
    testPoop: './fixtures/test-poop.jpg',
    petPhoto: './fixtures/pet-photo.jpg',
    largeImage: './fixtures/large-image.jpg',
    invalidFile: './fixtures/test-document.pdf'
  }
};

// 测试工具函数
export const testUtils = {
  // 生成唯一的测试数据
  generateUniqueData: (prefix: string) => ({
    timestamp: Date.now(),
    id: `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }),
  
  // 等待元素出现
  waitForElement: async (page: any, selector: string, timeout = 10000) => {
    await page.waitForSelector(selector, { timeout });
  },
  
  // 清理测试数据
  cleanupTestData: async (page: any) => {
    // 清理测试创建的数据
    console.log('清理测试数据...');
  },
  
  // 模拟网络延迟
  simulateNetworkDelay: async (page: any, delay = 100) => {
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });
  }
};