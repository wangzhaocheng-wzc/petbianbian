export declare const APP_CONFIG: {
    PORT: string | number;
    NODE_ENV: string;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    REFRESH_TOKEN_EXPIRES_IN: string;
    BASE_URL: string;
    MAX_FILE_SIZE: number;
    ALLOWED_IMAGE_TYPES: string[];
    UPLOAD_PATH: {
        AVATARS: string;
        ANALYSIS: string;
        COMMUNITY: string;
    };
    AI_SERVICE: {
        URL: string;
        KEY: string;
    };
    PAGINATION: {
        DEFAULT_PAGE_SIZE: number;
        MAX_PAGE_SIZE: number;
    };
    RATE_LIMIT: {
        WINDOW_MS: number;
        MAX_REQUESTS: number;
    };
};
export declare const POOP_TYPES: {
    readonly TYPE1: "type1";
    readonly TYPE2: "type2";
    readonly TYPE3: "type3";
    readonly TYPE4: "type4";
    readonly TYPE5: "type5";
    readonly TYPE6: "type6";
    readonly TYPE7: "type7";
};
export declare const HEALTH_STATUS: {
    readonly HEALTHY: "healthy";
    readonly WARNING: "warning";
    readonly CONCERNING: "concerning";
};
export declare const PET_TYPES: {
    readonly DOG: "dog";
    readonly CAT: "cat";
    readonly OTHER: "other";
};
export declare const POST_CATEGORIES: {
    readonly HEALTH: "health";
    readonly HELP: "help";
    readonly EXPERIENCE: "experience";
    readonly GENERAL: "general";
};
export declare const MODERATION_STATUS: {
    readonly APPROVED: "approved";
    readonly PENDING: "pending";
    readonly REJECTED: "rejected";
};
//# sourceMappingURL=constants.d.ts.map