import { Request, Response, NextFunction } from 'express';
import cacheService, { CacheTTL } from '../services/cacheService';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
}

/**
 * Cache middleware for API responses
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateDefaultCacheKey(req);

    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      console.log(`Cache miss for key: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function(data: any) {
        // Check condition if provided
        if (options.condition && !options.condition(req, res)) {
          return originalJson.call(this, data);
        }

        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.ttl || CacheTTL.MEDIUM;
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req: Request): string {
  const { path, query, user } = req;
  const userId = (user as any)?._id || 'anonymous';
  const queryString = Object.keys(query).length > 0 
    ? JSON.stringify(query) 
    : '';
  
  return `api:${path}:${userId}:${queryString}`;
}

/**
 * Cache invalidation middleware
 */
export const invalidateCacheMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to invalidate cache after successful operations
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          try {
            await cacheService.delPattern(pattern);
            console.log(`Invalidated cache pattern: ${pattern}`);
          } catch (error) {
            console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
          }
        }
      }
    };

    res.json = function(data: any) {
      invalidateCache();
      return originalJson.call(this, data);
    };

    res.send = function(data: any) {
      invalidateCache();
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Predefined cache configurations
 */
export const CacheConfigs = {
  // User data caching
  userData: {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req: Request) => `user:${(req as any).user._id}:profile`,
  },

  // Pet data caching
  petData: {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user._id;
      const petId = req.params.petId;
      return petId ? `pet:${petId}` : `user:${userId}:pets`;
    },
  },

  // Poop records caching
  poopRecords: {
    ttl: CacheTTL.SHORT,
    keyGenerator: (req: Request) => {
      const petId = req.params.petId;
      const page = req.query.page || 1;
      return `poop:${petId}:page:${page}`;
    },
  },

  // Community posts caching
  communityPosts: {
    ttl: CacheTTL.SHORT,
    keyGenerator: (req: Request) => {
      const page = req.query.page || 1;
      const category = req.query.category;
      return category 
        ? `community:${category}:page:${page}`
        : `community:page:${page}`;
    },
  },

  // Statistics caching
  statistics: {
    ttl: CacheTTL.LONG,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user._id;
      const petId = req.params.petId;
      return petId ? `stats:pet:${petId}` : `stats:user:${userId}`;
    },
  },
};

/**
 * Cache invalidation patterns
 */
export const InvalidationPatterns = {
  user: (userId: string) => [`user:${userId}*`],
  pet: (petId: string) => [`pet:${petId}*`, `poop:${petId}*`, `stats:pet:${petId}*`],
  community: () => ['community:*'],
  analysis: (petId: string) => [`poop:${petId}*`, `stats:pet:${petId}*`, 'stats:analysis:*'],
};