"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRefreshToken = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../config/constants");
// JWT认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '访问令牌缺失',
            code: 'TOKEN_MISSING'
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, constants_1.APP_CONFIG.JWT_SECRET);
        // 确保这不是刷新令牌
        if (decoded.type === 'refresh') {
            return res.status(401).json({
                success: false,
                message: '请使用访问令牌而非刷新令牌',
                code: 'INVALID_TOKEN_TYPE'
            });
        }
        req.user = {
            id: decoded.id,
            email: decoded.email
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '访问令牌已过期',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的访问令牌',
                code: 'TOKEN_INVALID'
            });
        }
        return res.status(401).json({
            success: false,
            message: '令牌验证失败',
            code: 'TOKEN_VERIFICATION_FAILED'
        });
    }
};
exports.authenticateToken = authenticateToken;
// 可选认证中间件（不强制要求登录）
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, constants_1.APP_CONFIG.JWT_SECRET);
        // 只接受访问令牌
        if (decoded.type !== 'refresh') {
            req.user = {
                id: decoded.id,
                email: decoded.email
            };
        }
    }
    catch (error) {
        // 可选认证失败时不返回错误，继续执行
    }
    next();
};
exports.optionalAuth = optionalAuth;
// 验证刷新令牌中间件
const validateRefreshToken = (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: '刷新令牌缺失',
            code: 'REFRESH_TOKEN_MISSING'
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, constants_1.APP_CONFIG.JWT_SECRET);
        // 确保这是刷新令牌
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: '无效的刷新令牌类型',
                code: 'INVALID_REFRESH_TOKEN_TYPE'
            });
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            type: decoded.type
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '刷新令牌已过期，请重新登录',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的刷新令牌',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }
        return res.status(401).json({
            success: false,
            message: '刷新令牌验证失败',
            code: 'REFRESH_TOKEN_VERIFICATION_FAILED'
        });
    }
};
exports.validateRefreshToken = validateRefreshToken;
//# sourceMappingURL=auth.js.map