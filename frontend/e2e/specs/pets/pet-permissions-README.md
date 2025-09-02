# 宠物权限管理测试文档

## 概述

本测试套件专门用于测试宠物健康监测平台的权限管理功能，确保用户数据安全和访问控制的正确性。

## 测试范围

### 1. 宠物访问权限测试
- **用户隔离**: 验证用户只能查看和管理自己的宠物
- **未授权访问**: 测试未登录用户无法访问宠物管理功能
- **API安全**: 验证通过API无法访问其他用户的宠物数据

### 2. 宠物共享功能测试
- **分享机制**: 测试宠物主人可以将宠物分享给其他用户
- **权限级别**: 验证只读和编辑权限的正确实现
- **权限撤销**: 测试主人可以撤销已分享的权限
- **多级权限**: 验证不同权限级别的功能限制

### 3. 多用户宠物管理权限测试
- **并发操作**: 测试多个用户同时操作各自宠物的安全性
- **数据隔离**: 验证用户操作不会影响其他用户的数据
- **并发安全**: 测试并发用户操作不会产生数据冲突

### 4. 宠物数据隐私保护测试
- **敏感信息**: 测试宠物医疗记录等敏感信息的访问控制
- **图片隐私**: 验证宠物图片的隐私保护机制
- **数据导出**: 测试数据导出功能的权限控制
- **账户删除**: 验证账户删除时的数据清理机制

### 5. 权限边界测试
- **安全攻击**: 测试SQL注入、XSS等攻击的防护
- **权限提升**: 验证普通用户无法获取管理员权限
- **会话安全**: 测试会话劫持等安全威胁的防护

## 测试文件结构

```
frontend/e2e/specs/pets/
├── pet-permissions.spec.ts           # 主要测试文件
├── pet-permissions-README.md         # 本文档
└── fixtures/
    ├── test-pet-avatar.jpg          # 测试用宠物头像
    └── test-users.json              # 测试用户数据
```

## 运行测试

### 基本运行

```bash
# 运行所有宠物权限测试
node frontend/e2e/run-pet-permissions-tests.cjs

# 或使用npm脚本
npm run test:pet-permissions
```

### 运行特定测试套件

```bash
# 运行访问权限测试
node frontend/e2e/run-pet-permissions-tests.cjs suite access

# 运行共享功能测试
node frontend/e2e/run-pet-permissions-tests.cjs suite sharing

# 运行多用户权限测试
node frontend/e2e/run-pet-permissions-tests.cjs suite multi-user

# 运行隐私保护测试
node frontend/e2e/run-pet-permissions-tests.cjs suite privacy

# 运行安全边界测试
node frontend/e2e/run-pet-permissions-tests.cjs suite security
```

### 性能测试

```bash
# 运行并发性能测试
node frontend/e2e/run-pet-permissions-tests.cjs performance
```

### 环境配置

```bash
# 在staging环境运行
node frontend/e2e/run-pet-permissions-tests.cjs --env staging

# 有头模式运行（用于调试）
node frontend/e2e/run-pet-permissions-tests.cjs --headed

# 启用调试模式
node frontend/e2e/run-pet-permissions-tests.cjs --debug
```

## 测试数据管理

### 自动清理

测试运行后会自动清理创建的测试数据，包括：
- 测试用户账户
- 测试宠物数据
- 测试分析记录
- 上传的测试文件

### 手动清理

```bash
# 完整清理所有测试数据
node frontend/e2e/utils/cleanup-test-data.js full

# 快速清理最近1小时的数据
node frontend/e2e/utils/cleanup-test-data.js quick

# 重置数据库到初始状态（仅测试环境）
node frontend/e2e/utils/cleanup-test-data.js reset
```

## 测试用例详解

### 1. 用户只能查看自己的宠物

**测试目标**: 验证用户数据隔离
**测试步骤**:
1. 创建两个测试用户
2. 每个用户创建自己的宠物
3. 验证用户只能看到自己的宠物
4. 确认无法看到其他用户的宠物

**预期结果**: 用户宠物列表只包含自己创建的宠物

### 2. 宠物分享功能

**测试目标**: 验证宠物分享机制
**测试步骤**:
1. 用户A创建宠物
2. 用户A分享宠物给用户B
3. 用户B登录查看共享宠物
4. 验证权限级别正确

**预期结果**: 用户B可以按照分享权限访问宠物

### 3. 权限撤销功能

**测试目标**: 验证权限撤销机制
**测试步骤**:
1. 用户A分享宠物给用户B
2. 用户A撤销分享权限
3. 用户B再次登录
4. 验证无法再访问该宠物

