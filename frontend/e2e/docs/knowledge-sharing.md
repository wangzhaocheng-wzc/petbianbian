# Playwright测试知识分享文档

## 常见问题与解决方案

### 1. 元素定位问题

#### 问题：元素找不到或定位不准确

**常见原因：**
- 元素还未加载完成
- 选择器不够具体
- 动态内容导致选择器失效
- 元素被其他元素遮挡

**解决方案：**

```typescript
// ❌ 错误做法
await page.click('.button'); // 选择器太泛化
await page.waitForTimeout(5000); // 硬编码等待

// ✅ 正确做法
// 1. 使用更具体的选择器
await page.click('[data-testid="submit-button"]');

// 2. 使用智能等待
await page.waitForSelector('[data-testid="submit-button"]', { state: 'visible' });
await page.click('[data-testid="submit-button"]');

// 3. 使用expect等待
await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
await page.click('[data-testid="submit-button"]');

// 4. 处理被遮挡的元素
await page.locator('[data-testid="submit-button"]').click({ force: true });
```

#### 问题：动态内容定位困难

```typescript
// ❌ 问题：依赖动态内容
await page.click('text=用户数量: 123');

// ✅ 解决：使用部分匹配或属性选择器
await page.click('text=/用户数量:/');
await page.click('[data-testid="user-count"]');

// ✅ 使用正则表达式
await expect(page.locator('[data-testid="user-count"]'))
  .toHaveText(/用户数量: \d+/);
```

### 2. 异步操作处理

#### 问题：测试不稳定，时而成功时而失败

**常见原因：**
- 异步操作未正确等待
- 网络请求时序问题
- 动画和过渡效果干扰

**解决方案：**

```typescript
// ✅ 等待网络请求完成
test('等待API响应', async ({ page }) => {
  const responsePromise = page.waitForResponse(response => 
    response.url().includes('/api/pets') && response.status() === 200
  );
  
  await page.click('[data-testid="load-pets"]');
  const response = await responsePromise;
  
  // 验证响应数据
  const data = await response.json();
  expect(data.pets).toBeDefined();
});

// ✅ 等待元素状态变化
test('等待加载完成', async ({ page }) => {
  await page.click('[data-testid="analyze-button"]');
  
  // 等待加载指示器出现
  await expect(page.locator('[data-testid="loading"]')).toBeVisible();
  
  // 等待加载指示器消失
  await expect(page.locator('[data-testid="loading"]')).toBeHidden();
  
  // 等待结果出现
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});

// ✅ 处理动画干扰
test('禁用动画', async ({ page }) => {
  // 全局禁用动画
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
  
  await page.goto('/pets');
  await page.click('[data-testid="add-pet"]');
  // 现在不会被动画干扰
});
```

### 3. 测试数据管理

#### 问题：测试数据冲突和污染

```typescript
// ❌ 问题：使用固定测试数据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

// ✅ 解决：生成唯一测试数据
class TestDataGenerator {
  static generateUniqueUser() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return {
      email: `test-${timestamp}-${random}@example.com`,
      username: `user-${timestamp}-${random}`,
      password: 'TestPassword123!'
    };
  }
  
  static generateUniquePet() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return {
      name: `Pet-${timestamp}-${random}`,
      type: 'dog',
      breed: '测试品种',
      age: Math.floor(Math.random() * 10) + 1
    };
  }
}

// 使用示例
test('用户注册', async ({ page }) => {
  const userData = TestDataGenerator.generateUniqueUser();
  
  const authPage = new AuthPage(page);
  await authPage.register(userData);
  
  await expect(authPage.getUserMenu()).toBeVisible();
});
```

#### 问题：测试数据清理不彻底

