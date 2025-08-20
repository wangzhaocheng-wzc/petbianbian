import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// 确保上传目录存在
const ensureUploadDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 文件存储配置
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    let uploadPath = 'uploads/';
    
    // 根据上传类型确定存储路径
    if (req.path.includes('avatar')) {
      uploadPath += 'avatars/';
    } else if (req.path.includes('analysis')) {
      uploadPath += 'analysis/';
    } else if (req.path.includes('community')) {
      uploadPath += 'community/';
    }
    
    // 确保目录存在
    ensureUploadDir(uploadPath);
    
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 只允许图片文件
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传JPG、PNG、WebP、GIF格式的图片文件'));
  }
};

// 创建multer实例
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    files: 5, // 最多5个文件
  },
  fileFilter: fileFilter,
});

// 单文件上传中间件
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// 多文件上传中间件
export const uploadMultiple = (fieldName: string, maxCount: number) => 
  upload.array(fieldName, maxCount);

// 错误处理中间件
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: '文件大小超过限制（最大10MB）'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: '文件数量超过限制（最多5个文件）'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: '意外的文件字段'
        });
      default:
        return res.status(400).json({
          success: false,
          message: '文件上传错误: ' + error.message
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || '文件上传失败'
    });
  }
  next();
};