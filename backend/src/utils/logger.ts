import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

// 确保日志目录存在
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// 创建Winston logger实例
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'pet-health-api' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // 所有日志文件（按日期轮转）
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // 错误日志文件
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    }),
    
    // 访问日志文件
    new DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      level: 'http'
    }),
    
    // 安全审计日志
    new DailyRotateFile({
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
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

// 日志类型枚举
export enum LogType {
  APPLICATION = 'application',
  ACCESS = 'access',
  ERROR = 'error',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  DATABASE = 'database',
  AUTH = 'auth',
  API = 'api'
}

// 日志元数据接口
export interface LogMeta {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  type?: LogType;
  [key: string]: any;
}

export class Logger {
  /**
   * 记录信息日志
   */
  static info(message: string, meta?: LogMeta): void {
    winstonLogger.info(message, { ...meta, type: meta?.type || LogType.APPLICATION });
  }

  /**
   * 记录警告日志
   */
  static warn(message: string, meta?: LogMeta): void {
    winstonLogger.warn(message, { ...meta, type: meta?.type || LogType.APPLICATION });
  }

  /**
   * 记录错误日志
   */
  static error(message: string, error?: Error | any, meta?: LogMeta): void {
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
  static debug(message: string, meta?: LogMeta): void {
    winstonLogger.debug(message, { ...meta, type: meta?.type || LogType.APPLICATION });
  }

  /**
   * 记录HTTP访问日志
   */
  static http(message: string, meta?: LogMeta): void {
    winstonLogger.http(message, { ...meta, type: LogType.ACCESS });
  }

  /**
   * 记录安全相关日志
   */
  static security(message: string, meta?: LogMeta): void {
    winstonLogger.warn(message, { ...meta, type: LogType.SECURITY });
  }

  /**
   * 记录性能日志
   */
  static performance(message: string, meta?: LogMeta): void {
    winstonLogger.info(message, { ...meta, type: LogType.PERFORMANCE });
  }

  /**
   * 记录数据库操作日志
   */
  static database(message: string, meta?: LogMeta): void {
    winstonLogger.info(message, { ...meta, type: LogType.DATABASE });
  }

  /**
   * 记录认证相关日志
   */
  static auth(message: string, meta?: LogMeta): void {
    winstonLogger.info(message, { ...meta, type: LogType.AUTH });
  }

  /**
   * 记录API调用日志
   */
  static api(message: string, meta?: LogMeta): void {
    winstonLogger.info(message, { ...meta, type: LogType.API });
  }

  /**
   * 获取Winston logger实例
   */
  static getWinstonLogger(): winston.Logger {
    return winstonLogger;
  }
}