```typescript
// ✅ 完善的数据清理策略
class TestDataManager {
  private createdUsers: string[] = [];
  private createdPets: string[] = [];
  
  async createTestUser(): Promise<TestUser> {
    const userData = TestDataGenerator.generateUniqueUser();
    
    // 通过API创建用户
    const response = await this.page.request.post('/api/auth/register', {
      data: userData
    });
    
    const user = await response.json();
    this.createdUsers.push(user.id);
    
    return user;
  }
  
  async cleanup(): Promise<void> {
    // 清理创建的宠物
    for (const petId of this.createdPets) {
      try {
        await this.page.request.delete(`/api/pets/${petId}`);
      } catch (error) {
        console.warn(`清理宠物失败: ${petId}`, error);
      }
    }
    
    // 清理创建的用户
    for (const userId of this.createdUsers) {
      try {
        await this.page.request.delete(`/api/users/${userId}`);
      } catch (error) {
        console.warn(`清理用户失败: ${userId}`, error);
      }
    }
    
    // 清理浏览器状态
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 重置数组
    this.createdUsers = [];
    this.createdPets = [];
  }
}
```

### 4. 页面对象设计模式

#### 问题：页面对象过于庞大和复杂

```typescript
// ❌ 问题：单一页面对象包含所有功能
class PetsPage {
  // 包含了太多职责：CRUD、搜索、筛选、分页等
  async addPet() { /* ... */ }
  async editPet() { /* ... */ }
  async deletePet() { /* ... */ }
  async searchPets() { /* ... */ }
  async filterByType() { /* ... */ }
  async goToNextPage() { /* ... */ }
  // ... 更多方法
}

// ✅ 解决：拆分为多个专门的页面对象
class PetsListPage extends BasePage {
  async getPetsList() { /* ... */ }
  async clickAddPet() { /* ... */ }
  async clickEditPet(petName: string) { /* ... */ }
  async clickDeletePet(petName: string) { /* ... */ }
}

class PetFormPage extends BasePage {
  async fillPetForm(petData: PetData) { /* ... */ }
  async submitForm() { /* ... */ }
  async getValidationErrors() { /* ... */ }
}

class PetSearchPage extends BasePage {
  async searchByName(name: string) { /* ... */ }
  async filterByType(type: string) { /* ... */ }
  async sortBy(field: string) { /* ... */ }
}

// 在测试中组合使用
test('添加宠物', async ({ page }) => {
  const listPage = new PetsListPage(page);
  const formPage = new PetFormPage(page);
  
  await listPage.goto();
  await listPage.clickAddPet();
  
  await formPage.fillPetForm(petData);
  await formPage.submitForm();
  
  await expect(listPage.getPetByName(petData.name)).toBeVisible();
});
```

#### 问题：页面对象方法设计不合理

```typescript
// ❌ 问题：方法粒度不当
class AuthPage {
  // 粒度太细，使用繁琐
  async fillEmail(email: string) { /* ... */ }
  async fillPassword(password: string) { /* ... */ }
  async clickLoginButton() { /* ... */ }
  
  // 粒度太粗，不够灵活
  async loginAndNavigateToDashboard(email: string, password: string) { /* ... */ }
}

// ✅ 解决：合理的方法粒度
class AuthPage {
  // 原子操作方法（私有）
  private async fillEmail(email: string) {
    await this.page.fill('[data-testid="email"]', email);
  }
  
  private async fillPassword(password: string) {
    await this.page.fill('[data-testid="password"]', password);
  }
  
  private async clickLoginButton() {
    await this.page.click('[data-testid="login-button"]');
  }
  
  // 业务操作方法（公有）
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }
  
  // 验证方法
  async isLoggedIn(): Promise<boolean> {
    return await this.page.locator('[data-testid="user-menu"]').isVisible();
  }
  
  async getErrorMessage(): Promise<string> {
    return await this.page.textContent('[data-testid="error-message"]') || '';
  }
}
```

### 5. 错误处理和调试

#### 问题：测试失败时难以定位问题

