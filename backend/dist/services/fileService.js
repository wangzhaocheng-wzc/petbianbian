"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const constants_1 = require("../config/constants");
const unlinkAsync = (0, util_1.promisify)(fs_1.default.unlink);
const mkdirAsync = (0, util_1.promisify)(fs_1.default.mkdir);
class FileService {
    /**
     * 确保上传目录存在
     */
    static async ensureUploadDir(dirPath) {
        try {
            await mkdirAsync(dirPath, { recursive: true });
        }
        catch (error) {
            // 目录已存在时忽略错误
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    /**
     * 保存图片文件
     */
    static async saveImage(imageBuffer, filename, type) {
        // 确保上传目录存在
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', type);
        await this.ensureUploadDir(uploadDir);
        // 生成安全的文件名
        const safeFilename = this.generateSafeFilename(filename);
        const filePath = path_1.default.join(uploadDir, safeFilename);
        // 写入文件
        await fs_1.default.promises.writeFile(filePath, imageBuffer);
        // 返回文件URL
        return this.generateFileUrl(safeFilename, type);
    }
    /**
     * 生成文件URL
     */
    static generateFileUrl(filename, type) {
        const baseUrl = constants_1.APP_CONFIG.BASE_URL || 'http://localhost:5000';
        return `${baseUrl}/uploads/${type}/${filename}`;
    }
    /**
     * 删除文件
     */
    static async deleteFile(filePath) {
        try {
            await unlinkAsync(filePath);
        }
        catch (error) {
            // 文件不存在时忽略错误
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    /**
     * 验证文件类型
     */
    static validateFileType(mimetype, allowedTypes) {
        return allowedTypes.some(type => mimetype.startsWith(type));
    }
    /**
     * 验证文件大小
     */
    static validateFileSize(size, maxSize) {
        return size <= maxSize;
    }
    /**
     * 获取文件扩展名
     */
    static getFileExtension(filename) {
        return path_1.default.extname(filename).toLowerCase();
    }
    /**
     * 生成安全的文件名
     */
    static generateSafeFilename(originalName) {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = this.getFileExtension(originalName);
        return `${timestamp}-${random}${ext}`;
    }
}
exports.FileService = FileService;
//# sourceMappingURL=fileService.js.map