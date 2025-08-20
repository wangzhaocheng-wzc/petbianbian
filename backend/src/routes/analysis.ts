import { Router } from 'express';
import { AnalysisController } from '../controllers/analysisController';
import { uploadSingle, handleUploadError } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 上传图片进行分析
router.post('/upload', uploadSingle('image'), handleUploadError, AnalysisController.uploadForAnalysis);

// 获取分析记录
router.get('/records/:petId', AnalysisController.getAnalysisRecords);

// 获取单个分析记录
router.get('/record/:id', AnalysisController.getAnalysisRecord);

// 获取分析统计
router.get('/statistics/:petId', AnalysisController.getAnalysisStatistics);

// 删除分析记录
router.delete('/record/:id', AnalysisController.deleteAnalysisRecord);

export default router;