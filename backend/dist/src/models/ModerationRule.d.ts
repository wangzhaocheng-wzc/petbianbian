import mongoose, { Document } from 'mongoose';
export interface IModerationRule extends Document {
    name: string;
    description: string;
    type: 'keyword' | 'pattern' | 'length' | 'frequency' | 'custom';
    config: {
        keywords?: string[];
        patterns?: string[];
        minLength?: number;
        maxLength?: number;
        maxFrequency?: number;
        timeWindow?: number;
        customScript?: string;
    };
    action: 'flag' | 'auto_reject' | 'require_approval' | 'warning';
    severity: 'low' | 'medium' | 'high' | 'critical';
    isActive: boolean;
    appliesTo: ('post' | 'comment')[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IModerationRule, {}, {}, {}, mongoose.Document<unknown, {}, IModerationRule> & IModerationRule & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=ModerationRule.d.ts.map