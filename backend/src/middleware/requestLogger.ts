import { Request, Response, NextFunction } from 'express';
import { Logger, LogType } from '../utils/logger';

// 扩展Request接口以包含开始时间
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

// 生成请求ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 获取客户端IP
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// 清理敏感信息
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') return body;
  
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
const sanitizeHeaders = (headers: any): any => {
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
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  req.startTime = startTime;
  req.requestId = requestId;
  
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const user = (req as any).user;
  
  // 记录请求开始
  Logger.http(`请求开始: ${req.method} ${req.originalUrl}`, {
    type: LogType.ACCESS,
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
    let level: 'info' | 'warn' | 'error' = 'info';
    if (statusCode >= 400 && statusCode < 500) {
      level = 'warn';
    } else if (statusCode >= 500) {
      level = 'error';
    }
    
    // 记录请求完成
    const logMessage = `请求完成: ${req.method} ${req.originalUrl} - ${statusCode} (${responseTime}ms)`;
    
    if (level === 'info') {
      Logger.http(logMessage, {
        type: LogType.ACCESS,
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
    } else if (level === 'warn') {
      Logger.warn(logMessage, {
        type: LogType.ACCESS,
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
    } else {
      Logger.error(logMessage, undefined, {
        type: LogType.ACCESS,
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
      Logger.performance(`慢请求警告: ${req.method} ${req.originalUrl} - ${responseTime}ms`, {
        type: LogType.PERFORMANCE,
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
    Logger.error(`响应错误: ${req.method} ${req.originalUrl}`, error, {
      type: LogType.ERROR,
      requestId,
      method: req.method,
      endpoint: req.originalUrl,
      ip: clientIP,
      userId: user?.id
    });
  });
  
  next();
};

// 安全事件日志中间件
export const securityLoggerMiddleware = (eventType: string, message: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const user = (req as any).user;
    
    Logger.security(`${eventType}: ${message}`, {
      type: LogType.SECURITY,
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

// 数据库操作日志
export const logDatabaseOperation = (operation: string, collection: string, query?: any, result?: any) => {
  Logger.database(`数据库操作: ${operation} on ${collection}`, {
    type: LogType.DATABASE,
    operation,
    collection,
    query: query ? sanitizeBody(query) : undefined,
    resultCount: Array.isArray(result) ? result.length : result ? 1 : 0
  });
};

// API调用日志
export const logAPICall = (service: string, endpoint: string, method: string, responseTime: number, success: boolean) => {
  const message = `API调用: ${service} ${method} ${endpoint} - ${success ? '成功' : '失败'} (${responseTime}ms)`;
  
  if (success) {
    Logger.api(message, {
      type: LogType.API,
      service,
      endpoint,
      method,
      responseTime,
      success
    });
  } else {
    Logger.error(message, undefined, {
      type: LogType.API,
      service,
      endpoint,
      method,
      responseTime,
      success
    });
  }
};