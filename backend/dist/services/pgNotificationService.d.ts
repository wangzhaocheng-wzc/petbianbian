export interface PgListOptions {
    status?: 'unread' | 'read' | 'archived';
    type?: 'alert' | 'system' | 'community' | 'reminder';
    category?: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    page?: number;
    limit?: number;
}
export interface CreateNotificationRequestPg {
    userId: string;
    petId?: string;
    type: 'alert' | 'system' | 'community' | 'reminder';
    category: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
    title: string;
    message: string;
    data?: any;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: {
        inApp?: boolean;
        email?: boolean;
        push?: boolean;
    };
    scheduledFor?: Date;
    expiresAt?: Date;
}
export declare class PGNotificationService {
    private static poolPromise;
    static createNotification(payload: CreateNotificationRequestPg): Promise<any>;
    static getUserNotifications(userId: string, options: PgListOptions): Promise<any>;
    static getUnreadCount(userId: string): Promise<number>;
    static markNotificationAsRead(notificationId: string, userId: string): Promise<boolean>;
    static markNotificationsAsRead(notificationIds: string[], userId: string): Promise<number>;
    static deleteNotification(notificationId: string, userId: string): Promise<boolean>;
    static getNotificationStatistics(userId: string, days?: number): Promise<any>;
}
//# sourceMappingURL=pgNotificationService.d.ts.map