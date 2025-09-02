"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAPICall = exports.logDatabaseOperation = exports.securityLoggerMiddleware = exports.requestLoggerMiddleware = void 0;
const logger_1 = require("../utils/logger");
// 生成请求ID
const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
// 获取客户端IP
const getClientIP = (req) => {
    return (req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown');
};
// 清理敏感信息
const sanitizeBody = (body) => {
    if (!body || typeof body !== 'object')
        return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    return sanitized;
};
// 清理敏感头信息
const sanitizeHeaders = (headers) => {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    });
    return sanitized;
};
// HTTP请求日志中间件
const requestLoggerMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    req.startTime = startTime;
    req.requestId = requestId;
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const user = req.user;
    // 记录请求开始
    logger_1.Logger.http(`请求开始: ${req.method} ${req.originalUrl}`, {
        type: logger_1.LogType.ACCESS,
        requestId,
        method: req.method,
        endpoint: req.originalUrl,
        ip: clientIP,
        userAgent,
        userId: user?.id,
        sessionId: user?.sessionId,
        headers: sanitizeHeaders(req.headers),
        body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
        query: req.query
    });
    // 监听响应结束
    res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const statusCode = res.statusCode;
        // 确定日志级别
        let level = 'info';
        if (statusCode >= 400 && statusCode < 500) {
            level = 'warn';
        }
        else if (statusCode >= 500) {
            level = 'error';
        }
        // 记录请求完成
        const logMessage = `请求完成: ${req.method} ${req.originalUrl} - ${statusCode} (${responseTime}ms)`;
        if (level === 'info') {
            logger_1.Logger.http(logMessage, {
                type: logger_1.LogType.ACCESS,
                requestId,
                method: req.method,
                endpoint: req.originalUrl,
                ip: clientIP,
                userAgent,
                userId: user?.id,
                sessionId: user?.sessionId,
                statusCode,
                responseTime
            });
        }
        else if (level === 'warn') {
            logger_1.Logger.warn(logMessage, {
                type: logger_1.LogType.ACCESS,
                requestId,
                method: req.method,
                endpoint: req.originalUrl,
                ip: clientIP,
                userAgent,
                userId: user?.id,
                sessionId: user?.sessionId,
                statusCode,
                responseTime
            });
        }
        else {
            logger_1.Logger.error(logMessage, undefined, {
                type: logger_1.LogType.ACCESS,
                requestId,
                method: req.method,
                endpoint: req.originalUrl,
                ip: clientIP,
                userAgent,
                userId: user?.id,
                sessionId: user?.sessionId,
                statusCode,
                responseTime
            });
        }
        // 记录慢请求
        if (responseTime > 5000) { // 超过5秒的请求
            logger_1.Logger.performance(`慢请求警告: ${req.method} ${req.originalUrl} - ${responseTime}ms`, {
                type: logger_1.LogType.PERFORMANCE,
                requestId,
                method: req.method,
                endpoint: req.originalUrl,
                responseTime,
                userId: user?.id
            });
        }
    });
    // 监听响应错误
    res.on('error', (error) => {
        logger_1.Logger.error(`响应错误: ${req.method} ${req.originalUrl}`, error, {
            type: logger_1.LogType.ERROR,
            requestId,
            method: req.method,
            endpoint: req.originalUrl,
            ip: clientIP,
            userId: user?.id
        });
    });
    next();
};
exports.requestLoggerMiddleware = requestLoggerMiddleware;
// 安全事件日志中间件
const securityLoggerMiddleware = (eventType, message) => {
    return (req, res, next) => {
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const user = req.user;
        logger_1.Logger.security(`${eventType}: ${message}`, {
            type: logger_1.LogType.SECURITY,
            requestId: req.requestId,
            eventType,
            method: req.method,
            endpoint: req.originalUrl,
            ip: clientIP,
            userAgent,
            userId: user?.id,
            sessionId: user?.sessionId
        });
        next();
    };
};
exports.securityLoggerMiddleware = securityLoggerMiddleware;
// 数据库操作日志
const logDatabaseOperation = (operation, collection, query, result) => {
    logger_1.Logger.database(`数据库操作: ${operation} on ${collection}`, {
        type: logger_1.LogType.DATABASE,
        operation,
        collection,
        query: query ? sanitizeBody(query) : undefined,
        resultCount: Array.isArray(result) ? result.length : result ? 1 : 0
    });
};
exports.logDatabaseOperation = logDatabaseOperation;
// API调用日志
const logAPICall = (service, endpoint, method, responseTime, success) => {
    const message = `API调用: ${service} ${method} ${endpoint} - ${success ? '成功' : '失败'} (${responseTime}ms)`;
    if (success) {
        logger_1.Logger.api(message, {
            type: logger_1.LogType.API,
            service,
            endpoint,
            method,
            responseTime,
            success
        });
    }
    else {
        logger_1.Logger.error(message, undefined, {
            type: logger_1.LogType.API,
            service,
            endpoint,
            method,
            responseTime,
            success
        });
    }
};
exports.logAPICall = logAPICall;
//# sourceMappingURL=requestLogger.js.map