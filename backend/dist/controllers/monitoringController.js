"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logImageUrlRewrite = exports.getPerformanceStats = exports.getErrorStats = exports.getRealtimeStats = exports.getSystemInfo = exports.getMetrics = exports.getHealthCheck = void 0;
const monitoringService_1 = require("../services/monitoringService");
const logger_1 = require("../utils/logger");
const monitoringService = monitoringService_1.MonitoringService.getInstance();
// 获取健康检查信息
const getHealthCheck = async (req, res) => {
    try {
        const healthCheck = await monitoringService.getHealthCheck();
        // 根据健康状态设置HTTP状态码
        const statusCode = healthCheck.status === 'healthy' ? 200 :
            healthCheck.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json({
            success: true,
            data: healthCheck
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            message: '健康检查失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getHealthCheck = getHealthCheck;
// 获取Prometheus指标
const getMetrics = async (req, res) => {
    try {
        const metrics = await monitoringService.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    }
    catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({
            success: false,
            message: '获取指标失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getMetrics = getMetrics;
// 获取系统信息
const getSystemInfo = (req, res) => {
    try {
        const systemInfo = monitoringService.getSystemInfo();
        res.json({
            success: true,
            data: systemInfo
        });
    }
    catch (error) {
        console.error('System info error:', error);
        res.status(500).json({
            success: false,
            message: '获取系统信息失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getSystemInfo = getSystemInfo;
// 获取实时监控数据
const getRealtimeStats = async (req, res) => {
    try {
        const healthCheck = await monitoringService.getHealthCheck();
        const systemInfo = monitoringService.getSystemInfo();
        const realtimeStats = {
            timestamp: new Date().toISOString(),
            status: healthCheck.status,
            uptime: healthCheck.uptime,
            services: healthCheck.services,
            performance: {
                memoryUsage: healthCheck.metrics.memoryUsage,
                cpuUsage: healthCheck.metrics.cpuUsage,
                requestsPerMinute: healthCheck.metrics.requestsPerMinute,
                errorRate: healthCheck.metrics.errorRate
            },
            system: {
                totalMemory: systemInfo.totalMemory,
                freeMemory: systemInfo.freeMemory,
                loadAverage: systemInfo.loadAverage,
                cpuCount: systemInfo.cpuCount
            }
        };
        res.json({
            success: true,
            data: realtimeStats
        });
    }
    catch (error) {
        console.error('Realtime stats error:', error);
        res.status(500).json({
            success: false,
            message: '获取实时统计失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRealtimeStats = getRealtimeStats;
// 获取错误统计
const getErrorStats = (req, res) => {
    try {
        // 这里可以从日志系统或数据库获取错误统计
        const errorStats = {
            last24Hours: {
                total: 0,
                byType: {
                    '4xx': 0,
                    '5xx': 0,
                    database: 0,
                    validation: 0,
                    auth: 0
                },
                byEndpoint: {}
            },
            trends: {
                hourly: [],
                daily: []
            }
        };
        res.json({
            success: true,
            data: errorStats
        });
    }
    catch (error) {
        console.error('Error stats error:', error);
        res.status(500).json({
            success: false,
            message: '获取错误统计失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getErrorStats = getErrorStats;
// 获取性能统计
const getPerformanceStats = (req, res) => {
    try {
        // 这里可以从监控数据获取性能统计
        const performanceStats = {
            responseTime: {
                average: 0,
                p95: 0,
                p99: 0
            },
            throughput: {
                requestsPerSecond: 0,
                requestsPerMinute: 0
            },
            endpoints: {
                slowest: [],
                fastest: [],
                mostUsed: []
            }
        };
        res.json({
            success: true,
            data: performanceStats
        });
    }
    catch (error) {
        console.error('Performance stats error:', error);
        res.status(500).json({
            success: false,
            message: '获取性能统计失败',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPerformanceStats = getPerformanceStats;
// 接收前端图片URL重写事件（公共端点）
const logImageUrlRewrite = (req, res) => {
    try {
        const { original, resolved, reason, frontendOrigin, backendOrigin, timestamp } = req.body || {};
        // 记录请求计数
        monitoringService.recordRequest('/api/monitoring/image-url-rewrite');
        // 基础校验与安全过滤（避免日志污染）
        const safeReason = typeof reason === 'string' ? reason : 'unknown';
        const payload = {
            original: typeof original === 'string' ? original : 'invalid',
            resolved: typeof resolved === 'string' ? resolved : 'invalid',
            reason: safeReason,
            frontendOrigin: typeof frontendOrigin === 'string' ? frontendOrigin : 'unknown',
            backendOrigin: typeof backendOrigin === 'string' ? backendOrigin : 'unknown',
            timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        };
        // 记录到应用日志（归类为 API 日志类型）
        logger_1.Logger.api('Image URL rewrite', {
            payload,
        });
        res.json({ success: true });
    }
    catch (error) {
        monitoringService.recordError('/api/monitoring/image-url-rewrite', error);
        logger_1.Logger.error('Image URL rewrite log error', { error: error });
        res.status(500).json({ success: false, message: '日志记录失败' });
    }
};
exports.logImageUrlRewrite = logImageUrlRewrite;
//# sourceMappingURL=monitoringController.js.map