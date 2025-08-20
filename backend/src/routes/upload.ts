import { Router, Request, Response } from 'express';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';
import { FileService } from '../services/fileService';
import { Logger } from '../utils/logger';

const router = Router();

// 所有上传路由都需要认证
router.use(authenticateToken);

/**
 * 上传单个头像文件
 */
router.post('/avatar', uploadSingle('avatar'), handleUploadError, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    const file = req.file;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '头像只支持JPG、PNG、WebP格式'
      });
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: '头像文件大小不能超过5MB'
      });
    }

    const avatarUrl = FileService.generateFileUrl(file.filename, 'avatars');

    Logger.info(`头像上传成功: ${file.filename}`);

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        url: avatarUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      }
    });

  } catch (error) {
    Logger.error('头像上传失败:', error);
    res.status(500).json({
      success: false,
      message: '头像上传失败，请稍后重试'
    });
  }
});

/**
 * 上传社区帖子图片（支持多张）
 */
router.post('/community', uploadMultiple('images', 5), handleUploadError, async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片文件'
      });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedFiles = [];

    for (const file of files) {
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `文件 ${file.originalname} 格式不支持，只支持JPG、PNG、WebP格式`
        });
      }

      // 验证文件大小 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `文件 ${file.originalname} 大小超过10MB限制`
        });
      }

      const imageUrl = FileService.generateFileUrl(file.filename, 'community');
      uploadedFiles.push({
        url: imageUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
    }

    Logger.info(`社区图片上传成功: ${files.length} 个文件`);

    res.json({
      success: true,
      message: `成功上传 ${files.length} 张图片`,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length
      }
    });

  } catch (error) {
    Logger.error('社区图片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上传失败，请稍后重试'
    });
  }
});

/**
 * 删除上传的文件
 */
router.delete('/file/:type/:filename', async (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params;
    
    // 验证文件类型
    const allowedTypes = ['avatars', 'analysis', 'community'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的文件类型'
      });
    }

    const filePath = `uploads/${type}/${filename}`;
    await FileService.deleteFile(filePath);

    Logger.info(`文件删除成功: ${filePath}`);

    res.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    Logger.error('文件删除失败:', error);
    res.status(500).json({
      success: false,
      message: '文件删除失败'
    });
  }
});

export default router;