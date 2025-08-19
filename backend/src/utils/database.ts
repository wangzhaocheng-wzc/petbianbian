import mongoose from 'mongoose';

// 数据库连接配置
export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health';
    
    await mongoose.connect(mongoURI, {
      // 移除已弃用的选项，使用默认配置
    });
    
    console.log('MongoDB 连接成功');
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB 连接错误:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB 连接断开');
    });
    
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 优雅关闭数据库连接
export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB 连接已关闭');
  } catch (error) {
    console.error('关闭MongoDB连接时出错:', error);
  }
};