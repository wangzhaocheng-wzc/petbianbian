"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectRedis = exports.connectRedis = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
// Skip Redis if URL is not configured
const isRedisEnabled = process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '';
// Redis client configuration
const redisClient = isRedisEnabled ? (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        connectTimeout: 60000,
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
        // Skip Redis connection if REDIS_URL is not set or empty
        if (!isRedisEnabled) {
            logger_1.Logger.info('Redis URL not configured, skipping Redis connection');
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