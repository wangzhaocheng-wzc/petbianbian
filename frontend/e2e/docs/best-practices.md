# Playwright测试最佳实践

## 测试设计原则

### 1. 测试金字塔原则

```
    /\     E2E Tests (少量)
   /  \    
  /____\   Integration Tests (适量)
 /______\  Unit Tests (大量)
```

- **单元测试**：测试单个函数或组件
- **集成测试**：测试模块间的交互
- **E2E测试**：测试完整的用户流程

### 2. 独立性原则

每个测试应该：
- 独立运行，不依赖其他测试
- 有自己的测试数据
- 清理自己创建的资源

```typescript
// ✅ 好的做法
test.beforeEach(async ({ page }) => {
  const dataManager = new TestDataManager(page);
  await dataManager.createTestUser();
});

test.afterEach(async ({ page }) => {
  const dataManager = new TestDataManager(page);
  await dataManager.cleanup();
});

// ❌ 避免的做法
test('创建用户', async ({ page }) => {
  // 创建用户，但不清理
});

test('编辑用户', async ({ page }) => {
  // 依赖上一个测试创建的用户
});
```

### 3. 可读性原则

测试代码应该像文档一样清晰：

```typescript
// ✅ 清晰的测试描述
test.describe('宠物管理功能', () => {
  test('用户可以成功添加新宠物', async ({ page }) => {
    // Given: 用户已登录
    const authPage = new AuthPage(page);
    await authPage.login('test@example.com', 'password123');
    
    // When: 用户添加新宠物
    const petsPage = new PetsPage(page);
    await petsPage.addPet({
      name: '小白',
      type: 'dog',
      breed: '金毛',
      age: 2
    });
    
    // Then: 宠物成功添加到列表
    await expect(petsPage.getPetByName('小白')).toBeVisible();
  });
});
```

## 选择器最佳实践

### 1. 选择器优先级

1. **data-testid** (最推荐)
2. **role + name**
3. **label text**
4. **placeholder text**
5. **CSS选择器** (最后选择)

```typescript
// ✅ 推荐：使用data-testid
await page.click('[data-testid="submit-button"]');

// ✅ 推荐：使用role和accessible name
await page.click('button[role="button"][name="提交"]');

// ✅ 可以：使用文本内容
await page.click('text=提交');

// ❌ 避免：使用脆弱的CSS选择器
await page.click('.btn.btn-primary.submit-btn');
```

### 2. 选择器稳定性

```typescript
// ✅ 稳定的选择器
const stableSelectors = {
  // 使用语义化的测试ID
  loginButton: '[data-testid="login-button"]',
  
  // 使用ARIA角色
  navigation: '[role="navigation"]',
  
  // 使用表单标签
  emailInput: 'input[name="email"]'
};

// ❌ 不稳定的选择器
const unstableSelectors = {
  // 依赖样式类名
  button: '.btn-primary.large.rounded',
  
  // 依赖DOM结构
  input: 'div > div > form > input:nth-child(2)',
  
  // 依赖动态内容
  userCount: 'span:contains("用户数量: 123")'
};
```

## 等待策略

### 1. 智能等待 vs 硬编码等待

```typescript
// ✅ 使用智能等待
await expect(page.locator('[data-testid="result"]')).toBeVisible();
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });

// ❌ 避免硬编码等待
await page.waitForTimeout(5000); // 不可预测，可能过长或过短
```

### 2. 等待网络请求

```typescript
// ✅ 等待特定API请求
const responsePromise = page.waitForResponse(response => 
  response.url().includes('/api/pets') && response.status() === 200
);

await page.click('[data-testid="load-pets"]');
await responsePromise;

// ✅ 等待所有网络请求完成
await page.waitForLoadState('networkidle');
```

### 3. 等待元素状态

```typescript
// 等待元素可见
await page.waitForSelector('[data-testid="modal"]', { state: 'visible' });

// 等待元素隐藏
await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });

// 等待元素可交互
await page.waitForSelector('[data-testid="button"]', { state: 'attached' });
```

## 测试数据管理

### 1. 测试数据隔离

```typescript
class TestDataManager {
  private testId: string;
  
  constructor() {
    this.testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async createTestUser(): Promise<TestUser> {
    return {
      email: `user-${this.testId}@example.com`,
      username: `user-${this.testId}`,
      password: 'TestPassword123!'
    };
  }
  
  async createTestPet(): Promise<TestPet> {
    return {
      name: `Pet-${this.testId}`,
      type: 'dog',
      breed: '测试品种',
      age: 2
    };
  }
}
```

### 2. 测试数据清理

```typescript
test.afterEach(async ({ page }) => {
  // 清理UI状态
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // 清理测试数据
  const dataManager = new TestDataManager(page);
  await dataManager.cleanup();
});

test.afterAll(async () => {
  // 清理数据库
  await cleanupTestDatabase();
});
```

