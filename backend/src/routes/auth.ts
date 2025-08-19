import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/User';
import { validateUserRegistration } from '../middleware/validation';

const router = Router();

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// 生成JWT令牌
const generateTokens = (userId: string, email: string) => {
  const payload = { id: userId, email };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  
  return { accessToken, refreshToken };
};

// 用户注册
router.post('/register', validateUserRegistration, async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户名是否已存在
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
        errors: [{ field: 'username', message: '该用户名已被使用' }]
      });
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: '邮箱已存在',
        errors: [{ field: 'email', message: '该邮箱已被注册' }]
      });
    }

    // 创建新用户
    const newUser = new User({
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

  } catch (error: any) {
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
      const errors = Object.values(error.errors).map((err: any) => ({
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

export default router;