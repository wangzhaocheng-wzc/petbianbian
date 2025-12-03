"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogType = exports.LogLevel = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// 确保日志目录存在
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
// 自定义日志格式
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
        log += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
}));
// 创建Winston logger实例
const winstonLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'pet-health-api' },
    transports: [
        // 控制台输出
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        // 所有日志文件（按日期轮转）
        new winston_daily_rotate_file_1.default({
            filename: path.join(logsDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info'
        }),
        // 错误日志文件
        new winston_daily_rotate_file_1.default({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error'
        }),
        // 访问日志文件
        new winston_daily_rotate_file_1.default({
            filename: path.join(logsDir, 'access-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '7d',
            level: 'http'
        }),
        // 安全审计日志
        new winston_daily_rotate_file_1.default({
            filename: path.join(logsDir, 'security-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '90d',
            level: 'warn'
        })
    ]
});
// 日志级别枚举
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["HTTP"] = "http";
    LogLevel["VERBOSE"] = "verbose";
    LogLevel["DEBUG"] = "debug";
    LogLevel["SILLY"] = "silly";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// 日志类型枚举
var LogType;
(function (LogType) {
    LogType["APPLICATION"] = "application";
    LogType["ACCESS"] = "access";
    LogType["ERROR"] = "error";
    LogType["SECURITY"] = "security";
    LogType["PERFORMANCE"] = "performance";
    LogType["DATABASE"] = "database";
    LogType["AUTH"] = "auth";
    LogType["API"] = "api";
})(LogType || (exports.LogType = LogType = {}));
class Logger {
    /**
     * 记录信息日志
     */
    static info(message, meta) {
        winstonLogger.info(message, { ...meta, type: meta?.type || LogType.APPLICATION });
    }
    /**
     * 记录警告日志
     */
    static warn(message, meta) {
        winstonLogger.warn(message, { ...meta, type: meta?.type || LogType.APPLICATION });
    }
    /**
     * 记录错误日志
     */
    static error(message, error, meta) {
        const errorMeta = {
            ...meta,
            type: meta?.type || LogType.ERROR,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error
        };
        winstonLogger.error(message, errorMeta);
    }
    /**
     * 记录调试日志
     */
    static debug(message, meta) {
        winstonLogger.debug(message, { ...meta, type: meta?.type || LogType.APPLICATION });
    }
    /**
     * 记录HTTP访问日志
     */
    static http(message, meta) {
        winstonLogger.http(message, { ...meta, type: LogType.ACCESS });
    }
    /**
     * 记录安全相关日志
     */
    static security(message, meta) {
        winstonLogger.warn(message, { ...meta, type: LogType.SECURITY });
    }
    /**
     * 记录性能日志
     */
    static performance(message, meta) {
        winstonLogger.info(message, { ...meta, type: LogType.PERFORMANCE });
    }
    /**
     * 记录数据库操作日志
     */
    static database(message, meta) {
        winstonLogger.info(message, { ...meta, type: LogType.DATABASE });
    }
    /**
     * 记录认证相关日志
     */
    static auth(message, meta) {
        winstonLogger.info(message, { ...meta, type: LogType.AUTH });
    }
    /**
     * 记录API调用日志
     */
    static api(message, meta) {
        winstonLogger.info(message, { ...meta, type: LogType.API });
    }
    /**
     * 获取Winston logger实例
     */
    static getWinstonLogger() {
        return winstonLogger;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map