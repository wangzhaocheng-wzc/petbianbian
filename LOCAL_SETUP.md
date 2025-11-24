# 本地运行环境配置（移除容器化）

本项目已移除所有 Docker/容器相关文件与脚本，改为通过本地 `npm` 启动方式运行。请按以下说明在本地环境完整运行前后端。

## 环境前置

- Node.js >= 18，npm >= 8
- Redis（默认：`redis://localhost:6379`）
- PostgreSQL（推荐作为主库），或 MongoDB（可选）
  - PostgreSQL 连接串示例：`postgresql://user:pass@host:port/db`
  - MongoDB 连接串示例：`mongodb://localhost:27017/pet-health`
- Windows PowerShell 或其他终端

## 仓库结构与启动方式

- 后端：`backend/`
  - 开发启动：`npm run dev`（监听源码）
  - 生产启动：`npm run build && npm start`
- 前端：`frontend/`
  - 开发启动：`npm run dev`（默认端口 `5173`）

根目录提供并行启动脚本：

- `npm start` 等同于并行运行后端与前端的开发模式
- `npm install` 会自动安装前端与后端依赖（通过 `postinstall`）

## 配置环境变量

1) 后端复制示例环境：

```powershell
Copy-Item backend/.env.example backend/.env
```

并按需设置（`backend/.env`）：

```
PORT=5000
REDIS_URL=redis://localhost:6379

# 使用 Postgres 作为主库（推荐）
POSTGRES_URL=postgresql://<user>:<pass>@<host>:<port>/<db>
DB_PRIMARY=postgres

# 可选：若使用 MongoDB
MONGODB_URI=mongodb://localhost:27017/pet-health

JWT_SECRET=your-super-secret-jwt-key-here
```

2) 前端复制示例环境：

```powershell
Copy-Item frontend/.env.example frontend/.env
```

确认 `frontend/.env`：

```
VITE_API_URL=http://localhost:5000/api
```

## 安装与启动

在项目根目录执行：

```powershell
npm install
npm start
```

- 后端接口：`http://localhost:5000/api`
- 前端开发：`http://localhost:5173`

## 初始化数据库（PostgreSQL 推荐）

如使用 Postgres，可初始化表结构：

```powershell
node scripts/pg-bootstrap.js "postgresql://user:pass@host:port/db"
```

或在设置好 `POSTGRES_URL` 后：

```powershell
node backend/tools/applySchema.js
```

## 健康检查

后端启动后可访问：`http://localhost:5000/api/health`

- `primary_db` 显示当前主库（`postgres` 或 `mongo`）
- `postgres` 与 `mongo` 字段显示连接状态

## 常见问题

- 端口占用：调整 `backend/.env` 中 `PORT` 或前端启动端口（Vite 使用 `--port`）
- 数据库连接失败：检查 `POSTGRES_URL/MONGODB_URI`、网络与认证信息
- Redis 未运行：确保本地 Redis 正常启动，或修改 `REDIS_URL`

## 已移除的内容

- 所有 Dockerfile、`docker-compose*.yml` 与 `docker/` 目录下配置
- 前端/后端的 `.dockerignore` 与 Nginx 容器配置

本地运行不再依赖任何容器运行时，完整功能保持可用。

## 密钥管理与注入（AI服务）

后端支持通过环境变量注入 AI 服务密钥，避免将真实 Key 写入代码或示例文件。

- 支持的变量名（后端已在 `constants.ts` 处理优先级）：
  - 优先：`AI_SERVICE_KEY`
  - 回退：`DASHSCOPE_API_KEY`

### 本地永久注入（macOS 常用）
- 如果使用 zsh（macOS 默认）：
  - `echo "export DASHSCOPE_API_KEY='YOUR_DASHSCOPE_API_KEY'" >> ~/.zshrc`
  - `source ~/.zshrc`
  - 验证：`echo $DASHSCOPE_API_KEY`
- 如果使用 bash：
  - `echo "export DASHSCOPE_API_KEY='YOUR_DASHSCOPE_API_KEY'" >> ~/.bashrc`
  - `source ~/.bashrc`

### 本地临时注入（当前会话）
- 在当前终端设置，仅该会话有效：
  - `export DASHSCOPE_API_KEY='YOUR_DASHSCOPE_API_KEY'`
  - 或 `export AI_SERVICE_KEY='YOUR_DASHSCOPE_API_KEY'`

### 项目运行时对接
- 推荐配置（DashScope 兼容模式）：
  - `AI_SERVICE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
  - `AI_SERVICE_ANALYSIS_PATH=/chat/completions`
  - `AI_MODEL=qwen-plus`
  - 密钥：优先读 `AI_SERVICE_KEY`，无则回退 `DASHSCOPE_API_KEY`
- 示例运行（密钥从环境变量读取，无需明文传入命令）：
  - `npm run dev`（或在根目录并行启动）

### 生产与云环境建议
- 使用 CI/CD 的 Secrets 注入（GitHub Actions/GitLab CI）。
- 容器编排使用环境变量或 Kubernetes `Secret`（结合 `envFrom`/`valueFrom`）。
- 不要将真实密钥写入仓库或镜像层；`.env.example` 保持占位符。