import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { monitoringMiddleware } from './services/monitoringService';
import { errorTrackingMiddleware } from './services/errorTrackingService';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { connectDB } from './utils/database';
import { Logger } from './utils/logger';
import { connectRedis, disconnectRedis } from './config/redis';
import { connectPostgres, getPostgresStatus } from './config/postgres';
import { createDatabaseIndexes } from './utils/database';

dotenv.config();

import { APP_CONFIG } from './config/constants';

const app = express();
const PORT = APP_CONFIG.PORT;
const DB_PRIMARY = process.env.DB_PRIMARY || 'mongo';

// 中间件
app.use(helmet());
// 更灵活的 CORS 配置，支持本机与局域网预览地址
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // 允许非浏览器请求（如curl、服务器端）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // 允许常见的局域网IP访问前端开发服务器（端口5173）
    if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/.test(origin)) return callback(null, true);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // 允许初始化请求使用的自定义头，避免预检失败
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Init-Request']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 监控中间件
app.use(monitoringMiddleware);

// 请求日志中间件
app.use(requestLoggerMiddleware);

// 静态文件 - 添加CORS头部
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const cacheService = (await import('./services/cacheService')).default;
    const cacheStats = await cacheService.getStats();
    const pgStatus = await getPostgresStatus();
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const primaryDb = DB_PRIMARY === 'postgres' ? 'postgres' : 'mongo';
    const primaryDbStatus = DB_PRIMARY === 'postgres' ? pgStatus : mongoStatus;
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      primary_db: primaryDb,
      primary_db_status: primaryDbStatus,
      cache: cacheStats?.connected ? 'connected' : 'disconnected',
      postgres: pgStatus,
      mongo: mongoStatus
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      primary_db: DB_PRIMARY === 'postgres' ? 'postgres' : 'mongo',
      primary_db_status: 'error',
      cache: 'error',
      postgres: 'error',
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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
    if (DB_PRIMARY === 'mongo') {
      await connectDB();
    } else {
      // 切换为Postgres主数据库时，跳过Mongo连接
      Logger.info('跳过Mongo连接，主数据库设为 Postgres');
    }
    await connectPostgres();

    // 当主库设为 Postgres 且连接不可用时，启用内存 Mongo 作为后备
    if (DB_PRIMARY === 'postgres') {
      const status = await getPostgresStatus();
      if (status !== 'connected') {
        Logger.warn('Postgres 未连接，启用内存 Mongo 作为后备');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        await createDatabaseIndexes();
        (global as any).__IN_MEMORY_MONGO__ = mongoServer;
        Logger.info('内存 MongoDB 已启动并连接');
      }
    }

    await connectRedis();
    
    app.listen(PORT, () => {
      Logger.info(`服务器运行在端口 ${PORT}`);
      Logger.info(`健康检查: http://localhost:${PORT}/api/health`);
      Logger.info(`主数据库: ${DB_PRIMARY === 'postgres' ? 'Postgres' : 'Mongo'}`);
    });
  } catch (error) {
    Logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  Logger.info('收到SIGTERM信号，正在关闭服务器...');
  try {
    if (DB_PRIMARY === 'mongo') {
      await mongoose.connection.close();
    }
    // 如果启用了内存 Mongo，额外关闭
    if ((global as any).__IN_MEMORY_MONGO__) {
      try { await mongoose.connection.close(); } catch {}
      try { await (global as any).__IN_MEMORY_MONGO__.stop(); } catch {}
    }
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
    if (DB_PRIMARY === 'mongo') {
      await mongoose.connection.close();
    }
    // 如果启用了内存 Mongo，额外关闭
    if ((global as any).__IN_MEMORY_MONGO__) {
      try { await mongoose.connection.close(); } catch {}
      try { await (global as any).__IN_MEMORY_MONGO__.stop(); } catch {}
    }
    await disconnectRedis();
    Logger.info('数据库和缓存连接已关闭');
    process.exit(0);
  } catch (error) {
    Logger.error('关闭连接时出错:', error);
    process.exit(1);
  }
});

startServer();
