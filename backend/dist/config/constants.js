"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODERATION_STATUS = exports.POST_CATEGORIES = exports.PET_TYPES = exports.HEALTH_STATUS = exports.POOP_TYPES = exports.APP_CONFIG = void 0;
// 应用常量配置
exports.APP_CONFIG = {
    // 服务器配置
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    // 数据库配置
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health',
    // JWT配置
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    JWT_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    // 文件上传配置
    BASE_URL: process.env.BASE_URL || 'http://localhost:5000',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    UPLOAD_PATH: {
        AVATARS: 'uploads/avatars',
        ANALYSIS: 'uploads/analysis',
        COMMUNITY: 'uploads/community'
    },
    AI_SERVICE: {
        URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
        KEY: process.env.AI_SERVICE_KEY || 'default-key'
    },
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        MAX_PAGE_SIZE: 100
    },
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100
    }
};
// 便便分析类型
exports.POOP_TYPES = {
    TYPE1: 'type1', // 硬球状
    TYPE2: 'type2', // 块状
    TYPE3: 'type3', // 裂纹状
    TYPE4: 'type4', // 光滑软便
    TYPE5: 'type5', // 软块状
    TYPE6: 'type6', // 糊状
    TYPE7: 'type7', // 水状
};
// 健康状态
exports.HEALTH_STATUS = {
    HEALTHY: 'healthy',
    WARNING: 'warning',
    CONCERNING: 'concerning',
};
// 宠物类型
exports.PET_TYPES = {
    DOG: 'dog',
    CAT: 'cat',
    OTHER: 'other',
};
// 社区帖子分类
exports.POST_CATEGORIES = {
    HEALTH: 'health',
    HELP: 'help',
    EXPERIENCE: 'experience',
    GENERAL: 'general',
};
// 审核状态
exports.MODERATION_STATUS = {
    APPROVED: 'approved',
    PENDING: 'pending',
    REJECTED: 'rejected',
};
//# sourceMappingURL=constants.js.map