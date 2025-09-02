# Playwright测试框架使用指南

## 概述

本指南详细介绍了如何使用我们的Playwright测试框架进行端到端测试。框架基于页面对象模式设计，提供了丰富的测试工具和最佳实践。

## 快速开始

### 环境准备

```bash
# 安装依赖
cd frontend
npm install

# 安装Playwright浏览器
npx playwright install

# 运行测试
npm run test:e2e
```

### 基本测试结构

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';

test.describe('用户认证测试', () => {
  test('用户登录成功', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    await authPage.goToLogin();
    await authPage.login('test@example.com', 'password123');
    
    expect(await authPage.isLoggedIn()).toBe(true);
  });
});
```

## 框架架构

### 目录结构

```
frontend/e2e/
├── config/                 # 配置文件
│   ├── browser-configs.ts  # 浏览器配置
│   └── test-environments.ts # 环境配置
├── fixtures/               # 测试数据
│   ├── test-data.json     # 基础测试数据
│   └── mock-responses.json # API模拟响应
├── page-objects/          # 页面对象
│   ├── auth-page.ts       # 认证页面
│   ├── pets-page.ts       # 宠物管理页面
│   └── analysis-page.ts   # 分析页面
├── specs/                 # 测试规范
│   ├── auth/             # 认证测试
│   ├── pets/             # 宠物管理测试
│   └── analysis/         # 分析功能测试
└── utils/                # 工具函数
    ├── test-setup.ts     # 测试设置
    └── test-data-manager.ts # 数据管理
```

### 核心组件

#### 1. 页面对象 (Page Objects)

页面对象封装了页面元素和操作，提供了清晰的API接口：

```typescript
export class AuthPage extends BasePage {
  // 页面元素
  private emailInput = this.page.locator('[data-testid="email-input"]');
  private passwordInput = this.page.locator('[data-testid="password-input"]');
  private loginButton = this.page.locator('[data-testid="login-button"]');

  // 页面操作
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForNavigation();
  }

  // 状态验证
  async isLoggedIn(): Promise<boolean> {
    return await this.page.locator('[data-testid="user-menu"]').isVisible();
  }
}
```

#### 2. 测试数据管理

使用TestDataManager管理测试数据的生命周期：

```typescript
import { TestDataManager } from '../utils/test-data-manager';

test.beforeEach(async ({ page }) => {
  const dataManager = new TestDataManager(page);
  await dataManager.createTestUser();
  await dataManager.createTestPet();
});

test.afterEach(async ({ page }) => {
  const dataManager = new TestDataManager(page);
  await dataManager.cleanup();
});
```

#### 3. API模拟

使用APIMocker模拟API响应：

```typescript
import { APIMocker } from '../utils/api-mocker';

test('处理分析API错误', async ({ page }) => {
  const apiMocker = new APIMocker(page);
  await apiMocker.mockAnalysisAPI({ error: '分析服务暂时不可用' });
  
  // 执行测试...
});
```

## 编写测试用例

### 测试命名规范

- 测试文件：`功能模块.spec.ts`
- 测试套件：`功能模块测试`
- 测试用例：`具体操作或场景`

```typescript
test.describe('宠物管理测试', () => {
  test('添加新宠物成功', async ({ page }) => {
    // 测试实现
  });
  
  test('编辑宠物信息', async ({ page }) => {
    // 测试实现
  });
  
  test('删除宠物确认', async ({ page }) => {
    // 测试实现
  });
});
```

### 断言最佳实践

```typescript
// ✅ 好的断言
expect(await page.locator('[data-testid="success-message"]').textContent())
  .toBe('宠物添加成功');

// ✅ 等待元素出现
await expect(page.locator('[data-testid="pet-list"]')).toBeVisible();

// ✅ 检查元素数量
await expect(page.locator('[data-testid="pet-item"]')).toHaveCount(3);

// ❌ 避免硬编码等待
await page.waitForTimeout(5000); // 不推荐
```

### 错误处理

```typescript
test('处理网络错误', async ({ page }) => {
  // 模拟网络错误
  await page.route('**/api/pets', route => route.abort());
  
  const petsPage = new PetsPage(page);
  await petsPage.goToPetsList();
  
  // 验证错误提示
  await expect(page.locator('[data-testid="error-message"]'))
    .toContainText('网络连接失败');
});
```

## 测试配置

### 浏览器配置

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

### 环境变量

```bash
# .env.test
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

## 调试测试

### 调试模式

```bash
# 以调试模式运行测试
npx playwright test --debug

# 运行特定测试文件
npx playwright test auth.spec.ts --debug

# 在浏览器中查看测试
npx playwright test --headed
```

