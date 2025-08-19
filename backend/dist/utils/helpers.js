"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaginationResponse = exports.getPaginationParams = exports.generateRandomString = exports.verifyToken = exports.generateRefreshToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// 密码加密
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
// 密码验证
const comparePassword = async (password, hashedPassword) => {
    return await bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
// 生成JWT令牌
const generateToken = (payload, expiresIn = '15m') => {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn });
};
exports.generateToken = generateToken;
// 生成刷新令牌
const generateRefreshToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
// 验证令牌
const verifyToken = (token) => {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    return jsonwebtoken_1.default.verify(token, jwtSecret);
};
exports.verifyToken = verifyToken;
// 生成随机字符串
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateRandomString = generateRandomString;
// 分页辅助函数
const getPaginationParams = (page, limit) => {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;
    return {
        page: pageNum,
        limit: limitNum,
        skip,
    };
};
exports.getPaginationParams = getPaginationParams;
// 构建分页响应
const buildPaginationResponse = (data, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};
exports.buildPaginationResponse = buildPaginationResponse;
//# sourceMappingURL=helpers.js.map