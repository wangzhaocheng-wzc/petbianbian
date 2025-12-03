import mongoose, { Document } from 'mongoose';
import { IUser } from './User';
import { IPet } from './Pet';
export interface IAlertRule extends Document {
    userId: mongoose.Types.ObjectId;
    petId?: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    isActive: boolean;
    triggers: {
        anomalyTypes: ('frequency' | 'health_decline' | 'pattern_change' | 'consistency_change')[];
        severityLevels: ('low' | 'medium' | 'high')[];
        minimumConfidence: number;
    };
    notifications: {
        inApp: boolean;
        email: boolean;
        push?: boolean;
    };
    frequency: {
        maxPerDay: number;
        maxPerWeek: number;
        cooldownHours: number;
    };
    customConditions?: {
        frequencyThreshold?: {
            minPerWeek?: number;
            maxPerWeek?: number;
        };
        healthDeclineThreshold?: {
            concerningRatio?: number;
            consecutiveConcerning?: number;
        };
        patternChangeThreshold?: {
            shapeVariationLimit?: number;
            consistencyChangeRatio?: number;
        };
    };
    stats: {
        totalTriggered: number;
        lastTriggered?: Date;
        totalNotificationsSent: number;
    };
    createdAt: Date;
    updatedAt: Date;
    user?: IUser;
    pet?: IPet;
}
export declare const AlertRule: mongoose.Model<IAlertRule, {}, {}, {}, mongoose.Document<unknown, {}, IAlertRule> & IAlertRule & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=AlertRule.d.ts.map