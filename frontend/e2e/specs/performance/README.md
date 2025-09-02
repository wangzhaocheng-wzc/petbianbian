# 性能测试套件

本目录包含了宠物健康监测社区平台的完整性能测试套件，包括页面加载性能、交互性能、负载测试和压力测试。

## 测试文件结构

```
performance/
├── README.md                           # 本文档
├── page-load-performance.spec.ts       # 页面加载性能测试
├── interaction-performance.spec.ts     # 交互性能测试
├── interaction-performance-minimal.spec.ts # 简化交互性能测试
├── load-stress-testing.spec.ts         # 负载和压力测试
└── run-*.cjs                          # 各种测试运行器
```

## 测试类型

### 1. 页面加载性能测试 (page-load-performance.spec.ts)

测试各个页面的加载性能指标：
- **首次内容绘制 (FCP)**: 页面开始渲染内容的时间
- **最大内容绘制 (LCP)**: 最大内容元素渲染完成的时间
- **DOM内容加载完成**: DOM解析完成的时间
- **页面完全加载**: 所有资源加载完成的时间

**性能阈值:**
- FCP < 2000ms
- LCP < 4000ms
- DOM加载 < 3000ms

### 2. 交互性能测试 (interaction-performance.spec.ts)

测试用户交互的响应时间：
- **登录响应时间**: 用户登录操作的完成时间
- **页面导航时间**: 页面间跳转的时间
- **表单提交时间**: 表单处理和响应时间
- **图片上传时间**: 文件上传和处理时间

**性能阈值:**
- 登录 < 3000ms
- 导航 < 2000ms
- 表单提交 < 2000ms
- 图片上传 < 10000ms

### 3. 负载和压力测试 (load-stress-testing.spec.ts)

测试系统在高并发情况下的表现：

#### 并发用户访问测试
- **多用户同时登录**: 测试认证系统的并发处理能力
- **多用户同时上传分析**: 测试图片分析功能的并发性能
- **多用户同时浏览社区**: 测试社区功能的并发访问

#### 系统资源监控测试
- **内存使用监控**: 监控JavaScript堆内存使用情况
- **网络请求监控**: 监控API请求的成功率和响应时间
- **页面性能指标监控**: 监控Core Web Vitals指标

#### 性能瓶颈识别测试
- **慢查询识别**: 识别响应时间超过2秒的API请求
- **资源加载瓶颈识别**: 识别大文件和慢加载资源
- **用户体验瓶颈识别**: 识别影响用户交互的性能问题

## 支持工具

### 1. LoadTestingUtils (utils/load-testing-utils.ts)

负载测试工具类，提供：
- **并发会话管理**: 创建和管理多个用户会话
- **网络监控**: 监控请求响应时间和成功率
- **系统指标收集**: 收集内存、性能和网络指标
- **测试报告生成**: 生成详细的负载测试报告

### 2. SystemMonitor (utils/system-monitor.ts)

系统资源监控工具，提供：
- **内存监控**: 监控JavaScript堆内存使用
- **性能监控**: 监控页面加载和渲染性能
- **网络监控**: 监控网络请求和响应
- **长任务监控**: 监控阻塞主线程的长任务

### 3. BottleneckAnalyzer (utils/bottleneck-analyzer.ts)

性能瓶颈分析工具，提供：
- **网络瓶颈分析**: 识别慢请求、失败请求和大文件传输
- **渲染瓶颈分析**: 识别渲染性能问题
- **内存瓶颈分析**: 识别内存泄漏和过度使用
- **JavaScript瓶颈分析**: 识别长任务和脚本性能问题

## 运行测试

### 单独运行测试

```bash
# 页面加载性能测试
npx playwright test frontend/e2e/specs/performance/page-load-performance.spec.ts

# 交互性能测试
npx playwright test frontend/e2e/specs/performance/interaction-performance.spec.ts

# 负载和压力测试
npx playwright test frontend/e2e/specs/performance/load-stress-testing.spec.ts
```

### 使用测试运行器

