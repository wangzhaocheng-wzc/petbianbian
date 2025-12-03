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
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorTrackingMiddleware = exports.ErrorTrackingService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ErrorTrackingService {
    constructor() {
        this.errorCounts = new Map();
        this.recentErrors = [];
        this.maxRecentErrors = 1000;
    }
    static getInstance() {
        if (!ErrorTrackingService.instance) {
            ErrorTrackingService.instance = new ErrorTrackingService();
        }
        return ErrorTrackingService.instance;
    }
    // 记录错误
    trackError(error, context) {
        const errorId = this.generateErrorId();
        const fingerprint = this.generateFingerprint(error);
        const errorReport = {
            id: errorId,
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error.message,
            stack: error.stack,
            fingerprint,
            context: context?.additional
        };
        if (context?.request) {
            errorReport.request = {
                method: context.request.method,
                url: context.request.url,
                headers: this.sanitizeHeaders(context.request.headers),
                body: this.sanitizeBody(context.request.body),
                user: context.user
            };
        }
        // 更新错误计数
        this.errorCounts.set(fingerprint, (this.errorCounts.get(fingerprint) || 0) + 1);
        // 添加到最近错误列表
        this.recentErrors.unshift(errorReport);
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors = this.recentErrors.slice(0, this.maxRecentErrors);
        }
        // 写入日志文件
        this.writeErrorToFile(errorReport);
        // 如果是严重错误，发送告警
        if (this.isCriticalError(error)) {
            this.sendAlert(errorReport);
        }
        return errorId;
    }
    // 记录警告
    trackWarning(message, context) {
        const warningId = this.generateErrorId();
        const warningReport = {
            id: warningId,
            timestamp: new Date().toISOString(),
            level: 'warning',
            message,
            fingerprint: this.generateFingerprintFromMessage(message),
            context
        };
        this.recentErrors.unshift(warningReport);
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors = this.recentErrors.slice(0, this.maxRecentErrors);
        }
        this.writeErrorToFile(warningReport);
        return warningId;
    }
    // 获取错误统计
    getErrorStats(timeRange = '24h') {
        const now = new Date();
        const cutoff = new Date();
        switch (timeRange) {
            case '1h':
                cutoff.setHours(now.getHours() - 1);
                break;
            case '24h':
                cutoff.setDate(now.getDate() - 1);
                break;
            case '7d':
                cutoff.setDate(now.getDate() - 7);
                break;
        }
        const recentErrors = this.recentErrors.filter(error => new Date(error.timestamp) > cutoff);
        const errorsByLevel = recentErrors.reduce((acc, error) => {
            acc[error.level] = (acc[error.level] || 0) + 1;
            return acc;
        }, {});
        const errorsByFingerprint = recentErrors.reduce((acc, error) => {
            acc[error.fingerprint] = (acc[error.fingerprint] || 0) + 1;
            return acc;
        }, {});
        const topErrors = Object.entries(errorsByFingerprint)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([fingerprint, count]) => {
            const example = recentErrors.find(e => e.fingerprint === fingerprint);
            return {
                fingerprint,
                count,
                message: example?.message || 'Unknown error',
                lastOccurrence: example?.timestamp
            };
        });
        return {
            total: recentErrors.length,
            byLevel: errorsByLevel,
            topErrors,
            timeRange
        };
    }
    // 获取最近错误
    getRecentErrors(limit = 50) {
        return this.recentErrors.slice(0, limit);
    }
    // 获取错误详情
    getErrorById(id) {
        return this.recentErrors.find(error => error.id === id);
    }
    // 生成错误ID
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // 生成错误指纹
    generateFingerprint(error) {
        const message = error.message.replace(/\d+/g, 'N'); // 替换数字
        const stack = error.stack?.split('\n')[1] || '';
        return Buffer.from(`${error.name}:${message}:${stack}`).toString('base64').substr(0, 16);
    }
    // 从消息生成指纹
    generateFingerprintFromMessage(message) {
        const normalized = message.replace(/\d+/g, 'N');
        return Buffer.from(normalized).toString('base64').substr(0, 16);
    }
    // 清理请求头
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }
    // 清理请求体
    sanitizeBody(body) {
        if (!body)
            return body;
        const sanitized = { ...body };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.secret;
        return sanitized;
    }
    // 判断是否为严重错误
    isCriticalError(error) {
        const criticalPatterns = [
            /database.*connection/i,
            /out of memory/i,
            /econnrefused/i,
            /timeout/i
        ];
        return criticalPatterns.some(pattern => pattern.test(error.message) || pattern.test(error.stack || ''));
    }
    // 写入错误到文件
    writeErrorToFile(errorReport) {
        try {
            const logsDir = path.join(__dirname, '../../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(logsDir, `errors-${today}.log`);
            const logEntry = JSON.stringify(errorReport) + '\n';
            fs.appendFileSync(logFile, logEntry);
        }
        catch (writeError) {
            console.error('Failed to write error to file:', writeError);
        }
    }
    // 发送告警
    sendAlert(errorReport) {
        // 这里可以集成邮件、Slack、钉钉等告警系统
        console.error('CRITICAL ERROR ALERT:', {
            id: errorReport.id,
            message: errorReport.message,
            timestamp: errorReport.timestamp
        });
        // TODO: 实现实际的告警发送逻辑
    }
}
exports.ErrorTrackingService = ErrorTrackingService;
// 错误追踪中间件
const errorTrackingMiddleware = (error, req, res, next) => {
    const errorTracker = ErrorTrackingService.getInstance();
    const user = req.user;
    const errorId = errorTracker.trackError(error, {
        request: req,
        user: user ? { id: user.id, username: user.username } : undefined
    });
    // 在响应中包含错误ID
    res.locals.errorId = errorId;
    next(error);
};
exports.errorTrackingMiddleware = errorTrackingMiddleware;
//# sourceMappingURL=errorTrackingService.js.map