import { createClient } from 'redis';

// Redis client configuration
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 60000,
  },
});

// Skip Redis if URL is not configured
const isRedisEnabled = process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '';

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
export const connectRedis = async (): Promise<void> => {
  try {
    // Skip Redis connection if REDIS_URL is not set or empty
    if (!isRedisEnabled) {
      console.log('Redis URL not configured, skipping Redis connection');
      return;
    }
    
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // Don't throw error to allow app to continue without cache
  }
};

// Disconnect from Redis
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('Failed to disconnect from Redis:', error);
  }
};

export default redisClient;