const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  const connectionString = process.env.POSTGRES_URL || process.env.PG_URL;
  if (!connectionString) {
    console.error('POSTGRES_URL/PG_URL 未配置，无法初始化数据库');
    process.exit(1);
  }

  const schemaPath = path.resolve(__dirname, '../../scripts/postgres/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('未找到 schema.sql 文件:', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  let pool;
  try {
    // 优先尝试 SSL 连接
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    await pool.query('SELECT 1');
    console.log('Postgres: 已通过 SSL 连接');
  } catch (err) {
    console.warn('Postgres: SSL 连接失败，尝试非 SSL，原因:', err.message);
    pool = new Pool({ connectionString });
    await pool.query('SELECT 1');
    console.log('Postgres: 已通过非 SSL 连接');
  }

  try {
    console.log('开始应用数据库架构:', schemaPath);
    await pool.query(sql);
    console.log('数据库架构应用成功');
    process.exit(0);
  } catch (e) {
    console.error('数据库架构应用失败:', e);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch {}
  }
})();