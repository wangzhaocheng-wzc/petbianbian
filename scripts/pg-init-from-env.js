// 从 backend/.env 加载 PostgreSQL 连接，解析参数并执行架构初始化
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.error('未找到 backend/.env，请先创建并设置 POSTGRES_URL');
  process.exit(1);
}

// 轻量解析 .env 文件
const raw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  env[key] = val;
}

let url = env.POSTGRES_URL || env.DATABASE_URL || env.PGURL;
if (!url) {
  console.error('backend/.env 中未找到 POSTGRES_URL / DATABASE_URL / PGURL');
  process.exit(1);
}

// 规范化协议
url = url.replace(/^postgres:\/\//, 'postgresql://');
const u = new URL(url);
const username = decodeURIComponent(u.username || '');
const password = decodeURIComponent(u.password || '');
const host = u.hostname;
const port = u.port ? Number(u.port) : 5432;
const database = (u.pathname || '').replace(/^\//,'') || 'postgres';

const standardUrl = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

console.log('解析到的连接参数:');
console.table([{ host, port, database, user: username }]);
console.log('标准化连接字符串:');
console.log(standardUrl);

console.log('开始执行架构初始化...');
const child = spawn(process.execPath, [path.resolve(__dirname, 'pg-bootstrap.js'), standardUrl], {
  stdio: 'inherit'
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('架构初始化与校验完成。');
  } else {
    console.error('架构初始化失败，已尝试回滚。退出码: ' + code);
  }
  process.exit(code);
});