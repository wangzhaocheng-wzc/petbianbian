"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
// 生成JWT令牌
const generateTokens = (userId, email) => {
    const payload = { id: userId, email };
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    return { accessToken, refreshToken };
};
// 用户注册
router.post('/register', validation_1.validateUserRegistration, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // 检查用户名是否已存在
        const existingUserByUsername = await User_1.default.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在',
                errors: [{ field: 'username', message: '该用户名已被使用' }]
            });
        }
        // 检查邮箱是否已存在
        const existingUserByEmail = await User_1.default.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: '邮箱已存在',
                errors: [{ field: 'email', message: '该邮箱已被注册' }]
            });
        }
        // 创建新用户
        const newUser = new User_1.default({
            username,
            email,
            password, // 密码会在User模型的pre('save')中间件中自动加密
            profile: {
                firstName: '',
                lastName: '',
                phone: '',
                location: '',
                bio: ''
            },
            preferences: {
                notifications: true,
                emailUpdates: true,
                language: 'zh-CN'
            },
            stats: {
                totalAnalysis: 0,
                totalPosts: 0,
                reputation: 0
            },
            isActive: true,
            isVerified: false
        });
        // 保存用户到数据库
        const savedUser = await newUser.save();
        // 生成JWT令牌
        const { accessToken, refreshToken } = generateTokens(savedUser._id.toString(), savedUser.email);
        // 返回成功响应（不包含密码）
        const userResponse = {
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            avatar: savedUser.avatar,
            profile: savedUser.profile,
            preferences: savedUser.preferences,
            stats: savedUser.stats,
            isActive: savedUser.isActive,
            isVerified: savedUser.isVerified,
            createdAt: savedUser.createdAt,
            updatedAt: savedUser.updatedAt
        };
        res.status(201).json({
            success: true,
            message: '用户注册成功',
            data: {
                user: userResponse,
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    }
    catch (error) {
        console.error('用户注册错误:', error);
        // 处理MongoDB重复键错误
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const message = field === 'email' ? '邮箱已存在' : '用户名已存在';
            return res.status(400).json({
                success: false,
                message,
                errors: [{ field, message: `该${field === 'email' ? '邮箱' : '用户名'}已被使用` }]
            });
        }
        // 处理Mongoose验证错误
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err) => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({
                success: false,
                message: '数据验证失败',
                errors
            });
        }
        // 其他服务器错误
        res.status(500).json({
            success: false,
            message: '服务器内部错误，请稍后重试'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map