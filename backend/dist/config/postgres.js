"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostgresStatus = exports.connectPostgres = exports.getPostgresPool = void 0;
const pg_1 = require("pg");
let pool = null;
const getPostgresPool = async () => {
    if (pool)
        return pool;
    const connectionString = process.env.POSTGRES_URL || process.env.PG_URL || '';
    if (!connectionString)
        throw new Error('POSTGRES_URL/PG_URL 未配置');
    // 优先尝试SSL，失败后自动降级到非SSL
    try {
        pool = new pg_1.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
        // 简单探测连接
        await pool.query('SELECT 1');
        return pool;
    }
    catch (err) {
        // 降级到非SSL
        pool = new pg_1.Pool({ connectionString, ssl: false });
        await pool.query('SELECT 1');
        return pool;
    }
};
exports.getPostgresPool = getPostgresPool;
const connectPostgres = async () => {
    try {
        const p = await (0, exports.getPostgresPool)();
        const res = await p.query('SELECT version()');
        console.log(`Postgres 连接成功: ${res.rows[0].version}`);
    }
    catch (error) {
        console.error('Postgres 连接失败（将继续启动以保持兼容）:', error);
    }
};
exports.connectPostgres = connectPostgres;
const getPostgresStatus = async () => {
    try {
        const p = await (0, exports.getPostgresPool)();
        await p.query('SELECT 1');
        return 'connected';
    }
    catch {
        return 'disconnected';
    }
};
exports.getPostgresStatus = getPostgresStatus;
//# sourceMappingURL=postgres.js.map