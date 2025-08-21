"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectRedis = exports.connectRedis = void 0;
const redis_1 = require("redis");
// Redis client configuration
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        connectTimeout: 60000,
    },
});
// Error handling
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});
redisClient.on('connect', () => {
    console.log('Redis Client Connected');
});
redisClient.on('ready', () => {
    console.log('Redis Client Ready');
});
redisClient.on('end', () => {
    console.log('Redis Client Disconnected');
});
// Connect to Redis
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    }
    catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Don't throw error to allow app to continue without cache
    }
};
exports.connectRedis = connectRedis;
// Disconnect from Redis
const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.disconnect();
        }
    }
    catch (error) {
        console.error('Failed to disconnect from Redis:', error);
    }
};
exports.disconnectRedis = disconnectRedis;
exports.default = redisClient;
//# sourceMappingURL=redis.js.map