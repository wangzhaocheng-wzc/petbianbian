"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationService = void 0;
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const Comment_1 = __importDefault(require("../models/Comment"));
const Report_1 = __importDefault(require("../models/Report"));
// 敏感词库 - 在实际应用中应该从数据库或配置文件加载
const SENSITIVE_WORDS = [
    // 政治敏感词
    '政治', '政府', '官员', '腐败',
    // 色情内容
    '色情', '裸体', '性行为', '成人',
    // 暴力内容
    '暴力', '杀害', '伤害', '虐待',
    // 垃圾信息
    '广告', '推广', '营销', '代理',
    // 其他不当内容
    '赌博', '毒品', '诈骗', '欺诈'
];
// 违规模式检测
const VIOLATION_PATTERNS = [
    // 重复字符模式
    /(.)\1{4,}/g,
    // 联系方式模式
    /\d{11}|\d{3}-\d{4}-\d{4}/g,
    // 网址模式
    /https?:\/\/[^\s]+/g,
    // QQ/微信号模式
    /[qQ]{2}[:：]\s*\d+|微信[:：]\s*\w+/g
];
class ModerationService {
    /**
     * 检查文本内容是否包含敏感词
     */
    static checkSensitiveWords(content) {
        const detectedWords = [];
        let filteredContent = content;
        // 转换为小写进行检查
        const lowerContent = content.toLowerCase();
        SENSITIVE_WORDS.forEach(word => {
            const lowerWord = word.toLowerCase();
            if (lowerContent.includes(lowerWord)) {
                detectedWords.push(word);
                // 用星号替换敏感词
                const regex = new RegExp(word, 'gi');
                filteredContent = filteredContent.replace(regex, '*'.repeat(word.length));
            }
        });
        return {
            hasSensitiveWords: detectedWords.length > 0,
            detectedWords,
            filteredContent
        };
    }
    /**
     * 检查违规模式
     */
    static checkViolationPatterns(content) {
        const violations = [];
        VIOLATION_PATTERNS.forEach((pattern, index) => {
            if (pattern.test(content)) {
                switch (index) {
                    case 0:
                        violations.push('重复字符');
                        break;
                    case 1:
                        violations.push('联系方式');
                        break;
                    case 2:
                        violations.push('外部链接');
                        break;
                    case 3:
                        violations.push('社交账号');
                        break;
                }
            }
        });
        return {
            hasViolations: violations.length > 0,
            violations
        };
    }
    /**
     * 综合内容审核
     */
    static moderateContent(content, title) {
        const issues = [];
        let approved = true;
        let moderationStatus = 'approved';
        // 检查内容
        const contentCheck = this.checkSensitiveWords(content);
        const patternCheck = this.checkViolationPatterns(content);
        let filteredContent = contentCheck.filteredContent;
        let filteredTitle = title;
        // 检查标题（如果有）
        if (title) {
            const titleCheck = this.checkSensitiveWords(title);
            const titlePatternCheck = this.checkViolationPatterns(title);
            if (titleCheck.hasSensitiveWords) {
                issues.push(...titleCheck.detectedWords.map(word => `标题包含敏感词: ${word}`));
                filteredTitle = titleCheck.filteredContent;
            }
            if (titlePatternCheck.hasViolations) {
                issues.push(...titlePatternCheck.violations.map(v => `标题违规: ${v}`));
            }
        }
        // 处理内容问题
        if (contentCheck.hasSensitiveWords) {
            issues.push(...contentCheck.detectedWords.map(word => `内容包含敏感词: ${word}`));
            // 如果敏感词过多，直接拒绝
            if (contentCheck.detectedWords.length > 3) {
                approved = false;
                moderationStatus = 'rejected';
            }
            else {
                // 少量敏感词，标记为待审核
                approved = false;
                moderationStatus = 'pending';
            }
        }
        if (patternCheck.hasViolations) {
            issues.push(...patternCheck.violations.map(v => `内容违规: ${v}`));
            approved = false;
            moderationStatus = 'pending';
        }
        // 内容长度检查
        if (content.length < 5) {
            issues.push('内容过短');
            approved = false;
            moderationStatus = 'pending';
        }
        return {
            approved,
            moderationStatus,
            issues,
            filteredContent,
            filteredTitle
        };
    }
    /**
     * 创建举报
     */
    static async createReport(reporterId, targetType, targetId, reason, description) {
        try {
            const report = new Report_1.default({
                reporterId,
                targetType,
                targetId,
                reason,
                description
            });
            await report.save();
            // 如果举报数量达到阈值，自动标记为待审核
            const reportCount = await Report_1.default.countDocuments({
                targetType,
                targetId,
                status: { $in: ['pending', 'reviewed'] }
            });
            if (reportCount >= 3) {
                await this.autoModerateBatch(targetType, targetId);
            }
            return report;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new Error('您已经举报过此内容');
            }
            throw error;
        }
    }
    /**
     * 自动审核批处理
     */
    static async autoModerateBatch(targetType, targetId) {
        try {
            if (targetType === 'post') {
                await CommunityPost_1.default.findByIdAndUpdate(targetId, {
                    moderationStatus: 'pending'
                });
            }
            else if (targetType === 'comment') {
                await Comment_1.default.findByIdAndUpdate(targetId, {
                    moderationStatus: 'pending'
                });
            }
        }
        catch (error) {
            console.error('Auto moderation failed:', error);
        }
    }
    /**
     * 获取待审核内容
     */
    static async getPendingContent(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [posts, comments, reports] = await Promise.all([
            CommunityPost_1.default.find({ moderationStatus: 'pending' })
                .populate('userId', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip),
            Comment_1.default.find({ moderationStatus: 'pending' })
                .populate('userId', 'username avatar')
                .populate('postId', 'title')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip),
            Report_1.default.find({ status: 'pending' })
                .populate('reporterId', 'username')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
        ]);
        return {
            posts,
            comments,
            reports,
            pagination: {
                page,
                limit,
                total: await Promise.all([
                    CommunityPost_1.default.countDocuments({ moderationStatus: 'pending' }),
                    Comment_1.default.countDocuments({ moderationStatus: 'pending' }),
                    Report_1.default.countDocuments({ status: 'pending' })
                ])
            }
        };
    }
    /**
     * 审核决定
     */
    static async moderateDecision(type, id, decision, reviewerId, notes) {
        try {
            if (type === 'post') {
                await CommunityPost_1.default.findByIdAndUpdate(id, {
                    moderationStatus: decision === 'approve' ? 'approved' : 'rejected'
                });
            }
            else if (type === 'comment') {
                await Comment_1.default.findByIdAndUpdate(id, {
                    moderationStatus: decision === 'approve' ? 'approved' : 'rejected'
                });
            }
            else if (type === 'report') {
                await Report_1.default.findByIdAndUpdate(id, {
                    status: decision === 'approve' ? 'resolved' : 'dismissed',
                    reviewerId,
                    reviewNotes: notes
                });
            }
            return true;
        }
        catch (error) {
            console.error('Moderation decision failed:', error);
            return false;
        }
    }
    /**
     * 获取用户违规统计
     */
    static async getUserViolationStats(userId) {
        const [rejectedPosts, rejectedComments, reports] = await Promise.all([
            CommunityPost_1.default.countDocuments({
                userId,
                moderationStatus: 'rejected'
            }),
            Comment_1.default.countDocuments({
                userId,
                moderationStatus: 'rejected'
            }),
            Report_1.default.countDocuments({
                targetType: 'user',
                targetId: userId,
                status: { $in: ['pending', 'resolved'] }
            })
        ]);
        return {
            rejectedPosts,
            rejectedComments,
            reports,
            totalViolations: rejectedPosts + rejectedComments + reports
        };
    }
    /**
     * 批量审核
     */
    static async batchModerate(items, reviewerId) {
        const results = [];
        for (const item of items) {
            try {
                const result = await this.moderateDecision(item.type, item.id, item.decision, reviewerId);
                results.push({ id: item.id, success: result });
            }
            catch (error) {
                results.push({ id: item.id, success: false, error: error.message });
            }
        }
        return results;
    }
}
exports.ModerationService = ModerationService;
exports.default = ModerationService;
//# sourceMappingURL=moderationService.js.map