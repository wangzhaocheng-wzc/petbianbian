import { Request, Response } from 'express';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        email: string;
    };
}
export declare class NotificationController {
    /**
     * 创建通知
     */
    static createNotification(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取用户通知列表
     */
    static getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取未读通知数量
     */
    static getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 标记通知为已读
     */
    static markAsRead(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 批量标记通知为已读
     */
    static markMultipleAsRead(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 删除通知
     */
    static deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取通知统计
     */
    static getNotificationStatistics(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 发送测试通知
     */
    static sendTestNotification(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 处理待发送通知（管理员功能）
     */
    static processPendingNotifications(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 清理过期通知（管理员功能）
     */
    static cleanupExpiredNotifications(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取通知设置
     */
    static getNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 更新通知设置
     */
    static updateNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void>;
}
export {};
//# sourceMappingURL=notificationController.d.ts.map