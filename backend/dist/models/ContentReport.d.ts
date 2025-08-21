import mongoose, { Document } from 'mongoose';
export interface IContentReport extends Document {
    reporterId: mongoose.Types.ObjectId;
    targetType: 'post' | 'comment';
    targetId: mongoose.Types.ObjectId;
    reason: 'spam' | 'inappropriate' | 'harassment' | 'violence' | 'hate_speech' | 'misinformation' | 'other';
    description?: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    reviewerId?: mongoose.Types.ObjectId;
    reviewNotes?: string;
    action?: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IContentReport, {}, {}, {}, mongoose.Document<unknown, {}, IContentReport> & IContentReport & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=ContentReport.d.ts.map