"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const server_1 = __importDefault(require("../src/server"));
const database_1 = require("../src/utils/database");
const postgres_1 = require("../src/config/postgres");
const redis_1 = require("../src/config/redis");
// 缓存数据库连接状态
let isConnected = false;
async function handler(req, res) {
    if (!isConnected) {
        try {
            // 并行连接所有服务
            await Promise.all([
                (0, postgres_1.connectPostgres)().catch(err => console.error('Postgres init failed:', err)),
                (0, database_1.connectDB)().catch(err => console.error('Mongo init failed:', err)),
                (0, redis_1.connectRedis)().catch(err => console.error('Redis init failed:', err))
            ]);
            isConnected = true;
            console.log('Vercel: Database connections established');
        }
        catch (error) {
            console.error('Vercel: Database connection error:', error);
        }
    }
    // 将请求交给 Express 处理
    return (0, server_1.default)(req, res);
}
//# sourceMappingURL=index.js.map