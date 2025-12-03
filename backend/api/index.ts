import app from '../src/server';
import { connectDB } from '../src/utils/database';
import { connectPostgres } from '../src/config/postgres';
import { connectRedis } from '../src/config/redis';

// 缓存数据库连接状态
let isConnected = false;

export default async function handler(req: any, res: any) {
  // Log request details for debugging
  console.log(`[Vercel] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);

  // 手动处理 CORS 预检请求 (OPTIONS)
  // 这是解决 Vercel 部署中 CORS 问题的最稳健方法，因为它绕过了 Express 的中间件链
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Init-Request'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
