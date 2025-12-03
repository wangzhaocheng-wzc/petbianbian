export declare class CacheService {
    private static instance;
    private defaultTTL;
    static getInstance(): CacheService;
    /**
     * Set a value in cache with optional TTL
     */
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    /**
     * Get a value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Delete a value from cache
     */
    del(key: string): Promise<boolean>;
    /**
     * Delete multiple keys from cache
     */
    delPattern(pattern: string): Promise<number>;
    /**
     * Check if a key exists in cache
     */
    exists(key: string): Promise<boolean>;
    /**
     * Set TTL for an existing key
     */
    expire(key: string, ttl: number): Promise<boolean>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<any>;
    /**
     * Clear all cache
     */
    clear(): Promise<boolean>;
}
export declare const CacheKeys: {
    user: (id: string) => string;
    userPets: (userId: string) => string;
    pet: (id: string) => string;
    poopRecords: (petId: string, page?: number) => string;
    poopRecord: (id: string) => string;
    communityPosts: (page?: number, category?: string) => string;
    communityPost: (id: string) => string;
    userStats: (userId: string) => string;
    petStats: (petId: string) => string;
    analysisStats: () => string;
};
export declare const CacheTTL: {
    SHORT: number;
    MEDIUM: number;
    LONG: number;
    VERY_LONG: number;
};
declare const _default: CacheService;
export default _default;
//# sourceMappingURL=cacheService.d.ts.map