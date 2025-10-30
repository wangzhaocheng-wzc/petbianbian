import express from 'express';
import {
  getHealthCheck,
  getMetrics,
  getSystemInfo,
  getRealtimeStats,
  getErrorStats,
  getPerformanceStats,
  logImageUrlRewrite,
} from '../controllers/monitoringController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 健康检查 - 公开接口
router.get('/health', getHealthCheck);

// Prometheus指标 - 公开接口（通常由监控系统调用）
router.get('/metrics', getMetrics);

// 图片URL重写事件上报 - 公开接口（仅收集最小信息）
router.post('/image-url-rewrite', logImageUrlRewrite);

// 以下接口需要认证
router.use(authenticateToken);

// 系统信息
router.get('/system', getSystemInfo);

// 实时监控数据
router.get('/realtime', getRealtimeStats);

// 错误统计
router.get('/errors', getErrorStats);

// 性能统计
router.get('/performance', getPerformanceStats);

export default router;