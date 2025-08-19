import multer from 'multer';
import path from 'path';
import { Request } from 'express';

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
    
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'));
  }
};

// 创建multer实例
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: fileFilter,
});

// 单文件上传中间件
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// 多文件上传中间件
export const uploadMultiple = (fieldName: string, maxCount: number) => 
  upload.array(fieldName, maxCount);