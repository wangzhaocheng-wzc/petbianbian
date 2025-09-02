# 错误处理测试套件

本目录包含所有错误处理相关的端到端测试，确保应用在各种错误情况下都能正确处理并提供良好的用户体验。

## 测试覆盖范围

### 网络错误处理测试 (network-error-handling.spec.ts)
- 网络中断和连接超时处理
- 离线模式和数据同步测试
- 网络恢复和重连机制测试
- DNS解析失败处理
- 网络不稳定处理
- 慢网络连接处理
- Service Worker缓存策略
- 请求队列管理

### 服务器错误处理测试 (server-error-handling.spec.ts)
- HTTP 4xx 客户端错误处理
- HTTP 5xx 服务器错误处理
- 错误页面显示和用户引导
- 错误恢复和重试机制
- 用户友好的错误消息
- 错误状态的响应式设计

### 客户端错误处理测试 (client-error-handling.spec.ts)
- JavaScript运行时错误处理
- Promise rejection错误处理
- 资源加载错误处理
- 内存泄漏检测
- 性能问题检测
- 错误报告和用户反馈收集
- 错误恢复和降级策略

## 运行测试

### 运行所有错误处理测试
```bash
node frontend/e2e/run-error-handling-tests.cjs
```

### 运行特定测试文件
```bash
# 网络错误处理测试
npx playwright test specs/error-handling/network-error-handling.spec.ts

# 服务器错误处理测试
npx playwright test specs/error-handling/server-error-handling.spec.ts

# 客户端错误处理测试
npx playwright test specs/error-handling/client-error-handling.spec.ts

# 简化版服务器错误测试
npx playwright test specs/error-handling/server-error-simple.spec.ts
```

### 运行测试并生成报告
```bash
npx playwright test specs/error-handling/ --reporter=html
```

## 测试数据

测试使用以下工具和数据：
- `NetworkErrorUtils`: 网络错误处理测试工具类
- `ServerErrorUtils`: 服务器错误处理测试工具类
- `ClientErrorUtils`: 客户端错误处理测试工具类
- `APIMocker`: API响应模拟器
- `TestDataManager`: 测试数据管理器

## 测试场景

### 网络错误场景
1. **网络完全中断** - 模拟网络断开
2. **连接超时** - 模拟请求超时
3. **DNS解析失败** - 模拟域名解析错误
4. **网络不稳定** - 模拟间歇性连接问题
5. **慢网络连接** - 模拟网络延迟
6. **离线数据缓存** - 验证离线数据存储
7. **数据同步** - 验证网络恢复后的同步
8. **Service Worker** - 验证缓存策略

### 服务器错误场景
1. **400 Bad Request** - 请求格式错误
2. **401 Unauthorized** - 未授权访问
3. **403 Forbidden** - 权限不足
4. **404 Not Found** - 资源不存在
5. **409 Conflict** - 数据冲突
6. **422 Validation Error** - 数据验证失败
7. **429 Rate Limited** - 请求频率限制
8. **500 Internal Server Error** - 服务器内部错误
9. **502 Bad Gateway** - 网关错误
10. **503 Service Unavailable** - 服务不可用
11. **504 Gateway Timeout** - 网关超时

### 客户端错误场景
1. **JavaScript运行时错误** - 代码执行错误
2. **Promise rejection** - 未处理的Promise错误
3. **资源加载错误** - 图片、脚本加载失败
4. **内存泄漏** - 内存使用异常增长
5. **性能问题** - 长时间运行的任务
6. **错误边界** - React错误边界处理
7. **错误报告** - 用户反馈收集
8. **错误恢复** - 自动和手动恢复机制

### 错误处理验证
- 错误页面基本元素显示
- 用户友好的错误消息
- 重试按钮功能
- 导航按钮可用性
- 联系支持功能
- 倒计时功能（限流场景）
- 表单状态保持
- 字段级错误消息
- 自动重试指示器
- 熔断器状态
- 响应式设计适配
- 离线功能可用性
- 数据同步状态
- 错误统计和分析
- 可访问性支持

