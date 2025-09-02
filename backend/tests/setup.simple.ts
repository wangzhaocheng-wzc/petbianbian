// 简化的测试设置，不使用MongoDB内存服务器
import mongoose from 'mongoose';

// 设置测试超时时间
jest.setTimeout(30000);

// 模拟MongoDB连接
beforeAll(async () => {
  // 在测试环境中，我们可以连接到真实的测试数据库
  // 或者完全模拟数据库操作
  console.log('🧪 测试环境设置完成');
});

// 在每个测试之前运行
beforeEach(async () => {
  // 如果连接到真实数据库，在这里清理数据
  console.log('🧹 测试数据清理');
});

// 在所有测试之后运行
afterAll(async () => {
  // 关闭数据库连接
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  console.log('🧪 测试环境清理完成');
});

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/pet-health-test';