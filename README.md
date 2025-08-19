# 宠物健康监测社区平台

一个集宠物健康监测、便便分析、记录追踪和社区分享于一体的综合性网站平台。

## 功能特性

- 🔍 **便便健康检测** - AI图像识别分析宠物便便健康状况
- 📊 **健康记录追踪** - 记录和追踪宠物排便情况和健康趋势
- 👥 **宠物社区** - 分享经验、上传照片、与其他宠物主人交流
- 📱 **移动端适配** - 响应式设计，支持手机和平板访问

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架
- React Router 路由管理
- Axios HTTP客户端
- Lucide React 图标库

### 后端
- Node.js + Express + TypeScript
- MongoDB + Mongoose ODM
- JWT 身份认证 + bcryptjs 密码加密
- Multer 文件上传处理
- Helmet + CORS 安全中间件
- Morgan 日志记录

### 开发工具
- ESLint + Prettier 代码规范
- Nodemon 热重载开发
- Concurrently 并行运行脚本

## 快速开始

### 环境要求
- Node.js 16+
- MongoDB 4.4+
- npm 包管理器

### 安装依赖
```bash
# 安装所有依赖（根目录、前端、后端）
npm run install:all
```

### 环境配置
1. 复制后端环境配置文件：
```bash
cp backend/.env.example backend/.env
```

2. 修改 `backend/.env` 文件中的配置：
```env
# 服务器配置
PORT=5000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/pet-health

# JWT密钥（请使用强密码）
JWT_SECRET=your-super-secret-jwt-key-here

# AI服务配置（可选）
AI_SERVICE_URL=https://api.example.com/analyze
AI_SERVICE_KEY=your-ai-service-key
```

### 启动开发服务器
```bash
# 同时启动前后端开发服务器
npm run dev

# 或分别启动
npm run dev:frontend  # 前端 (http://localhost:3000)
npm run dev:backend   # 后端 (http://localhost:5000)
```

### 构建生产版本
```bash
# 构建所有项目
npm run build

# 分别构建
npm run build:frontend  # 构建前端
npm run build:backend   # 构建后端
```

### 代码质量检查
```bash
# 后端
cd backend
npm run lint          # ESLint检查
npm run lint:fix      # 自动修复
npm run format        # Prettier格式化
npm run type-check    # TypeScript类型检查

# 前端
cd frontend
npm run lint          # ESLint检查
npm run lint:fix      # 自动修复
npm run format        # Prettier格式化
npm run type-check    # TypeScript类型检查
```

## 项目结构

```
pet-health-community/
├── frontend/                    # React前端应用
│   ├── src/
│   │   ├── components/         # 可复用组件
│   │   │   └── Layout.tsx      # 主布局组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── Home.tsx        # 首页
│   │   │   ├── PoopAnalysis.tsx # 便便分析页
│   │   │   ├── Records.tsx     # 记录页面
│   │   │   ├── Community.tsx   # 社区页面
│   │   │   └── Profile.tsx     # 个人资料页
│   │   ├── services/           # API服务
│   │   │   └── api.ts          # API客户端
│   │   ├── utils/              # 工具函数
│   │   │   ├── constants.ts    # 常量定义
│   │   │   └── helpers.ts      # 辅助函数
│   │   ├── App.tsx             # 主应用组件
│   │   ├── main.tsx            # 应用入口
│   │   └── index.css           # 全局样式
│   ├── index.html              # HTML模板
│   ├── vite.config.ts          # Vite配置
│   ├── tailwind.config.js      # Tailwind配置
│   ├── tsconfig.json           # TypeScript配置
│   ├── .eslintrc.js            # ESLint配置
│   ├── .prettierrc             # Prettier配置
│   └── package.json
├── backend/                     # Node.js后端API
│   ├── src/
│   │   ├── models/             # Mongoose数据模型
│   │   │   ├── User.ts         # 用户模型
│   │   │   └── Pet.ts          # 宠物模型
│   │   ├── routes/             # Express路由
│   │   │   ├── auth.ts         # 认证路由
│   │   │   ├── users.ts        # 用户路由
│   │   │   ├── pets.ts         # 宠物路由
│   │   │   ├── analysis.ts     # 分析路由
│   │   │   └── community.ts    # 社区路由
│   │   ├── middleware/         # Express中间件
│   │   │   ├── auth.ts         # 认证中间件
│   │   │   ├── validation.ts   # 验证中间件
│   │   │   ├── upload.ts       # 文件上传中间件
│   │   │   └── errorHandler.ts # 错误处理中间件
│   │   ├── utils/              # 工具函数
│   │   │   ├── database.ts     # 数据库连接
│   │   │   ├── logger.ts       # 日志工具
│   │   │   └── helpers.ts      # 辅助函数
│   │   ├── config/             # 配置文件
│   │   │   └── constants.ts    # 应用常量
│   │   └── server.ts           # 服务器入口
│   ├── uploads/                # 文件上传目录
│   │   ├── avatars/            # 用户头像
│   │   ├── analysis/           # 分析图片
│   │   └── community/          # 社区图片
│   ├── dist/                   # 编译输出目录
│   ├── tsconfig.json           # TypeScript配置
│   ├── .eslintrc.js            # ESLint配置
│   ├── .prettierrc             # Prettier配置
│   ├── .env.example            # 环境变量模板
│   └── package.json
├── shared/                      # 共享类型定义
│   └── types.ts                # 通用类型
├── .kiro/                      # Kiro AI配置
│   ├── specs/                  # 功能规格文档
│   └── steering/               # 开发指导文档
└── package.json                # 根项目配置
```

