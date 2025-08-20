import { Router } from 'express';
import { StatisticsController } from '../controllers/statisticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有统计路由都需要认证
router.use(authenticateToken);

// 健康趋势分析
router.get('/trends/health/:petId', StatisticsController.getHealthTrends);

// 周期统计数据
router.get('/period/:petId', StatisticsController.getPeriodStatistics);

// 异常模式检测
router.get('/anomalies/:petId', StatisticsController.getAnomalyPatterns);

// 对比分析
router.get('/comparison/:petId', StatisticsController.getComparisonAnalysis);

// 多宠物统计汇总
router.get('/summary/multi-pet', StatisticsController.getMultiPetSummary);

// 用户整体统计
router.get('/overview/user', StatisticsController.getUserOverview);

export default router;