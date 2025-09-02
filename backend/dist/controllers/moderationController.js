"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testContentModeration = exports.getUserViolationStats = exports.batchModerate = exports.moderateDecision = exports.getPendingContent = exports.getModerationStats = exports.deleteModerationRule = exports.updateModerationRule = exports.getModerationRules = exports.createModerationRule = exports.getUserReports = exports.processReport = exports.getReports = exports.createReport = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const moderationService_1 = __importDefault(require("../services/moderationService"));
const moderationService = new moderationService_1.default();
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
            targetExists = !!(await CommunityPost_1.default.exists({ _id: targetId }));
        }
        else {
            targetExists = !!(await Comment_1.default.exists({ _id: targetId }));
        }
        if (!targetExists) {
            return res.status(404).json({
                success: false,
                message: '举报目标不存在'
            });
        }
        const report = await moderationService.createReport({
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
        const report = await moderationService.processReport(reportId, new mongoose_1.default.Types.ObjectId(reviewerId), action, reviewNotes);
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
        await moderationService.loadRules();
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
        await moderationService.loadRules();
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
        await moderationService.loadRules();
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
        // 获取基础统计数据
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const [pendingPosts, pendingComments, pendingReports, rejectedPosts, rejectedComments, resolvedReports, recentPosts, recentComments, recentReports] = await Promise.all([
            CommunityPost_1.default.countDocuments({ moderationStatus: 'pending' }),
            Comment_1.default.countDocuments({ moderationStatus: 'pending' }),
            ContentReport_1.default.countDocuments({ status: 'pending' }),
            CommunityPost_1.default.countDocuments({ moderationStatus: 'rejected' }),
            Comment_1.default.countDocuments({ moderationStatus: 'rejected' }),
            ContentReport_1.default.countDocuments({ status: 'resolved' }),
            CommunityPost_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Comment_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            ContentReport_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
        ]);
        const stats = {
            pending: {
                posts: pendingPosts,
                comments: pendingComments,
                reports: pendingReports,
                total: pendingPosts + pendingComments + pendingReports
            },
            processed: {
                rejectedPosts,
                rejectedComments,
                resolvedReports,
                total: rejectedPosts + rejectedComments + resolvedReports
            },
            recentActivity: {
                posts: recentPosts,
                comments: recentComments,
                reports: recentReports,
                total: recentPosts + recentComments + recentReports
            }
        };
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
// 获取待审核内容
const getPendingContent = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [posts, comments, reports] = await Promise.all([
            CommunityPost_1.default.find({ moderationStatus: 'pending' })
                .populate('userId', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .lean(),
            Comment_1.default.find({ moderationStatus: 'pending' })
                .populate('userId', 'username avatar')
                .populate('postId', 'title')
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .lean(),
            ContentReport_1.default.find({ status: 'pending' })
                .populate('reporterId', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .lean()
        ]);
        const [totalPosts, totalComments, totalReports] = await Promise.all([
            CommunityPost_1.default.countDocuments({ moderationStatus: 'pending' }),
            Comment_1.default.countDocuments({ moderationStatus: 'pending' }),
            ContentReport_1.default.countDocuments({ status: 'pending' })
        ]);
        res.json({
            success: true,
            data: {
                posts,
                comments,
                reports,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: [totalPosts, totalComments, totalReports]
                }
            }
        });
    }
    catch (error) {
        console.error('获取待审核内容失败:', error);
        res.status(500).json({
            success: false,
            message: '获取待审核内容失败'
        });
    }
};
exports.getPendingContent = getPendingContent;
// 审核决定
const moderateDecision = async (req, res) => {
    try {
        const { type, id, decision, notes } = req.body;
        const reviewerId = req.user.userId;
        if (!['post', 'comment', 'report'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: '无效的内容类型'
            });
        }
        if (!['approve', 'reject'].includes(decision)) {
            return res.status(400).json({
                success: false,
                message: '无效的审核决定'
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的内容ID'
            });
        }
        let result;
        if (type === 'post') {
            result = await CommunityPost_1.default.findByIdAndUpdate(id, {
                moderationStatus: decision === 'approve' ? 'approved' : 'rejected'
            }, { new: true });
        }
        else if (type === 'comment') {
            result = await Comment_1.default.findByIdAndUpdate(id, {
                moderationStatus: decision === 'approve' ? 'approved' : 'rejected'
            }, { new: true });
        }
        else if (type === 'report') {
            result = await ContentReport_1.default.findByIdAndUpdate(id, {
                status: decision === 'approve' ? 'resolved' : 'dismissed',
                reviewerId: new mongoose_1.default.Types.ObjectId(reviewerId),
                reviewNotes: notes
            }, { new: true });
        }
        if (!result) {
            return res.status(404).json({
                success: false,
                message: '内容不存在'
            });
        }
        res.json({
            success: true,
            data: result,
            message: `内容已${decision === 'approve' ? '通过' : '拒绝'}`
        });
    }
    catch (error) {
        console.error('审核决定失败:', error);
        res.status(500).json({
            success: false,
            message: '审核决定失败'
        });
    }
};
exports.moderateDecision = moderateDecision;
// 批量审核
const batchModerate = async (req, res) => {
    try {
        const { items } = req.body;
        const reviewerId = req.user.userId;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: '无效的批量操作数据'
            });
        }
        const results = [];
        for (const item of items) {
            try {
                const { type, id, decision } = item;
                if (!['post', 'comment'].includes(type) || !['approve', 'reject'].includes(decision)) {
                    results.push({ id, success: false, error: '无效的参数' });
                    continue;
                }
                let result;
                if (type === 'post') {
                    result = await CommunityPost_1.default.findByIdAndUpdate(id, {
                        moderationStatus: decision === 'approve' ? 'approved' : 'rejected'
                    });
                }
                else {
                    result = await Comment_1.default.findByIdAndUpdate(id, {
                        moderationStatus: decision === 'approve' ? 'approved' : 'rejected'
                    });
                }
                results.push({ id, success: !!result });
            }
            catch (error) {
                results.push({ id: item.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
        res.json({
            success: true,
            data: results,
            message: `批量审核完成，成功处理 ${results.filter(r => r.success).length} 项`
        });
    }
    catch (error) {
        console.error('批量审核失败:', error);
        res.status(500).json({
            success: false,
            message: '批量审核失败'
        });
    }
};
exports.batchModerate = batchModerate;
// 获取用户违规统计
const getUserViolationStats = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: '无效的用户ID'
            });
        }
        const [rejectedPosts, rejectedComments, reports] = await Promise.all([
            CommunityPost_1.default.countDocuments({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                moderationStatus: 'rejected'
            }),
            Comment_1.default.countDocuments({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                moderationStatus: 'rejected'
            }),
            ContentReport_1.default.countDocuments({
                targetType: 'user',
                targetId: new mongoose_1.default.Types.ObjectId(userId),
                status: { $in: ['pending', 'resolved'] }
            })
        ]);
        const stats = {
            rejectedPosts,
            rejectedComments,
            reports,
            totalViolations: rejectedPosts + rejectedComments + reports
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('获取用户违规统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户违规统计失败'
        });
    }
};
exports.getUserViolationStats = getUserViolationStats;
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
        const result = await moderationService.analyzeContent({
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