## API文档

### 健康检查
- `GET /api/health` - 服务器健康状态检查

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新访问令牌
- `POST /api/auth/logout` - 用户登出

### 用户管理
- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息
- `POST /api/users/avatar` - 上传用户头像

### 宠物管理
- `GET /api/pets` - 获取用户的宠物列表
- `POST /api/pets` - 添加新宠物
- `GET /api/pets/:id` - 获取特定宠物信息
- `PUT /api/pets/:id` - 更新宠物信息
- `DELETE /api/pets/:id` - 删除宠物

### 健康分析
- `POST /api/analysis/upload` - 上传图片进行便便分析
- `GET /api/analysis/records/:petId` - 获取宠物的分析记录
- `GET /api/analysis/statistics/:petId` - 获取分析统计数据
- `DELETE /api/analysis/records/:id` - 删除分析记录

### 社区功能
- `GET /api/community/posts` - 获取社区帖子列表
- `POST /api/community/posts` - 发布新帖子
- `GET /api/community/posts/:id` - 获取特定帖子详情
- `POST /api/community/posts/:id/like` - 点赞/取消点赞帖子
- `GET /api/community/posts/:id/comments` - 获取帖子评论
- `POST /api/community/posts/:id/comments` - 添加评论

## 开发指南

### 代码规范
- 使用 ESLint + Prettier 进行代码格式化
- 遵循 TypeScript 严格模式
- 组件使用 PascalCase 命名
- 文件使用 camelCase 命名
- API路由使用 kebab-case

### Git提交规范
使用 Conventional Commits 规范：
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 开发流程
1. 从 main 分支创建功能分支
2. 开发功能并编写测试
3. 运行代码质量检查
4. 提交代码并推送分支
5. 创建 Pull Request

## 部署

### 生产环境部署
1. 构建项目：
```bash
npm run build
```

2. 启动后端服务：
```bash
cd backend
npm start
```

3. 配置Nginx代理前端静态文件和API请求

### Docker部署（待实现）
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

## 故障排除

### 常见问题

1. **MongoDB连接失败**
   - 确保MongoDB服务正在运行
   - 检查 `.env` 文件中的 `MONGODB_URI` 配置

2. **端口冲突**
   - 前端默认端口：3000
   - 后端默认端口：5000
   - 可在配置文件中修改端口

3. **依赖安装失败**
   - 清除npm缓存：`npm cache clean --force`
   - 删除 `node_modules` 重新安装

4. **TypeScript编译错误**
   - 运行类型检查：`npm run type-check`
   - 检查 `tsconfig.json` 配置

## 贡献指南

1. Fork 项目到你的GitHub账户
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'feat: add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，请：
- 提交 GitHub Issue
- 发送邮件至开发团队
- 查看项目文档和FAQ

---

**注意**: 这是一个开发中的项目，部分功能可能尚未完全实现。请查看项目的 Issues 和 Milestones 了解开发进度。