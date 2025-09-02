# 宠物权限管理测试问题解决方案

## 问题分析

您遇到的错误是因为在 `frontend` 目录中运行命令时，路径被重复了，导致系统尝试访问 `frontend/frontend/e2e/...` 这样的错误路径。

**错误示例:**
```
Error: Cannot find module 'C:\Users\86137\Desktop\xm\pet\frontend\frontend\e2e\run-pet-permissions-tests.cjs'
```

## 解决方案

我已经创建了多种运行测试的方法，解决了路径问题：

### 1. 使用 npm 脚本 (推荐方法)

#### 从项目根目录运行:
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

#### 从 frontend 目录运行:
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

### 2. 使用 Windows 脚本

#### 批处理脚本 (.bat) - 从项目根目录运行:
```cmd
# 运行所有测试
run-tests.bat

# 运行特定测试套件
run-tests.bat suite access
run-tests.bat suite sharing
run-tests.bat suite privacy
run-tests.bat suite security

# 运行性能测试
run-tests.bat performance

# 清理测试数据
run-tests.bat cleanup
```

#### PowerShell 脚本 (.ps1) - 从项目根目录运行:
```powershell
# 运行所有测试
.\run-tests.ps1

# 运行特定测试套件
.\run-tests.ps1 suite access
.\run-tests.ps1 suite sharing
.\run-tests.ps1 suite privacy
.\run-tests.ps1 suite security

# 有头模式运行 (用于调试)
.\run-tests.ps1 -Headed

# 启用调试模式
.\run-tests.ps1 -Debug

# 在staging环境运行
.\run-tests.ps1 -Env staging
```

### 3. 直接使用 Node.js (从 frontend 目录)

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

## 环境验证

运行以下命令验证环境是否正确配置:

```bash
# 从项目根目录运行
node verify-test-setup.js
```

这将检查所有必要的文件、脚本和依赖是否正确安装。

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
**解决方案**: 使用正确的运行方法，推荐使用 npm 脚本

### 2. PowerShell 执行策略错误
```powershell
# 临时允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. 测试超时
- 检查前后端服务是否正常运行
- 检查网络连接
- 使用 `--timeout` 选项增加超时时间

### 4. 数据清理失败
```bash
# 手动清理测试数据
npm run cleanup:test-data
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

### 3. 查看测试报告
```bash
cd frontend
npx playwright show-report
```

## 文件结构

创建的主要文件:
- `frontend/e2e/specs/pets/pet-permissions.spec.ts` - 主测试文件
- `frontend/e2e/run-pet-permissions-tests.cjs` - 测试运行器
- `frontend/e2e/utils/cleanup-test-data.cjs` - 数据清理工具
- `run-tests.bat` - Windows批处理脚本
- `run-tests.ps1` - PowerShell脚本
- `verify-test-setup.js` - 环境验证脚本
- `PET_PERMISSIONS_TEST_GUIDE.md` - 详细使用指南

## 快速开始

1. **验证环境**:
   ```bash
   node verify-test-setup.js
   ```

2. **启动服务**:
   ```bash
   npm run dev
   ```

3. **运行测试**:
   ```bash
   npm run test:pet-permissions
   ```

现在您可以成功运行宠物权限管理测试了！