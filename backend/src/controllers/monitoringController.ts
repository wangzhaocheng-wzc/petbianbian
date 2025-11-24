import { Request, Response } from 'express';
import { MonitoringService } from '../services/monitoringService';
import { Logger } from '../utils/logger';

const monitoringService = MonitoringService.getInstance();

// 获取健康检查信息
export const getHealthCheck = async (req: Request, res: Response) => {
  try {
    const healthCheck = await monitoringService.getHealthCheck();
    
    // 根据健康状态设置HTTP状态码
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取Prometheus指标
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      message: '获取指标失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取系统信息
export const getSystemInfo = (req: Request, res: Response) => {
  try {
    const systemInfo = monitoringService.getSystemInfo();
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      success: false,
      message: '获取系统信息失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取实时监控数据
export const getRealtimeStats = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Realtime stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取实时统计失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取错误统计
export const getErrorStats = (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取错误统计失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 获取性能统计
export const getPerformanceStats = (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取性能统计失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// 接收前端图片URL重写事件（公共端点）
export const logImageUrlRewrite = (req: Request, res: Response) => {
  try {
    const {
      original,
      resolved,
      reason,
      frontendOrigin,
      backendOrigin,
      timestamp
    } = req.body || {};

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
    Logger.api('Image URL rewrite', {
      payload,
    });

    res.json({ success: true });
  } catch (error) {
    monitoringService.recordError('/api/monitoring/image-url-rewrite', error as Error);
    Logger.error('Image URL rewrite log error', { error: error as any });
    res.status(500).json({ success: false, message: '日志记录失败' });
  }
};