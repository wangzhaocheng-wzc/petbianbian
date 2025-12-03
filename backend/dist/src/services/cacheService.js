"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTTL = exports.CacheKeys = exports.CacheService = void 0;
const redis_1 = __importDefault(require("../config/redis"));
class CacheService {
    constructor() {
        this.defaultTTL = 3600; // 1 hour in seconds
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    /**
     * Set a value in cache with optional TTL
     */
    async set(key, value, ttl) {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                console.warn('Redis client not connected, skipping cache set');
                return false;
            }
            const serializedValue = JSON.stringify(value);
            const expiration = ttl || this.defaultTTL;
            await client.setEx(key, expiration, serializedValue);
            return true;
        }
        catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }
    /**
     * Get a value from cache
     */
    async get(key) {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                console.warn('Redis client not connected, skipping cache get');
                return null;
            }
            const value = await client.get(key);
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    /**
     * Delete a value from cache
     */
    async del(key) {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                console.warn('Redis client not connected, skipping cache delete');
                return false;
            }
            const result = await client.del(key);
            return result > 0;
        }
        catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }
    /**
     * Delete multiple keys from cache
     */
    async delPattern(pattern) {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                console.warn('Redis client not connected, skipping cache pattern delete');
                return 0;
            }
            const keys = await client.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            const result = await client.del(keys);
            return result;
        }
        catch (error) {
            console.error('Cache pattern delete error:', error);
            return 0;
        }
    }
    /**
     * Check if a key exists in cache
     */
    async exists(key) {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                return false;
            }
            const result = await client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }
    /**
     * Set TTL for an existing key
     */
    async expire(key, ttl) {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                return false;
            }
            const result = await client.expire(key, ttl);
            return result === 1;
        }
        catch (error) {
            console.error('Cache expire error:', error);
            return false;
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                return null;
            }
            const info = await client.info('memory');
            return {
                connected: client.isOpen,
                memory: info,
            };
        }
        catch (error) {
            console.error('Cache stats error:', error);
            return null;
        }
    }
    /**
     * Clear all cache
     */
    async clear() {
        try {
            const client = redis_1.default;
            if (!client || !client.isOpen) {
                return false;
            }
            await client.flushAll();
            return true;
        }
        catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }
}
exports.CacheService = CacheService;
// Cache key generators
exports.CacheKeys = {
    user: (id) => `user:${id}`,
    userPets: (userId) => `user:${userId}:pets`,
    pet: (id) => `pet:${id}`,
    poopRecords: (petId, page = 1) => `poop:${petId}:page:${page}`,
    poopRecord: (id) => `poop:record:${id}`,
    communityPosts: (page = 1, category) => category ? `community:${category}:page:${page}` : `community:page:${page}`,
    communityPost: (id) => `community:post:${id}`,
    userStats: (userId) => `stats:user:${userId}`,
    petStats: (petId) => `stats:pet:${petId}`,
    analysisStats: () => 'stats:analysis:global',
};
// Cache TTL constants (in seconds)
exports.CacheTTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
};
exports.default = CacheService.getInstance();
//# sourceMappingURL=cacheService.js.map