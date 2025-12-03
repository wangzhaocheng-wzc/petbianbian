import mongoose, { Document } from 'mongoose';
export interface IReport extends Document {
    reporterId: mongoose.Types.ObjectId;
    targetType: 'post' | 'comment' | 'user';
    targetId: mongoose.Types.ObjectId;
    reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
    description?: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    reviewerId?: mongoose.Types.ObjectId;
    reviewNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IReport, {}, {}, {}, mongoose.Document<unknown, {}, IReport> & IReport & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Report.d.ts.map