"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testContentModeration = exports.getModerationStats = exports.deleteModerationRule = exports.updateModerationRule = exports.getModerationRules = exports.createModerationRule = exports.getUserReports = exports.processReport = exports.getReports = exports.createReport = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const moderationService_1 = require("../services/moderationService");
const ContentReport_1 = __importDefault(require("../models/ContentReport"));
const ModerationRule_1 = __importDefault(require("../models/ModerationRule"));
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const Comment_1 = __importDefault(require("../models/Comment"));
// 创建举报
const createReport = async (req, res) => {
    try {
        const { targetType, targetId, reason, description } = req.body;
        const reporterId = req.user.userId;
        // 验证必填字段
        if (!targetType || !targetId || !reason) {
            return res.status(400).json({
                success: false,
                message: '缺少必填字段'
            });
        }
        // 验证目标类型
        if (!['post', 'comment'].includes(targetType)) {
            return res.status(400).json({
                success: false,
                message: '无效的目标类型'
            });
        }
        // 验证目标ID
        if (!mongoose_1.default.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({
                success: false,
                message: '无效的目标ID'
            });
        }
        // 验证举报原因
        const validReasons = ['spam', 'inappropriate', 'harassment', 'violence', 'hate_speech', 'misinformation', 'other'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: '无效的举报原因'
            });
        }
        // 验证目标是否存在
        let targetExists = false;
        if (targetType === 'post') {
            targetExists = await CommunityPost_1.default.exists({ _id: targetId });
        }
        else {
            targetExists = await Comment_1.default.exists({ _id: targetId });
        }
        if (!targetExists) {
            return res.status(404).json({
                success: false,
                message: '举报目标不存在'
            });
        }
        const report = await moderationService_1.moderationService.createReport({
            reporterId: new mongoose_1.default.Types.ObjectId(reporterId),
            targetType,
            targetId: new mongoose_1.default.Types.ObjectId(targetId),
            reason,
            description
        });
        res.status(201).json({
            success: true,
            data: report,
            message: '举报提交成功'
        });
    }
    catch (error) {
        console.error('创建举报失败:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '创建举报失败'
        });
    }
};
exports.createReport = createReport;
// 获取举报列表（管理员）
const getReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, targetType, reason } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let query = {};
        if (status)
            query.status = status;
        if (targetType)
            query.targetType = targetType;
        if (reason)
            query.reason = reason;
        const [reports, total] = await Promise.all([
            ContentReport_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .populate('reporterId', 'username avatar')
                .populate('reviewerId', 'username avatar')
                .lean(),
            ContentReport_1.default.countDocuments(query)
        ]);
        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    current: pageNum,
                    total: Math.ceil(total / limitNum),
                    pageSize: limitNum,
                    totalItems: total
                }
            }
        });
    }
    catch (error) {
        console.error('获取举报列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取举报列表失败'
        });
    }
};
exports.getReports = getReports;
// 处理举报（管理员）
const processReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { action, reviewNotes } = req.body;
        const reviewerId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({
                success: false,
                message: '无效的举报ID'
            });
        }
        const validActions = ['none', 'warning', 'content_removed', 'user_suspended', 'user_banned'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: '无效的处理动作'
            });
        }
        const report = await moderationService_1.moderationService.processReport(reportId, new mongoose_1.default.Types.ObjectId(reviewerId), action, reviewNotes);
        res.json({
            success: true,
            data: report,
            message: '举报处理成功'
        });
    }
    catch (error) {
        console.error('处理举报失败:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '处理举报失败'
        });
    }
};
exports.processReport = processReport;
// 获取用户的举报历史
const getUserReports = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user.userId;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let query = { reporterId: userId };
        if (status)
            query.status = status;
        const [reports, total] = await Promise.all([
            ContentReport_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .populate('reviewerId', 'username')
                .lean(),
            ContentReport_1.default.countDocuments(query)
        ]);
        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    current: pageNum,
                    total: Math.ceil(total / limitNum),
                    pageSize: limitNum,
                    totalItems: total
                }
            }
        });
    }
    catch (error) {
        console.error('获取用户举报历史失败:', error);
        res.status(500).json({
            success: false,
            message: '获取举报历史失败'
        });
    }
};
exports.getUserReports = getUserReports;
// 创建审核规则（管理员）
const createModerationRule = async (req, res) => {
    try {
        const { name, description, type, config, action, severity, appliesTo } = req.body;
        const createdBy = req.user.userId;
        // 验证必填字段
        if (!name || !description || !type || !action || !severity || !appliesTo) {
            return res.status(400).json({
                success: false,
                message: '缺少必填字段'
            });
        }
        const rule = new ModerationRule_1.default({
            name,
            description,
            type,
            config,
            action,
            severity,
            appliesTo,
            createdBy: new mongoose_1.default.Types.ObjectId(createdBy)
        });
        await rule.save();
        // 重新加载规则
        await moderationService_1.moderationService.loadRules();
        res.status(201).json({
            success: true,
            data: rule,
            message: '审核规则创建成功'
        });
    }
    catch (error) {
        console.error('创建审核规则失败:', error);
        res.status(500).json({
            success: false,
            message: '创建审核规则失败'
        });
    }
};
exports.createModerationRule = createModerationRule;
// 获取审核规则列表（管理员）
const getModerationRules = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, isActive } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let query = {};
        if (type)
            query.type = type;
        if (isActive !== undefined)
            query.isActive = isActive === 'true';
        const [rules, total] = await Promise.all([
            ModerationRule_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .populate('createdBy', 'username')
                .lean(),
            ModerationRule_1.default.countDocuments(query)
        ]);
        res.json({
            success: true,
            data: {
                rules,
                pagination: {
                    current: pageNum,
                    total: Math.ceil(total / limitNum),
                    pageSize: limitNum,
                    totalItems: total
                }
            }
        });
    }
    catch (error) {
        console.error('获取审核规则失败:', error);
        res.status(500).json({
            success: false,
            message: '获取审核规则失败'
        });
    }
};
exports.getModerationRules = getModerationRules;
// 更新审核规则（管理员）
const updateModerationRule = async (req, res) => {
    try {
        const { ruleId } = req.params;
        const updates = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(ruleId)) {
            return res.status(400).json({
                success: false,
                message: '无效的规则ID'
            });
        }
        const rule = await ModerationRule_1.default.findByIdAndUpdate(ruleId, updates, { new: true, runValidators: true });
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: '审核规则不存在'
            });
        }
        // 重新加载规则
        await moderationService_1.moderationService.loadRules();
        res.json({
            success: true,
            data: rule,
            message: '审核规则更新成功'
        });
    }
    catch (error) {
        console.error('更新审核规则失败:', error);
        res.status(500).json({
            success: false,
            message: '更新审核规则失败'
        });
    }
};
exports.updateModerationRule = updateModerationRule;
// 删除审核规则（管理员）
const deleteModerationRule = async (req, res) => {
    try {
        const { ruleId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(ruleId)) {
            return res.status(400).json({
                success: false,
                message: '无效的规则ID'
            });
        }
        const rule = await ModerationRule_1.default.findByIdAndDelete(ruleId);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: '审核规则不存在'
            });
        }
        // 重新加载规则
        await moderationService_1.moderationService.loadRules();
        res.json({
            success: true,
            message: '审核规则删除成功'
        });
    }
    catch (error) {
        console.error('删除审核规则失败:', error);
        res.status(500).json({
            success: false,
            message: '删除审核规则失败'
        });
    }
};
exports.deleteModerationRule = deleteModerationRule;
// 获取审核统计（管理员）
const getModerationStats = async (req, res) => {
    try {
        const { timeRange = 'week' } = req.query;
        const stats = await moderationService_1.moderationService.getModerationStats(timeRange);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('获取审核统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取审核统计失败'
        });
    }
};
exports.getModerationStats = getModerationStats;
// 测试内容审核
const testContentModeration = async (req, res) => {
    try {
        const { content, type = 'post' } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                message: '内容不能为空'
            });
        }
        const result = await moderationService_1.moderationService.analyzeContent({
            content,
            type: type,
            userId: new mongoose_1.default.Types.ObjectId() // 测试用的临时ID
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('内容审核测试失败:', error);
        res.status(500).json({
            success: false,
            message: '内容审核测试失败'
        });
    }
};
exports.testContentModeration = testContentModeration;
//# sourceMappingURL=moderationController.js.map