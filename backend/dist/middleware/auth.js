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
exports.requireRole = exports.validateRefreshToken = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../config/constants");
const pgSyncService_1 = require("../services/pgSyncService");
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
        // 先检查令牌是否在Postgres黑名单
        (0, pgSyncService_1.isTokenRevoked)(token).then((revoked) => {
            if (revoked) {
                return res.status(401).json({
                    success: false,
                    message: '访问令牌已被撤销',
                    code: 'TOKEN_REVOKED'
                });
            }
            // 再进行JWT验证
            try {
                const decoded = jsonwebtoken_1.default.verify(token, constants_1.APP_CONFIG.JWT_SECRET);
                if (decoded.type === 'refresh') {
                    return res.status(401).json({
                        success: false,
                        message: '请使用访问令牌而非刷新令牌',
                        code: 'INVALID_TOKEN_TYPE'
                    });
                }
                req.user = { userId: decoded.id, email: decoded.email };
                next();
            }
            catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).json({ success: false, message: '访问令牌已过期', code: 'TOKEN_EXPIRED' });
                }
                if (error.name === 'JsonWebTokenError') {
                    return res.status(401).json({ success: false, message: '无效的访问令牌', code: 'TOKEN_INVALID' });
                }
                return res.status(401).json({ success: false, message: '令牌验证失败', code: 'TOKEN_VERIFICATION_FAILED' });
            }
        }).catch(() => {
            // Postgres检查失败时，退化为仅JWT验证
            try {
                const decoded = jsonwebtoken_1.default.verify(token, constants_1.APP_CONFIG.JWT_SECRET);
                if (decoded.type === 'refresh') {
                    return res.status(401).json({ success: false, message: '请使用访问令牌而非刷新令牌', code: 'INVALID_TOKEN_TYPE' });
                }
                req.user = { userId: decoded.id, email: decoded.email };
                next();
            }
            catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).json({ success: false, message: '访问令牌已过期', code: 'TOKEN_EXPIRED' });
                }
                if (error.name === 'JsonWebTokenError') {
                    return res.status(401).json({ success: false, message: '无效的访问令牌', code: 'TOKEN_INVALID' });
                }
                return res.status(401).json({ success: false, message: '令牌验证失败', code: 'TOKEN_VERIFICATION_FAILED' });
            }
        });
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
                userId: decoded.id,
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
            userId: decoded.id,
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
// 角色权限中间件
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({
                    success: false,
                    message: '用户未认证',
                    code: 'USER_NOT_AUTHENTICATED'
                });
            }
            // 动态导入User模型以避免循环依赖
            const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
            const user = await User.findById(req.user.userId).select('role');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户不存在',
                    code: 'USER_NOT_FOUND'
                });
            }
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: '权限不足',
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            // 将用户角色添加到请求对象中
            req.user.role = user.role;
            next();
        }
        catch (error) {
            console.error('角色验证失败:', error);
            return res.status(500).json({
                success: false,
                message: '角色验证失败',
                code: 'ROLE_VERIFICATION_FAILED'
            });
        }
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map