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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const pets_1 = __importDefault(require("./routes/pets"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const records_1 = __importDefault(require("./routes/records"));
const community_1 = __importDefault(require("./routes/community"));
const upload_1 = __importDefault(require("./routes/upload"));
const statistics_1 = __importDefault(require("./routes/statistics"));
const moderation_1 = __importDefault(require("./routes/moderation"));
const cache_1 = __importDefault(require("./routes/cache"));
const admin_1 = __importDefault(require("./routes/admin"));
// import comparisonRoutes from './routes/comparison';
const reports_1 = __importDefault(require("./routes/reports"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const logs_1 = __importDefault(require("./routes/logs"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const governance_1 = __importDefault(require("./routes/governance"));
const errorHandler_1 = require("./middleware/errorHandler");
const monitoringService_1 = require("./services/monitoringService");
const errorTrackingService_1 = require("./services/errorTrackingService");
const requestLogger_1 = require("./middleware/requestLogger");
const logger_1 = require("./utils/logger");
const redis_1 = require("./config/redis");
const database_1 = require("./utils/database");
const postgres_1 = require("./config/postgres");
const imageUrlGovernanceService_1 = require("./services/imageUrlGovernanceService");
const envLocal = '.env.local';
if (fs_1.default.existsSync(envLocal)) {
    dotenv_1.default.config({ path: envLocal });
}
else {
    dotenv_1.default.config();
}
const constants_1 = require("./config/constants");
const app = (0, express_1.default)();
const PORT = constants_1.APP_CONFIG.PORT;
const DB_PRIMARY = process.env.DB_PRIMARY || 'postgres';
// 中间件
// 调整 Helmet 的跨源资源策略，允许前端 (5173) 加载后端静态资源（如 /uploads 下图片）
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
}));
// 更灵活的 CORS 配置，支持本机与局域网预览地址
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://localhost:4174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:4174',
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // 允许非浏览器请求（如curl、服务器端）
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        // 允许常见的局域网IP访问前端开发服务器与预览服务器（端口5173/5174/4173/4174）
        if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(517(3|4)|417(3|4))$/.test(origin))
            return callback(null, true);
        callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // 允许初始化请求使用的自定义头，避免预检失败
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Init-Request']
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// 监控中间件
app.use(monitoringService_1.monitoringMiddleware);
// 请求日志中间件
app.use(requestLogger_1.requestLoggerMiddleware);
// 静态文件 - 添加CORS头部与缓存、方法支持
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    // 允许 GET/HEAD/OPTIONS，便于前端用 HEAD 探测图片是否存在
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    // 为图片增加合理缓存，减少重复加载导致的闪烁（可按需调整）
    res.header('Cache-Control', 'public, max-age=86400'); // 1天
    next();
}, express_1.default.static('uploads'));
// 路由
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/pets', pets_1.default);
app.use('/api/analysis', analysis_1.default);
app.use('/api/records', records_1.default);
app.use('/api/community', community_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/statistics', statistics_1.default);
app.use('/api/moderation', moderation_1.default);
app.use('/api/cache', cache_1.default);
app.use('/api/admin', admin_1.default);
// app.use('/api/comparison', comparisonRoutes);
app.use('/api/reports', reports_1.default);
app.use('/api/monitoring', monitoring_1.default);
app.use('/api/logs', logs_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/governance', governance_1.default);
// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        const cacheService = (await Promise.resolve().then(() => __importStar(require('./services/cacheService')))).default;
        const cacheStats = await cacheService.getStats();
        const pgStatus = await (0, postgres_1.getPostgresStatus)();
        const primaryDb = 'postgres';
        const primaryDbStatus = pgStatus;
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            primary_db: primaryDb,
            primary_db_status: primaryDbStatus,
            cache: cacheStats?.connected ? 'connected' : 'disconnected',
            postgres: pgStatus
        });
    }
    catch (error) {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            primary_db: 'postgres',
            primary_db_status: 'error',
            cache: 'error',
            postgres: 'error'
        });
    }
});
// 404处理
app.use('*', errorHandler_1.notFoundHandler);
// 错误追踪中间件
app.use(errorTrackingService_1.errorTrackingMiddleware);
// 错误处理
app.use(errorHandler_1.errorHandler);
// 启动服务器
const startServer = async () => {
    try {
        await (0, postgres_1.connectPostgres)();
        // 启用 Mongo（或内存 Mongo）以支持社区模块
        // 即使主库为 Postgres，社区帖子与评论仍使用 Mongoose 模型
        try {
            await (0, database_1.connectDB)();
            logger_1.Logger.info('社区模块：Mongo 已连接（必要时使用内存回退）');
        }
        catch (err) {
            logger_1.Logger.warn('社区模块：Mongo 连接失败', err);
        }
        await (0, redis_1.connectRedis)();
        app.listen(PORT, () => {
            logger_1.Logger.info(`服务器运行在端口 ${PORT}`);
            logger_1.Logger.info(`健康检查: http://localhost:${PORT}/api/health`);
            logger_1.Logger.info(`主数据库: Postgres`);
            // 启动每日数据治理预览报告任务
            try {
                if (DB_PRIMARY !== 'postgres') {
                    (0, imageUrlGovernanceService_1.startGovernanceReportScheduler)();
                    logger_1.Logger.info('每日数据治理预览报告定时任务已启动');
                }
                else {
                    logger_1.Logger.info('Postgres 模式下跳过数据治理定时任务（Mongo 依赖已禁用）');
                }
            }
            catch (err) {
                logger_1.Logger.warn('启动数据治理定时任务失败', err);
            }
        });
    }
    catch (error) {
        logger_1.Logger.error('服务器启动失败:', error);
        process.exit(1);
    }
};
// 优雅关闭
process.on('SIGTERM', async () => {
    logger_1.Logger.info('收到SIGTERM信号，正在关闭服务器...');
    try {
        await (0, database_1.closeDB)();
        await (0, redis_1.disconnectRedis)();
        logger_1.Logger.info('数据库和缓存连接已关闭');
        process.exit(0);
    }
    catch (error) {
        logger_1.Logger.error('关闭连接时出错:', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    logger_1.Logger.info('收到SIGINT信号，正在关闭服务器...');
    try {
        await (0, database_1.closeDB)();
        await (0, redis_1.disconnectRedis)();
        logger_1.Logger.info('数据库和缓存连接已关闭');
        process.exit(0);
    }
    catch (error) {
        logger_1.Logger.error('关闭连接时出错:', error);
        process.exit(1);
    }
});
startServer();
//# sourceMappingURL=server.js.map