# 宠物权限管理测试运行指南

## 快速开始

### 方法1: 使用npm脚本 (推荐)

从项目根目录运行:

```bash
# 运行所有宠物权限测试
npm run test:pet-permissions

# 运行特定测试套件
npm run test:pet-permissions:access      # 访问权限测试
npm run test:pet-permissions:sharing     # 共享功能测试
npm run test:pet-permissions:privacy     # 隐私保护测试
npm run test:pet-permissions:security    # 安全边界测试
npm run test:pet-permissions:performance # 性能测试

# 清理测试数据
npm run cleanup:test-data
```

从frontend目录运行:

```bash
cd frontend

# 运行所有宠物权限测试
npm run test:pet-permissions

# 运行特定测试套件
npm run test:pet-permissions:access
npm run test:pet-permissions:sharing
npm run test:pet-permissions:privacy
npm run test:pet-permissions:security
npm run test:pet-permissions:performance

# 清理测试数据
npm run cleanup:test-data
```

### 方法2: 使用Windows脚本

#### 使用批处理脚本 (.bat)

```cmd
# 从项目根目录运行
run-pet-permissions-tests.bat

# 运行特定测试套件
run-pet-permissions-tests.bat suite access
run-pet-permissions-tests.bat suite sharing
run-pet-permissions-tests.bat suite privacy

# 运行性能测试
run-pet-permissions-tests.bat performance

# 清理测试数据
run-pet-permissions-tests.bat cleanup
```

#### 使用PowerShell脚本 (.ps1)

```powershell
# 从项目根目录运行
.\run-pet-permissions-tests.ps1

# 运行特定测试套件
.\run-pet-permissions-tests.ps1 suite access
.\run-pet-permissions-tests.ps1 suite sharing
.\run-pet-permissions-tests.ps1 suite privacy

# 有头模式运行 (用于调试)
.\run-pet-permissions-tests.ps1 -Headed

# 启用调试模式
.\run-pet-permissions-tests.ps1 -Debug

# 在staging环境运行
.\run-pet-permissions-tests.ps1 -Env staging
```

### 方法3: 直接使用Node.js

从frontend目录运行:

```bash
cd frontend

# 运行所有测试
node e2e/run-pet-permissions-tests.cjs

# 运行特定测试套件
node e2e/run-pet-permissions-tests.cjs suite access
node e2e/run-pet-permissions-tests.cjs suite sharing
node e2e/run-pet-permissions-tests.cjs suite privacy
node e2e/run-pet-permissions-tests.cjs suite security

# 运行性能测试
node e2e/run-pet-permissions-tests.cjs performance

# 清理测试数据
node e2e/utils/cleanup-test-data.cjs
```

## 测试套件说明

### 1. 访问权限测试 (access)
- 用户只能查看自己的宠物
- 未登录用户无法访问宠物管理
- 防止通过URL直接访问其他用户宠物

### 2. 共享功能测试 (sharing)
- 宠物主人可以分享宠物给其他用户
- 被分享用户具有正确的权限级别
- 主人可以撤销分享权限

### 3. 多用户权限测试 (multi-user)
- 多个用户同时管理各自宠物
- 用户操作不影响其他用户数据
- 并发操作安全性

### 4. 隐私保护测试 (privacy)
- 宠物敏感信息访问控制
- 医疗记录隐私保护
- 图片隐私保护
- 数据导出权限控制

### 5. 安全边界测试 (security)
- SQL注入攻击防护
- XSS攻击防护
- 权限提升攻击防护
- 会话劫持防护

### 6. 性能测试 (performance)
- 并发用户操作性能
- 大量数据处理性能
- 内存使用监控

## 环境要求

### 前端环境
- Node.js 16+
- 前端应用运行在 http://localhost:3000

### 后端环境
- 后端API运行在 http://localhost:5000
- 测试数据库（独立于生产数据库）

### 启动服务

在运行测试前，请确保前后端服务正在运行:

```bash
# 启动前后端服务
npm run dev

# 或分别启动
npm run dev:frontend  # 前端服务
npm run dev:backend   # 后端服务
```

## 常见问题解决

### 1. 模块找不到错误

**错误**: `Cannot find module 'C:\...\frontend\frontend\e2e\...'`

**解决方案**: 确保在正确的目录运行命令
- 如果在项目根目录，使用: `npm run test:pet-permissions`
- 如果在frontend目录，使用: `npm run test:pet-permissions` 或 `node e2e/run-pet-permissions-tests.cjs`

### 2. 权限错误 (PowerShell)

**错误**: `execution of scripts is disabled on this system`

**解决方案**: 
```powershell
# 临时允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 或使用绕过策略运行
powershell -ExecutionPolicy Bypass -File run-pet-permissions-tests.ps1
```

### 3. 测试超时

**解决方案**:
- 检查前后端服务是否正常运行
- 增加测试超时时间: `--timeout 120000`
- 检查网络连接

### 4. 数据清理失败

**解决方案**:
```bash
# 手动清理测试数据
npm run cleanup:test-data

# 或重置数据库 (仅测试环境)
cd frontend
node e2e/utils/cleanup-test-data.cjs reset
```

## 调试技巧

### 1. 有头模式运行
```bash
# 查看浏览器操作过程
npm run test:pet-permissions -- --headed
```

### 2. 启用调试模式
```bash
# 显示详细日志
npm run test:pet-permissions -- --debug
```

### 3. 运行单个测试
```bash
# 使用Playwright直接运行
cd frontend
npx playwright test --grep "用户只能查看自己的宠物"
```

### 4. 查看测试报告
```bash
# 生成并查看HTML报告
cd frontend
npx playwright show-report
```

## 高级选项

### 环境配置
```bash
# 在staging环境运行
npm run test:pet-permissions -- --env staging

# 自定义API地址
API_BASE_URL=http://custom-api.com npm run test:pet-permissions
```

### 并发配置
```bash
# 设置工作进程数
npm run test:pet-permissions -- --workers 4

# 设置重试次数
npm run test:pet-permissions -- --retries 3
```

### 浏览器选择
```bash
# 只在Chrome运行
cd frontend
npx playwright test --project=chromium e2e/specs/pets/pet-permissions.spec.ts

# 在所有浏览器运行
npx playwright test --project=chromium,firefox,webkit e2e/specs/pets/pet-permissions.spec.ts
```

## 持续集成

在CI/CD环境中运行测试:

```yaml
# GitHub Actions 示例
- name: Run Pet Permissions Tests
  run: |
    npm run dev &
    sleep 30
    npm run test:pet-permissions
    npm run cleanup:test-data
```

## 联系支持

如果遇到问题，请:
1. 查看测试日志和截图
2. 检查环境配置
3. 联系开发团队获取支持