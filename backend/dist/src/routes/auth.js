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
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const constants_1 = require("../config/constants");
const pgSyncService_1 = require("../services/pgSyncService");
const pgUserService_1 = require("../services/pgUserService");
const postgres_1 = require("../config/postgres");
const router = (0, express_1.Router)();
// JWT配置
const JWT_SECRET = constants_1.APP_CONFIG.JWT_SECRET;
const JWT_EXPIRES_IN = constants_1.APP_CONFIG.JWT_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = constants_1.APP_CONFIG.REFRESH_TOKEN_EXPIRES_IN;
// 生成JWT令牌
const generateTokens = (userId, email) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const payload = { id: userId, email, iat: Math.floor(timestamp / 1000), jti: random };
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    return { access_token: accessToken, refresh_token: refreshToken };
};
// 用户注册
router.post('/register', validation_1.validateUserRegistration, async (req, res) => {
    try {
        const DB_PRIMARY = process.env.DB_PRIMARY || 'postgres';
        const { username, email, password } = req.body;
        const pgStatus = await (0, postgres_1.getPostgresStatus)();
        // 仅当主库为 Postgres 且 PG 已连接时走 PG 实现；
        // 当主库为 Mongo 时，即使 PG 可用也优先使用 Mongo
        if (DB_PRIMARY === 'postgres' && pgStatus === 'connected') {
            // 使用现有的PG实现
            if (await (0, pgUserService_1.usernameExists)(username)) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在',
                    errors: [{ field: 'username', message: '该用户名已被使用' }]
                });
            }
            if (await (0, pgUserService_1.emailExists)(email)) {
                return res.status(400).json({
                    success: false,
                    message: '邮箱已存在',
                    errors: [{ field: 'email', message: '该邮箱已被注册' }]
                });
            }
            const userAgg = await (0, pgUserService_1.createUser)({ username, email, password });
            const { access_token, refresh_token } = generateTokens(userAgg.id, userAgg.email);
            const refreshExp = new Date(Date.now() + 7 * 24 * 3600 * 1000);
            await (0, pgUserService_1.recordRefreshTokenById)(userAgg.id, refresh_token, refreshExp);
            const userResponse = {
                id: userAgg.id,
                username: userAgg.username,
                email: userAgg.email,
                avatar: userAgg.avatar,
                profile: userAgg.profile,
                preferences: userAgg.preferences,
                stats: userAgg.stats,
                isActive: userAgg.isActive,
                isVerified: userAgg.isVerified,
                createdAt: userAgg.createdAt,
                updatedAt: userAgg.updatedAt
            };
            return res.status(201).json({
                success: true,
                message: '用户注册成功',
                data: { user: userResponse, tokens: { access_token, refresh_token } }
            });
        }
        else {
            // Mongo 后备实现
            const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
            const usernameTaken = await User.exists({ username });
            if (usernameTaken) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在',
                    errors: [{ field: 'username', message: '该用户名已被使用' }]
                });
            }
            const emailTaken = await User.exists({ email });
            if (emailTaken) {
                return res.status(400).json({
                    success: false,
                    message: '邮箱已存在',
                    errors: [{ field: 'email', message: '该邮箱已被注册' }]
                });
            }
            const userDoc = new User({ username, email, password });
            await userDoc.save();
            const { access_token, refresh_token } = generateTokens(userDoc.id, userDoc.email);
            const userResponse = {
                id: userDoc.id,
                username: userDoc.username,
                email: userDoc.email,
                avatar: userDoc.avatar ?? null,
                profile: userDoc.profile ?? {},
                preferences: userDoc.preferences ?? { notifications: true, emailUpdates: true, language: 'zh-CN' },
                stats: userDoc.stats ?? { totalAnalysis: 0, totalPosts: 0, reputation: 0 },
                isActive: userDoc.isActive,
                isVerified: userDoc.isVerified,
                createdAt: userDoc.createdAt,
                updatedAt: userDoc.updatedAt
            };
            return res.status(201).json({
                success: true,
                message: '用户注册成功（Mongo后备）',
                data: { user: userResponse, tokens: { access_token, refresh_token } }
            });
        }
    }
    catch (error) {
        console.error('用户注册错误:', error);
        return res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
    }
});
// 用户登录
router.post('/login', validation_1.validateUserLogin, async (req, res) => {
    try {
        const DB_PRIMARY = process.env.DB_PRIMARY || 'postgres';
        const { email, password } = req.body;
        const pgStatus = await (0, postgres_1.getPostgresStatus)();
        // 仅当主库为 Postgres 且 PG 已连接时走 PG 实现；
        // 当主库为 Mongo 时，即使 PG 可用也优先使用 Mongo
        if (DB_PRIMARY === 'postgres' && pgStatus === 'connected') {
            // 使用现有的PG实现
            const auth = await (0, pgUserService_1.getUserAuthByEmail)(email);
            if (!auth || !auth.agg.isActive) {
                return res.status(401).json({
                    success: false,
                    message: '邮箱或密码错误',
                    errors: [{ field: 'email', message: '用户不存在或不可用' }]
                });
            }
            const isPasswordValid = await (0, pgUserService_1.comparePassword)(password, auth.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: '邮箱或密码错误',
                    errors: [{ field: 'password', message: '密码不正确' }]
                });
            }
            const now = new Date();
            await (0, pgUserService_1.updateLastLoginById)(auth.agg.id, now);
            const { access_token, refresh_token } = generateTokens(auth.agg.id, auth.agg.email);
            const refreshExp = new Date(Date.now() + 7 * 24 * 3600 * 1000);
            await (0, pgUserService_1.recordRefreshTokenById)(auth.agg.id, refresh_token, refreshExp);
            const userResponse = {
                id: auth.agg.id,
                username: auth.agg.username,
                email: auth.agg.email,
                avatar: auth.agg.avatar,
                profile: auth.agg.profile,
                preferences: auth.agg.preferences,
                stats: auth.agg.stats,
                isActive: auth.agg.isActive,
                isVerified: auth.agg.isVerified,
                lastLoginAt: now,
                createdAt: auth.agg.createdAt,
                updatedAt: auth.agg.updatedAt
            };
            return res.json({
                success: true,
                message: '登录成功',
                data: { user: userResponse, tokens: { access_token, refresh_token } }
            });
        }
        else {
            // Mongo 后备实现
            const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
            const userDoc = await User.findOne({ email });
            if (!userDoc || !userDoc.isActive) {
                return res.status(401).json({
                    success: false,
                    message: '邮箱或密码错误',
                    errors: [{ field: 'email', message: '用户不存在或不可用' }]
                });
            }
            const isPasswordValid = await userDoc.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: '邮箱或密码错误',
                    errors: [{ field: 'password', message: '密码不正确' }]
                });
            }
            const now = new Date();
            userDoc.lastLoginAt = now;
            await userDoc.save();
            const { access_token, refresh_token } = generateTokens(userDoc.id, userDoc.email);
            const userResponse = {
                id: userDoc.id,
                username: userDoc.username,
                email: userDoc.email,
                avatar: userDoc.avatar ?? null,
                profile: userDoc.profile ?? {},
                preferences: userDoc.preferences ?? { notifications: true, emailUpdates: true, language: 'zh-CN' },
                stats: userDoc.stats ?? { totalAnalysis: 0, totalPosts: 0, reputation: 0 },
                isActive: userDoc.isActive,
                isVerified: userDoc.isVerified,
                lastLoginAt: now,
                createdAt: userDoc.createdAt,
                updatedAt: userDoc.updatedAt
            };
            return res.json({
                success: true,
                message: '登录成功（Mongo后备）',
                data: { user: userResponse, tokens: { access_token, refresh_token } }
            });
        }
    }
    catch (error) {
        console.error('用户登录错误:', error);
        return res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
    }
});
// 刷新令牌
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: '刷新令牌缺失'
            });
        }
        // 验证刷新令牌
        const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
        // 检查令牌类型
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: '无效的刷新令牌'
            });
        }
        // 查找用户（PG）
        const userAgg = await (0, pgUserService_1.getUserById)(decoded.id);
        if (!userAgg || !userAgg.isActive) {
            return res.status(401).json({
                success: false,
                message: '用户不存在或已被禁用'
            });
        }
        // 生成新的令牌对
        const { access_token, refresh_token: newRefreshToken } = generateTokens(userAgg.id, userAgg.email);
        const refreshExp = new Date(Date.now() + 7 * 24 * 3600 * 1000);
        await (0, pgUserService_1.recordRefreshTokenById)(userAgg.id, newRefreshToken, refreshExp);
        res.json({
            success: true,
            message: '令牌刷新成功',
            data: {
                tokens: {
                    access_token,
                    refresh_token: newRefreshToken
                }
            }
        });
    }
    catch (error) {
        console.error('令牌刷新错误:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的刷新令牌'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '刷新令牌已过期，请重新登录'
            });
        }
        res.status(500).json({
            success: false,
            message: '服务器内部错误，请稍后重试'
        });
    }
});
// 登出
router.post('/logout', auth_1.authenticateToken, async (req, res) => {
    try {
        // 将当前访问令牌加入黑名单（Postgres）
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token && req.user?.userId) {
            (0, pgSyncService_1.revokeToken)(token, req.user.userId);
        }
        res.json({
            success: true,
            message: '登出成功'
        });
    }
    catch (error) {
        console.error('用户登出错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误，请稍后重试'
        });
    }
});
// 获取当前用户信息
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userAgg = await (0, pgUserService_1.getUserById)(req.user?.userId);
        if (!userAgg) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        const userResponse = {
            id: userAgg.id,
            username: userAgg.username,
            email: userAgg.email,
            avatar: userAgg.avatar,
            profile: userAgg.profile,
            preferences: userAgg.preferences,
            stats: userAgg.stats,
            isActive: userAgg.isActive,
            isVerified: userAgg.isVerified,
            lastLoginAt: userAgg.lastLoginAt,
            createdAt: userAgg.createdAt,
            updatedAt: userAgg.updatedAt
        };
        res.json({
            success: true,
            data: {
                user: userResponse
            }
        });
    }
    catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误，请稍后重试'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map