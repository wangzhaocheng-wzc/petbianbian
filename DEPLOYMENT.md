# 宠物健康监测平台部署指南

## 概述

本文档提供了宠物健康监测社区平台的完整部署指南，包括容器化部署、多环境配置和CI/CD流水线设置。

## 系统要求

### 最低硬件要求
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐硬件要求（生产环境）
- **CPU**: 4核心或更多
- **内存**: 8GB RAM或更多
- **存储**: 100GB SSD
- **网络**: 高速互联网连接

### 软件要求
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Node.js 18+ (用于本地开发)

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd pet-health-community
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 3. 部署应用

#### Windows用户
```cmd
# 使用批处理脚本
scripts\deploy.bat development

# 或使用PowerShell脚本
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 development
```

#### Linux/macOS用户
```bash
# 使脚本可执行
chmod +x scripts/deploy.sh

# 部署开发环境
./scripts/deploy.sh development
```

## 环境配置

### 环境变量说明

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `JWT_SECRET` | JWT令牌密钥 | - | ✅ |
| `MONGO_ROOT_USERNAME` | MongoDB管理员用户名 | admin | ✅ |
| `MONGO_ROOT_PASSWORD` | MongoDB管理员密码 | - | ✅ |
| `REDIS_PASSWORD` | Redis密码 | - | ❌ |
| `AI_SERVICE_URL` | AI服务API地址 | - | ❌ |
| `AI_SERVICE_KEY` | AI服务API密钥 | - | ❌ |
| `NODE_ENV` | 运行环境 | production | ✅ |

### 开发环境配置
```env
JWT_SECRET=dev-jwt-secret-key
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=dev-password
NODE_ENV=development
```

### 生产环境配置
```env
JWT_SECRET=your-super-secure-jwt-secret-key-here
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=very-secure-mongo-password
REDIS_PASSWORD=very-secure-redis-password
NODE_ENV=production
```

## 部署模式

### 开发模式
- 启用热重载
- 详细日志输出
- 开发工具集成
- 无SSL配置

```bash
# 启动开发环境
./scripts/deploy.sh development

# 或使用docker-compose直接启动
docker-compose -f docker-compose.dev.yml up -d
```

### 生产模式
- 优化构建
- 压缩资源
- SSL配置
- 性能监控
- 安全加固

```bash
# 启动生产环境
./scripts/deploy.sh production

# 或使用docker-compose直接启动
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 服务架构

### 服务组件

| 服务 | 端口 | 描述 |
|------|------|------|
| Nginx | 80, 443 | 反向代理和负载均衡 |
| Frontend | 3000 | React前端应用 |
| Backend | 5000 | Node.js API服务 |
| MongoDB | 27017 | 主数据库 |
| Redis | 6379 | 缓存和会话存储 |

### 网络架构
```
Internet → Nginx (80/443) → Frontend (3000)
                         → Backend (5000) → MongoDB (27017)
                                         → Redis (6379)
```

## 监控和维护

### 健康检查
```bash
# 运行健康检查
./scripts/health-check.sh

# 详细健康检查
./scripts/health-check.sh --detailed
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 服务管理
```bash
# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

## 备份和恢复

### 创建备份
```bash
# 完整备份
./scripts/backup.sh full

# 仅备份数据库
./scripts/backup.sh mongodb

# 仅备份上传文件
./scripts/backup.sh uploads
```

### 恢复备份
```bash
# 列出可用备份
./scripts/backup.sh list

# 恢复指定备份
./scripts/backup.sh restore 20240127_143022
```

### 清理旧备份
```bash
# 清理7天前的备份
./scripts/backup.sh cleanup 7
```

## SSL配置

### 开发环境（自签名证书）
```bash
# 生成自签名证书
mkdir -p docker/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/ssl/private.key \
  -out docker/ssl/cert.pem \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

