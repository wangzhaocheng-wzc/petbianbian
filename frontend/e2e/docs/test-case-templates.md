# 测试用例编写模板

## 基础测试模板

### 1. 标准功能测试模板

```typescript
import { test, expect } from '@playwright/test';
import { [PageObject] } from '../page-objects/[page-object]';
import { TestDataManager } from '../utils/test-data-manager';

test.describe('[功能模块]测试', () => {
  let dataManager: TestDataManager;
  let [pageObject]: [PageObject];

  test.beforeEach(async ({ page }) => {
    // 初始化测试数据管理器
    dataManager = new TestDataManager(page);
    [pageObject] = new [PageObject](page);
    
    // 创建测试数据
    await dataManager.createTestUser();
    
    // 导航到测试页面
    await page.goto('/[target-page]');
  });

  test.afterEach(async ({ page }) => {
    // 清理测试数据
    await dataManager.cleanup();
  });

  test('[具体功能描述]', async ({ page }) => {
    // Given: 前置条件
    // 描述测试的初始状态
    
    // When: 执行操作
    // 描述用户执行的操作
    
    // Then: 验证结果
    // 验证预期的结果
    
    // 断言示例
    await expect([element]).toBeVisible();
    await expect([element]).toHaveText('[expected-text]');
  });
});
```

### 2. 用户认证测试模板

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';
import { TestDataManager } from '../utils/test-data-manager';

