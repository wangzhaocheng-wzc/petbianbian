import { Pool } from 'pg';

let pool: Pool | null = null;

export const getPostgresPool = async (): Promise<Pool> => {
  if (pool) return pool;

  const connectionString = process.env.POSTGRES_URL || process.env.PG_URL || '';
  if (!connectionString) throw new Error('POSTGRES_URL/PG_URL 未配置');

  // 优先尝试SSL，失败后自动降级到非SSL
  try {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    // 简单探测连接
    await pool.query('SELECT 1');
    return pool;
  } catch (err) {
    // 降级到非SSL
    pool = new Pool({ connectionString, ssl: false as any });
    await pool.query('SELECT 1');
    return pool;
  }
};

export const connectPostgres = async () => {
  try {
    const p = await getPostgresPool();
    const res = await p.query('SELECT version()');
    console.log(`Postgres 连接成功: ${res.rows[0].version}`);
  } catch (error) {
    console.error('Postgres 连接失败（将继续启动以保持兼容）:', error);
  }
};

export const getPostgresStatus = async () => {
  try {
    const p = await getPostgresPool();
    await p.query('SELECT 1');
    return 'connected';
  } catch {
    return 'disconnected';
  }
};