### 生产环境（Let's Encrypt）
```bash
# 使用Certbot获取证书
certbot certonly --webroot -w /var/www/html -d yourdomain.com

# 复制证书到Docker目录
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/private.key
```

## CI/CD配置

### GitHub Actions
项目包含完整的CI/CD流水线配置（`.github/workflows/ci-cd.yml`），支持：

- 自动化测试
- Docker镜像构建
- 多环境部署
- 安全扫描

### 环境变量配置
在GitHub仓库设置中配置以下Secrets：

| Secret名称 | 描述 |
|------------|------|
| `DOCKER_USERNAME` | Docker Hub用户名 |
| `DOCKER_PASSWORD` | Docker Hub密码 |
| `DEPLOY_HOST` | 部署服务器地址 |
| `DEPLOY_USER` | 部署用户名 |
| `DEPLOY_KEY` | SSH私钥 |

## 性能优化

### 数据库优化
```javascript
// MongoDB索引优化
db.users.createIndex({ "email": 1 }, { unique: true })
db.pets.createIndex({ "ownerId": 1 })
db.pooprecords.createIndex({ "petId": 1, "timestamp": -1 })
```

### 缓存配置
```yaml
# Redis配置优化
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Nginx优化
```nginx
# 启用gzip压缩
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/javascript;

# 启用缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 故障排除

### 常见问题

#### 1. 容器启动失败
```bash
# 检查容器状态
docker-compose ps

# 查看容器日志
docker-compose logs [service-name]

# 重新构建镜像
docker-compose build --no-cache
```

#### 2. 数据库连接失败
```bash
# 检查MongoDB状态
docker exec pet-health-mongo mongosh --eval "db.adminCommand('ping')"

# 检查网络连接
docker network ls
docker network inspect pet-health-network
```

#### 3. 文件上传失败
```bash
# 检查上传目录权限
ls -la backend/uploads/

# 创建上传目录
mkdir -p backend/uploads
chmod 755 backend/uploads
```

#### 4. SSL证书问题
```bash
# 检查证书有效性
openssl x509 -in docker/ssl/cert.pem -text -noout

# 验证证书和私钥匹配
openssl x509 -noout -modulus -in docker/ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in docker/ssl/private.key | openssl md5
```

### 日志分析
```bash
# 查看错误日志
docker-compose logs | grep -i error

# 查看访问日志
docker exec pet-health-nginx tail -f /var/log/nginx/access.log

# 查看应用日志
docker exec pet-health-backend tail -f logs/app.log
```

## 安全最佳实践

### 1. 密码安全
- 使用强密码
- 定期更换密码
- 不在代码中硬编码密码

### 2. 网络安全
- 使用HTTPS
- 配置防火墙
- 限制端口访问

### 3. 容器安全
- 使用非root用户运行容器
- 定期更新基础镜像
- 扫描镜像漏洞

### 4. 数据安全
- 定期备份数据
- 加密敏感数据
- 实施访问控制

## 扩展部署

### 水平扩展
```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
  
  frontend:
    deploy:
      replicas: 2
```

### 负载均衡
```nginx
# nginx负载均衡配置
upstream backend {
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}
```

### 数据库集群
```yaml
# MongoDB副本集配置
mongo1:
  image: mongo:6.0
  command: mongod --replSet rs0

mongo2:
  image: mongo:6.0
  command: mongod --replSet rs0

mongo3:
  image: mongo:6.0
  command: mongod --replSet rs0
```

## 支持和维护

### 更新应用
```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
./scripts/deploy.sh production
```

### 监控指标
- CPU使用率
- 内存使用率
- 磁盘空间
- 网络流量
- 响应时间
- 错误率

### 告警配置
- 服务不可用告警
- 资源使用率告警
- 错误率告警
- 磁盘空间告警

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的Issue页面
3. 提交新的Issue并提供详细信息
4. 联系开发团队

---

**注意**: 在生产环境部署前，请确保已经充分测试所有功能，并制定了完整的备份和恢复计划。