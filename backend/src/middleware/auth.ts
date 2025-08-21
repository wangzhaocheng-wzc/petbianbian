import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APP_CONFIG } from '../config/constants';

// 扩展Request接口以包含用户信息
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      email: string;
      type?: string;
      role?: string;
    };
  }
}

// 认证请求接口
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    type?: string;
    role?: string;
  };
}

// JWT认证中间件
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
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
    const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET) as any;
    
    // 确保这不是刷新令牌
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        success: false,
        message: '请使用访问令牌而非刷新令牌',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    req.user = {
      userId: decoded.id,
      email: decoded.email
    };
    
    next();
  } catch (error: any) {
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

// 可选认证中间件（不强制要求登录）
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, APP_CONFIG.JWT_SECRET) as any;
    
    // 只接受访问令牌
    if (decoded.type !== 'refresh') {
      req.user = {
        userId: decoded.id,
        email: decoded.email
      };
    }
  } catch (error) {
    // 可选认证失败时不返回错误，继续执行
  }
  
  next();
};

// 验证刷新令牌中间件
export const validateRefreshToken = (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: '刷新令牌缺失',
      code: 'REFRESH_TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, APP_CONFIG.JWT_SECRET) as any;
    
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
  } catch (error: any) {
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

// 角色权限中间件
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
          code: 'USER_NOT_AUTHENTICATED'
        });
      }

      // 动态导入User模型以避免循环依赖
      const User = (await import('../models/User')).default;
      
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
    } catch (error) {
      console.error('角色验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '角色验证失败',
        code: 'ROLE_VERIFICATION_FAILED'
      });
    }
  };
};