```bash
# 运行交互性能测试（完整版）
node frontend/e2e/run-interaction-performance-tests.cjs

# 运行交互性能测试（简化版）
node frontend/e2e/run-interaction-performance-tests-simple.cjs

# 运行负载和压力测试
node frontend/e2e/run-load-stress-tests.cjs
```

### 负载测试配置

负载测试支持通过环境变量配置：

```bash
# 设置并发用户数
export LOAD_TEST_USERS=5

# 设置测试持续时间（毫秒）
export LOAD_TEST_DURATION=60000

# 设置用户启动间隔（毫秒）
export LOAD_TEST_RAMP_UP=10000

# 运行测试
npx playwright test frontend/e2e/specs/performance/load-stress-testing.spec.ts
```

## 性能基准

### 页面加载性能基准

| 页面 | FCP目标 | LCP目标 | DOM加载目标 |
|------|---------|---------|-------------|
| 登录页 | < 1500ms | < 3000ms | < 2000ms |
| 首页 | < 2000ms | < 4000ms | < 3000ms |
| 分析页 | < 2000ms | < 4000ms | < 3000ms |
| 社区页 | < 2500ms | < 5000ms | < 3500ms |

### 交互性能基准

| 操作 | 响应时间目标 | 说明 |
|------|-------------|------|
| 用户登录 | < 3000ms | 包含网络请求和页面跳转 |
| 页面导航 | < 2000ms | 页面间跳转时间 |
| 表单提交 | < 2000ms | 表单验证和提交 |
| 图片上传 | < 10000ms | 文件上传和预处理 |
| 图片分析 | < 30000ms | AI分析处理时间 |

### 负载测试基准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 并发登录成功率 | > 80% | 5个并发用户 |
| 并发分析成功率 | > 70% | 3个并发用户 |
| 并发浏览成功率 | > 90% | 8个并发用户 |
| 平均响应时间 | < 5000ms | API请求响应时间 |
| 内存增长率 | < 200% | 页面使用过程中的内存增长 |

## 性能优化建议

### 网络优化
- 启用HTTP/2和资源预加载
- 使用CDN加速静态资源
- 实现API响应缓存
- 压缩图片和启用WebP格式

### 渲染优化
- 优化关键渲染路径
- 实现代码分割和懒加载
- 减少阻塞渲染的资源
- 使用虚拟滚动处理大列表

### JavaScript优化
- 拆分长任务为小任务
- 使用Web Workers处理计算密集型任务
- 移除未使用的代码
- 优化算法复杂度

### 内存优化
- 及时清理不用的对象
- 使用对象池模式
- 实现数据懒加载
- 优化数据结构

## 故障排除

### 常见问题

1. **测试超时**
   - 增加测试超时时间
   - 检查网络连接
   - 确认服务器响应正常

2. **内存不足**
   - 减少并发用户数
   - 增加测试环境内存
   - 优化测试数据大小

3. **网络错误**
   - 检查API端点可用性
   - 确认测试数据正确性
   - 检查网络连接稳定性

### 调试技巧

1. **启用详细日志**
   ```bash
   DEBUG=pw:api npx playwright test
   ```

2. **保存测试截图**
   ```bash
   npx playwright test --screenshot=on
   ```

3. **生成测试报告**
   ```bash
   npx playwright test --reporter=html
   ```

## 持续集成

性能测试可以集成到CI/CD流水线中：

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install
      - name: Run performance tests
        run: |
          node frontend/e2e/run-interaction-performance-tests-simple.cjs
          node frontend/e2e/run-load-stress-tests.cjs
```

## 扩展和定制

### 添加新的性能测试

1. 在相应的spec文件中添加测试用例
2. 更新性能阈值和基准
3. 添加相应的测试运行器配置
4. 更新文档

### 自定义性能指标

1. 扩展SystemMonitor类添加新指标
2. 在BottleneckAnalyzer中添加新的分析逻辑
3. 更新测试报告格式
4. 添加相应的阈值检查

### 集成外部监控工具

可以集成如下工具增强性能监控：
- Lighthouse CI
- WebPageTest
- New Relic
- DataDog

通过这个完整的性能测试套件，可以全面监控和优化宠物健康监测社区平台的性能表现。