"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.uploadMultiple = exports.uploadSingle = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 确保上传目录存在
const ensureUploadDir = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
// 文件存储配置
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/';
        // 根据上传类型确定存储路径
        if (req.path.includes('avatar')) {
            uploadPath += 'avatars/';
        }
        else if (req.path.includes('analysis')) {
            uploadPath += 'analysis/';
        }
        else if (req.path.includes('community')) {
            uploadPath += 'community/';
        }
        // 确保目录存在
        ensureUploadDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
// 文件过滤器
const fileFilter = (req, file, cb) => {
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
    }
    else {
        cb(new Error('只允许上传JPG、PNG、WebP、GIF格式的图片文件'));
    }
};
// 创建multer实例
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB限制
        files: 5, // 最多5个文件
    },
    fileFilter: fileFilter,
});
// 单文件上传中间件
const uploadSingle = (fieldName) => exports.upload.single(fieldName);
exports.uploadSingle = uploadSingle;
// 多文件上传中间件
const uploadMultiple = (fieldName, maxCount) => exports.upload.array(fieldName, maxCount);
exports.uploadMultiple = uploadMultiple;
// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
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
    }
    else if (error) {
        return res.status(400).json({
            success: false,
            message: error.message || '文件上传失败'
        });
    }
    next();
};
exports.handleUploadError = handleUploadError;
//# sourceMappingURL=upload.js.map