import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

export class FileService {
  /**
   * 确保上传目录存在
   */
  static async ensureUploadDir(dirPath: string): Promise<void> {
    try {
      await mkdirAsync(dirPath, { recursive: true });
    } catch (error) {
      // 目录已存在时忽略错误
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 生成文件URL
   */
  static generateFileUrl(filename: string, type: 'avatars' | 'analysis' | 'community'): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/${type}/${filename}`;
  }

  /**
   * 删除文件
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      // 文件不存在时忽略错误
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 验证文件类型
   */
  static validateFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => mimetype.startsWith(type));
  }

  /**
   * 验证文件大小
   */
  static validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  /**
   * 获取文件扩展名
   */
  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * 生成安全的文件名
   */
  static generateSafeFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = this.getFileExtension(originalName);
    return `${timestamp}-${random}${ext}`;
  }
}