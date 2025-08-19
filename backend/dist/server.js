"use strict";
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
const community_1 = __importDefault(require("./routes/community"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./utils/database");
const logger_1 = require("./utils/logger");
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
// 静态文件
app.use('/uploads', express_1.default.static('uploads'));
// 路由
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/pets', pets_1.default);
app.use('/api/analysis', analysis_1.default);
app.use('/api/community', community_1.default);
// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// 404处理
app.use('*', errorHandler_1.notFoundHandler);
// 错误处理
app.use(errorHandler_1.errorHandler);
// 启动服务器
const startServer = async () => {
    try {
        await (0, database_1.connectDB)();
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
        logger_1.Logger.info('数据库连接已关闭');
        process.exit(0);
    }
    catch (error) {
        logger_1.Logger.error('关闭数据库连接时出错:', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    logger_1.Logger.info('收到SIGINT信号，正在关闭服务器...');
    try {
        await mongoose_1.default.connection.close();
        logger_1.Logger.info('数据库连接已关闭');
        process.exit(0);
    }
    catch (error) {
        logger_1.Logger.error('关闭数据库连接时出错:', error);
        process.exit(1);
    }
});
startServer();
//# sourceMappingURL=server.js.map