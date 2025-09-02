# 社区功能测试套件

本目录包含宠物健康社区平台的社区功能端到端测试。

## 测试文件结构

```
community/
├── README.md                           # 本文档
├── post-management.spec.ts             # 帖子管理功能测试
└── community-interaction.spec.ts       # 社区互动功能测试
```

## 测试覆盖范围

### 1. 帖子管理测试 (post-management.spec.ts)
- ✅ 帖子创建和发布
- ✅ 富文本编辑器功能
- ✅ 图片上传和管理
- ✅ 帖子编辑和删除
- ✅ 草稿保存和管理
- ✅ 帖子搜索和筛选
- ✅ 内容审核和举报

### 2. 社区互动测试 (community-interaction.spec.ts)
- ✅ 点赞功能
  - 点赞和取消点赞
  - 防重复点赞
  - 点赞用户列表
- ✅ 评论功能
  - 发表评论
  - 回复评论
  - 评论分页
  - 删除评论
- ✅ 分享功能
  - 社交平台分享
  - 分享链接生成
  - 复制分享链接
- ✅ 用户关注功能
  - 关注和取消关注
  - 关注者列表
  - 互相关注
  - 关注动态
- ✅ 私信功能
  - 发送私信
  - 回复私信
  - 会话管理
  - 消息删除
  - 未读消息
- ✅ 社区活动
  - 创建活动
  - 参加活动
  - 活动搜索筛选
  - 人数限制
- ✅ 话题讨论
  - 创建话题
  - 参与讨论
  - 关注话题
  - 热门话题

## 运行测试

### 运行所有社区测试
```bash
npm run test:community
```

### 运行特定测试文件
```bash
# 帖子管理测试
npx playwright test frontend/e2e/specs/community/post-management.spec.ts

# 社区互动测试
npx playwright test frontend/e2e/specs/community/community-interaction.spec.ts
```

### 使用专用脚本运行
```bash
# 社区互动测试
node frontend/e2e/run-community-interaction-tests.cjs
```

## 测试数据管理

### 测试用户
- `community_user1`: 主要测试用户
- `community_user2`: 互动测试用户

### 测试宠物
- `InteractionPet`: 用于社区互动测试的宠物

### 清理机制
- 每个测试用例后自动清理测试数据
- 使用 `TestDataManager` 统一管理测试数据生命周期

## 页面对象

### CommunityPage
位置: `frontend/e2e/page-objects/community-page.ts`

主要方法:
- `createPost()`: 创建帖子
- `likePost()`: 点赞帖子
- `commentOnPost()`: 评论帖子
- `sharePost()`: 分享帖子
- `followUser()`: 关注用户
- `sendMessage()`: 发送私信
- `createActivity()`: 创建活动
- `createTopic()`: 创建话题

## 测试环境要求

### 前置条件
1. 后端服务运行在 `http://localhost:5000`
2. 前端服务运行在 `http://localhost:3000`
3. MongoDB 数据库连接正常
4. 测试用户权限配置正确

### 浏览器支持
- Chrome (推荐)
- Firefox
- Safari
- Edge

## 测试配置

### Playwright 配置
```typescript
// playwright.config.ts
export default {
  testDir: './e2e/specs',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
};
```

### 环境变量
```bash
# .env.test
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_UPLOAD_URL=http://localhost:5000/uploads
```

## 故障排除

### 常见问题

1. **测试超时**
   - 检查网络连接
   - 确认服务器响应时间
   - 增加测试超时时间

2. **元素未找到**
   - 检查页面加载状态
   - 验证选择器正确性
   - 确认页面路由正常

3. **数据库连接失败**
   - 检查 MongoDB 服务状态
   - 验证连接字符串
   - 确认数据库权限

4. **文件上传失败**
   - 检查上传目录权限
   - 验证文件大小限制
   - 确认文件格式支持

### 调试技巧

1. **启用调试模式**
```bash
npx playwright test --debug
```

2. **查看测试报告**
```bash
npx playwright show-report
```

3. **截图和录屏**
- 失败时自动截图
- 保留失败测试的录屏
- 查看 `test-results` 目录

## 性能监控

### 关键指标
- 页面加载时间
- API 响应时间
- 用户交互响应时间
- 内存使用情况

### 性能测试
```bash
# 运行性能测试
npx playwright test --grep "性能"
```

## 持续集成

### GitHub Actions
```yaml
name: Community Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:community
```

## 贡献指南

### 添加新测试
1. 在相应的 `.spec.ts` 文件中添加测试用例
2. 更新页面对象方法（如需要）
3. 添加必要的测试数据
4. 更新文档

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 添加适当的注释
- 保持测试独立性

### 提交规范
```
feat(community): 添加话题讨论功能测试
fix(community): 修复点赞功能测试问题
test(community): 优化社区互动测试性能
```

## 相关文档

- [Playwright 官方文档](https://playwright.dev/)
- [测试最佳实践](../../../docs/testing-best-practices.md)
- [API 文档](../../../docs/api-reference.md)
- [项目架构](../../../docs/architecture.md)