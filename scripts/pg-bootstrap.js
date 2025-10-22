const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connStr = process.argv[2] || process.env.PGURL;
if (!connStr) {
  console.error('用法: node scripts/pg-bootstrap.js <postgres_url>');
  console.error('示例: node scripts/pg-bootstrap.js "postgresql://user:pass@host:port/db"');
  process.exit(1);
}

const schemaPath = path.resolve(__dirname, 'postgres', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('找不到 schema.sql: ' + schemaPath);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');

async function connectWithFallback(connectionString) {
  // Try SSL first, then without SSL if server does not support it
  let client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, application_name: 'pg-bootstrap' });
  try {
    await client.connect();
    console.log('使用 SSL 连接成功。');
    return client;
  } catch (err) {
    const msg = String(err && err.message || '');
    if (msg.includes('does not support SSL') || msg.includes('handshake') || msg.includes('certificate')) {
      console.log('SSL 不可用，尝试以非 SSL 连接...');
      try { await client.end(); } catch (_) {}
      client = new Client({ connectionString, ssl: false, application_name: 'pg-bootstrap' });
      await client.connect();
      console.log('使用非 SSL 连接成功。');
      return client;
    }
    throw err;
  }
}

(async () => {
  let client;

  try {
    console.log('正在连接到 PostgreSQL...');
    client = await connectWithFallback(connStr);
    const ver = await client.query('SELECT version()');
    console.log('连接成功。服务器版本: ' + ver.rows[0].version);

    console.log('开始执行 DDL 迁移...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('DDL 迁移完成。');

    console.log('验证关键对象是否存在...');
    const tables = [
      'users','pets','poop_records','community_posts','post_images','tags','post_tags',
      'post_likes','comments','comment_likes','content_reports','moderation_rules',
      'user_profiles','user_preferences','user_stats','user_tokens',
      'notifications','alert_rules'
    ];
    const checks = [];
    for (const t of tables) {
      const res = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        [t]
      );
      checks.push({ table: t, exists: res.rows[0].exists });
    }
    console.log('表检查结果:');
    console.table(checks);

    const enumTypes = [
      'user_role','pet_type','gender','poop_shape','health_status','post_status','post_category',
      'moderation_status','report_reason','moderation_action','moderation_rule_type',
      'notification_type','notification_category','notification_status','notification_priority'
    ];
    const enumCheckRes = await client.query(
      `SELECT t.typname AS name
         FROM pg_type t
         JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = ANY($1::text[])
        GROUP BY t.typname
        ORDER BY t.typname`,
      [enumTypes]
    );
    console.log('枚举存在: ' + enumCheckRes.rows.map(r => r.name).join(', '));

    console.log('全部完成。');
    process.exit(0);
  } catch (err) {
    console.error('迁移失败: ' + err.message);
    if (err.stack) console.error(err.stack);
    try { await client.query('ROLLBACK'); } catch (_) {}
    process.exit(2);
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();