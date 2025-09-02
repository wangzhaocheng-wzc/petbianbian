import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// 设置测试超时时间
jest.setTimeout(30000);

// 全局变量声明
declare global {
  var __MONGO__: MongoMemoryServer;
}

// 在所有测试之前运行
beforeAll(async () => {
  // 创建内存中的MongoDB实例
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // 连接到测试数据库
  await mongoose.connect(mongoUri);
  
  // 保存MongoDB实例到全局变量
  global.__MONGO__ = mongoServer;
});

// 在每个测试之前运行
beforeEach(async () => {
  // 清理所有集合
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// 在所有测试之后运行
afterAll(async () => {
  // 关闭数据库连接
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // 停止MongoDB实例
  if (global.__MONGO__) {
    await global.__MONGO__.stop();
  }
});

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/pet-health-test';