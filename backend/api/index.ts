import app from '../src/server';
import { connectDB } from '../src/utils/database';
import { connectPostgres } from '../src/config/postgres';
import { connectRedis } from '../src/config/redis';

// 缓存数据库连接状态
let isConnected = false;

export default async function handler(req: any, res: any) {
  if (!isConnected) {
    try {
      // 并行连接所有服务
      await Promise.all([
        connectPostgres().catch(err => console.error('Postgres init failed:', err)),
        connectDB().catch(err => console.error('Mongo init failed:', err)),
        connectRedis().catch(err => console.error('Redis init failed:', err))
      ]);
      isConnected = true;
      console.log('Vercel: Database connections established');
    } catch (error) {
      console.error('Vercel: Database connection error:', error);
    }
  }

  // 将请求交给 Express 处理
  return app(req, res);
}
