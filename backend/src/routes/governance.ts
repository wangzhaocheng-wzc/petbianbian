import express from 'express';
import { previewImageUrlCleanup, getImageUrlPreview, executeImageUrlCleanup } from '../controllers/governanceController';
import { getDailyAnalytics } from '../controllers/governanceAnalyticsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// 所有治理接口需要管理员权限
router.use(authenticateToken);
router.use(requireRole(['admin']));

// 预览治理更改（生成预览任务并返回jobId与统计）
router.post('/image-url/preview', previewImageUrlCleanup);

// 获取预览结果（通过jobId）
router.get('/image-url/preview/:jobId', getImageUrlPreview);

// 执行治理（根据预览jobId落库并生成报告）
router.post('/image-url/execute', executeImageUrlCleanup);

// 治理每日分析聚合（按时间范围）
router.get('/reports/daily', getDailyAnalytics);

export default router;