### 3. 使用Fixtures

```typescript
// fixtures/test-data.json
{
  "users": [
    {
      "email": "test1@example.com",
      "password": "password123",
      "role": "user"
    },
    {
      "email": "admin@example.com", 
      "password": "admin123",
      "role": "admin"
    }
  ],
  "pets": [
    {
      "name": "测试宠物1",
      "type": "dog",
      "breed": "金毛",
      "age": 3
    }
  ]
}
```

## 错误处理和调试

### 1. 错误信息优化

```typescript
// ✅ 提供有用的错误信息
test('用户登录', async ({ page }) => {
  const authPage = new AuthPage(page);
  
  try {
    await authPage.login('invalid@email.com', 'wrongpassword');
    throw new Error('登录应该失败但却成功了');
  } catch (error) {
    // 验证错误消息
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('邮箱或密码错误');
  }
});

// ✅ 添加调试信息
test('分析流程', async ({ page }) => {
  console.log('开始分析流程测试');
  
  const analysisPage = new AnalysisPage(page);
  await analysisPage.uploadImage('test-image.jpg');
  
  console.log('图片上传完成，等待分析结果');
  const result = await analysisPage.waitForAnalysisResult();
  
  console.log('分析结果:', result);
  expect(result.status).toBe('completed');
});
```

### 2. 截图和录制

```typescript
test('失败时自动截图', async ({ page }) => {
  try {
    // 测试逻辑
    await page.click('[data-testid="non-existent-button"]');
  } catch (error) {
    // 失败时截图
    await page.screenshot({ 
      path: `screenshots/failure-${Date.now()}.png`,
      fullPage: true 
    });
    throw error;
  }
});

// 配置自动截图
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  }
});
```

### 3. 调试技巧

```typescript
// 暂停执行进行调试
test('调试测试', async ({ page }) => {
  await page.goto('/pets');
  
  // 暂停执行，打开浏览器开发者工具
  await page.pause();
  
  // 继续执行后续步骤
  await page.click('[data-testid="add-pet"]');
});

// 添加断点
test('断点调试', async ({ page }) => {
  await page.goto('/pets');
  
  // 在浏览器中设置断点
  await page.evaluate(() => debugger);
  
  await page.click('[data-testid="add-pet"]');
});
```

## 性能优化

### 1. 并行执行

```typescript
// playwright.config.ts
export default defineConfig({
  // 设置并行工作进程数
  workers: process.env.CI ? 2 : 4,
  
  // 启用完全并行
  fullyParallel: true,
  
  // 项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] }
    }
  ]
});
```

### 2. 测试分组

```typescript
// 快速冒烟测试
test.describe('冒烟测试 @smoke', () => {
  test('首页加载', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});

// 完整回归测试
test.describe('回归测试 @regression', () => {
  test('完整用户流程', async ({ page }) => {
    // 完整的端到端测试
  });
});

// 运行特定分组
// npx playwright test --grep "@smoke"
```

### 3. 资源优化

```typescript
// 禁用不必要的资源
test.beforeEach(async ({ page }) => {
  // 阻止图片加载以提高速度
  await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => route.abort());
  
  // 阻止字体加载
  await page.route('**/*.{woff,woff2,ttf,otf}', route => route.abort());
  
  // 阻止分析脚本
  await page.route('**/analytics.js', route => route.abort());
});
```

## 可维护性

### 1. 页面对象模式

```typescript
// ✅ 良好的页面对象设计
export class PetsPage extends BasePage {
  // 私有选择器
  private readonly addPetButton = '[data-testid="add-pet-button"]';
  private readonly petList = '[data-testid="pet-list"]';
  private readonly petForm = '[data-testid="pet-form"]';
  
  // 公共方法
  async addPet(petData: PetData): Promise<void> {
    await this.page.click(this.addPetButton);
    await this.fillPetForm(petData);
    await this.submitForm();
  }
  
  // 私有辅助方法
  private async fillPetForm(petData: PetData): Promise<void> {
    await this.page.fill('[name="name"]', petData.name);
    await this.page.selectOption('[name="type"]', petData.type);
    await this.page.fill('[name="breed"]', petData.breed);
  }
  
  private async submitForm(): Promise<void> {
    await this.page.click('[data-testid="submit-button"]');
    await this.waitForNavigation();
  }
}
```

### 2. 代码复用

