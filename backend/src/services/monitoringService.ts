import { Request, Response, NextFunction } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { getPostgresStatus } from '../config/postgres';

// 启用默认指标收集
collectDefaultMetrics();

// 自定义指标
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const databaseConnections = new Gauge({
  name: 'database_connections',
  help: 'Number of database connections'
});

export const errorRate = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint']
});

export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

export const cpuUsage = new Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage'
});

// 监控中间件
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route,
      status_code: res.statusCode
    }, duration);
    
    if (res.statusCode >= 400) {
      errorRate.inc({
        type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        endpoint: route
      });
    }
  });
  
  next();
};

// 系统指标收集
export const collectSystemMetrics = () => {
  // 内存使用情况
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'external' }, memUsage.external);
  
  // CPU使用率
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);
  
  cpuUsage.set(usage);
};

// 健康检查接口
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    fileSystem: 'accessible' | 'error';
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

export class MonitoringService {
  private static instance: MonitoringService;
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }
  
  // 获取Prometheus指标
  public getMetrics(): Promise<string> {
    return register.metrics();
  }
  
  // 健康检查
  public async getHealthCheck(): Promise<HealthCheck> {
    const mongoose = require('mongoose');
    const redis = require('../config/redis');
    
    // 检查数据库连接
    let databaseStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    try {
      const dbPrimary = process.env.DB_PRIMARY || 'mongo';
      if (dbPrimary === 'postgres') {
        const pg = await getPostgresStatus();
        databaseStatus = pg === 'connected' ? 'connected' : 'disconnected';
      } else {
        if (mongoose.connection.readyState === 1) {
          databaseStatus = 'connected';
        }
      }
    } catch (error) {
      databaseStatus = 'error';
    }
    
    // 检查Redis连接
    let redisStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    try {
      if (redis.isReady) {
        redisStatus = 'connected';
      }
    } catch (error) {
      redisStatus = 'error';
    }
    
    // 检查文件系统
    let fileSystemStatus: 'accessible' | 'error' = 'accessible';
    try {
      const uploadsDir = path.join(__dirname, '../../uploads');
      await fs.promises.access(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      fileSystemStatus = 'error';
    }
    
    // 计算整体状态
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (databaseStatus === 'error' || fileSystemStatus === 'error') {
      overallStatus = 'unhealthy';
    } else if (databaseStatus === 'disconnected' || redisStatus === 'error') {
      overallStatus = 'degraded';
    }
    
    // 获取CPU使用率
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalIdle += cpu.times.idle;
        totalTick += cpu.times[type as keyof typeof cpu.times];
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
  public recordRequest(endpoint: string) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `${endpoint}:${minute}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    
    // 清理旧数据
    this.cleanupOldData();
  }
  
  // 记录错误
  public recordError(endpoint: string, error: Error) {
    const minute = Math.floor(Date.now() / 60000);
    const key = `${endpoint}:${minute}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // 记录错误详情到日志
    console.error(`Error at ${endpoint}:`, error);
  }
  
  // 获取每分钟请求数
  private getRequestsPerMinute(): number {
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
  private getErrorRate(): number {
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
  private cleanupOldData() {
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
  public getSystemInfo() {
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

// 启动系统指标收集
setInterval(collectSystemMetrics, 30000); // 每30秒收集一次