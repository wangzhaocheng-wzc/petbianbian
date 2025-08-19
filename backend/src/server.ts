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
import communityRoutes from './routes/community';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { connectDB } from './utils/database';
import { Logger } from './utils/logger';

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

// 静态文件
app.use('/uploads', express.static('uploads'));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/community', communityRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404处理
app.use('*', notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    await connectDB();
    
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
    Logger.info('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    Logger.error('关闭数据库连接时出错:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  Logger.info('收到SIGINT信号，正在关闭服务器...');
  try {
    await mongoose.connection.close();
    Logger.info('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    Logger.error('关闭数据库连接时出错:', error);
    process.exit(1);
  }
});

startServer();