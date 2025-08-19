"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// 数据库连接配置
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health';
        await mongoose_1.default.connect(mongoURI, {
        // 移除已弃用的选项，使用默认配置
        });
        console.log('MongoDB 连接成功');
        // 监听连接事件
        mongoose_1.default.connection.on('error', (err) => {
            console.error('MongoDB 连接错误:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDB 连接断开');
        });
    }
    catch (error) {
        console.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
// 优雅关闭数据库连接
const closeDB = async () => {
    try {
        await mongoose_1.default.connection.close();
        console.log('MongoDB 连接已关闭');
    }
    catch (error) {
        console.error('关闭MongoDB连接时出错:', error);
    }
};
exports.closeDB = closeDB;
//# sourceMappingURL=database.js.map