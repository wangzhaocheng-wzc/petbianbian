"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupLogs = exports.exportLogs = exports.getPerformanceLogs = exports.getSecurityLogs = exports.getErrorLogs = exports.getLogStats = exports.queryLogs = void 0;
const logManagementService_1 = require("../services/logManagementService");
const logger_1 = require("../utils/logger");
const logger_2 = require("../utils/logger");
const logService = logManagementService_1.LogManagementService.getInstance();
// 查询日志
const queryLogs = async (req, res) => {
    try {
        const { level, type, startDate, endDate, userId, ip, endpoint, search, limit = 100, offset = 0 } = req.query;
        const query = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        if (level) {
            query.level = Array.isArray(level) ? level : [level];
        }
        if (type) {
            query.type = Array.isArray(type) ? type : [type];
        }
        if (startDate) {
            query.startDate = new Date(startDate);
        }
        if (endDate) {
            query.endDate = new Date(endDate);
        }
        if (userId) {
            query.userId = userId;
        }
        if (ip) {
            query.ip = ip;
        }
        if (endpoint) {
            query.endpoint = endpoint;
        }
        if (search) {
            query.search = search;
        }
        const result = await logService.queryLogs(query);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        logger_2.Logger.error('查询日志失败', error);
        res.status(500).json({
            success: false,
            message: '查询日志失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.queryLogs = queryLogs;
// 获取日志统计
const getLogStats = async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        const query = {};
        if (startDate) {
            query.startDate = new Date(startDate);
        }
        if (endDate) {
            query.endDate = new Date(endDate);
        }
        if (type) {
            query.type = Array.isArray(type) ? type : [type];
        }
        const stats = await logService.getLogStats(query);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_2.Logger.error('获取日志统计失败', error);
        res.status(500).json({
            success: false,
            message: '获取日志统计失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getLogStats = getLogStats;
// 获取错误日志
const getErrorLogs = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const logs = await logService.getErrorLogs(parseInt(limit));
        res.json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        logger_2.Logger.error('获取错误日志失败', error);
        res.status(500).json({
            success: false,
            message: '获取错误日志失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getErrorLogs = getErrorLogs;
// 获取安全日志
const getSecurityLogs = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const logs = await logService.getSecurityLogs(parseInt(limit));
        res.json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        logger_2.Logger.error('获取安全日志失败', error);
        res.status(500).json({
            success: false,
            message: '获取安全日志失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getSecurityLogs = getSecurityLogs;
// 获取性能日志
const getPerformanceLogs = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const logs = await logService.getPerformanceLogs(parseInt(limit));
        res.json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        logger_2.Logger.error('获取性能日志失败', error);
        res.status(500).json({
            success: false,
            message: '获取性能日志失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPerformanceLogs = getPerformanceLogs;
// 导出日志
const exportLogs = async (req, res) => {
    try {
        const { level, type, startDate, endDate, userId, ip, endpoint, search, format = 'json' } = req.query;
        const query = {};
        if (level) {
            query.level = Array.isArray(level) ? level : [level];
        }
        if (type) {
            query.type = Array.isArray(type) ? type : [type];
        }
        if (startDate) {
            query.startDate = new Date(startDate);
        }
        if (endDate) {
            query.endDate = new Date(endDate);
        }
        if (userId) {
            query.userId = userId;
        }
        if (ip) {
            query.ip = ip;
        }
        if (endpoint) {
            query.endpoint = endpoint;
        }
        if (search) {
            query.search = search;
        }
        const exportData = await logService.exportLogs(query, format);
        const contentType = format === 'csv' ? 'text/csv' : 'application/json';
        const filename = `logs-${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
    }
    catch (error) {
        logger_2.Logger.error('导出日志失败', error);
        res.status(500).json({
            success: false,
            message: '导出日志失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.exportLogs = exportLogs;
// 清理旧日志
const cleanupLogs = async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;
        await logService.cleanupOldLogs(parseInt(daysToKeep));
        logger_2.Logger.info(`清理了 ${daysToKeep} 天前的日志`, {
            type: logger_1.LogType.APPLICATION,
            userId: req.user?.id
        });
        res.json({
            success: true,
            message: '日志清理完成'
        });
    }
    catch (error) {
        logger_2.Logger.error('清理日志失败', error);
        res.status(500).json({
            success: false,
            message: '清理日志失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.cleanupLogs = cleanupLogs;
//# sourceMappingURL=logController.js.map