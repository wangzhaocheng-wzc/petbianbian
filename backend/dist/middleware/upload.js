"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultiple = exports.uploadSingle = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
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
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('只允许上传图片文件'));
    }
};
// 创建multer实例
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB限制
    },
    fileFilter: fileFilter,
});
// 单文件上传中间件
const uploadSingle = (fieldName) => exports.upload.single(fieldName);
exports.uploadSingle = uploadSingle;
// 多文件上传中间件
const uploadMultiple = (fieldName, maxCount) => exports.upload.array(fieldName, maxCount);
exports.uploadMultiple = uploadMultiple;
//# sourceMappingURL=upload.js.map