# 数据流集成测试套件

## 概述

本测试套件专注于验证宠物健康监测平台的数据流完整性，包括端到端数据流、API集成和数据库集成测试。

## 测试文件结构

```
specs/integration/
├── end-to-end-dataflow.spec.ts    # 端到端数据流测试
├── api-integration.spec.ts        # API集成测试  
├── database-integration.spec.ts   # 数据库集成测试
└── README.md                      # 本文档
```

## 测试覆盖范围

### 1. 端到端数据流测试 (end-to-end-dataflow.spec.ts)

**测试目标**: 验证从用户注册到分析完成的完整数据流

**主要测试用例**:
- ✅ 完整用户注册到分析完成流程
- ✅ 数据在前后端传输验证
- ✅ 数据一致性和完整性检查
- ✅ 跨页面数据状态一致性
- ✅ 并发操作数据一致性

**验证要点**:
- 用户注册 → 宠物创建 → 图片上传 → 分析执行 → 结果保存的完整链路
- 网络请求和响应的正确性
- 前端显示与后端数据的一致性
- 多用户并发操作的数据隔离

### 2. API集成测试 (api-integration.spec.ts)

**测试目标**: 验证所有API端点的功能性和可靠性

**主要测试模块**:
- ✅ 认证API端点测试 (注册、登录、资料管理)
- ✅ 宠物管理API端点测试 (CRUD操作)
- ✅ 分析API端点测试 (上传、分析、结果获取)
- ✅ 记录管理API端点测试 (保存、查询记录)
- ✅ API错误处理测试 (401, 403, 404, 400, 429)
- ✅ API性能测试 (响应时间、并发处理)
- ✅ API版本兼容性测试

**验证要点**:
- HTTP状态码正确性
- 响应数据格式和内容
- 错误处理和用户友好提示
- API性能指标
- 向后兼容性

### 3. 数据库集成测试 (database-integration.spec.ts)

**测试目标**: 验证数据库操作的正确性和性能

**主要测试模块**:
- ✅ 数据库操作和事务处理测试
- ✅ 数据备份恢复和迁移测试
- ✅ 数据库性能和并发访问测试

**验证要点**:
- 事务完整性和回滚机制
- 数据一致性约束
- 并发访问的事务隔离
- 大数据量查询性能
- 连接池管理
- 数据迁移兼容性

## 运行测试

### 快速运行
```bash
# 运行所有集成测试
node frontend/e2e/run-integration-tests.cjs

# 或使用npm脚本
npm run test:integration
```

### 单独运行测试文件
```bash
# 端到端数据流测试
npx playwright test specs/integration/end-to-end-dataflow.spec.ts

# API集成测试
npx playwright test specs/integration/api-integration.spec.ts

# 数据库集成测试  
npx playwright test specs/integration/database-integration.spec.ts
```

### 调试模式运行
```bash
# 以调试模式运行
npx playwright test specs/integration/ --debug

# 以UI模式运行
npx playwright test specs/integration/ --ui
```

## 环境要求

### 必需服务
- ✅ 后端API服务 (http://localhost:5000)
- ✅ MongoDB数据库
- ✅ 前端开发服务器 (http://localhost:3000)

### 环境变量
```bash
NODE_ENV=test
API_BASE_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/pet-health-test
```

### 测试数据
- 测试图片文件位于 `frontend/e2e/fixtures/images/`
- 测试数据模板位于 `frontend/e2e/fixtures/`
- 自动生成的测试用户和宠物数据

## 测试配置

### 超时设置
- 单个测试用例: 60秒
- API请求: 30秒
- 页面操作: 10秒

### 重试策略
- 失败重试次数: 2次
- 并发执行: 2个worker

### 浏览器配置
- 默认浏览器: Chromium
- 支持: Chrome, Firefox, Safari
- 移动端: 模拟移动设备

## 数据清理

### 自动清理
- 每个测试用例前后自动清理测试数据
- 使用独立的测试数据库
- 避免测试间相互影响

### 手动清理
```bash
# 清理测试数据
node frontend/e2e/utils/cleanup-test-data.js

# 重置测试数据库
npm run db:reset:test
```

## 故障排除

### 常见问题

1. **连接超时**
   - 检查后端服务是否运行
   - 验证API_BASE_URL配置
   - 确认网络连接正常

2. **数据库错误**
   - 检查MongoDB服务状态
   - 验证数据库连接字符串
   - 确认测试数据库权限

3. **测试不稳定**
   - 增加等待时间
   - 检查页面元素选择器
   - 验证测试数据清理

4. **API错误**
   - 检查API端点是否正确
   - 验证认证token有效性
   - 确认请求数据格式

### 调试技巧

1. **使用截图**
   ```typescript
   await page.screenshot({ path: 'debug-screenshot.png' });
   ```

2. **查看网络请求**
   ```typescript
   page.on('request', request => console.log(request.url()));
   page.on('response', response => console.log(response.status()));
   ```

3. **控制台日志**
   ```typescript
   page.on('console', msg => console.log(msg.text()));
   ```

## 性能指标

### 目标指标
- API响应时间: < 2秒
- 页面加载时间: < 3秒
- 数据库查询: < 1秒
- 并发处理: 支持5个并发用户

### 监控指标
- 测试执行时间
- 内存使用情况
- 网络请求数量
- 数据库连接数

## 报告和分析

### 测试报告
- HTML报告: `playwright-report/index.html`
- JSON报告: `test-results/results.json`
- 截图和视频: `test-results/`

### 查看报告
```bash
# 打开HTML报告
npx playwright show-report

# 查看测试结果
cat test-results/results.json | jq
```

## 持续集成

### GitHub Actions
测试会在以下情况自动运行:
- Pull Request创建或更新
- 主分支代码推送
- 每日定时运行

### 集成配置
```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
    npx playwright show-report --reporter=github
```

## 最佳实践

### 测试编写
1. 使用描述性的测试名称
2. 保持测试独立性
3. 适当使用等待策略
4. 验证关键业务逻辑

### 数据管理
1. 使用测试专用数据库
2. 每次测试后清理数据
3. 使用工厂模式生成测试数据
4. 避免硬编码测试数据

### 错误处理
1. 捕获和记录详细错误信息
2. 提供有意义的断言消息
3. 在失败时保存调试信息
4. 实现适当的重试机制

## 贡献指南

### 添加新测试
1. 在相应的spec文件中添加测试用例
2. 更新README文档
3. 确保测试通过CI检查
4. 添加必要的测试数据和工具

### 修改现有测试
1. 保持向后兼容性
2. 更新相关文档
3. 验证不影响其他测试
4. 添加变更说明

---

**维护者**: Playwright测试团队  
**最后更新**: 2024-12-29  
**版本**: 1.0.0