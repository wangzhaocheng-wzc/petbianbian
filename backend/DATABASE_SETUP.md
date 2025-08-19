# 数据库设置指南

## 选项1：本地 MongoDB（开发环境推荐）

### 1. 安装 MongoDB Community Server
- 访问：https://www.mongodb.com/try/download/community
- 下载 Windows 版本并安装
- 安装时选择 "Complete" 安装类型
- 勾选 "Install MongoDB as a Service"

### 2. 验证安装
```bash
# 检查 MongoDB 服务是否运行
net start | findstr MongoDB

# 使用 MongoDB Shell 连接
mongosh
```

### 3. 创建数据库用户（可选，用于生产环境）
```javascript
// 在 mongosh 中执行
use pet-health
db.createUser({
  user: "petHealthUser",
  pwd: "yourPassword123",
  roles: [{ role: "readWrite", db: "pet-health" }]
})
```

## 选项2：MongoDB Atlas（云数据库，推荐）

### 1. 注册账户
- 访问：https://www.mongodb.com/atlas
- 创建免费账户

### 2. 创建集群
- 点击 "Build a Database"
- 选择 "M0 Sandbox"（免费）
- 选择云提供商和区域（推荐选择离你最近的）
- 集群名称：pet-health-cluster

### 3. 设置数据库访问
- 在 "Database Access" 中创建数据库用户
- 用户名：petHealthUser
- 密码：生成强密码并保存

### 4. 设置网络访问
- 在 "Network Access" 中添加 IP 地址
- 开发环境可以添加 0.0.0.0/0（允许所有IP）
- 生产环境应该限制特定IP

### 5. 获取连接字符串
- 点击 "Connect" -> "Connect your application"
- 选择 "Node.js" 和版本 "4.1 or later"
- 复制连接字符串

### 6. 更新 .env 文件
```env
MONGODB_URI=mongodb+srv://petHealthUser:yourPassword@pet-health-cluster.xxxxx.mongodb.net/pet-health?retryWrites=true&w=majority
```

## 测试连接

运行以下命令测试数据库连接：

```bash
# 在 backend 目录下
npm run dev
```

如果看到 "MongoDB 连接成功" 消息，说明连接正常。

## 常见问题

### 1. 连接超时
- 检查网络连接
- 确认 MongoDB 服务正在运行
- 检查防火墙设置

### 2. 认证失败
- 检查用户名和密码
- 确认用户有正确的权限

### 3. 数据库不存在
- MongoDB 会在首次写入数据时自动创建数据库
- 不需要手动创建数据库

## 数据库结构

应用启动后，会自动创建以下集合：
- `users` - 用户信息
- `pets` - 宠物信息
- `pooprecords` - 便便分析记录
- `communityposts` - 社区帖子

## 安全建议

1. **生产环境**：
   - 使用强密码
   - 限制网络访问
   - 启用 SSL/TLS
   - 定期备份数据

2. **开发环境**：
   - 使用本地 MongoDB 或 Atlas 免费层
   - 定期清理测试数据