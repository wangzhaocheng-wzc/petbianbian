import redisClient from '../config/redis';

export class CacheService {
  private static instance: CacheService;
  private defaultTTL = 3600; // 1 hour in seconds

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        console.warn('Redis client not connected, skipping cache set');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      
      await redisClient.setEx(key, expiration, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!redisClient.isOpen) {
        console.warn('Redis client not connected, skipping cache get');
        return null;
      }

      const value = await redisClient.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        console.warn('Redis client not connected, skipping cache delete');
        return false;
      }

      const result = await redisClient.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (!redisClient.isOpen) {
        console.warn('Redis client not connected, skipping cache pattern delete');
        return 0;
      }

      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await redisClient.del(keys);
      return result;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }

      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set TTL for an existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }

      const result = await redisClient.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      if (!redisClient.isOpen) {
        return null;
      }

      const info = await redisClient.info('memory');
      return {
        connected: redisClient.isOpen,
        memory: info,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      if (!redisClient.isOpen) {
        return false;
      }

      await redisClient.flushAll();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
}

// Cache key generators
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userPets: (userId: string) => `user:${userId}:pets`,
  pet: (id: string) => `pet:${id}`,
  poopRecords: (petId: string, page: number = 1) => `poop:${petId}:page:${page}`,
  poopRecord: (id: string) => `poop:record:${id}`,
  communityPosts: (page: number = 1, category?: string) => 
    category ? `community:${category}:page:${page}` : `community:page:${page}`,
  communityPost: (id: string) => `community:post:${id}`,
  userStats: (userId: string) => `stats:user:${userId}`,
  petStats: (petId: string) => `stats:pet:${petId}`,
  analysisStats: () => 'stats:analysis:global',
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,    // 5 minutes
  MEDIUM: 1800,  // 30 minutes
  LONG: 3600,    // 1 hour
  VERY_LONG: 86400, // 24 hours
};

export default CacheService.getInstance();