```typescript
// ✅ 增强错误信息和调试能力
class BasePage {
  protected async clickWithRetry(selector: string, maxRetries: number = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.click(selector);
        return;
      } catch (error) {
        console.log(`点击失败，重试 ${i + 1}/${maxRetries}: ${selector}`);
        
        if (i === maxRetries - 1) {
          // 最后一次失败时截图
          await this.page.screenshot({ 
            path: `debug-click-failure-${Date.now()}.png`,
            fullPage: true 
          });
          
          // 输出页面状态信息
          console.log('页面URL:', this.page.url());
          console.log('页面标题:', await this.page.title());
          
          // 检查元素是否存在
          const elementExists = await this.page.locator(selector).count() > 0;
          console.log(`元素是否存在: ${elementExists}`);
          
          if (elementExists) {
            const isVisible = await this.page.locator(selector).isVisible();
            const isEnabled = await this.page.locator(selector).isEnabled();
            console.log(`元素可见: ${isVisible}, 元素可用: ${isEnabled}`);
          }
          
          throw new Error(`点击元素失败: ${selector}. 详细信息已输出到控制台。`);
        }
        
        await this.page.waitForTimeout(1000);
      }
    }
  }
}

// 使用示例
test('带调试信息的测试', async ({ page }) => {
  const petsPage = new PetsPage(page);
  
  try {
    await petsPage.goto();
    await petsPage.addPet(petData);
  } catch (error) {
    // 测试失败时的额外调试信息
    console.log('测试失败，当前页面状态:');
    console.log('URL:', page.url());
    console.log('标题:', await page.title());
    
    // 截图保存
    await page.screenshot({ 
      path: `test-failure-${Date.now()}.png`,
      fullPage: true 
    });
    
    throw error;
  }
});
```

### 6. 性能优化技巧

#### 问题：测试执行速度慢

```typescript
// ✅ 性能优化策略

// 1. 并行执行配置
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  
  // 2. 项目分组
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*\.mobile\.spec\.ts/
    }
  ]
});

// 3. 资源阻断优化
test.beforeEach(async ({ page }) => {
  // 阻断不必要的资源
  await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => {
    // 只在非视觉测试中阻断图片
    if (!test.info().title.includes('视觉')) {
      route.abort();
    } else {
      route.continue();
    }
  });
  
  // 阻断分析脚本
  await page.route('**/analytics.js', route => route.abort());
  await page.route('**/gtag.js', route => route.abort());
});

// 4. 智能等待策略
class OptimizedBasePage {
  protected async waitForStableState() {
    // 等待网络空闲，但设置超时
    await this.page.waitForLoadState('networkidle', { timeout: 5000 });
  }
  
  protected async waitForElement(selector: string, timeout: number = 10000) {
    return await this.page.waitForSelector(selector, { 
      state: 'visible',
      timeout 
    });
  }
}

// 5. 测试数据预加载
class DataPreloader {
  private static preloadedUsers: TestUser[] = [];
  
  static async preloadTestData() {
    if (this.preloadedUsers.length === 0) {
      // 批量创建测试用户
      const promises = Array.from({ length: 10 }, () => 
        this.createTestUser()
      );
      this.preloadedUsers = await Promise.all(promises);
    }
  }
  
  static getPreloadedUser(): TestUser {
    return this.preloadedUsers.pop() || this.createTestUser();
  }
}
```

### 7. 跨浏览器兼容性处理

#### 问题：不同浏览器行为差异

```typescript
// ✅ 浏览器兼容性处理
class BrowserCompatibilityHelper {
  static async handleBrowserSpecificBehavior(page: Page, action: () => Promise<void>) {
    const browserName = page.context().browser()?.browserType().name();
    
    switch (browserName) {
      case 'webkit':
        // Safari特殊处理
        await page.waitForTimeout(500); // Safari需要额外等待
        await action();
        break;
        
      case 'firefox':
        // Firefox特殊处理
        await page.keyboard.press('Escape'); // 清除可能的焦点
        await action();
        break;
        
      default:
        // Chrome默认行为
        await action();
    }
  }
  
  static async uploadFile(page: Page, selector: string, filePath: string) {
    const browserName = page.context().browser()?.browserType().name();
    
    if (browserName === 'webkit') {
      // Safari文件上传特殊处理
      const fileInput = page.locator(selector);
      await fileInput.setInputFiles(filePath);
      await page.waitForTimeout(1000); // Safari需要额外等待
    } else {
      // 其他浏览器标准处理
      await page.setInputFiles(selector, filePath);
    }
  }
}

// 使用示例
test('跨浏览器文件上传', async ({ page }) => {
  await page.goto('/analysis');
  
  await BrowserCompatibilityHelper.uploadFile(
    page,
    '[data-testid="file-input"]',
    'test-image.jpg'
  );
  
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
});
```

