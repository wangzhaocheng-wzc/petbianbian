import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Logger, LogType } from '../utils/logger';

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
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topErrors: Array<{ message: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
}

export class LogManagementService {
  private static instance: LogManagementService;
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
  }

  public static getInstance(): LogManagementService {
    if (!LogManagementService.instance) {
      LogManagementService.instance = new LogManagementService();
    }
    return LogManagementService.instance;
  }

  /**
   * 查询日志
   */
  async queryLogs(query: LogQuery): Promise<{ logs: LogEntry[]; total: number }> {
    try {
      const logFiles = await this.getLogFiles(query.startDate, query.endDate);
      const allLogs: LogEntry[] = [];

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
    } catch (error) {
      Logger.error('查询日志失败', error);
      throw error;
    }
  }

  /**
   * 获取日志统计
   */
  async getLogStats(query: Partial<LogQuery> = {}): Promise<LogStats> {
    try {
      const { logs } = await this.queryLogs({ ...query, limit: 10000 });

      const stats: LogStats = {
        totalLogs: logs.length,
        byLevel: {},
        byType: {},
        byHour: {},
        topEndpoints: [],
        topErrors: [],
        topUsers: []
      };

      const endpointCounts: Record<string, number> = {};
      const errorCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

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
    } catch (error) {
      Logger.error('获取日志统计失败', error);
      throw error;
    }
  }

  /**
   * 获取错误日志
   */
  async getErrorLogs(limit: number = 50): Promise<LogEntry[]> {
    return (await this.queryLogs({
      level: ['error'],
      limit,
      offset: 0
    })).logs;
  }

  /**
   * 获取安全日志
   */
  async getSecurityLogs(limit: number = 50): Promise<LogEntry[]> {
    return (await this.queryLogs({
      type: [LogType.SECURITY],
      limit,
      offset: 0
    })).logs;
  }

  /**
   * 获取性能日志
   */
  async getPerformanceLogs(limit: number = 50): Promise<LogEntry[]> {
    return (await this.queryLogs({
      type: [LogType.PERFORMANCE],
      limit,
      offset: 0
    })).logs;
  }

  /**
   * 清理旧日志
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(filePath);
          Logger.info(`删除旧日志文件: ${file}`);
        }
      }
    } catch (error) {
      Logger.error('清理旧日志失败', error);
      throw error;
    }
  }

  /**
   * 导出日志
   */
  async exportLogs(query: LogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const { logs } = await this.queryLogs(query);

      if (format === 'csv') {
        return this.convertToCSV(logs);
      } else {
        return JSON.stringify(logs, null, 2);
      }
    } catch (error) {
      Logger.error('导出日志失败', error);
      throw error;
    }
  }

  /**
   * 获取日志文件列表
   */
  private async getLogFiles(startDate?: Date, endDate?: Date): Promise<string[]> {
    const files = await fs.promises.readdir(this.logsDir);
    const logFiles = files.filter(file => file.endsWith('.log') && !file.endsWith('.gz'));

    if (!startDate && !endDate) {
      return logFiles.map(file => path.join(this.logsDir, file));
    }

    // 根据日期过滤文件
    const filteredFiles = logFiles.filter(file => {
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return true;

      const fileDate = new Date(dateMatch[1]);
      if (startDate && fileDate < startDate) return false;
      if (endDate && fileDate > endDate) return false;
      return true;
    });

    return filteredFiles.map(file => path.join(this.logsDir, file));
  }

  /**
   * 读取日志文件
   */
  private async readLogFile(filePath: string): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];

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
        } catch (error) {
          // 忽略无法解析的行
        }
      }
    }

    return logs;
  }

  /**
   * 过滤日志
   */
  private filterLogs(logs: LogEntry[], query: LogQuery): LogEntry[] {
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
  private convertToCSV(logs: LogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = ['timestamp', 'level', 'message', 'type', 'userId', 'ip', 'endpoint', 'method', 'statusCode', 'responseTime'];
    const csvLines = [headers.join(',')];

    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header];
        if (value === undefined || value === null) return '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  }
}