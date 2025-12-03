import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import petRoutes from './routes/pets';
import analysisRoutes from './routes/analysis';
import recordsRoutes from './routes/records';
import communityRoutes from './routes/community';
import uploadRoutes from './routes/upload';
import statisticsRoutes from './routes/statistics';
import moderationRoutes from './routes/moderation';
import cacheRoutes from './routes/cache';
import adminRoutes from './routes/admin';
// import comparisonRoutes from './routes/comparison';
import reportsRoutes from './routes/reports';
import monitoringRoutes from './routes/monitoring';
import logsRoutes from './routes/logs';
import alertRoutes from './routes/alerts';
import notificationRoutes from './routes/notifications';
import governanceRoutes from './routes/governance';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { monitoringMiddleware } from './services/monitoringService';
import { errorTrackingMiddleware } from './services/errorTrackingService';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { Logger } from './utils/logger';
import { connectRedis, disconnectRedis } from './config/redis';
import { connectDB, closeDB } from './utils/database';
import { connectPostgres, getPostgresStatus } from './config/postgres';
import { startGovernanceReportScheduler } from './services/imageUrlGovernanceService';

const envLocal = '.env.local';
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else {
  dotenv.config();
}

import { APP_CONFIG } from './config/constants';

const app = express();
const PORT = APP_CONFIG.PORT;
const DB_PRIMARY = process.env.DB_PRIMARY || 'postgres';

// 中间件
// 调整 Helmet 的跨源资源策略，允许前端 (5173) 加载后端静态资源（如 /uploads 下图片）
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));
// 更灵活的 CORS 配置，支持本机与局域网预览地址
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://localhost:3000',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // 允许非浏览器请求（如curl、服务器端）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // 允许常见的局域网IP访问前端开发服务器与预览服务器（端口5173/5174/4173/4174）
    if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(517(3|4)|417(3|4))$/.test(origin)) return callback(null, true);
    // 允许所有 Vercel 部署的前端访问 (修复 CORS 问题)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    
    console.warn(`Blocked by CORS: ${origin}`);
    callback(null, true); // 暂时允许所有来源以排除故障，生产环境可收紧
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Init-Request', 'X-Requested-With']
}));

// 显式处理预检请求，防止进入鉴权中间件
app.options('*', cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 监控中间件
app.use(monitoringMiddleware);

// 请求日志中间件
app.use(requestLoggerMiddleware);

// 静态文件 - 添加CORS头部与缓存、方法支持
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  // 允许 GET/HEAD/OPTIONS，便于前端用 HEAD 探测图片是否存在
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // 为图片增加合理缓存，减少重复加载导致的闪烁（可按需调整）
  res.header('Cache-Control', 'public, max-age=86400'); // 1天
  next();
}, express.static('uploads'));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/comparison', comparisonRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/governance', governanceRoutes);

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const cacheService = (await import('./services/cacheService')).default;
    const cacheStats = await cacheService.getStats();
    const pgStatus = await getPostgresStatus();
    const primaryDb = 'postgres';
    const primaryDbStatus = pgStatus;
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      primary_db: primaryDb,
      primary_db_status: primaryDbStatus,
      cache: cacheStats?.connected ? 'connected' : 'disconnected',
      postgres: pgStatus
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      primary_db: 'postgres',
      primary_db_status: 'error',
      cache: 'error',
      postgres: 'error'
    });
  }
});

// 404处理
app.use('*', notFoundHandler);

// 错误追踪中间件
app.use(errorTrackingMiddleware);

// 错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    await connectPostgres();

    // 启用 Mongo（或内存 Mongo）以支持社区模块
    // 即使主库为 Postgres，社区帖子与评论仍使用 Mongoose 模型
    try {
      await connectDB();
      Logger.info('社区模块：Mongo 已连接（必要时使用内存回退）');
    } catch (err) {
      Logger.warn('社区模块：Mongo 连接失败', err as any);
    }

    await connectRedis();
    
    app.listen(PORT, () => {
      Logger.info(`服务器运行在端口 ${PORT}`);
      Logger.info(`健康检查: http://localhost:${PORT}/api/health`);
      Logger.info(`主数据库: Postgres`);
      // 启动每日数据治理预览报告任务
      try {
        if (DB_PRIMARY !== 'postgres') {
          startGovernanceReportScheduler();
          Logger.info('每日数据治理预览报告定时任务已启动');
        } else {
          Logger.info('Postgres 模式下跳过数据治理定时任务（Mongo 依赖已禁用）');
        }
      } catch (err) {
        Logger.warn('启动数据治理定时任务失败', err as any);
      }
    });
  } catch (error) {
    Logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 仅在直接运行脚本时启动服务器（避免测试或Vercel部署时自动启动）
if (require.main === module) {
  startServer();
}

export default app;

// 优雅关闭
process.on('SIGTERM', async () => {
  Logger.info('收到SIGTERM信号，正在关闭服务器...');
  try {
    await closeDB();
    await disconnectRedis();
    Logger.info('数据库和缓存连接已关闭');
    process.exit(0);
  } catch (error) {
    Logger.error('关闭连接时出错:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  Logger.info('收到SIGINT信号，正在关闭服务器...');
  try {
    await closeDB();
    await disconnectRedis();
    Logger.info('数据库和缓存连接已关闭');
    process.exit(0);
  } catch (error) {
    Logger.error('关闭连接时出错:', error);
    process.exit(1);
  }
});

startServer();
