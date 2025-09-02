import { Request, Response } from 'express';
import { LogManagementService, LogQuery } from '../services/logManagementService';
import { LogType } from '../utils/logger';
import { Logger } from '../utils/logger';

const logService = LogManagementService.getInstance();

// 查询日志
export const queryLogs = async (req: Request, res: Response) => {
  try {
    const {
      level,
      type,
      startDate,
      endDate,
      userId,
      ip,
      endpoint,
      search,
      limit = 100,
      offset = 0
    } = req.query;

    const query: LogQuery = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (level) {
      query.level = Array.isArray(level) ? level as string[] : [level as string];
    }

    if (type) {
      query.type = Array.isArray(type) ? type as LogType[] : [type as LogType];
    }

    if (startDate) {
      query.startDate = new Date(startDate as string);
    }

    if (endDate) {
      query.endDate = new Date(endDate as string);
    }

    if (userId) {
      query.userId = userId as string;
    }

    if (ip) {
      query.ip = ip as string;
    }

    if (endpoint) {
      query.endpoint = endpoint as string;
    }

    if (search) {
      query.search = search as string;
    }

    const result = await logService.queryLogs(query);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('查询日志失败', error);
    res.status(500).json({
      success: false,
      message: '查询日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取日志统计
export const getLogStats = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      type
    } = req.query;

    const query: Partial<LogQuery> = {};

    if (startDate) {
      query.startDate = new Date(startDate as string);
    }

    if (endDate) {
      query.endDate = new Date(endDate as string);
    }

    if (type) {
      query.type = Array.isArray(type) ? type as LogType[] : [type as LogType];
    }

    const stats = await logService.getLogStats(query);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('获取日志统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取日志统计失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取错误日志
export const getErrorLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await logService.getErrorLogs(parseInt(limit as string));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    Logger.error('获取错误日志失败', error);
    res.status(500).json({
      success: false,
      message: '获取错误日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取安全日志
export const getSecurityLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await logService.getSecurityLogs(parseInt(limit as string));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    Logger.error('获取安全日志失败', error);
    res.status(500).json({
      success: false,
      message: '获取安全日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取性能日志
export const getPerformanceLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await logService.getPerformanceLogs(parseInt(limit as string));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    Logger.error('获取性能日志失败', error);
    res.status(500).json({
      success: false,
      message: '获取性能日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 导出日志
export const exportLogs = async (req: Request, res: Response) => {
  try {
    const {
      level,
      type,
      startDate,
      endDate,
      userId,
      ip,
      endpoint,
      search,
      format = 'json'
    } = req.query;

    const query: LogQuery = {};

    if (level) {
      query.level = Array.isArray(level) ? level as string[] : [level as string];
    }

    if (type) {
      query.type = Array.isArray(type) ? type as LogType[] : [type as LogType];
    }

    if (startDate) {
      query.startDate = new Date(startDate as string);
    }

    if (endDate) {
      query.endDate = new Date(endDate as string);
    }

    if (userId) {
      query.userId = userId as string;
    }

    if (ip) {
      query.ip = ip as string;
    }

    if (endpoint) {
      query.endpoint = endpoint as string;
    }

    if (search) {
      query.search = search as string;
    }

    const exportData = await logService.exportLogs(query, format as 'json' | 'csv');

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `logs-${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    Logger.error('导出日志失败', error);
    res.status(500).json({
      success: false,
      message: '导出日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 清理旧日志
export const cleanupLogs = async (req: Request, res: Response) => {
  try {
    const { daysToKeep = 30 } = req.body;

    await logService.cleanupOldLogs(parseInt(daysToKeep));

    Logger.info(`清理了 ${daysToKeep} 天前的日志`, {
      type: LogType.APPLICATION,
      userId: (req as any).user?.id
    });

    res.json({
      success: true,
      message: '日志清理完成'
    });
  } catch (error) {
    Logger.error('清理日志失败', error);
    res.status(500).json({
      success: false,
      message: '清理日志失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};