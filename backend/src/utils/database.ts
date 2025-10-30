import mongoose from 'mongoose';

// 数据库连接配置
export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health';
    
    await mongoose.connect(mongoURI, {
      // 加速不可用Mongo的失败以便快速回退到内存库
      // 降低服务器选择超时，避免长时间阻塞启动
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      // 在单节点本地开发场景下直连更快
      directConnection: true,
    });
    
    console.log('MongoDB 连接成功');
    
    // 创建数据库索引以优化查询性能
    await createDatabaseIndexes();
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB 连接错误:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB 连接断开');
    });
    
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    // 尝试启动内存 MongoDB 作为开发环境回退
    try {
      console.log('尝试启动内存 MongoDB 以提供临时开发数据库...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mem = await MongoMemoryServer.create({
        instance: { dbName: 'pet-health' },
      });
      const uri = mem.getUri();
      // 保存到全局，便于优雅关闭
      (global as any).__IN_MEMORY_MONGO__ = mem;

      await mongoose.connect(uri);
      console.log('内存 MongoDB 启动并连接成功');

      await createDatabaseIndexes();

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB 连接错误:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB 连接断开');
      });
    } catch (memError) {
      console.error('启动内存 MongoDB 失败:', memError);
      process.exit(1);
    }
  }
};

// 创建数据库索引以优化查询性能
export const createDatabaseIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    
    // 用户集合索引
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ isActive: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    // 宠物集合索引
    await db.collection('pets').createIndex({ ownerId: 1, isActive: 1 });
    await db.collection('pets').createIndex({ ownerId: 1, name: 1 });
    await db.collection('pets').createIndex({ type: 1 });
    await db.collection('pets').createIndex({ createdAt: -1 });
    
    // 便便记录集合索引
    await db.collection('pooprecords').createIndex({ petId: 1, timestamp: -1 });
    await db.collection('pooprecords').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('pooprecords').createIndex({ 'analysis.healthStatus': 1 });
    await db.collection('pooprecords').createIndex({ isShared: 1 });
    await db.collection('pooprecords').createIndex({ createdAt: -1 });
    
    // 社区帖子集合索引
    await db.collection('communityposts').createIndex({ userId: 1, status: 1 });
    await db.collection('communityposts').createIndex({ category: 1, status: 1 });
    await db.collection('communityposts').createIndex({ tags: 1 });
    await db.collection('communityposts').createIndex({ moderationStatus: 1 });
    await db.collection('communityposts').createIndex({ createdAt: -1 });
    await db.collection('communityposts').createIndex({ 'interactions.likes': 1 });
    
    // 评论集合索引
    await db.collection('comments').createIndex({ postId: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ userId: 1 });
    await db.collection('comments').createIndex({ parentId: 1 });
    await db.collection('comments').createIndex({ moderationStatus: 1 });
    
    // 内容举报集合索引
    await db.collection('contentreports').createIndex({ contentId: 1, contentType: 1 });
    await db.collection('contentreports').createIndex({ reporterId: 1 });
    await db.collection('contentreports').createIndex({ status: 1 });
    await db.collection('contentreports').createIndex({ createdAt: -1 });
    
    // 复合索引用于复杂查询
    await db.collection('pooprecords').createIndex({ 
      petId: 1, 
      'analysis.healthStatus': 1, 
      timestamp: -1 
    });
    
    await db.collection('communityposts').createIndex({ 
      category: 1, 
      status: 1, 
      moderationStatus: 1, 
      createdAt: -1 
    });
    
    console.log('数据库索引创建成功');
  } catch (error) {
    console.error('创建数据库索引时出错:', error);
    // 不抛出错误，允许应用继续运行
  }
};

// 优雅关闭数据库连接
export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB 连接已关闭');
    const mem = (global as any).__IN_MEMORY_MONGO__;
    if (mem) {
      await mem.stop();
      (global as any).__IN_MEMORY_MONGO__ = undefined;
      console.log('内存 MongoDB 已停止');
    }
  } catch (error) {
    console.error('关闭MongoDB连接时出错:', error);
  }
};