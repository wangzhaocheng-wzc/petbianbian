import mongoose from 'mongoose';
import { IContentReport } from '../models/ContentReport';
export interface ModerationResult {
    isAllowed: boolean;
    action: 'approve' | 'flag' | 'reject' | 'require_approval';
    severity: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    triggeredRules: string[];
}
export interface ContentAnalysis {
    content: string;
    type: 'post' | 'comment';
    userId: mongoose.Types.ObjectId;
    metadata?: {
        title?: string;
        tags?: string[];
        images?: string[];
        pgUserId?: string;
    };
}
declare class ModerationService {
    private sensitiveWords;
    private patterns;
    private rules;
    constructor();
    private initializeDefaultRules;
    loadRules(): Promise<void>;
    analyzeContent(analysis: ContentAnalysis): Promise<ModerationResult>;
    private checkKeywords;
    private checkPatterns;
    private checkLength;
    private checkFrequency;
    private applyCustomRules;
    private updateResult;
    createReport(reportData: {
        reporterId: mongoose.Types.ObjectId;
        targetType: 'post' | 'comment';
        targetId: mongoose.Types.ObjectId;
        reason: string;
        description?: string;
    }): Promise<IContentReport>;
    processReport(reportId: string, reviewerId: mongoose.Types.ObjectId, action: string, reviewNotes?: string): Promise<IContentReport>;
    private executeAction;
    private removeContent;
    getModerationStats(timeRange?: 'day' | 'week' | 'month'): Promise<{
        reports: any;
        pendingContent: {
            posts: number;
            comments: number;
        };
    }>;
}
export default ModerationService;
//# sourceMappingURL=moderationService.d.ts.map