import { INotification } from '../models/Notification';
export interface CreateNotificationRequest {
    userId: string;
    petId?: string;
    type: 'alert' | 'system' | 'community' | 'reminder';
    category: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
    title: string;
    message: string;
    data?: {
        alertRuleId?: string;
        anomalyType?: string;
        severity?: 'low' | 'medium' | 'high';
        petName?: string;
        actionUrl?: string;
        metadata?: any;
    };
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: {
        inApp?: boolean;
        email?: boolean;
        push?: boolean;
    };
    scheduledFor?: Date;
    expiresAt?: Date;
}
interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}
interface PushConfig {
    serverKey: string;
    senderId: string;
}
export declare class NotificationService {
    private static emailTransporter;
    private static pushConfig;
    /**
     * 初始化邮件服务
     */
    static initializeEmailService(config: EmailConfig): void;
    /**
     * 初始化推送服务
     */
    static initializePushService(config: PushConfig): void;
    /**
     * 创建通知
     */
    static createNotification(data: CreateNotificationRequest): Promise<INotification>;
    /**
     * 发送通知
     */
    static sendNotification(notificationId: string, channels?: {
        inApp?: boolean;
        email?: boolean;
        push?: boolean;
    }): Promise<{
        inApp: boolean;
        email: boolean;
        push: boolean;
    }>;
    /**
     * 发送应用内通知
     */
    private static sendInAppNotification;
    /**
     * 发送邮件通知
     */
    private static sendEmailNotification;
    /**
     * 发送推送通知
     */
    private static sendPushNotification;
    /**
     * 生成邮件内容
     */
    private static generateEmailContent;
    /**
     * 生成警报邮件HTML
     */
    private static generateAlertEmailHTML;
    /**
     * 生成提醒邮件HTML
     */
    private static generateReminderEmailHTML;
    /**
     * 生成系统邮件HTML
     */
    private static generateSystemEmailHTML;
    /**
     * 生成默认邮件HTML
     */
    private static generateDefaultEmailHTML;
    /**
     * 获取异常类型描述
     */
    private static getAnomalyTypeDescription;
    /**
     * 获取用户通知列表
     */
    static getUserNotifications(userId: string, options?: {
        status?: 'unread' | 'read' | 'archived';
        type?: 'alert' | 'system' | 'community' | 'reminder';
        category?: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        page?: number;
        limit?: number;
    }): Promise<{
        notifications: INotification[];
        total: number;
        page: number;
        totalPages: number;
        hasMore: boolean;
        unreadCount: number;
    }>;
    /**
     * 标记通知为已读
     */
    static markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
    /**
     * 批量标记通知为已读
     */
    static markNotificationsAsRead(notificationIds: string[], userId: string): Promise<number>;
    /**
     * 删除通知
     */
    static deleteNotification(notificationId: string, userId: string): Promise<boolean>;
    /**
     * 处理待发送的通知（定时任务用）
     */
    static processPendingNotifications(): Promise<{
        processed: number;
        successful: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * 清理过期通知
     */
    static cleanupExpiredNotifications(): Promise<number>;
    /**
     * 获取通知统计
     */
    static getNotificationStatistics(userId: string, days?: number): Promise<{
        totalNotifications: number;
        unreadCount: number;
        readCount: number;
        archivedCount: number;
        byType: {
            [key: string]: number;
        };
        byCategory: {
            [key: string]: number;
        };
        byPriority: {
            [key: string]: number;
        };
        recentActivity: Array<{
            date: string;
            count: number;
        }>;
    }>;
}
export {};
//# sourceMappingURL=notificationService.d.ts.map