import mongoose from 'mongoose';
export declare class ModerationService {
    /**
     * 检查文本内容是否包含敏感词
     */
    static checkSensitiveWords(content: string): {
        hasSensitiveWords: boolean;
        detectedWords: string[];
        filteredContent: string;
    };
    /**
     * 检查违规模式
     */
    static checkViolationPatterns(content: string): {
        hasViolations: boolean;
        violations: string[];
    };
    /**
     * 综合内容审核
     */
    static moderateContent(content: string, title?: string): {
        approved: boolean;
        moderationStatus: 'approved' | 'pending' | 'rejected';
        issues: string[];
        filteredContent: string;
        filteredTitle?: string;
    };
    /**
     * 创建举报
     */
    static createReport(reporterId: mongoose.Types.ObjectId, targetType: 'post' | 'comment' | 'user', targetId: mongoose.Types.ObjectId, reason: string, description?: string): Promise<mongoose.Document<unknown, {}, import("../models/Report").IReport> & import("../models/Report").IReport & {
        _id: mongoose.Types.ObjectId;
    }>;
    /**
     * 自动审核批处理
     */
    static autoModerateBatch(targetType: 'post' | 'comment' | 'user', targetId: mongoose.Types.ObjectId): Promise<void>;
    /**
     * 获取待审核内容
     */
    static getPendingContent(page?: number, limit?: number): Promise<{
        posts: Omit<mongoose.Document<unknown, {}, import("../models/CommunityPost").ICommunityPost> & import("../models/CommunityPost").ICommunityPost & {
            _id: mongoose.Types.ObjectId;
        }, never>[];
        comments: Omit<Omit<mongoose.Document<unknown, {}, import("../models/Comment").IComment> & import("../models/Comment").IComment & {
            _id: mongoose.Types.ObjectId;
        }, never>, never>[];
        reports: Omit<mongoose.Document<unknown, {}, import("../models/Report").IReport> & import("../models/Report").IReport & {
            _id: mongoose.Types.ObjectId;
        }, never>[];
        pagination: {
            page: number;
            limit: number;
            total: [number, number, number];
        };
    }>;
    /**
     * 审核决定
     */
    static moderateDecision(type: 'post' | 'comment' | 'report', id: mongoose.Types.ObjectId, decision: 'approve' | 'reject', reviewerId: mongoose.Types.ObjectId, notes?: string): Promise<boolean>;
    /**
     * 获取用户违规统计
     */
    static getUserViolationStats(userId: mongoose.Types.ObjectId): Promise<{
        rejectedPosts: number;
        rejectedComments: number;
        reports: number;
        totalViolations: number;
    }>;
    /**
     * 批量审核
     */
    static batchModerate(items: Array<{
        type: 'post' | 'comment';
        id: mongoose.Types.ObjectId;
        decision: 'approve' | 'reject';
    }>, reviewerId: mongoose.Types.ObjectId): Promise<({
        id: mongoose.Types.ObjectId;
        success: boolean;
        error?: undefined;
    } | {
        id: mongoose.Types.ObjectId;
        success: boolean;
        error: any;
    })[]>;
}
export default ModerationService;
//# sourceMappingURL=moderationService.d.ts.map