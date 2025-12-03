import winston from 'winston';
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    HTTP = "http",
    VERBOSE = "verbose",
    DEBUG = "debug",
    SILLY = "silly"
}
export declare enum LogType {
    APPLICATION = "application",
    ACCESS = "access",
    ERROR = "error",
    SECURITY = "security",
    PERFORMANCE = "performance",
    DATABASE = "database",
    AUTH = "auth",
    API = "api"
}
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
export declare class Logger {
    /**
     * 记录信息日志
     */
    static info(message: string, meta?: LogMeta): void;
    /**
     * 记录警告日志
     */
    static warn(message: string, meta?: LogMeta): void;
    /**
     * 记录错误日志
     */
    static error(message: string, error?: Error | any, meta?: LogMeta): void;
    /**
     * 记录调试日志
     */
    static debug(message: string, meta?: LogMeta): void;
    /**
     * 记录HTTP访问日志
     */
    static http(message: string, meta?: LogMeta): void;
    /**
     * 记录安全相关日志
     */
    static security(message: string, meta?: LogMeta): void;
    /**
     * 记录性能日志
     */
    static performance(message: string, meta?: LogMeta): void;
    /**
     * 记录数据库操作日志
     */
    static database(message: string, meta?: LogMeta): void;
    /**
     * 记录认证相关日志
     */
    static auth(message: string, meta?: LogMeta): void;
    /**
     * 记录API调用日志
     */
    static api(message: string, meta?: LogMeta): void;
    /**
     * 获取Winston logger实例
     */
    static getWinstonLogger(): winston.Logger;
}
//# sourceMappingURL=logger.d.ts.map