```typescript
// 创建可复用的测试步骤
export class TestSteps {
  static async loginAsUser(page: Page, userType: 'regular' | 'admin' = 'regular') {
    const authPage = new AuthPage(page);
    const userData = userType === 'admin' 
      ? { email: 'admin@example.com', password: 'admin123' }
      : { email: 'user@example.com', password: 'user123' };
    
    await authPage.login(userData.email, userData.password);
    await expect(authPage.getUserMenu()).toBeVisible();
  }
  
  static async createPetWithAnalysis(page: Page, petData: PetData) {
    // 创建宠物
    const petsPage = new PetsPage(page);
    await petsPage.addPet(petData);
    
    // 进行分析
    const analysisPage = new AnalysisPage(page);
    await analysisPage.uploadImage('test-poop.jpg');
    await analysisPage.selectPet(petData.name);
    await analysisPage.startAnalysis();
    
    return await analysisPage.waitForResult();
  }
}

// 在测试中使用
test('宠物分析流程', async ({ page }) => {
  await TestSteps.loginAsUser(page);
  const result = await TestSteps.createPetWithAnalysis(page, {
    name: '测试宠物',
    type: 'dog',
    breed: '金毛'
  });
  
  expect(result.status).toBe('completed');
});
```

### 3. 配置管理

```typescript
// config/test-config.ts
export const TestConfig = {
  timeouts: {
    default: 30000,
    navigation: 10000,
    api: 5000
  },
  
  urls: {
    base: process.env.BASE_URL || 'http://localhost:3000',
    api: process.env.API_URL || 'http://localhost:5000'
  },
  
  users: {
    regular: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123'
    },
    admin: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com', 
      password: process.env.ADMIN_PASSWORD || 'admin123'
    }
  }
};
```

## 团队协作

### 1. 代码审查清单

- [ ] 测试名称清晰描述测试内容
- [ ] 使用了稳定的选择器
- [ ] 包含适当的等待策略
- [ ] 测试数据独立且会被清理
- [ ] 错误处理得当
- [ ] 代码遵循项目规范

### 2. 文档规范

```typescript
/**
 * 测试宠物管理的完整流程
 * 
 * 前置条件：
 * - 用户已注册并登录
 * - 数据库为空状态
 * 
 * 测试步骤：
 * 1. 导航到宠物管理页面
 * 2. 点击添加宠物按钮
 * 3. 填写宠物信息表单
 * 4. 提交表单
 * 5. 验证宠物出现在列表中
 * 
 * 预期结果：
 * - 宠物成功添加到列表
 * - 显示成功提示消息
 * - 表单重置为空状态
 */
test('完整宠物管理流程', async ({ page }) => {
  // 测试实现
});
```

### 3. 持续改进

```typescript
// 测试质量指标收集
class TestMetrics {
  static async collectMetrics(testResult: TestResult) {
    return {
      duration: testResult.duration,
      status: testResult.status,
      retries: testResult.retry,
      screenshots: testResult.attachments.filter(a => a.name === 'screenshot').length,
      errors: testResult.errors
    };
  }
  
  static async generateReport(metrics: TestMetrics[]) {
    const report = {
      totalTests: metrics.length,
      passRate: metrics.filter(m => m.status === 'passed').length / metrics.length,
      avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      flakyTests: metrics.filter(m => m.retries > 0).length
    };
    
    console.log('测试质量报告:', report);
    return report;
  }
}
```

## 常见陷阱和解决方案

### 1. 时序问题

```typescript
// ❌ 问题：没有等待异步操作完成
test('错误的异步处理', async ({ page }) => {
  await page.click('[data-testid="submit"]');
  // 立即检查结果，可能还没有完成
  expect(await page.textContent('[data-testid="result"]')).toBe('成功');
});

// ✅ 解决：正确等待异步操作
test('正确的异步处理', async ({ page }) => {
  await page.click('[data-testid="submit"]');
  // 等待结果出现
  await expect(page.locator('[data-testid="result"]')).toHaveText('成功');
});
```

### 2. 测试依赖

```typescript
// ❌ 问题：测试之间有依赖关系
let userId: string;

test('创建用户', async ({ page }) => {
  // 创建用户并保存ID
  userId = await createUser();
});

test('编辑用户', async ({ page }) => {
  // 依赖上一个测试的userId
  await editUser(userId);
});

// ✅ 解决：每个测试独立
test('编辑用户', async ({ page }) => {
  // 在测试内部创建所需数据
  const userId = await createUser();
  await editUser(userId);
  // 清理数据
  await deleteUser(userId);
});
```

### 3. 脆弱的选择器

```typescript
// ❌ 问题：依赖不稳定的选择器
await page.click('.btn.btn-primary:nth-child(2)');

// ✅ 解决：使用稳定的选择器
await page.click('[data-testid="submit-button"]');

// 或者使用语义化选择器
await page.click('button:has-text("提交")');
```

通过遵循这些最佳实践，你可以编写出更加稳定、可维护和高效的Playwright测试。