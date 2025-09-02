# 宠物搜索和筛选测试文档 - 任务5.2

## 概述

本文档描述了宠物健康监测社区平台中宠物搜索和筛选功能的端到端测试实现。测试覆盖了多条件搜索、高级筛选、结果排序、分页显示、搜索历史记录和收藏功能等核心特性。

## 测试目标

根据任务5.2的要求，实现以下测试功能：

1. **多条件搜索测试** - 验证按名称、品种、类型等多种条件的搜索功能
2. **高级筛选测试** - 验证按年龄、体重、性别等属性的筛选功能
3. **搜索结果排序测试** - 验证按不同字段的排序功能
4. **分页功能测试** - 验证搜索结果的分页显示和导航
5. **搜索历史测试** - 验证搜索历史记录的保存和管理
6. **收藏功能测试** - 验证搜索条件的收藏和管理功能

## 测试文件结构

```
frontend/e2e/specs/pets/
├── README.md                           # 本文档
├── pet-search-basic.spec.ts           # 基础搜索功能测试
├── pet-search-advanced.spec.ts        # 高级搜索和筛选测试
├── pet-search-filter.spec.ts          # 搜索筛选组合测试
├── pet-search-pagination.spec.ts      # 分页功能测试
├── pet-search-history-favorites.spec.ts # 历史记录和收藏测试
└── simple-pet-test.spec.ts           # 简单宠物测试
```

## 测试用例详细说明

### 1. 基础搜索测试 (pet-search-basic.spec.ts)

**测试范围：**
- 搜索页面访问验证
- 基本搜索功能验证
- 宠物列表显示验证

**关键测试用例：**
- 验证搜索页面正常加载
- 验证搜索框和按钮可用性
- 验证宠物列表或空状态显示

### 2. 高级搜索和筛选测试 (pet-search-advanced.spec.ts)

**测试范围：**
- 多条件搜索功能
- 高级筛选功能
- 搜索结果排序
- 搜索性能和用户体验

**关键测试用例：**

#### 多条件搜索测试
- 按宠物名称精确搜索
- 按宠物品种搜索
- 组合搜索条件验证
- 模糊搜索功能
- 搜索建议和自动完成

#### 高级筛选测试
- 按宠物类型筛选（狗/猫）
- 按年龄范围筛选
- 按体重范围筛选
- 按性别筛选
- 多重筛选条件组合
- 筛选条件重置
- 筛选预设保存和加载

#### 搜索结果排序测试
- 按名称排序
- 按年龄排序
- 按体重排序
- 按创建时间排序
- 排序方向切换

#### 性能和用户体验测试
- 搜索响应时间验证
- 实时搜索反馈
- 键盘导航支持
- 移动端适配验证

### 3. 搜索筛选组合测试 (pet-search-filter.spec.ts)

**测试范围：**
- 搜索和筛选的组合使用
- 复杂查询条件验证
- 筛选结果准确性验证

**关键测试用例：**
- 文本搜索 + 类型筛选
- 品种搜索 + 年龄筛选
- 多重筛选条件组合验证
- 筛选条件变更时的结果更新

### 4. 分页功能测试 (pet-search-pagination.spec.ts)

**测试范围：**
- 分页控件显示和功能
- 分页导航验证
- 分页数据一致性
- 分页性能测试

**关键测试用例：**

#### 分页基础功能
- 分页控件和信息显示
- 页码直接跳转
- 上一页下一页导航
- 每页显示数量调整

#### 搜索结果分页
- 搜索结果正确分页
- 搜索条件变化时分页重置
- 搜索关键词变化时分页重置

#### 分页性能和用户体验
- 分页切换响应时间
- 分页加载状态显示
- 键盘导航支持
- 移动端分页适配

#### 分页数据一致性
- 分页数据不重复验证
- 排序后分页数据正确性
- 筛选后分页数据正确性

### 5. 搜索历史和收藏测试 (pet-search-history-favorites.spec.ts)

**测试范围：**
- 搜索历史记录功能
- 搜索条件收藏功能
- 历史和收藏的管理功能

**关键测试用例：**

#### 搜索历史功能
- 搜索历史记录和显示
- 点击历史项目执行搜索
- 搜索历史数量限制
- 删除单个历史记录
- 清空所有搜索历史
- 跨会话历史记录保持

#### 搜索收藏功能
- 收藏当前搜索条件
- 显示收藏的搜索列表
- 应用收藏的搜索条件
- 编辑收藏的搜索
- 删除收藏的搜索
- 收藏搜索分类管理
- 导入导出收藏搜索

#### 集成测试
- 从历史记录创建收藏
- 收藏和历史数据同步

## 测试数据设计

### 测试宠物数据结构

```typescript
interface TestPet {
  name: string;        // 宠物名称
  type: 'dog' | 'cat'; // 宠物类型
  breed: string;       // 品种
  age: number;         // 年龄（月）
  weight: number;      // 体重（kg）
  color?: string;      // 颜色
  gender?: 'male' | 'female'; // 性别
}
```

### 测试数据集

测试使用多样化的宠物数据，包括：

**狗类宠物：**
- 金毛Max (36个月, 28.5kg, 雄性)
- 拉布拉多Buddy (48个月, 32.0kg, 雄性)
- 边牧Charlie (30个月, 22.0kg, 雄性)
- 哈士奇Storm (42个月, 25.0kg, 雄性)
- 柯基Mochi (24个月, 12.5kg, 雌性)

**猫类宠物：**
- 英短Whiskers (24个月, 4.5kg, 雌性)
- 暹罗Luna (18个月, 3.8kg, 雌性)
- 波斯Princess (60个月, 5.2kg, 雌性)
- 布偶Bella (36个月, 6.0kg, 雌性)
- 美短Tiger (30个月, 4.8kg, 雄性)