### 截图和录制

```typescript
test('调试失败测试', async ({ page }) => {
  // 在关键步骤截图
  await page.screenshot({ path: 'debug-step1.png' });
  
  // 执行操作
  await page.click('[data-testid="submit-button"]');
  
  // 再次截图
  await page.screenshot({ path: 'debug-step2.png' });
});
```

### 测试录制

```bash
# 录制新测试
npx playwright codegen localhost:3000

# 录制并保存到文件
npx playwright codegen --target playwright-test --output new-test.spec.ts localhost:3000
```

## 性能测试

### 页面加载性能

```typescript
import { PerformanceMonitor } from '../utils/performance-monitor';

test('首页加载性能', async ({ page }) => {
  const monitor = new PerformanceMonitor(page);
  
  await page.goto('/');
  const metrics = await monitor.measurePageLoad();
  
  expect(metrics.firstContentfulPaint).toBeLessThan(2000);
  expect(metrics.largestContentfulPaint).toBeLessThan(4000);
});
```

### 交互性能

```typescript
test('分析按钮响应性能', async ({ page }) => {
  const monitor = new PerformanceMonitor(page);
  
  const responseTime = await monitor.measureInteractionTime(async () => {
    await page.click('[data-testid="analyze-button"]');
    await page.waitForSelector('[data-testid="analysis-result"]');
  });
  
  expect(responseTime).toBeLessThan(500);
});
```

## 视觉测试

### 截图对比

```typescript
test('页面视觉回归测试', async ({ page }) => {
  await page.goto('/pets');
  
  // 全页面截图对比
  await expect(page).toHaveScreenshot('pets-page.png');
  
  // 组件截图对比
  await expect(page.locator('[data-testid="pet-card"]').first())
    .toHaveScreenshot('pet-card.png');
});
```

### 响应式测试

```typescript
test('移动端布局测试', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/pets');
  
  // 验证移动端布局
  await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();
});
```

## 可访问性测试

### 键盘导航

```typescript
test('键盘导航测试', async ({ page }) => {
  await page.goto('/pets');
  
  // Tab键导航
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="add-pet-button"]')).toBeFocused();
  
  // 回车键激活
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="pet-form"]')).toBeVisible();
});
```

### ARIA标签验证

```typescript
test('ARIA标签测试', async ({ page }) => {
  await page.goto('/pets');
  
  // 验证ARIA标签
  const addButton = page.locator('[data-testid="add-pet-button"]');
  await expect(addButton).toHaveAttribute('aria-label', '添加新宠物');
  
  // 验证角色属性
  const petList = page.locator('[data-testid="pet-list"]');
  await expect(petList).toHaveAttribute('role', 'list');
});
```

## 持续集成

### GitHub Actions配置

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### 测试报告

测试完成后会生成详细的HTML报告：

```bash
# 查看测试报告
npx playwright show-report
```

## 故障排除

### 常见问题

1. **元素未找到**
   ```typescript
   // 使用更具体的选择器
   await page.locator('[data-testid="specific-element"]').click();
   
   // 等待元素出现
   await page.waitForSelector('[data-testid="element"]');
   ```

2. **测试不稳定**
   ```typescript
   // 使用内置等待
   await expect(page.locator('[data-testid="element"]')).toBeVisible();
   
   // 避免硬编码等待
   // await page.waitForTimeout(1000); // 不推荐
   ```

3. **测试数据冲突**
   ```typescript
   // 使用唯一的测试数据
   const uniqueEmail = `test-${Date.now()}@example.com`;
   ```

### 调试技巧

1. **使用浏览器开发者工具**
   ```bash
   npx playwright test --debug
   ```

2. **添加调试信息**
   ```typescript
   console.log('当前页面URL:', page.url());
   console.log('元素文本:', await element.textContent());
   ```

3. **分步执行**
   ```typescript
   await page.pause(); // 暂停执行，允许手动调试
   ```

## 最佳实践总结

1. **使用页面对象模式**：封装页面操作，提高代码复用性
2. **合理使用等待策略**：避免硬编码等待，使用智能等待
3. **独立的测试数据**：每个测试使用独立的数据，避免相互影响
4. **清晰的测试命名**：测试名称应该清楚描述测试内容
5. **适当的测试粒度**：既不过于细碎，也不过于庞大
6. **及时清理资源**：测试结束后清理测试数据和资源
7. **持续维护**：定期更新和优化测试用例

通过遵循这些指南和最佳实践，你可以编写出高质量、可维护的端到端测试。