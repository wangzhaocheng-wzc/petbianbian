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
exports.LogManagementService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const logger_1 = require("../utils/logger");
class LogManagementService {
    constructor() {
        this.logsDir = path.join(__dirname, '../../logs');
    }
    static getInstance() {
        if (!LogManagementService.instance) {
            LogManagementService.instance = new LogManagementService();
        }
        return LogManagementService.instance;
    }
    /**
     * 查询日志
     */
    async queryLogs(query) {
        try {
            const logFiles = await this.getLogFiles(query.startDate, query.endDate);
            const allLogs = [];
            for (const file of logFiles) {
                const logs = await this.readLogFile(file);
                allLogs.push(...logs);
            }
            // 过滤日志
            let filteredLogs = this.filterLogs(allLogs, query);
            // 排序（最新的在前）
            filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            // 分页
            const offset = query.offset || 0;
            const limit = query.limit || 100;
            const paginatedLogs = filteredLogs.slice(offset, offset + limit);
            return {
                logs: paginatedLogs,
                total: filteredLogs.length
            };
        }
        catch (error) {
            logger_1.Logger.error('查询日志失败', error);
            throw error;
        }
    }
    /**
     * 获取日志统计
     */
    async getLogStats(query = {}) {
        try {
            const { logs } = await this.queryLogs({ ...query, limit: 10000 });
            const stats = {
                totalLogs: logs.length,
                byLevel: {},
                byType: {},
                byHour: {},
                topEndpoints: [],
                topErrors: [],
                topUsers: []
            };
            const endpointCounts = {};
            const errorCounts = {};
            const userCounts = {};
            logs.forEach(log => {
                // 按级别统计
                stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
                // 按类型统计
                if (log.type) {
                    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
                }
                // 按小时统计
                const hour = new Date(log.timestamp).getHours();
                const hourKey = `${hour}:00`;
                stats.byHour[hourKey] = (stats.byHour[hourKey] || 0) + 1;
                // 统计端点
                if (log.endpoint) {
                    endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
                }
                // 统计错误
                if (log.level === 'error' && log.message) {
                    errorCounts[log.message] = (errorCounts[log.message] || 0) + 1;
                }
                // 统计用户
                if (log.userId) {
                    userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
                }
            });
            // 获取Top 10
            stats.topEndpoints = Object.entries(endpointCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([endpoint, count]) => ({ endpoint, count }));
            stats.topErrors = Object.entries(errorCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([message, count]) => ({ message, count }));
            stats.topUsers = Object.entries(userCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([userId, count]) => ({ userId, count }));
            return stats;
        }
        catch (error) {
            logger_1.Logger.error('获取日志统计失败', error);
            throw error;
        }
    }
    /**
     * 获取错误日志
     */
    async getErrorLogs(limit = 50) {
        return (await this.queryLogs({
            level: ['error'],
            limit,
            offset: 0
        })).logs;
    }
    /**
     * 获取安全日志
     */
    async getSecurityLogs(limit = 50) {
        return (await this.queryLogs({
            type: [logger_1.LogType.SECURITY],
            limit,
            offset: 0
        })).logs;
    }
    /**
     * 获取性能日志
     */
    async getPerformanceLogs(limit = 50) {
        return (await this.queryLogs({
            type: [logger_1.LogType.PERFORMANCE],
            limit,
            offset: 0
        })).logs;
    }
    /**
     * 清理旧日志
     */
    async cleanupOldLogs(daysToKeep = 30) {
        try {
            const files = await fs.promises.readdir(this.logsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            for (const file of files) {
                const filePath = path.join(this.logsDir, file);
                const stats = await fs.promises.stat(filePath);
                if (stats.mtime < cutoffDate) {
                    await fs.promises.unlink(filePath);
                    logger_1.Logger.info(`删除旧日志文件: ${file}`);
                }
            }
        }
        catch (error) {
            logger_1.Logger.error('清理旧日志失败', error);
            throw error;
        }
    }
    /**
     * 导出日志
     */
    async exportLogs(query, format = 'json') {
        try {
            const { logs } = await this.queryLogs(query);
            if (format === 'csv') {
                return this.convertToCSV(logs);
            }
            else {
                return JSON.stringify(logs, null, 2);
            }
        }
        catch (error) {
            logger_1.Logger.error('导出日志失败', error);
            throw error;
        }
    }
    /**
     * 获取日志文件列表
     */
    async getLogFiles(startDate, endDate) {
        const files = await fs.promises.readdir(this.logsDir);
        const logFiles = files.filter(file => file.endsWith('.log') && !file.endsWith('.gz'));
        if (!startDate && !endDate) {
            return logFiles.map(file => path.join(this.logsDir, file));
        }
        // 根据日期过滤文件
        const filteredFiles = logFiles.filter(file => {
            const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
            if (!dateMatch)
                return true;
            const fileDate = new Date(dateMatch[1]);
            if (startDate && fileDate < startDate)
                return false;
            if (endDate && fileDate > endDate)
                return false;
            return true;
        });
        return filteredFiles.map(file => path.join(this.logsDir, file));
    }
    /**
     * 读取日志文件
     */
    async readLogFile(filePath) {
        const logs = [];
        if (!fs.existsSync(filePath)) {
            return logs;
        }
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        for await (const line of rl) {
            if (line.trim()) {
                try {
                    const logEntry = JSON.parse(line);
                    logs.push(logEntry);
                }
                catch (error) {
                    // 忽略无法解析的行
                }
            }
        }
        return logs;
    }
    /**
     * 过滤日志
     */
    filterLogs(logs, query) {
        return logs.filter(log => {
            // 按级别过滤
            if (query.level && query.level.length > 0 && !query.level.includes(log.level)) {
                return false;
            }
            // 按类型过滤
            if (query.type && query.type.length > 0 && (!log.type || !query.type.includes(log.type))) {
                return false;
            }
            // 按日期过滤
            const logDate = new Date(log.timestamp);
            if (query.startDate && logDate < query.startDate) {
                return false;
            }
            if (query.endDate && logDate > query.endDate) {
                return false;
            }
            // 按用户过滤
            if (query.userId && log.userId !== query.userId) {
                return false;
            }
            // 按IP过滤
            if (query.ip && log.ip !== query.ip) {
                return false;
            }
            // 按端点过滤
            if (query.endpoint && log.endpoint !== query.endpoint) {
                return false;
            }
            // 按搜索关键词过滤
            if (query.search) {
                const searchLower = query.search.toLowerCase();
                const messageMatch = log.message.toLowerCase().includes(searchLower);
                const endpointMatch = log.endpoint?.toLowerCase().includes(searchLower);
                const errorMatch = log.error?.message?.toLowerCase().includes(searchLower);
                if (!messageMatch && !endpointMatch && !errorMatch) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * 转换为CSV格式
     */
    convertToCSV(logs) {
        if (logs.length === 0)
            return '';
        const headers = ['timestamp', 'level', 'message', 'type', 'userId', 'ip', 'endpoint', 'method', 'statusCode', 'responseTime'];
        const csvLines = [headers.join(',')];
        logs.forEach(log => {
            const row = headers.map(header => {
                const value = log[header];
                if (value === undefined || value === null)
                    return '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvLines.push(row.join(','));
        });
        return csvLines.join('\n');
    }
}
exports.LogManagementService = LogManagementService;
//# sourceMappingURL=logManagementService.js.map