"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '访问令牌缺失' });
    }
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    jsonwebtoken_1.default.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: '令牌无效' });
        }
        req.user = decoded;
        next();
    });
};
exports.authenticateToken = authenticateToken;
// 可选认证中间件（不强制要求登录）
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    jsonwebtoken_1.default.verify(token, jwtSecret, (err, decoded) => {
        if (!err) {
            req.user = decoded;
        }
        next();
    });
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map