**预期结果**: 权限撤销后用户B无法访问宠物

### 4. 并发用户操作

**测试目标**: 验证并发安全性
**测试步骤**:
1. 创建多个浏览器上下文
2. 每个上下文模拟不同用户
3. 同时执行宠物操作
4. 验证数据一致性

**预期结果**: 并发操作不会产生数据冲突

### 5. 安全攻击防护

**测试目标**: 验证安全防护机制
**测试步骤**:
1. 尝试SQL注入攻击
2. 尝试XSS攻击
3. 尝试权限提升攻击
4. 验证攻击被正确阻止

**预期结果**: 所有攻击尝试都被成功阻止

## 环境要求

### 前端环境
- Node.js 16+
- Playwright 1.40+
- 前端应用运行在 http://localhost:3000

### 后端环境
- 后端API运行在 http://localhost:5000
- 测试数据库（独立于生产数据库）
- 支持测试API端点（/api/test/*）

### 测试API端点

后端需要提供以下测试专用API端点：

```
GET  /api/test/users           # 获取所有测试用户
GET  /api/test/pets            # 获取所有测试宠物
GET  /api/test/analysis-records # 获取所有测试分析记录
POST /api/test/cleanup-all     # 清理所有测试数据
POST /api/test/cleanup-recent  # 清理最近的测试数据
POST /api/test/reset-database  # 重置数据库
POST /api/test/cleanup-uploads # 清理测试上传文件
POST /api/test/cleanup-sessions # 清理测试会话
```

## 配置文件

### Playwright配置

测试使用 `frontend/playwright.config.ts` 中的配置，主要设置：

```typescript
{
  testDir: './e2e',
  timeout: 60000,
  retries: 2,
  workers: 2,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
}
```

### 环境变量

```bash
# 测试环境
NODE_ENV=test

# 前端URL
BASE_URL=http://localhost:3000

# 后端API URL
API_BASE_URL=http://localhost:5000/api

# 测试环境标识
TEST_ENV=development

# 调试模式
DEBUG=false
```

## 故障排除

### 常见问题

1. **测试超时**
   - 检查前后端服务是否正常运行
   - 增加测试超时时间
   - 检查网络连接

2. **数据清理失败**
   - 手动运行清理脚本
   - 检查数据库连接
   - 重置测试数据库

3. **权限测试失败**
   - 检查认证机制是否正常
   - 验证JWT token生成和验证
   - 检查API权限控制逻辑

4. **并发测试不稳定**
   - 减少并发数量
   - 增加等待时间
   - 检查数据库事务处理

### 调试技巧

1. **启用调试模式**
   ```bash
   node frontend/e2e/run-pet-permissions-tests.cjs --debug --headed
   ```

2. **查看测试报告**
   ```bash
   npx playwright show-report
   ```

3. **单独运行失败的测试**
   ```bash
   npx playwright test --grep "特定测试名称"
   ```

4. **查看测试截图和视频**
   - 失败测试的截图保存在 `test-results/` 目录
   - 启用视频录制可以查看完整测试过程

## 最佳实践

### 测试编写

1. **独立性**: 每个测试用例应该独立，不依赖其他测试
2. **清理**: 测试后及时清理创建的数据
3. **等待**: 使用适当的等待策略，避免竞态条件
4. **断言**: 使用明确的断言，便于问题定位

### 数据管理

1. **唯一性**: 使用时间戳确保测试数据唯一性
2. **隔离**: 测试数据与生产数据完全隔离
3. **清理**: 定期清理测试数据，避免数据库膨胀
4. **备份**: 重要测试前备份数据库状态

### 性能优化

1. **并行**: 合理使用并行执行提高测试速度
2. **复用**: 复用浏览器上下文和页面对象
3. **缓存**: 缓存常用的测试数据和状态
4. **选择**: 只运行必要的测试用例

## 维护指南

### 定期维护

1. **更新依赖**: 定期更新Playwright和相关依赖
2. **清理数据**: 定期清理累积的测试数据
3. **性能监控**: 监控测试执行时间和成功率
4. **文档更新**: 及时更新测试文档和说明

### 扩展测试

1. **新功能**: 为新的权限功能添加对应测试
2. **边界情况**: 补充边界情况和异常场景测试
3. **性能测试**: 添加更多性能和压力测试
4. **兼容性**: 增加跨浏览器和设备兼容性测试

## 联系信息

如有问题或建议，请联系：
- 测试团队: test-team@company.com
- 开发团队: dev-team@company.com
- 项目经理: pm@company.com