## 页面对象模式

测试使用页面对象模式（Page Object Pattern）来提高代码复用性和维护性：

### PetsPage 类

主要方法：
- `goToPetsPage()` - 导航到宠物页面
- `addPet(petData)` - 添加宠物
- `searchPets(keyword)` - 搜索宠物
- `filterByType(type)` - 按类型筛选
- `sortPets(sortBy)` - 排序宠物列表
- `goToNextPage()` - 下一页
- `getCurrentPage()` - 获取当前页码
- `clearSearch()` - 清除搜索

### 选择器定义

```typescript
private readonly selectors = {
  // 搜索相关
  searchInput: '[data-testid="pets-search"]',
  searchButton: '[data-testid="search-button"]',
  clearSearchButton: '[data-testid="clear-search-button"]',
  
  // 筛选相关
  typeFilter: '[data-testid="type-filter"]',
  breedFilter: '[data-testid="breed-filter"]',
  ageFilter: '[data-testid="age-filter"]',
  weightFilter: '[data-testid="weight-filter"]',
  
  // 分页相关
  pagination: '[data-testid="pagination"]',
  prevPageButton: '[data-testid="prev-page"]',
  nextPageButton: '[data-testid="next-page"]',
  pageNumber: '[data-testid="page-number"]',
  
  // 宠物卡片
  petCard: '[data-testid="pet-card"]',
  petName: '[data-testid="pet-name"]',
  petType: '[data-testid="pet-type"]',
  petBreed: '[data-testid="pet-breed"]'
};
```

## 测试环境配置

### 前置条件

1. **应用服务运行**
   - 前端应用: http://localhost:3000
   - 后端API: http://localhost:5000/api

2. **测试数据准备**
   - 测试用户账号
   - 测试宠物数据
   - 清理机制

3. **浏览器环境**
   - Chromium (默认)
   - Firefox (可选)
   - WebKit/Safari (可选)

### 配置文件

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

## 运行测试

### 使用测试运行器

```bash
# 运行所有宠物搜索测试
node frontend/e2e/run-pet-search-tests.cjs

# 运行特定测试套件
node frontend/e2e/run-pet-search-tests.cjs --test=advanced

# 调试模式运行
node frontend/e2e/run-pet-search-tests.cjs --headed --debug

# 生成测试报告
node frontend/e2e/run-pet-search-tests.cjs --trace --video
```

### 直接使用 Playwright

```bash
# 运行单个测试文件
npx playwright test specs/pets/pet-search-advanced.spec.ts

# 运行所有宠物测试
npx playwright test specs/pets/

# 调试模式
npx playwright test specs/pets/pet-search-advanced.spec.ts --debug

# 生成HTML报告
npx playwright test specs/pets/ --reporter=html
```

## 测试报告

### 报告类型

1. **HTML报告** - 详细的交互式测试报告
2. **控制台报告** - 实时测试执行状态
3. **JUnit报告** - CI/CD集成用的XML格式报告

### 报告内容

- 测试执行总结
- 每个测试用例的详细结果
- 失败测试的错误信息和截图
- 执行轨迹和视频记录
- 性能指标统计

## 最佳实践

### 测试编写原则

1. **独立性** - 每个测试用例应该独立运行
2. **可重复性** - 测试结果应该一致可重复
3. **清晰性** - 测试意图和步骤应该清晰明了
4. **完整性** - 覆盖正常流程和异常情况

### 数据管理

1. **测试数据隔离** - 每个测试使用独立的测试数据
2. **数据清理** - 测试后自动清理创建的数据
3. **数据生成** - 使用工厂模式生成测试数据

### 错误处理

1. **重试机制** - 对不稳定的操作进行重试
2. **等待策略** - 合理使用显式等待
3. **错误诊断** - 提供详细的错误信息和截图

## 故障排除

### 常见问题

1. **测试超时**
   - 检查网络连接
   - 增加超时时间
   - 优化等待策略

2. **元素定位失败**
   - 验证选择器正确性
   - 检查页面加载状态
   - 使用更稳定的定位策略

3. **数据不一致**
   - 检查数据清理逻辑
   - 验证测试数据隔离
   - 确认并发测试影响

### 调试技巧

1. **使用调试模式** - `--debug` 参数
2. **启用轨迹记录** - `--trace` 参数
3. **截图和视频** - `--screenshot` 和 `--video` 参数
4. **控制台日志** - 查看浏览器控制台输出

## 持续集成

### CI/CD 配置

```yaml
# .github/workflows/pet-search-tests.yml
name: Pet Search Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: node frontend/e2e/run-pet-search-tests.cjs
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

### 测试策略

1. **提交时测试** - 运行核心测试用例
2. **合并前测试** - 运行完整测试套件
3. **定期测试** - 每日运行回归测试
4. **发布前测试** - 运行全面的验收测试

## 维护和更新

### 定期维护任务

1. **更新测试数据** - 保持测试数据的时效性
2. **优化测试性能** - 减少测试执行时间
3. **更新选择器** - 适应UI变更
4. **扩展测试覆盖** - 添加新功能的测试

### 版本管理

1. **测试版本控制** - 与应用版本同步
2. **向后兼容性** - 支持多个应用版本
3. **文档更新** - 及时更新测试文档

## 总结

本测试套件全面覆盖了宠物搜索和筛选功能的各个方面，通过自动化测试确保功能的正确性和稳定性。测试采用了现代化的测试框架和最佳实践，提供了完整的测试报告和调试支持，为产品质量提供了有力保障。