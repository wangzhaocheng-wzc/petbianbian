export default async function globalSetup() {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  process.env.BCRYPT_ROUNDS = '1'; // 使用最少的加密轮数以提高测试速度
  // 默认使用 Postgres 作为主数据库，以避免在本地环境拉取/启动 mongodb-memory-server 失败
  if (!process.env.DB_PRIMARY) {
    process.env.DB_PRIMARY = 'postgres';
  }
  // 在集成测试模式下显式禁用内存 Mongo（可通过环境变量覆盖）
  if (!process.env.USE_MEMORY_MONGO) {
    process.env.USE_MEMORY_MONGO = 'false';
  }
  
  console.log('🧪 Global test setup completed');
}