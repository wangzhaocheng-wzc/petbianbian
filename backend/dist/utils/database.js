"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDB = exports.createDatabaseIndexes = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// 数据库连接配置
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health';
        await mongoose_1.default.connect(mongoURI, {
        // 移除已弃用的选项，使用默认配置
        });
        console.log('MongoDB 连接成功');
        // 创建数据库索引以优化查询性能
        await (0, exports.createDatabaseIndexes)();
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
// 创建数据库索引以优化查询性能
const createDatabaseIndexes = async () => {
    try {
        const db = mongoose_1.default.connection.db;
        // 用户集合索引
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ isActive: 1 });
        await db.collection('users').createIndex({ createdAt: -1 });
        // 宠物集合索引
        await db.collection('pets').createIndex({ ownerId: 1, isActive: 1 });
        await db.collection('pets').createIndex({ ownerId: 1, name: 1 });
        await db.collection('pets').createIndex({ type: 1 });
        await db.collection('pets').createIndex({ createdAt: -1 });
        // 便便记录集合索引
        await db.collection('pooprecords').createIndex({ petId: 1, timestamp: -1 });
        await db.collection('pooprecords').createIndex({ userId: 1, timestamp: -1 });
        await db.collection('pooprecords').createIndex({ 'analysis.healthStatus': 1 });
        await db.collection('pooprecords').createIndex({ isShared: 1 });
        await db.collection('pooprecords').createIndex({ createdAt: -1 });
        // 社区帖子集合索引
        await db.collection('communityposts').createIndex({ userId: 1, status: 1 });
        await db.collection('communityposts').createIndex({ category: 1, status: 1 });
        await db.collection('communityposts').createIndex({ tags: 1 });
        await db.collection('communityposts').createIndex({ moderationStatus: 1 });
        await db.collection('communityposts').createIndex({ createdAt: -1 });
        await db.collection('communityposts').createIndex({ 'interactions.likes': 1 });
        // 评论集合索引
        await db.collection('comments').createIndex({ postId: 1, createdAt: -1 });
        await db.collection('comments').createIndex({ userId: 1 });
        await db.collection('comments').createIndex({ parentId: 1 });
        await db.collection('comments').createIndex({ moderationStatus: 1 });
        // 内容举报集合索引
        await db.collection('contentreports').createIndex({ contentId: 1, contentType: 1 });
        await db.collection('contentreports').createIndex({ reporterId: 1 });
        await db.collection('contentreports').createIndex({ status: 1 });
        await db.collection('contentreports').createIndex({ createdAt: -1 });
        // 复合索引用于复杂查询
        await db.collection('pooprecords').createIndex({
            petId: 1,
            'analysis.healthStatus': 1,
            timestamp: -1
        });
        await db.collection('communityposts').createIndex({
            category: 1,
            status: 1,
            moderationStatus: 1,
            createdAt: -1
        });
        console.log('数据库索引创建成功');
    }
    catch (error) {
        console.error('创建数据库索引时出错:', error);
        // 不抛出错误，允许应用继续运行
    }
};
exports.createDatabaseIndexes = createDatabaseIndexes;
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