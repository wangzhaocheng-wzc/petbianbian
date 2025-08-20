import { Router } from 'express';
import { RecordsController } from '../controllers/recordsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取记录列表（支持复杂查询和筛选）
router.get('/', RecordsController.getRecords);

// 获取单个记录详情
router.get('/:id', RecordsController.getRecordById);

// 更新记录
router.put('/:id', RecordsController.updateRecord);

// 删除记录
router.delete('/:id', RecordsController.deleteRecord);

// 获取记录统计数据
router.get('/statistics/overview', RecordsController.getStatisticsOverview);

// 获取宠物记录统计
router.get('/statistics/pet/:petId', RecordsController.getPetStatistics);

// 获取健康趋势数据
router.get('/trends/health/:petId', RecordsController.getHealthTrends);

// 获取记录聚合数据
router.get('/aggregation/summary', RecordsController.getAggregationSummary);

// 批量操作
router.post('/batch/delete', RecordsController.batchDeleteRecords);
router.post('/batch/update', RecordsController.batchUpdateRecords);

export default router;