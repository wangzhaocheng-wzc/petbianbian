export default async function globalSetup() {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  process.env.BCRYPT_ROUNDS = '1'; // 使用最少的加密轮数以提高测试速度
  
  console.log('🧪 Global test setup completed');
}