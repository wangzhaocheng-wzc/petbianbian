import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getHealthReportData,
  downloadHealthReportPDF,
  generateHealthReportPDF
} from '../controllers/reportController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/reports/health/:petId
 * @desc 获取宠物健康报告数据
 * @param petId - 宠物ID
 * @query days - 报告天数，默认30天
 * @access Private
 */
router.get('/health/:petId', getHealthReportData);

/**
 * @route GET /api/reports/health/:petId/pdf
 * @desc 生成并下载PDF健康报告
 * @param petId - 宠物ID
 * @query days - 报告天数，默认30天
 * @access Private
 */
router.get('/health/:petId/pdf', downloadHealthReportPDF);

/**
 * @route POST /api/reports/health/:petId/generate
 * @desc 生成并保存PDF健康报告
 * @param petId - 宠物ID
 * @query days - 报告天数，默认30天
 * @access Private
 */
router.post('/health/:petId/generate', generateHealthReportPDF);

export default router;