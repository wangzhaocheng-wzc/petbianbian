"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
// 设置测试超时时间
jest.setTimeout(30000);
// 当主数据库为 Postgres 或者明确禁用内存 Mongo 时，跳过 mongodb-memory-server
const shouldUseMemoryMongo = (() => {
    const dbPrimary = process.env.DB_PRIMARY || 'mongo';
    const useMemoryEnv = (process.env.USE_MEMORY_MONGO || 'true').toLowerCase();
    const useMemory = useMemoryEnv === 'true' || useMemoryEnv === '1';
    return dbPrimary !== 'postgres' && useMemory;
})();
// 在所有测试之前运行
beforeAll(async () => {
    if (shouldUseMemoryMongo) {
        // 创建内存中的MongoDB实例
        const mongoServer = await mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        // 连接到测试数据库
        await mongoose_1.default.connect(mongoUri);
        // 保存MongoDB实例到全局变量
        global.__MONGO__ = mongoServer;
    }
    else {
        // 在 Postgres 测试模式下，跳过 Mongo 内存库
        console.log('🧪 跳过 mongodb-memory-server（DB_PRIMARY=postgres 或 USE_MEMORY_MONGO=false）');
    }
});
// 在每个测试之前运行
beforeEach(async () => {
    if (shouldUseMemoryMongo) {
        // 清理所有集合
        const collections = mongoose_1.default.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    }
});
// 在所有测试之后运行
afterAll(async () => {
    if (shouldUseMemoryMongo) {
        // 关闭数据库连接
        try {
            await mongoose_1.default.connection.dropDatabase();
        }
        catch { }
        await mongoose_1.default.connection.close();
        // 停止MongoDB实例
        if (global.__MONGO__) {
            await global.__MONGO__.stop();
        }
    }
    else {
        if (mongoose_1.default.connection.readyState !== 0) {
            await mongoose_1.default.connection.close();
        }
    }
});
// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health-test';
//# sourceMappingURL=setup.js.map