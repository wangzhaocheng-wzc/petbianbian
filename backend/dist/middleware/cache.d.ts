import { Request, Response, NextFunction } from 'express';
interface CacheOptions {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request, res: Response) => boolean;
}
/**
 * Cache middleware for API responses
 */
export declare const cacheMiddleware: (options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Cache invalidation middleware
 */
export declare const invalidateCacheMiddleware: (patterns: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Predefined cache configurations
 */
export declare const CacheConfigs: {
    userData: {
        ttl: number;
        keyGenerator: (req: Request) => string;
    };
    petData: {
        ttl: number;
        keyGenerator: (req: Request) => string;
    };
    poopRecords: {
        ttl: number;
        keyGenerator: (req: Request) => string;
    };
    communityPosts: {
        ttl: number;
        keyGenerator: (req: Request) => string;
    };
    statistics: {
        ttl: number;
        keyGenerator: (req: Request) => string;
    };
};
/**
 * Cache invalidation patterns
 */
export declare const InvalidationPatterns: {
    user: (userId: string) => string[];
    pet: (petId: string) => string[];
    community: () => string[];
    analysis: (petId: string) => string[];
};
export {};
//# sourceMappingURL=cache.d.ts.map