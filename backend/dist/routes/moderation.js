"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const moderationController_1 = require("../controllers/moderationController");
const router = (0, express_1.Router)();
// 举报相关路由
router.post('/reports', auth_1.authenticateToken, moderationController_1.createReport); // 创建举报
router.get('/reports', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.getReports); // 获取举报列表（管理员）
router.put('/reports/:reportId', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.processReport); // 处理举报（管理员）
router.get('/reports/user', auth_1.authenticateToken, moderationController_1.getUserReports); // 获取用户举报历史
// 审核内容相关路由
router.get('/pending', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.getPendingContent); // 获取待审核内容
router.post('/decision', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.moderateDecision); // 审核决定
router.post('/batch', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.batchModerate); // 批量审核
// 用户违规统计
router.get('/users/:userId/violations', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.getUserViolationStats);
// 审核规则相关路由
router.post('/rules', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), moderationController_1.createModerationRule); // 创建审核规则（管理员）
router.get('/rules', moderationController_1.getModerationRules); // 获取审核规则列表
router.put('/rules/:ruleId', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), moderationController_1.updateModerationRule); // 更新审核规则（管理员）
router.delete('/rules/:ruleId', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), moderationController_1.deleteModerationRule); // 删除审核规则（管理员）
// 统计和测试
router.get('/stats', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), moderationController_1.getModerationStats); // 获取审核统计
router.post('/test', moderationController_1.testContentModeration); // 测试内容审核
exports.default = router;
//# sourceMappingURL=moderation.js.map