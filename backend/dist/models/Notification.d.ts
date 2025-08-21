import mongoose, { Document } from 'mongoose';
export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    petId?: mongoose.Types.ObjectId;
    type: 'alert' | 'system' | 'community' | 'reminder';
    category: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
    title: string;
    message: string;
    data?: {
        alertRuleId?: mongoose.Types.ObjectId;
        anomalyType?: string;
        severity?: 'low' | 'medium' | 'high';
        petName?: string;
        actionUrl?: string;
        metadata?: any;
    };
    status: 'unread' | 'read' | 'archived';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    channels: {
        inApp: {
            sent: boolean;
            sentAt?: Date;
            readAt?: Date;
        };
        email: {
            sent: boolean;
            sentAt?: Date;
            emailAddress?: string;
            deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
        };
        push: {
            sent: boolean;
            sentAt?: Date;
            deviceTokens?: string[];
            deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
        };
    };
    scheduledFor?: Date;
    expiresAt?: Date;
    stats: {
        viewCount: number;
        clickCount: number;
        lastViewedAt?: Date;
        lastClickedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Notification: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification> & INotification & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=Notification.d.ts.map