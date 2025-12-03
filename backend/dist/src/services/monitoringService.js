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
exports.MonitoringService = exports.collectSystemMetrics = exports.monitoringMiddleware = exports.imageUrlGovernanceProcessedTotal = exports.imageUrlGovernanceRemaining = exports.imageUrlRewriteDurationMs = exports.imageUrlRewriteTotal = exports.cpuUsage = exports.memoryUsage = exports.errorRate = exports.databaseConnections = exports.activeConnections = exports.httpRequestDuration = exports.httpRequestsTotal = void 0;
const prom_client_1 = require("prom-client");
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const postgres_1 = require("../config/postgres");
// 启用默认指标收集
(0, prom_client_1.collectDefaultMetrics)();
// 自定义指标
exports.httpRequestsTotal = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});
exports.activeConnections = new prom_client_1.Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
});
exports.databaseConnections = new prom_client_1.Gauge({
    name: 'database_connections',
    help: 'Number of database connections'
});
exports.errorRate = new prom_client_1.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'endpoint']
});
exports.memoryUsage = new prom_client_1.Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
});
exports.cpuUsage = new prom_client_1.Gauge({
    name: 'cpu_usage_percent',
    help: 'CPU usage percentage'
});
// Image URL 重写相关指标
exports.imageUrlRewriteTotal = new prom_client_1.Counter({
    name: 'image_url_rewrite_total',
    help: 'Total number of image URL rewrite events',
    labelNames: ['origin', 'type', 'model']
});
exports.imageUrlRewriteDurationMs = new prom_client_1.Histogram({
    name: 'image_url_rewrite_duration_ms',
    help: 'Processing time in ms per image URL rewrite event',
    labelNames: ['origin', 'type', 'model'],
    buckets: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000]
});
exports.imageUrlGovernanceRemaining = new prom_client_1.Gauge({
    name: 'image_url_governance_remaining',
    help: 'Remaining items to be processed in image URL governance',
    labelNames: ['model']
});
exports.imageUrlGovernanceProcessedTotal = new prom_client_1.Counter({
    name: 'image_url_governance_processed_total',
    help: 'Total items processed in image URL governance',
    labelNames: ['model']
});
// 监控中间件
const monitoringMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        exports.httpRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode
        });
        exports.httpRequestDuration.observe({
            method: req.method,
            route,
            status_code: res.statusCode
        }, duration);
        if (res.statusCode >= 400) {
            exports.errorRate.inc({
                type: res.statusCode >= 500 ? 'server_error' : 'client_error',
                endpoint: route
            });
        }
    });
    next();
};
exports.monitoringMiddleware = monitoringMiddleware;
// 系统指标收集
const collectSystemMetrics = () => {
    // 内存使用情况
    const memUsage = process.memoryUsage();
    exports.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    exports.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    exports.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    exports.memoryUsage.set({ type: 'external' }, memUsage.external);
    // CPU使用率
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(cpu => {
        for (const type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    exports.cpuUsage.set(usage);
};
exports.collectSystemMetrics = collectSystemMetrics;
class MonitoringService {
    constructor() {
        this.requestCounts = new Map();
        this.errorCounts = new Map();
    }
    static getInstance() {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }
    // 记录图片URL重写事件
    recordImageUrlRewrite(origin, type, model, durationMs) {
        const modelName = model || 'unknown';
        exports.imageUrlRewriteTotal.inc({ origin, type, model: modelName });
        if (typeof durationMs === 'number' && durationMs >= 0) {
            exports.imageUrlRewriteDurationMs.observe({ origin, type, model: modelName }, durationMs);
        }
    }
    // 记录治理进度（处理量与剩余量）
    recordGovernanceProgress(processedByModel, remainingByModel) {
        for (const [model, count] of Object.entries(processedByModel || {})) {
            if (count && count > 0) {
                exports.imageUrlGovernanceProcessedTotal.inc({ model }, count);
            }
        }
        for (const [model, remaining] of Object.entries(remainingByModel || {})) {
            exports.imageUrlGovernanceRemaining.set({ model }, remaining);
        }
    }
    // 获取Prometheus指标
    getMetrics() {
        return prom_client_1.register.metrics();
    }
    // 健康检查
    async getHealthCheck() {
        const redis = require('../config/redis');
        // 检查数据库连接
        let databaseStatus = 'disconnected';
        try {
            const dbPrimary = process.env.DB_PRIMARY || 'postgres';
            const pg = await (0, postgres_1.getPostgresStatus)();
            databaseStatus = pg === 'connected' ? 'connected' : 'disconnected';
        }
        catch (error) {
            databaseStatus = 'error';
        }
        // 检查Redis连接
        let redisStatus = 'disconnected';
        try {
            if (redis.isReady) {
                redisStatus = 'connected';
            }
        }
        catch (error) {
            redisStatus = 'error';
        }
        // 检查文件系统
        let fileSystemStatus = 'accessible';
        try {
            const uploadsDir = path.join(__dirname, '../../uploads');
            await fs.promises.access(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
        }
        catch (error) {
            fileSystemStatus = 'error';
        }
        // 计算整体状态
        let overallStatus = 'healthy';
        if (databaseStatus === 'error' || fileSystemStatus === 'error') {
            overallStatus = 'unhealthy';
        }
        else if (databaseStatus === 'disconnected' || redisStatus === 'error') {
            overallStatus = 'degraded';
        }
        // 获取CPU使用率
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalIdle += cpu.times.idle;
                totalTick += cpu.times[type];
            }
        });
        const cpuUsagePercent = 100 - ~~(100 * totalIdle / totalTick);
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            services: {
                database: databaseStatus,
                redis: redisStatus,
                fileSystem: fileSystemStatus
            },
            metrics: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: cpuUsagePercent,
                activeConnections: 0, // 这里可以从实际连接池获取
                requestsPerMinute: this.getRequestsPerMinute(),
                errorRate: this.getErrorRate()
            }
        };
    }
    // 记录请求
    recordRequest(endpoint) {
        const minute = Math.floor(Date.now() / 60000);
        const key = `${endpoint}:${minute}`;
        this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
        // 清理旧数据
        this.cleanupOldData();
    }
    // 记录错误
    recordError(endpoint, error) {
        const minute = Math.floor(Date.now() / 60000);
        const key = `${endpoint}:${minute}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        // 记录错误详情到日志
        console.error(`Error at ${endpoint}:`, error);
    }
    // 获取每分钟请求数
    getRequestsPerMinute() {
        const currentMinute = Math.floor(Date.now() / 60000);
        let total = 0;
        this.requestCounts.forEach((count, key) => {
            const [, minute] = key.split(':');
            if (parseInt(minute) === currentMinute) {
                total += count;
            }
        });
        return total;
    }
    // 获取错误率
    getErrorRate() {
        const currentMinute = Math.floor(Date.now() / 60000);
        let totalRequests = 0;
        let totalErrors = 0;
        this.requestCounts.forEach((count, key) => {
            const [, minute] = key.split(':');
            if (parseInt(minute) === currentMinute) {
                totalRequests += count;
            }
        });
        this.errorCounts.forEach((count, key) => {
            const [, minute] = key.split(':');
            if (parseInt(minute) === currentMinute) {
                totalErrors += count;
            }
        });
        return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    }
    // 清理旧数据
    cleanupOldData() {
        const currentMinute = Math.floor(Date.now() / 60000);
        const cutoff = currentMinute - 60; // 保留最近60分钟的数据
        for (const [key] of this.requestCounts) {
            const [, minute] = key.split(':');
            if (parseInt(minute) < cutoff) {
                this.requestCounts.delete(key);
            }
        }
        for (const [key] of this.errorCounts) {
            const [, minute] = key.split(':');
            if (parseInt(minute) < cutoff) {
                this.errorCounts.delete(key);
            }
        }
    }
    // 获取系统信息
    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };
    }
}
exports.MonitoringService = MonitoringService;
// 启动系统指标收集
setInterval(exports.collectSystemMetrics, 30000); // 每30秒收集一次
//# sourceMappingURL=monitoringService.js.map