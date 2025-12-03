"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidationPatterns = exports.CacheConfigs = exports.invalidateCacheMiddleware = exports.cacheMiddleware = void 0;
const cacheService_1 = __importStar(require("../services/cacheService"));
/**
 * Cache middleware for API responses
 */
const cacheMiddleware = (options = {}) => {
    return async (req, res, next) => {
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
            const cachedResponse = await cacheService_1.default.get(cacheKey);
            if (cachedResponse) {
                console.log(`Cache hit for key: ${cacheKey}`);
                return res.json(cachedResponse);
            }
            console.log(`Cache miss for key: ${cacheKey}`);
            // Store original json method
            const originalJson = res.json;
            // Override json method to cache the response
            res.json = function (data) {
                // Check condition if provided
                if (options.condition && !options.condition(req, res)) {
                    return originalJson.call(this, data);
                }
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const ttl = options.ttl || cacheService_1.CacheTTL.MEDIUM;
                    cacheService_1.default.set(cacheKey, data, ttl).catch(err => {
                        console.error('Failed to cache response:', err);
                    });
                }
                return originalJson.call(this, data);
            };
            next();
        }
        catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req) {
    const { path, query, user } = req;
    const userId = user?._id || 'anonymous';
    const queryString = Object.keys(query).length > 0
        ? JSON.stringify(query)
        : '';
    return `api:${path}:${userId}:${queryString}`;
}
/**
 * Cache invalidation middleware
 */
const invalidateCacheMiddleware = (patterns) => {
    return async (req, res, next) => {
        // Store original methods
        const originalJson = res.json;
        const originalSend = res.send;
        // Override response methods to invalidate cache after successful operations
        const invalidateCache = async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                for (const pattern of patterns) {
                    try {
                        await cacheService_1.default.delPattern(pattern);
                        console.log(`Invalidated cache pattern: ${pattern}`);
                    }
                    catch (error) {
                        console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
                    }
                }
            }
        };
        res.json = function (data) {
            invalidateCache();
            return originalJson.call(this, data);
        };
        res.send = function (data) {
            invalidateCache();
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.invalidateCacheMiddleware = invalidateCacheMiddleware;
/**
 * Predefined cache configurations
 */
exports.CacheConfigs = {
    // User data caching
    userData: {
        ttl: cacheService_1.CacheTTL.MEDIUM,
        keyGenerator: (req) => `user:${req.user._id}:profile`,
    },
    // Pet data caching
    petData: {
        ttl: cacheService_1.CacheTTL.MEDIUM,
        keyGenerator: (req) => {
            const userId = req.user._id;
            const petId = req.params.petId;
            return petId ? `pet:${petId}` : `user:${userId}:pets`;
        },
    },
    // Poop records caching
    poopRecords: {
        ttl: cacheService_1.CacheTTL.SHORT,
        keyGenerator: (req) => {
            const petId = req.params.petId;
            const page = req.query.page || 1;
            return `poop:${petId}:page:${page}`;
        },
    },
    // Community posts caching
    communityPosts: {
        ttl: cacheService_1.CacheTTL.SHORT,
        keyGenerator: (req) => {
            const page = req.query.page || 1;
            const category = req.query.category;
            return category
                ? `community:${category}:page:${page}`
                : `community:page:${page}`;
        },
    },
    // Statistics caching
    statistics: {
        ttl: cacheService_1.CacheTTL.LONG,
        keyGenerator: (req) => {
            const userId = req.user._id;
            const petId = req.params.petId;
            return petId ? `stats:pet:${petId}` : `stats:user:${userId}`;
        },
    },
};
/**
 * Cache invalidation patterns
 */
exports.InvalidationPatterns = {
    user: (userId) => [`user:${userId}*`],
    pet: (petId) => [`pet:${petId}*`, `poop:${petId}*`, `stats:pet:${petId}*`],
    community: () => ['community:*'],
    analysis: (petId) => [`poop:${petId}*`, `stats:pet:${petId}*`, 'stats:analysis:*'],
};
//# sourceMappingURL=cache.js.map