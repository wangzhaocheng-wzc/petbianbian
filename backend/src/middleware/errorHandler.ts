import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// 错误处理中间件
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err);

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
    
    return res.status(400).json({
      message: '数据验证失败',
      errors,
    });
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `${field} 已存在`,
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: '无效的访问令牌',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: '访问令牌已过期',
    });
  }

  // Multer文件上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: '文件大小超出限制（最大10MB）',
      });
    }
    return res.status(400).json({
      message: '文件上传失败',
    });
  }

  // 默认服务器错误
  res.status(500).json({
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
};

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message: `接口 ${req.method} ${req.path} 不存在`,
  });
};