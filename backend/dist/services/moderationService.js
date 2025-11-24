"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = require("../config/postgres");
const ModerationRule_1 = __importDefault(require("../models/ModerationRule"));
const ContentReport_1 = __importDefault(require("../models/ContentReport"));
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const Comment_1 = __importDefault(require("../models/Comment"));
const logger_1 = require("../utils/logger");
class ModerationService {
    constructor() {
        this.sensitiveWords = new Set();
        this.patterns = [];
        this.rules = [];
        this.initializeDefaultRules();
        // 在 Postgres 模式下暂时跳过 Mongo 规则加载
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary !== 'postgres') {
            this.loadRules();
        }
        else {
            logger_1.Logger.info('Postgres 模式：跳过基于 Mongo 的审核规则加载，使用默认规则');
        }
    }
    // 初始化默认敏感词和规则
    initializeDefaultRules() {
        // 基础敏感词库
        const defaultSensitiveWords = [
            // 垃圾信息
            '广告', '推广', '加微信', '加QQ', '代理', '兼职', '赚钱', '投资', '理财',
            // 不当内容
            '色情', '暴力', '血腥', '恐怖', '自杀', '毒品', '赌博',
            // 仇恨言论
            '歧视', '种族主义', '性别歧视', '地域歧视',
            // 欺诈信息
            '诈骗', '虚假', '假冒', '盗版', '侵权'
        ];
        defaultSensitiveWords.forEach(word => this.sensitiveWords.add(word));
        // 默认正则模式
        this.patterns = [
            /\b(?:https?:\/\/|www\.)\S+/gi, // URL链接
            /\b\d{11}\b/g, // 手机号
            /\b\d{6,10}\b/g, // QQ号
            /微信号?[:：]\s*\w+/gi, // 微信号
            /[￥$]\d+/g, // 价格信息
            /[\u4e00-\u9fa5]{2,}(?:群|代理|加盟|招聘)/g // 可疑商业信息
        ];
    }
    // 从数据库加载审核规则
    async loadRules() {
        try {
            const dbPrimary = process.env.DB_PRIMARY || 'postgres';
            if (dbPrimary === 'postgres') {
                // TODO: 后续将从 Postgres 读取规则，这里先使用默认内置规则
                this.rules = [];
                logger_1.Logger.info('Postgres 模式：暂未从数据库加载审核规则，使用内置默认规则');
                return;
            }
            this.rules = await ModerationRule_1.default.find({ isActive: true }).sort({ severity: -1, createdAt: -1 });
            // 更新敏感词库
            this.sensitiveWords.clear();
            this.patterns = [];
            for (const rule of this.rules) {
                if (rule.type === 'keyword' && rule.config.keywords) {
                    rule.config.keywords.forEach(keyword => this.sensitiveWords.add(keyword));
                }
                if (rule.type === 'pattern' && rule.config.patterns) {
                    rule.config.patterns.forEach(pattern => {
                        try {
                            this.patterns.push(new RegExp(pattern, 'gi'));
                        }
                        catch (error) {
                            logger_1.Logger.error(`Invalid regex pattern: ${pattern}`, error);
                        }
                    });
                }
            }
            logger_1.Logger.info(`Loaded ${this.rules.length} moderation rules`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to load moderation rules:', error);
        }
    }
    // 分析内容
    async analyzeContent(analysis) {
        const result = {
            isAllowed: true,
            action: 'approve',
            severity: 'low',
            reasons: [],
            triggeredRules: []
        };
        try {
            // 检查敏感词
            const keywordResult = this.checkKeywords(analysis.content);
            if (keywordResult.violations.length > 0) {
                result.reasons.push(...keywordResult.violations);
                result.triggeredRules.push('keyword_filter');
                this.updateResult(result, 'medium', 'flag');
            }
            // 检查正则模式
            const patternResult = this.checkPatterns(analysis.content);
            if (patternResult.violations.length > 0) {
                result.reasons.push(...patternResult.violations);
                result.triggeredRules.push('pattern_filter');
                this.updateResult(result, 'medium', 'flag');
            }
            // 检查内容长度
            const lengthResult = this.checkLength(analysis.content, analysis.type);
            if (lengthResult.violation) {
                result.reasons.push(lengthResult.violation);
                result.triggeredRules.push('length_filter');
                this.updateResult(result, 'low', 'flag');
            }
            // 检查发布频率（PG 模式支持通过 metadata.pgUserId 进行检查）
            const frequencyResult = await this.checkFrequency(analysis.userId, analysis.type, analysis.metadata?.pgUserId);
            if (frequencyResult.violation) {
                result.reasons.push(frequencyResult.violation);
                result.triggeredRules.push('frequency_filter');
                this.updateResult(result, 'high', 'require_approval');
            }
            // 应用自定义规则
            await this.applyCustomRules(analysis, result);
            // 根据严重程度决定最终动作
            if (result.severity === 'critical') {
                result.isAllowed = false;
                result.action = 'reject';
            }
            else if (result.severity === 'high') {
                result.isAllowed = false;
                result.action = 'require_approval';
            }
            else if (result.severity === 'medium') {
                result.isAllowed = true;
                result.action = 'flag';
            }
        }
        catch (error) {
            logger_1.Logger.error('Content analysis failed:', error);
            // 出错时采用保守策略
            result.isAllowed = false;
            result.action = 'require_approval';
            result.reasons.push('系统错误，需要人工审核');
        }
        return result;
    }
    // 检查敏感词
    checkKeywords(content) {
        const violations = [];
        const lowerContent = content.toLowerCase();
        for (const word of this.sensitiveWords) {
            if (lowerContent.includes(word.toLowerCase())) {
                violations.push(`包含敏感词: ${word}`);
            }
        }
        return { violations };
    }
    // 检查正则模式
    checkPatterns(content) {
        const violations = [];
        for (const pattern of this.patterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                violations.push(`匹配可疑模式: ${matches[0]}`);
            }
        }
        return { violations };
    }
    // 检查内容长度
    checkLength(content, type) {
        const minLength = type === 'post' ? 10 : 1;
        const maxLength = type === 'post' ? 10000 : 2000;
        if (content.length < minLength) {
            return { violation: `内容过短，至少需要${minLength}个字符` };
        }
        if (content.length > maxLength) {
            return { violation: `内容过长，最多允许${maxLength}个字符` };
        }
        return {};
    }
    // 检查发布频率
    async checkFrequency(userId, type, pgUserId) {
        try {
            const timeWindow = 10; // 10分钟
            const maxFrequency = type === 'post' ? 3 : 10; // 帖子3个，评论10个
            const since = new Date(Date.now() - timeWindow * 60 * 1000);
            const dbPrimary = process.env.DB_PRIMARY || 'postgres';
            let count = 0;
            if (dbPrimary === 'postgres' && pgUserId) {
                const pool = await (0, postgres_1.getPostgresPool)();
                if (type === 'post') {
                    const r = await pool.query(`SELECT COUNT(*)::int AS cnt FROM community_posts WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeWindow} minutes'`, [pgUserId]);
                    count = r.rows[0]?.cnt || 0;
                }
                else {
                    const r = await pool.query(`SELECT COUNT(*)::int AS cnt FROM comments WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeWindow} minutes'`, [pgUserId]);
                    count = r.rows[0]?.cnt || 0;
                }
            }
            else {
                // Mongo 回退
                if (type === 'post') {
                    count = await CommunityPost_1.default.countDocuments({
                        userId,
                        createdAt: { $gte: since }
                    });
                }
                else {
                    count = await Comment_1.default.countDocuments({
                        userId,
                        createdAt: { $gte: since }
                    });
                }
            }
            if (count >= maxFrequency) {
                return { violation: `发布过于频繁，${timeWindow}分钟内最多发布${maxFrequency}个${type === 'post' ? '帖子' : '评论'}` };
            }
            return {};
        }
        catch (error) {
            logger_1.Logger.error('Frequency check failed:', error);
            return {};
        }
    }
    // 应用自定义规则
    async applyCustomRules(analysis, result) {
        const customRules = this.rules.filter(rule => rule.type === 'custom' &&
            rule.appliesTo.includes(analysis.type));
        for (const rule of customRules) {
            try {
                // 这里可以实现自定义脚本执行
                // 为了安全起见，暂时跳过自定义脚本执行
                logger_1.Logger.info(`Skipping custom rule: ${rule.name}`);
            }
            catch (error) {
                logger_1.Logger.error(`Custom rule execution failed: ${rule.name}`, error);
            }
        }
    }
    // 更新结果
    updateResult(result, severity, action) {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        if (severityLevels[severity] > severityLevels[result.severity]) {
            result.severity = severity;
            result.action = action;
        }
    }
    // 创建举报
    async createReport(reportData) {
        try {
            // 检查是否已经举报过
            const existingReport = await ContentReport_1.default.findOne({
                reporterId: reportData.reporterId,
                targetType: reportData.targetType,
                targetId: reportData.targetId,
                status: { $in: ['pending', 'reviewing'] }
            });
            if (existingReport) {
                throw new Error('您已经举报过此内容，请等待处理结果');
            }
            const report = new ContentReport_1.default(reportData);
            await report.save();
            logger_1.Logger.info(`New content report created: ${report._id}`);
            return report;
        }
        catch (error) {
            logger_1.Logger.error('Failed to create content report:', error);
            throw error;
        }
    }
    // 处理举报
    async processReport(reportId, reviewerId, action, reviewNotes) {
        try {
            const report = await ContentReport_1.default.findById(reportId);
            if (!report) {
                throw new Error('举报记录不存在');
            }
            // 分配审核员
            report.reviewerId = reviewerId;
            report.status = 'reviewing';
            // 完成审核
            report.action = action;
            report.reviewNotes = reviewNotes;
            report.status = action === 'none' ? 'dismissed' : 'resolved';
            await report.save();
            // 根据处理结果执行相应动作
            await this.executeAction(report, action);
            logger_1.Logger.info(`Content report processed: ${reportId}, action: ${action}`);
            return report;
        }
        catch (error) {
            logger_1.Logger.error('Failed to process content report:', error);
            throw error;
        }
    }
    // 执行审核动作
    async executeAction(report, action) {
        try {
            switch (action) {
                case 'content_removed':
                    await this.removeContent(report.targetType, report.targetId);
                    break;
                case 'user_suspended':
                    // TODO: 实现用户暂停功能
                    logger_1.Logger.info(`User suspension not implemented for report: ${report._id}`);
                    break;
                case 'user_banned':
                    // TODO: 实现用户封禁功能
                    logger_1.Logger.info(`User ban not implemented for report: ${report._id}`);
                    break;
                case 'warning':
                    // TODO: 实现用户警告功能
                    logger_1.Logger.info(`User warning not implemented for report: ${report._id}`);
                    break;
                default:
                    // 无动作
                    break;
            }
        }
        catch (error) {
            logger_1.Logger.error('Failed to execute moderation action:', error);
        }
    }
    // 移除内容
    async removeContent(targetType, targetId) {
        try {
            if (targetType === 'post') {
                await CommunityPost_1.default.findByIdAndUpdate(targetId, {
                    status: 'archived',
                    moderationStatus: 'rejected'
                });
            }
            else {
                await Comment_1.default.findByIdAndUpdate(targetId, {
                    isDeleted: true,
                    moderationStatus: 'rejected'
                });
            }
            logger_1.Logger.info(`Content removed: ${targetType} ${targetId}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to remove content:', error);
        }
    }
    // 获取审核统计
    async getModerationStats(timeRange = 'week') {
        try {
            const now = new Date();
            let since;
            switch (timeRange) {
                case 'day':
                    since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case 'week':
                    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }
            const [reportStats, contentStats] = await Promise.all([
                ContentReport_1.default.aggregate([
                    { $match: { createdAt: { $gte: since } } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                Promise.all([
                    CommunityPost_1.default.countDocuments({
                        createdAt: { $gte: since },
                        moderationStatus: 'pending'
                    }),
                    Comment_1.default.countDocuments({
                        createdAt: { $gte: since },
                        moderationStatus: 'pending'
                    })
                ])
            ]);
            return {
                reports: reportStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                pendingContent: {
                    posts: contentStats[0],
                    comments: contentStats[1]
                }
            };
        }
        catch (error) {
            logger_1.Logger.error('Failed to get moderation stats:', error);
            throw error;
        }
    }
}
exports.default = ModerationService;
//# sourceMappingURL=moderationService.js.map