import { Router } from 'express';
import { authenticateToken as auth, requireRole } from '../middleware/auth';
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
  getPendingContent,
  moderateDecision,
  batchModerate,
  getUserViolationStats,
  testContentModeration
} from '../controllers/moderationController';

const router = Router();

// 举报相关路由
router.post('/reports', auth, createReport);                    // 创建举报
router.get('/reports', auth, requireRole(['admin', 'moderator']), getReports); // 获取举报列表（管理员）
router.put('/reports/:reportId', auth, requireRole(['admin', 'moderator']), processReport); // 处理举报（管理员）
router.get('/reports/user', auth, getUserReports);              // 获取用户举报历史

// 审核内容相关路由
router.get('/pending', auth, requireRole(['admin', 'moderator']), getPendingContent); // 获取待审核内容
router.post('/decision', auth, requireRole(['admin', 'moderator']), moderateDecision); // 审核决定
router.post('/batch', auth, requireRole(['admin', 'moderator']), batchModerate); // 批量审核

// 用户违规统计
router.get('/users/:userId/violations', auth, requireRole(['admin', 'moderator']), getUserViolationStats);

// 审核规则相关路由
router.post('/rules', auth, requireRole(['admin']), createModerationRule); // 创建审核规则（管理员）
router.get('/rules', getModerationRules);                       // 获取审核规则列表
router.put('/rules/:ruleId', auth, requireRole(['admin']), updateModerationRule); // 更新审核规则（管理员）
router.delete('/rules/:ruleId', auth, requireRole(['admin']), deleteModerationRule); // 删除审核规则（管理员）

// 统计和测试
router.get('/stats', auth, requireRole(['admin', 'moderator']), getModerationStats); // 获取审核统计
router.post('/test', testContentModeration);                    // 测试内容审核

export default router;