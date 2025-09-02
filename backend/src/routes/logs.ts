import express from 'express';
import {
  queryLogs,
  getLogStats,
  getErrorLogs,
  getSecurityLogs,
  getPerformanceLogs,
  exportLogs,
  cleanupLogs
} from '../controllers/logController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 所有日志管理接口都需要认证
router.use(authenticateToken);

// 查询日志
router.get('/query', queryLogs);

// 获取日志统计
router.get('/stats', getLogStats);

// 获取错误日志
router.get('/errors', getErrorLogs);

// 获取安全日志
router.get('/security', getSecurityLogs);

// 获取性能日志
router.get('/performance', getPerformanceLogs);

// 导出日志
router.get('/export', exportLogs);

// 清理旧日志
router.post('/cleanup', cleanupLogs);

export default router;