test.describe('用户认证测试', () => {
  let authPage: AuthPage;
  let dataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dataManager = new TestDataManager(page);
  });

  test.afterEach(async ({ page }) => {
    await dataManager.cleanup();
  });

  test('用户登录成功', async ({ page }) => {
    // Given: 用户存在有效账户
    const userData = await dataManager.createTestUser();
    
    // When: 用户使用正确凭据登录
    await authPage.goToLogin();
    await authPage.login(userData.email, userData.password);
    
    // Then: 用户成功登录并重定向到首页
    await expect(authPage.getUserMenu()).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('用户登录失败 - 错误密码', async ({ page }) => {
    // Given: 用户存在有效账户
    const userData = await dataManager.createTestUser();
    
    // When: 用户使用错误密码登录
    await authPage.goToLogin();
    await authPage.login(userData.email, 'wrong-password');
    
    // Then: 显示错误消息，用户仍在登录页面
    await expect(authPage.getErrorMessage()).toContainText('密码错误');
    expect(page.url()).toContain('/login');
  });

  test('用户注册成功', async ({ page }) => {
    // Given: 用户准备注册新账户
    const newUserData = {
      username: `testuser-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    // When: 用户填写注册表单并提交
    await authPage.goToRegister();
    await authPage.register(newUserData);
    
    // Then: 用户成功注册并自动登录
    await expect(authPage.getSuccessMessage()).toContainText('注册成功');
    await expect(authPage.getUserMenu()).toBeVisible();
  });
});
```

### 3. CRUD操作测试模板

```typescript
import { test, expect } from '@playwright/test';
import { PetsPage } from '../page-objects/pets-page';
import { TestDataManager } from '../utils/test-data-manager';

test.describe('宠物管理CRUD测试', () => {
  let petsPage: PetsPage;
  let dataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    petsPage = new PetsPage(page);
    dataManager = new TestDataManager(page);
    
    // 创建测试用户并登录
    const userData = await dataManager.createTestUser();
    await dataManager.loginUser(userData);
    
    await page.goto('/pets');
  });

  test.afterEach(async ({ page }) => {
    await dataManager.cleanup();
  });

  test('创建新宠物', async ({ page }) => {
    // Given: 用户在宠物管理页面
    const petData = {
      name: '测试宠物',
      type: 'dog',
      breed: '金毛',
      age: 2,
      weight: 25
    };
    
    // When: 用户添加新宠物
    await petsPage.clickAddPetButton();
    await petsPage.fillPetForm(petData);
    await petsPage.submitPetForm();
    
    // Then: 宠物成功添加到列表
    await expect(petsPage.getPetByName(petData.name)).toBeVisible();
    await expect(petsPage.getSuccessMessage()).toContainText('宠物添加成功');
  });

  test('编辑宠物信息', async ({ page }) => {
    // Given: 已存在一个宠物
    const originalPet = await dataManager.createTestPet();
    await page.reload();
    
    const updatedData = {
      name: '更新后的宠物名',
      age: 3,
      weight: 30
    };
    
    // When: 用户编辑宠物信息
    await petsPage.clickEditPet(originalPet.name);
    await petsPage.updatePetForm(updatedData);
    await petsPage.submitPetForm();
    
    // Then: 宠物信息成功更新
    await expect(petsPage.getPetByName(updatedData.name)).toBeVisible();
    await expect(petsPage.getPetByName(originalPet.name)).not.toBeVisible();
  });

  test('删除宠物', async ({ page }) => {
    // Given: 已存在一个宠物
    const testPet = await dataManager.createTestPet();
    await page.reload();
    
    // When: 用户删除宠物
    await petsPage.clickDeletePet(testPet.name);
    await petsPage.confirmDeletion();
    
    // Then: 宠物从列表中移除
    await expect(petsPage.getPetByName(testPet.name)).not.toBeVisible();
    await expect(petsPage.getSuccessMessage()).toContainText('宠物删除成功');
  });

  test('查看宠物详情', async ({ page }) => {
    // Given: 已存在一个宠物
    const testPet = await dataManager.createTestPet();
    await page.reload();
    
    // When: 用户点击查看宠物详情
    await petsPage.clickViewPetDetails(testPet.name);
    
    // Then: 显示宠物详细信息
    await expect(petsPage.getPetDetailModal()).toBeVisible();
    await expect(petsPage.getPetDetailName()).toHaveText(testPet.name);
    await expect(petsPage.getPetDetailBreed()).toHaveText(testPet.breed);
  });
});
```

### 4. 表单验证测试模板

```typescript
import { test, expect } from '@playwright/test';
import { [FormPage] } from '../page-objects/[form-page]';

test.describe('[表单名称]验证测试', () => {
  let formPage: [FormPage];

  test.beforeEach(async ({ page }) => {
    formPage = new [FormPage](page);
    await page.goto('/[form-url]');
  });

  test('必填字段验证', async ({ page }) => {
    // Given: 用户在表单页面
    
    // When: 用户不填写必填字段直接提交
    await formPage.submitForm();
    
    // Then: 显示必填字段错误提示
    await expect(formPage.getFieldError('[field-name]')).toContainText('此字段为必填项');
    await expect(formPage.getFormSubmitButton()).toBeDisabled();
  });

  test('字段格式验证', async ({ page }) => {
    // Given: 用户在表单页面
    
    // When: 用户输入无效格式的数据
    await formPage.fillField('[field-name]', '[invalid-data]');
    await formPage.blurField('[field-name]');
    
    // Then: 显示格式错误提示
    await expect(formPage.getFieldError('[field-name]')).toContainText('[format-error-message]');
  });

  test('字段长度验证', async ({ page }) => {
    // Given: 用户在表单页面
    
    // When: 用户输入超长数据
    const longText = 'a'.repeat(256); // 假设最大长度为255
    await formPage.fillField('[field-name]', longText);
    await formPage.blurField('[field-name]');
    
    // Then: 显示长度错误提示
    await expect(formPage.getFieldError('[field-name]')).toContainText('字符长度不能超过');
  });

  test('表单提交成功', async ({ page }) => {
    // Given: 用户在表单页面
    const validData = {
      // 有效的表单数据
    };
    
    // When: 用户填写有效数据并提交
    await formPage.fillForm(validData);
    await formPage.submitForm();
    
    // Then: 表单提交成功
    await expect(formPage.getSuccessMessage()).toContainText('提交成功');
  });
});
```

### 5. API集成测试模板

```typescript
import { test, expect } from '@playwright/test';
import { APIMocker } from '../utils/api-mocker';

test.describe('API集成测试', () => {
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    apiMocker = new APIMocker(page);
  });

  test('API调用成功', async ({ page }) => {
    // Given: API返回成功响应
    await apiMocker.mockAPI('/api/pets', {
      status: 200,
      body: { pets: [{ id: 1, name: '测试宠物' }] }
    });
    
    // When: 用户触发API调用
    await page.goto('/pets');
    
    // Then: 页面显示API返回的数据
    await expect(page.locator('[data-testid="pet-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="pet-name"]')).toHaveText('测试宠物');
  });

  test('API调用失败处理', async ({ page }) => {
    // Given: API返回错误响应
    await apiMocker.mockAPI('/api/pets', {
      status: 500,
      body: { error: '服务器内部错误' }
    });
    
    // When: 用户触发API调用
    await page.goto('/pets');
    
    // Then: 页面显示错误提示
    await expect(page.locator('[data-testid="error-message"]')).toContainText('加载失败');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('网络超时处理', async ({ page }) => {
    // Given: API响应超时
    await apiMocker.mockSlowAPI('/api/pets', 10000); // 10秒延迟
    
    // When: 用户触发API调用
    await page.goto('/pets');
    
    // Then: 显示加载状态和超时提示
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    
    // 等待超时
    await page.waitForTimeout(5000);
    await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible();
  });
});
```

### 6. 性能测试模板

```typescript
import { test, expect } from '@playwright/test';
import { PerformanceMonitor } from '../utils/performance-monitor';

test.describe('性能测试', () => {
  let performanceMonitor: PerformanceMonitor;

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor(page);
  });

  test('页面加载性能', async ({ page }) => {
    // Given: 用户访问页面
    
    // When: 测量页面加载性能
    const metrics = await performanceMonitor.measurePageLoad(async () => {
      await page.goto('/');
    });
    
    // Then: 性能指标符合要求
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    expect(metrics.largestContentfulPaint).toBeLessThan(4000);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1);
  });

  test('交互响应性能', async ({ page }) => {
    // Given: 用户在页面上
    await page.goto('/pets');
    
    // When: 测量交互响应时间
    const responseTime = await performanceMonitor.measureInteractionTime(async () => {
      await page.click('[data-testid="add-pet-button"]');
      await page.waitForSelector('[data-testid="pet-form"]');
    });
    
    // Then: 响应时间符合要求
    expect(responseTime).toBeLessThan(500);
  });

  test('资源加载性能', async ({ page }) => {
    // Given: 用户访问页面
    
    // When: 分析资源加载
    const resourceMetrics = await performanceMonitor.analyzeResourceLoading(async () => {
      await page.goto('/');
    });
    
    // Then: 资源加载符合要求
    expect(resourceMetrics.totalSize).toBeLessThan(2 * 1024 * 1024); // 2MB
    expect(resourceMetrics.imageCount).toBeLessThan(20);
    expect(resourceMetrics.scriptCount).toBeLessThan(10);
  });
});
```

### 7. 视觉回归测试模板

```typescript
import { test, expect } from '@playwright/test';

test.describe('视觉回归测试', () => {
  test('页面视觉对比', async ({ page }) => {
    // Given: 用户访问页面
    await page.goto('/pets');
    
    // When: 等待页面完全加载
    await page.waitForLoadState('networkidle');
    
    // Then: 页面视觉与基准一致
    await expect(page).toHaveScreenshot('pets-page.png');
  });

  test('组件视觉对比', async ({ page }) => {
    // Given: 用户访问包含特定组件的页面
    await page.goto('/pets');
    await page.waitForSelector('[data-testid="pet-card"]');
    
    // When: 截取组件截图
    const petCard = page.locator('[data-testid="pet-card"]').first();
    
    // Then: 组件视觉与基准一致
    await expect(petCard).toHaveScreenshot('pet-card.png');
  });

  test('响应式设计视觉对比', async ({ page }) => {
    // Given: 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pets');
    
    // When: 等待页面适配完成
    await page.waitForLoadState('networkidle');
    
    // Then: 移动端布局与基准一致
    await expect(page).toHaveScreenshot('pets-page-mobile.png');
  });

  test('主题切换视觉对比', async ({ page }) => {
    // Given: 用户在页面上
    await page.goto('/pets');
    
    // When: 切换到深色主题
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // 等待主题切换动画
    
    // Then: 深色主题视觉与基准一致
    await expect(page).toHaveScreenshot('pets-page-dark.png');
  });
});
```

### 8. 可访问性测试模板

```typescript
import { test, expect } from '@playwright/test';
import { AccessibilityUtils } from '../utils/accessibility-utils';

test.describe('可访问性测试', () => {
  let a11yUtils: AccessibilityUtils;

  test.beforeEach(async ({ page }) => {
    a11yUtils = new AccessibilityUtils(page);
  });

  test('键盘导航测试', async ({ page }) => {
    // Given: 用户使用键盘导航
    await page.goto('/pets');
    
    // When: 使用Tab键导航
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="add-pet-button"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    // Then: 焦点顺序正确
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="pet-form"]')).toBeVisible();
  });

  test('屏幕阅读器兼容性', async ({ page }) => {
    // Given: 用户使用屏幕阅读器
    await page.goto('/pets');
    
    // When: 检查ARIA标签
    const addButton = page.locator('[data-testid="add-pet-button"]');
    await expect(addButton).toHaveAttribute('aria-label', '添加新宠物');
    
    const petList = page.locator('[data-testid="pet-list"]');
    await expect(petList).toHaveAttribute('role', 'list');
    
    // Then: 语义化标签正确
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    expect(await headings.count()).toBeGreaterThan(0);
  });

  test('颜色对比度测试', async ({ page }) => {
    // Given: 用户访问页面
    await page.goto('/pets');
    
    // When: 检查颜色对比度
    const contrastResults = await a11yUtils.checkColorContrast();
    
    // Then: 对比度符合WCAG标准
    expect(contrastResults.violations).toHaveLength(0);
    expect(contrastResults.minContrast).toBeGreaterThan(4.5);
  });
});
```

### 9. 错误处理测试模板

```typescript
import { test, expect } from '@playwright/test';
import { ErrorHandler } from '../utils/error-handler';

test.describe('错误处理测试', () => {
  let errorHandler: ErrorHandler;

  test.beforeEach(async ({ page }) => {
    errorHandler = new ErrorHandler(page);
  });

  test('网络错误处理', async ({ page }) => {
    // Given: 网络连接中断
    await page.route('**/*', route => route.abort());
    
    // When: 用户尝试加载页面
    await page.goto('/pets');
    
    // Then: 显示网络错误提示
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('服务器错误处理', async ({ page }) => {
    // Given: 服务器返回500错误
    await page.route('**/api/**', route => 
      route.fulfill({ status: 500, body: '服务器内部错误' })
    );
    
    // When: 用户触发API调用
    await page.goto('/pets');
    
    // Then: 显示服务器错误提示
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('服务暂时不可用');
  });

  test('客户端错误处理', async ({ page }) => {
    // Given: 页面存在JavaScript错误
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        throw new Error('测试JavaScript错误');
      });
    });
    
    // When: 用户访问页面
    const errorPromise = page.waitForEvent('pageerror');
    await page.goto('/pets');
    const error = await errorPromise;
    
    // Then: 错误被正确捕获和处理
    expect(error.message).toContain('测试JavaScript错误');
    
    // 验证错误不影响用户体验
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });
});
```

### 10. 端到端流程测试模板

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth-page';
import { PetsPage } from '../page-objects/pets-page';
import { AnalysisPage } from '../page-objects/analysis-page';
import { TestDataManager } from '../utils/test-data-manager';

test.describe('端到端用户流程测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let dataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    dataManager = new TestDataManager(page);
  });

  test.afterEach(async ({ page }) => {
    await dataManager.cleanup();
  });

  test('完整用户旅程：注册到分析完成', async ({ page }) => {
    // Step 1: 用户注册
    const userData = {
      username: `testuser-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    await authPage.goToRegister();
    await authPage.register(userData);
    await expect(authPage.getUserMenu()).toBeVisible();
    
    // Step 2: 添加宠物
    const petData = {
      name: '小白',
      type: 'dog',
      breed: '金毛',
      age: 2
    };
    
    await petsPage.goToPetsPage();
    await petsPage.addPet(petData);
    await expect(petsPage.getPetByName(petData.name)).toBeVisible();
    
    // Step 3: 进行便便分析
    await analysisPage.goToAnalysisPage();
    await analysisPage.uploadImage('test-poop.jpg');
    await analysisPage.selectPet(petData.name);
    await analysisPage.startAnalysis();
    
    // Step 4: 查看分析结果
    const result = await analysisPage.waitForAnalysisResult();
    expect(result.status).toBe('completed');
    await expect(analysisPage.getAnalysisResult()).toBeVisible();
    
    // Step 5: 保存分析记录
    await analysisPage.saveAnalysisRecord();
    await expect(analysisPage.getSuccessMessage()).toContainText('记录保存成功');
    
    // Step 6: 验证记录在历史中显示
    await analysisPage.goToHistoryPage();
    await expect(analysisPage.getHistoryRecord(petData.name)).toBeVisible();
  });

  test('多宠物管理和比较分析', async ({ page }) => {
    // 登录用户
    const userData = await dataManager.createTestUser();
    await authPage.login(userData.email, userData.password);
    
    // 添加多个宠物
    const pets = [
      { name: '小白', type: 'dog', breed: '金毛' },
      { name: '小黑', type: 'cat', breed: '英短' }
    ];
    
    for (const pet of pets) {
      await petsPage.addPet(pet);
      await expect(petsPage.getPetByName(pet.name)).toBeVisible();
    }
    
    // 为每个宠物进行分析
    for (const pet of pets) {
      await analysisPage.goToAnalysisPage();
      await analysisPage.uploadImage(`test-${pet.type}-poop.jpg`);
      await analysisPage.selectPet(pet.name);
      await analysisPage.startAnalysis();
      await analysisPage.waitForAnalysisResult();
      await analysisPage.saveAnalysisRecord();
    }
    
    // 比较分析结果
    await analysisPage.goToComparisonPage();
    await analysisPage.selectPetsForComparison(pets.map(p => p.name));
    await analysisPage.generateComparison();
    
    // 验证比较结果
    await expect(analysisPage.getComparisonChart()).toBeVisible();
    await expect(analysisPage.getComparisonInsights()).toContainText('健康趋势');
  });
});
```

## 使用说明

### 1. 选择合适的模板

根据你要测试的功能类型选择对应的模板：

- **基础功能测试**：用于一般的功能测试
- **用户认证测试**：用于登录、注册、权限相关测试
- **CRUD操作测试**：用于增删改查功能测试
- **表单验证测试**：用于表单输入验证测试
- **API集成测试**：用于前后端集成测试
- **性能测试**：用于页面加载和交互性能测试
- **视觉回归测试**：用于UI一致性测试
- **可访问性测试**：用于无障碍访问测试
- **错误处理测试**：用于异常情况测试
- **端到端流程测试**：用于完整用户旅程测试

### 2. 自定义模板

将模板中的占位符替换为实际值：

- `[功能模块]` → 实际的功能模块名称
- `[PageObject]` → 实际的页面对象类名
- `[page-object]` → 实际的页面对象文件名
- `[具体功能描述]` → 具体的测试用例描述
- `[target-page]` → 目标页面URL
- `[element]` → 实际的页面元素选择器
- `[expected-text]` → 预期的文本内容

### 3. 最佳实践提醒

- 每个测试用例应该独立运行
- 使用描述性的测试名称
- 遵循Given-When-Then结构
- 包含适当的等待策略
- 添加必要的清理逻辑
- 使用稳定的选择器
- 包含错误处理

通过使用这些模板，你可以快速创建结构化、可维护的测试用例。