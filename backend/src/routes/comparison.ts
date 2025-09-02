import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getMultiPetComparison,
  getPetHealthTrends,
  getPetsForComparison
} from '../controllers/comparisonController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/comparison/pets
 * @desc 获取用户所有宠物的基本信息（用于选择对比宠物）
 * @access Private
 */
router.get('/pets', getPetsForComparison);

/**
 * @route GET /api/comparison/multi-pet
 * @desc 获取多宠物对比分析
 * @query petIds - 宠物ID列表，逗号分隔或数组格式
 * @query days - 对比天数，默认30天
 * @access Private
 */
router.get('/multi-pet', getMultiPetComparison);

/**
 * @route GET /api/comparison/trends
 * @desc 获取宠物健康趋势对比
 * @query petIds - 宠物ID列表，逗号分隔或数组格式
 * @query days - 对比天数，默认30天
 * @access Private
 */
router.get('/trends', getPetHealthTrends);

export default router;