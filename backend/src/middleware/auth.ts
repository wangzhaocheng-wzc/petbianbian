import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 扩展Request接口以包含用户信息
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}

// JWT认证中间件
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '访问令牌缺失' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'default-secret';

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: '令牌无效' });
    }

    req.user = decoded as { id: string; email: string };
    next();
  });
};

// 可选认证中间件（不强制要求登录）
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET || 'default-secret';

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (!err) {
      req.user = decoded as { id: string; email: string };
    }
    next();
  });
};