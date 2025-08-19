import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { validateUserRegistration, validateUserLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { APP_CONFIG } from '../config/constants';

const router = Router();

// JWT配置
const JWT_SECRET = APP_CONFIG.JWT_SECRET;
const JWT_EXPIRES_IN = APP_CONFIG.JWT_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = APP_CONFIG.REFRESH_TOKEN_EXPIRES_IN;

// 生成JWT令牌
const generateTokens = (userId: string, email: string) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const payload = { id: userId, email, iat: Math.floor(timestamp / 1000), jti: random };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions);
  
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

// 用户登录
router.post('/login', validateUserLogin, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        errors: [{ field: 'email', message: '用户不存在' }]
      });
    }

    // 检查用户是否激活
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用，请联系管理员',
        errors: [{ field: 'account', message: '账户状态异常' }]
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        errors: [{ field: 'password', message: '密码不正确' }]
      });
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成JWT令牌
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);

    // 返回成功响应（不包含密码）
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      profile: user.profile,
      preferences: user.preferences,
      stats: user.stats,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error: any) {
    console.error('用户登录错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 刷新令牌
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: '刷新令牌缺失'
      });
    }

    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    // 检查令牌类型
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }

    // 查找用户
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 生成新的令牌对
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString(), user.email);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    });

  } catch (error: any) {
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
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 在实际应用中，这里可以将令牌加入黑名单
    // 目前只是返回成功响应
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error: any) {
    console.error('用户登出错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      profile: user.profile,
      preferences: user.preferences,
      stats: user.stats,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      data: {
        user: userResponse
      }
    });

  } catch (error: any) {
    console.error('获取用户信息错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

export default router;