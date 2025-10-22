import { createClient } from 'redis';
import { Logger } from '../utils/logger';

// Skip Redis if URL is not configured
const isRedisEnabled = process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '';

// Redis client configuration
const redisClient = isRedisEnabled ? createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 60000,
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
    // Skip Redis connection if REDIS_URL is not set or empty
    if (!isRedisEnabled) {
      Logger.info('Redis URL not configured, skipping Redis connection');
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