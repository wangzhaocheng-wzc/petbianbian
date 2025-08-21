import { Router } from 'express';
import { authenticateToken as auth } from '../middleware/auth';
import {
  createReport,
  getReports,
  processReport,
  getUserReports,
  createModerationRule,
  getModerationRules,
  updateModerationRule,
  deleteModerationRule,
  getModerationStats,
  testContentModeration
} from '../controllers/moderationController';

const router = Router();

// 举报相关路由
router.post('/reports', auth, createReport);                    // 创建举报
router.get('/reports', auth, getReports);                       // 获取举报列表（管理员）
router.put('/reports/:reportId', auth, processReport);          // 处理举报（管理员）
router.get('/reports/user', auth, getUserReports);              // 获取用户举报历史

// 审核规则相关路由
router.post('/rules', auth, createModerationRule);              // 创建审核规则（管理员）
router.get('/rules', getModerationRules);                       // 获取审核规则列表
router.put('/rules/:ruleId', auth, updateModerationRule);       // 更新审核规则（管理员）
router.delete('/rules/:ruleId', auth, deleteModerationRule);    // 删除审核规则（管理员）

// 统计和测试
router.get('/stats', getModerationStats);                       // 获取审核统计
router.post('/test', testContentModeration);                    // 测试内容审核

export default router;