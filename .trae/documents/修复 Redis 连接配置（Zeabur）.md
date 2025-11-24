## 背景与原因
- 后端默认读取 `REDIS_URL`，未设置时回退到 `redis://localhost:6379`（backend/src/config/redis.ts:19），因此会出现“地址错误”。
- 连接参数支持：`REDIS_URL`、`REDIS_PASSWORD`、`REDIS_USERNAME`、`REDIS_DB`、`REDIS_CONNECT_TIMEOUT`、`REDIS_TLS`（backend/src/config/redis.ts:14–21）。
- 若使用 TLS，代码通过 `rediss://` 或 `REDIS_TLS=true` 自动启用（backend/src/config/redis.ts:20–21, 29–31）。

## 修改目标
- 将后端 `.env` 中的 Redis 指向 Zeabur 集群地址，并提供密码。
- 依据集群要求选择是否启用 TLS（Zeabur 公网集群通常建议使用 TLS）。

## 配置示例（二选一）
- 不启用 TLS（若集群明确不需要 TLS）：
  - `REDIS_URL=redis://sjc1.clusters.zeabur.com:27402`
  - `REDIS_PASSWORD=o2AtnO0EagCs358Q9fSpZzJ4j6V7Wh1M`
  - 可选：`REDIS_ENABLED=true`
- 启用 TLS（推荐）：
  - `REDIS_URL=rediss://sjc1.clusters.zeabur.com:27402`
  - `REDIS_PASSWORD=o2AtnO0EagCs358Q9fSpZzJ4j6V7Wh1M`
  - 或者保留 `REDIS_URL=redis://...` 并设置 `REDIS_TLS=true`

## 位置与加载
- 在 `backend` 目录的 `.env`（后端通过 `dotenv` 加载，backend/src/server.ts:5,35 和 backend/src/config/constants.ts:1–3）。
- 不需要 `REDIS_USERNAME`（除非你的服务端开启了 ACL 用户名）。

## 验证步骤
- 使用仓库内的测试脚本验证连通性（只读执行）：
  - 不启用 TLS：`node backend/scripts/testRedisConnection.js redis://sjc1.clusters.zeabur.com:27402 --password=你的密码`
  - 启用 TLS：`node backend/scripts/testRedisConnection.js rediss://sjc1.clusters.zeabur.com:27402 --password=你的密码 --tls`
  - 期望输出包含：`[redis-test] Connected`、`PING => PONG`、`SUCCESS`
- 更新 `.env` 后重启后端开发服务，日志应出现 `Redis Client Connected`（backend/src/config/redis.ts:48–54）。

## 错误提示与排查
- 认证失败（NOAUTH）：检查 `REDIS_PASSWORD` 是否正确（backend/scripts/testRedisConnection.js:113–115）。
- TLS 相关报错：改用 `rediss://` 或设置 `REDIS_TLS=true`（backend/scripts/testRedisConnection.js:115–117）。
- 主机/端口不可达：核对地址与端口是否可访问（backend/scripts/testRedisConnection.js:117–119）。

## 安全注意
- 不要将密码提交到版本库；将密钥仅放在本地 `.env`，并确保该文件在 `.gitignore` 中。

确认后，我将：
1) 在 `backend/.env` 写入你选择的配置；
2) 重启并验证后端连接日志；
3) 如有需要，调整 TLS 选项并复测，直到连接成功。