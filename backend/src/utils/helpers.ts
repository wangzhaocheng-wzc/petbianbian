import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 密码加密
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// 密码验证
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// 生成JWT令牌
export const generateToken = (payload: object, expiresIn = '15m'): string => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  return jwt.sign(payload, jwtSecret, { expiresIn } as jwt.SignOptions);
};

// 生成刷新令牌
export const generateRefreshToken = (payload: object): string => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' } as jwt.SignOptions);
};

// 验证令牌
export const verifyToken = (token: string): any => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  return jwt.verify(token, jwtSecret);
};

// 生成随机字符串
export const generateRandomString = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 分页辅助函数
export const getPaginationParams = (page?: string, limit?: string) => {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '10', 10);
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip,
  };
};

// 构建分页响应
export const buildPaginationResponse = (
  data: any[],
  total: number,
  page: number,
  limit: number
) => {
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