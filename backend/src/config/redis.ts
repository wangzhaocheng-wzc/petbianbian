import { createClient } from 'redis';
import { Logger } from '../utils/logger';

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

const redisClient = isRedisEnabled ? createClient({
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
    Logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    Logger.info('Redis Client Connected');
  });

  redisClient.on('ready', () => {
    Logger.info('Redis Client Ready');
  });

  redisClient.on('end', () => {
    Logger.info('Redis Client Disconnected');
  });
}

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    // 按启用开关与URL判断是否跳过连接
    if (!isRedisEnabled) {
      const reason = explicitlyDisabled ? 'REDIS_ENABLED=false' : '未配置 REDIS_URL';
      Logger.info(`Redis 已禁用（${reason}），跳过连接`);
      return;
    }
    
    if (redisClient && !redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    Logger.error('Failed to connect to Redis:', error);
    // Don't throw error to allow app to continue without cache
  }
};

// Disconnect from Redis
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
    }
  } catch (error) {
    Logger.error('Failed to disconnect from Redis:', error);
  }
};

export default redisClient;