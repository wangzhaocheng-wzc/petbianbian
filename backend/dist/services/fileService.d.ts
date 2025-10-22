export declare class FileService {
    /**
     * 确保上传目录存在
     */
    static ensureUploadDir(dirPath: string): Promise<void>;
    /**
     * 保存图片文件
     */
    static saveImage(imageBuffer: Buffer, filename: string, type: 'avatars' | 'analysis' | 'community'): Promise<string>;
    /**
     * 生成文件URL
     */
    static generateFileUrl(filename: string, type: 'avatars' | 'analysis' | 'community'): string;
    /**
     * 删除文件
     */
    static deleteFile(filePath: string): Promise<void>;
    /**
     * 验证文件类型
     */
    static validateFileType(mimetype: string, allowedTypes: string[]): boolean;
    /**
     * 验证文件大小
     */
    static validateFileSize(size: number, maxSize: number): boolean;
    /**
     * 获取文件扩展名
     */
    static getFileExtension(filename: string): string;
    /**
     * 生成安全的文件名
     */
    static generateSafeFilename(originalName: string): string;
}
//# sourceMappingURL=fileService.d.ts.map