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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
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
// import alertRoutes from './routes/alerts';
// import notificationRoutes from './routes/notifications';
const errorHandler_1 = require("./middleware/errorHandler");
const monitoringService_1 = require("./services/monitoringService");
const errorTrackingService_1 = require("./services/errorTrackingService");
const requestLogger_1 = require("./middleware/requestLogger");
const database_1 = require("./utils/database");
const logger_1 = require("./utils/logger");
const redis_1 = require("./config/redis");
dotenv_1.default.config();
const constants_1 = require("./config/constants");
const app = (0, express_1.default)();
const PORT = constants_1.APP_CONFIG.PORT;
// 中间件
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// 监控中间件
app.use(monitoringService_1.monitoringMiddleware);
// 请求日志中间件
app.use(requestLogger_1.requestLoggerMiddleware);
// 静态文件
app.use('/uploads', express_1.default.static('uploads'));
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
// app.use('/api/alerts', alertRoutes);
// app.use('/api/notifications', notificationRoutes);
// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        const cacheService = (await Promise.resolve().then(() => __importStar(require('./services/cacheService')))).default;
        const cacheStats = await cacheService.getStats();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
            cache: cacheStats?.connected ? 'connected' : 'disconnected'
        });
    }
    catch (error) {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
            cache: 'error'
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
        await (0, database_1.connectDB)();
        await (0, redis_1.connectRedis)();
        app.listen(PORT, () => {
            logger_1.Logger.info(`服务器运行在端口 ${PORT}`);
            logger_1.Logger.info(`健康检查: http://localhost:${PORT}/api/health`);
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
        await mongoose_1.default.connection.close();
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
        await mongoose_1.default.connection.close();
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