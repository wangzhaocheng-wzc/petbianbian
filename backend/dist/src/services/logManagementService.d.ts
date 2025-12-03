import { LogType } from '../utils/logger';
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    service?: string;
    type?: LogType;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    ip?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    error?: {
        name: string;
        message: string;
        stack: string;
    };
    [key: string]: any;
}
export interface LogQuery {
    level?: string[];
    type?: LogType[];
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    ip?: string;
    endpoint?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
export interface LogStats {
    totalLogs: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
    byHour: Record<string, number>;
    topEndpoints: Array<{
        endpoint: string;
        count: number;
    }>;
    topErrors: Array<{
        message: string;
        count: number;
    }>;
    topUsers: Array<{
        userId: string;
        count: number;
    }>;
}
export declare class LogManagementService {
    private static instance;
    private logsDir;
    constructor();
    static getInstance(): LogManagementService;
    /**
     * 查询日志
     */
    queryLogs(query: LogQuery): Promise<{
        logs: LogEntry[];
        total: number;
    }>;
    /**
     * 获取日志统计
     */
    getLogStats(query?: Partial<LogQuery>): Promise<LogStats>;
    /**
     * 获取错误日志
     */
    getErrorLogs(limit?: number): Promise<LogEntry[]>;
    /**
     * 获取安全日志
     */
    getSecurityLogs(limit?: number): Promise<LogEntry[]>;
    /**
     * 获取性能日志
     */
    getPerformanceLogs(limit?: number): Promise<LogEntry[]>;
    /**
     * 清理旧日志
     */
    cleanupOldLogs(daysToKeep?: number): Promise<void>;
    /**
     * 导出日志
     */
    exportLogs(query: LogQuery, format?: 'json' | 'csv'): Promise<string>;
    /**
     * 获取日志文件列表
     */
    private getLogFiles;
    /**
     * 读取日志文件
     */
    private readLogFile;
    /**
     * 过滤日志
     */
    private filterLogs;
    /**
     * 转换为CSV格式
     */
    private convertToCSV;
}
//# sourceMappingURL=logManagementService.d.ts.map