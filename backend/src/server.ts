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
// import alertRoutes from './routes/alerts';
// import notificationRoutes from './routes/notifications';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { monitoringMiddleware } from './services/monitoringService';
import { errorTrackingMiddleware } from './services/errorTrackingService';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { connectDB } from './utils/database';
import { Logger } from './utils/logger';
import { connectRedis, disconnectRedis } from './config/redis';

dotenv.config();

import { APP_CONFIG } from './config/constants';

const app = express();
const PORT = APP_CONFIG.PORT;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 监控中间件
app.use(monitoringMiddleware);

// 请求日志中间件
app.use(requestLoggerMiddleware);

// 静态文件
app.use('/uploads', express.static('uploads'));

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
// app.use('/api/alerts', alertRoutes);
// app.use('/api/notifications', notificationRoutes);

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const cacheService = (await import('./services/cacheService')).default;
    const cacheStats = await cacheService.getStats();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cache: cacheStats?.connected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cache: 'error'
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
    await connectDB();
    await connectRedis();
    
    app.listen(PORT, () => {
      Logger.info(`服务器运行在端口 ${PORT}`);
      Logger.info(`健康检查: http://localhost:${PORT}/api/health`);
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
    await mongoose.connection.close();
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
    await mongoose.connection.close();
    await disconnectRedis();
    Logger.info('数据库和缓存连接已关闭');
    process.exit(0);
  } catch (error) {
    Logger.error('关闭连接时出错:', error);
    process.exit(1);
  }
});

startServer();