## 实现文件

### 测试规范文件
- `network-error-handling.spec.ts` - 网络错误处理测试
- `server-error-handling.spec.ts` - 完整的服务器错误处理测试
- `client-error-handling.spec.ts` - 客户端错误处理测试
- `server-error-simple.spec.ts` - 简化版服务器错误测试

### 工具类文件
- `../utils/network-error-utils.ts` - 网络错误测试工具类
- `../utils/server-error-utils.ts` - 服务器错误测试工具类
- `../utils/client-error-utils.ts` - 客户端错误测试工具类

### 运行器文件
- `run-error-handling-tests.cjs` - 错误处理测试总运行器
- `run-server-error-tests.cjs` - 服务器错误测试运行器

## 注意事项

1. **测试隔离**: 每个测试用例都会清理测试数据，确保测试之间不相互影响
2. **错误模拟**: 使用 Playwright 的路由拦截功能模拟各种错误情况
3. **响应式测试**: 测试在不同屏幕尺寸下的错误页面显示
4. **可访问性**: 验证错误页面的键盘导航和屏幕阅读器兼容性
5. **多语言**: 支持中英文错误消息的测试
6. **浏览器兼容性**: 某些功能（如memory API）可能不被所有浏览器支持
7. **网络模拟**: 网络错误测试需要浏览器上下文支持
8. **内存监控**: 内存相关测试仅在支持的浏览器中运行

## 扩展测试

如需添加新的错误处理测试：

1. 在相应的测试文件中添加新的测试用例
2. 在对应的工具类中添加新的辅助方法
3. 更新本 README 文档
4. 在运行器中添加新的测试套件（如果需要）
5. 运行测试确保新功能正常工作

## 测试报告

运行测试后，可以在以下位置查看详细报告：
- HTML报告: `playwright-report/index.html`
- JSON报告: `test-results/`
- 控制台输出: 实时测试进度和结果

## 最佳实践

### 错误处理测试
1. **全面覆盖**：测试所有可能的错误状态码和网络情况
2. **用户体验**：验证错误消息的友好性和可访问性
3. **恢复机制**：确保用户可以从各种错误中恢复
4. **状态保持**：验证错误后用户状态和数据不丢失

### 测试稳定性
1. **模拟真实场景**：使用真实的错误响应和网络条件
2. **时间控制**：合理设置等待和超时时间
3. **清理机制**：每个测试后清理状态和路由拦截
4. **隔离性**：测试之间不相互影响

### 调试技巧
1. **详细日志**：记录错误上下文信息和网络状态
2. **截图捕获**：失败时自动截图保存现场
3. **网络监控**：记录所有网络请求和响应
4. **状态快照**：保存页面状态用于分析

## 故障排除

### 常见问题

1. **测试超时**
   - 检查网络连接和路由拦截配置
   - 增加超时时间或优化等待策略
   - 验证API模拟和错误触发逻辑

2. **元素未找到**
   - 检查选择器是否正确
   - 验证错误页面是否正确渲染
   - 确认错误状态下的UI变化

3. **网络模拟失效**
   - 检查路由拦截配置
   - 验证浏览器上下文设置
   - 确认网络状态监听器

4. **内存测试跳过**
   - 确认浏览器支持memory API
   - 检查测试跳过逻辑
   - 验证内存监控代码

### 调试命令

```bash
# 查看详细测试输出
npx playwright test specs/error-handling/ --reporter=line

# 生成HTML测试报告
npx playwright test specs/error-handling/ --reporter=html

# 保留浏览器窗口用于调试
npx playwright test specs/error-handling/ --headed --debug

# 运行特定测试并显示详细信息
npx playwright test specs/error-handling/network-error-handling.spec.ts --reporter=line
```