import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validateUserRegistration, validateUserLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { APP_CONFIG } from '../config/constants';
import { revokeToken } from '../services/pgSyncService';
import {
  createUser,
  emailExists,
  usernameExists,
  getUserAuthByEmail,
  getUserById,
  comparePassword,
  updateLastLoginById,
  recordRefreshTokenById,
} from '../services/pgUserService';
import { getPostgresStatus } from '../config/postgres';

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
  
  return { access_token: accessToken, refresh_token: refreshToken };
};

// 用户注册
router.post('/register', validateUserRegistration, async (req: Request, res: Response) => {
  try {
    const DB_PRIMARY = process.env.DB_PRIMARY || 'mongo';
    const { username, email, password } = req.body;
    const pgStatus = await getPostgresStatus();

    // 仅当主库为 Postgres 且 PG 已连接时走 PG 实现；
    // 当主库为 Mongo 时，即使 PG 可用也优先使用 Mongo
    if (DB_PRIMARY === 'postgres' && pgStatus === 'connected') {
      // 使用现有的PG实现
      if (await usernameExists(username)) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在',
          errors: [{ field: 'username', message: '该用户名已被使用' }]
        });
      }
      if (await emailExists(email)) {
        return res.status(400).json({
          success: false,
          message: '邮箱已存在',
          errors: [{ field: 'email', message: '该邮箱已被注册' }]
        });
      }

      const userAgg = await createUser({ username, email, password });
      const { access_token, refresh_token } = generateTokens(userAgg.id, userAgg.email);
      const refreshExp = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      await recordRefreshTokenById(userAgg.id, refresh_token, refreshExp);

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
    } else {
      // Mongo 后备实现
      const User = (await import('../models/User')).default;

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
  } catch (error: any) {
    console.error('用户注册错误:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
  }
});

// 用户登录
router.post('/login', validateUserLogin, async (req: Request, res: Response) => {
  try {
    const DB_PRIMARY = process.env.DB_PRIMARY || 'mongo';
    const { email, password } = req.body;
    const pgStatus = await getPostgresStatus();

    // 仅当主库为 Postgres 且 PG 已连接时走 PG 实现；
    // 当主库为 Mongo 时，即使 PG 可用也优先使用 Mongo
    if (DB_PRIMARY === 'postgres' && pgStatus === 'connected') {
      // 使用现有的PG实现
      const auth = await getUserAuthByEmail(email);
      if (!auth || !auth.agg.isActive) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          errors: [{ field: 'email', message: '用户不存在或不可用' }]
        });
      }

      const isPasswordValid = await comparePassword(password, auth.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          errors: [{ field: 'password', message: '密码不正确' }]
        });
      }

      const now = new Date();
      await updateLastLoginById(auth.agg.id, now);

      const { access_token, refresh_token } = generateTokens(auth.agg.id, auth.agg.email);
      const refreshExp = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      await recordRefreshTokenById(auth.agg.id, refresh_token, refreshExp);

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
    } else {
      // Mongo 后备实现
      const User = (await import('../models/User')).default;
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
  } catch (error: any) {
    console.error('用户登录错误:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
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

    // 查找用户（PG）
    const userAgg = await getUserById(decoded.id);
    if (!userAgg || !userAgg.isActive) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 生成新的令牌对
    const { access_token, refresh_token: newRefreshToken } = generateTokens(userAgg.id, userAgg.email);
    const refreshExp = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await recordRefreshTokenById(userAgg.id, newRefreshToken, refreshExp);

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
    // 将当前访问令牌加入黑名单（Postgres）
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token && req.user?.userId) {
      revokeToken(token, req.user.userId);
    }
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
    const userAgg = await getUserById(req.user?.userId as string);
    
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

  } catch (error: any) {
    console.error('获取用户信息错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试'
    });
  }
});

export default router;