### 8. 测试环境管理

#### 问题：不同环境配置管理复杂

```typescript
// ✅ 环境配置管理
interface EnvironmentConfig {
  baseURL: string;
  apiURL: string;
  timeout: number;
  credentials: {
    testUser: { email: string; password: string };
    adminUser: { email: string; password: string };
  };
}

class EnvironmentManager {
  private static configs: Record<string, EnvironmentConfig> = {
    development: {
      baseURL: 'http://localhost:3000',
      apiURL: 'http://localhost:5000',
      timeout: 30000,
      credentials: {
        testUser: { email: 'test@dev.com', password: 'dev123' },
        adminUser: { email: 'admin@dev.com', password: 'admin123' }
      }
    },
    
    staging: {
      baseURL: 'https://staging.example.com',
      apiURL: 'https://api-staging.example.com',
      timeout: 60000,
      credentials: {
        testUser: { email: 'test@staging.com', password: 'staging123' },
        adminUser: { email: 'admin@staging.com', password: 'admin123' }
      }
    },
    
    production: {
      baseURL: 'https://example.com',
      apiURL: 'https://api.example.com',
      timeout: 60000,
      credentials: {
        testUser: { email: 'test@prod.com', password: 'prod123' },
        adminUser: { email: 'admin@prod.com', password: 'admin123' }
      }
    }
  };
  
  static getConfig(): EnvironmentConfig {
    const env = process.env.TEST_ENV || 'development';
    const config = this.configs[env];
    
    if (!config) {
      throw new Error(`未找到环境配置: ${env}`);
    }
    
    return config;
  }
  
  static getBaseURL(): string {
    return this.getConfig().baseURL;
  }
  
  static getTestUser(): { email: string; password: string } {
    return this.getConfig().credentials.testUser;
  }
}

// playwright.config.ts中使用
export default defineConfig({
  baseURL: EnvironmentManager.getBaseURL(),
  timeout: EnvironmentManager.getConfig().timeout,
  
  use: {
    baseURL: EnvironmentManager.getBaseURL(),
  }
});
```

## 最佳实践总结

### 1. 选择器策略
- 优先使用`data-testid`属性
- 避免依赖CSS类名和复杂的DOM结构
- 使用语义化的选择器
- 为动态内容使用部分匹配

### 2. 等待策略
- 使用智能等待而非硬编码延迟
- 等待特定的状态变化
- 监控网络请求完成
- 处理动画和过渡效果

### 3. 测试数据管理
- 生成唯一的测试数据
- 实现完善的清理机制
- 使用数据工厂模式
- 考虑数据预加载优化

### 4. 页面对象设计
- 遵循单一职责原则
- 合理设计方法粒度
- 提供清晰的API接口
- 包含适当的错误处理

### 5. 错误处理
- 提供详细的错误信息
- 实现重试机制
- 自动截图和日志记录
- 优雅的失败处理

### 6. 性能优化
- 合理配置并行执行
- 阻断不必要的资源
- 使用智能等待策略
- 考虑测试数据预加载

### 7. 跨浏览器兼容
- 处理浏览器特定行为
- 统一API接口
- 充分测试各浏览器
- 文档化已知差异

### 8. 环境管理
- 统一配置管理
- 环境隔离
- 敏感信息保护
- 灵活的环境切换

通过应用这些知识和最佳实践，团队可以构建更加稳定、高效和可维护的测试套件。