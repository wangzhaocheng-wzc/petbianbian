"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectRedis = exports.connectRedis = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
// Redis 启用开关：
// - REDIS_ENABLED=true/1 显式启用
// - REDIS_ENABLED=false/0 显式禁用
// - 未设置时，若存在非空 REDIS_URL 则启用，否则禁用
const redisEnabledRaw = (process.env.REDIS_ENABLED || '').toLowerCase();
const explicitlyDisabled = redisEnabledRaw === '0' || redisEnabledRaw === 'false';
const explicitlyEnabled = redisEnabledRaw === '1' || redisEnabledRaw === 'true';
const hasRedisUrl = !!(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '');
const isRedisEnabled = explicitlyDisabled ? false : (explicitlyEnabled ? true : hasRedisUrl);
// Redis client configuration
const redisUsername = process.env.REDIS_USERNAME || undefined;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisDb = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;
const redisConnectTimeout = process.env.REDIS_CONNECT_TIMEOUT ? Number(process.env.REDIS_CONNECT_TIMEOUT) : 10000;
const url = process.env.REDIS_URL || 'redis://localhost:6379';
const redisTlsFlag = (process.env.REDIS_TLS || '').toLowerCase();
const isTlsEnabled = url.startsWith('rediss://') || redisTlsFlag === '1' || redisTlsFlag === 'true';
const redisClient = isRedisEnabled ? (0, redis_1.createClient)({
    url,
    username: redisUsername,
    password: redisPassword,
    database: redisDb,
    disableOfflineQueue: true,
    socket: {
        connectTimeout: redisConnectTimeout,
        tls: isTlsEnabled || undefined,
        // 限制重连次数，避免启动期错误日志持续刷屏
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                return new Error('Redis reconnect limit reached');
            }
            return Math.min(retries * 1000, 5000);
        },
    },
}) : null;
// Error handling
if (redisClient) {
    redisClient.on('error', (err) => {
        logger_1.Logger.error('Redis Client Error:', err);
    });
    redisClient.on('connect', () => {
        logger_1.Logger.info('Redis Client Connected');
    });
    redisClient.on('ready', () => {
        logger_1.Logger.info('Redis Client Ready');
    });
    redisClient.on('end', () => {
        logger_1.Logger.info('Redis Client Disconnected');
    });
}
// Connect to Redis
const connectRedis = async () => {
    try {
        // 按启用开关与URL判断是否跳过连接
        if (!isRedisEnabled) {
            const reason = explicitlyDisabled ? 'REDIS_ENABLED=false' : '未配置 REDIS_URL';
            logger_1.Logger.info(`Redis 已禁用（${reason}），跳过连接`);
            return;
        }
        if (redisClient && !redisClient.isOpen) {
            await redisClient.connect();
        }
    }
    catch (error) {
        logger_1.Logger.error('Failed to connect to Redis:', error);
        // Don't throw error to allow app to continue without cache
    }
};
exports.connectRedis = connectRedis;
// Disconnect from Redis
const disconnectRedis = async () => {
    try {
        if (redisClient && redisClient.isOpen) {
            await redisClient.disconnect();
        }
    }
    catch (error) {
        logger_1.Logger.error('Failed to disconnect from Redis:', error);
    }
};
exports.disconnectRedis = disconnectRedis;
exports.default = redisClient;
//# sourceMappingURL=redis.js.map