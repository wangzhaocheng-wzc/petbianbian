import { Notification, INotification } from '../models/Notification';
import { User } from '../models/User';
import { Pet } from '../models/Pet';
import { Logger } from '../utils/logger';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

// 通知创建请求
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

// 邮件配置接口
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

// 推送通知配置接口
interface PushConfig {
  serverKey: string;
  senderId: string;
}

export class NotificationService {
  private static emailTransporter: nodemailer.Transporter | null = null;
  private static pushConfig: PushConfig | null = null;

  /**
   * 初始化邮件服务
   */
  static initializeEmailService(config: EmailConfig): void {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth
      });

      Logger.info('邮件服务初始化成功');
    } catch (error) {
      Logger.error('邮件服务初始化失败:', error);
    }
  }

  /**
   * 初始化推送服务
   */
  static initializePushService(config: PushConfig): void {
    try {
      this.pushConfig = config;
      Logger.info('推送服务初始化成功');
    } catch (error) {
      Logger.error('推送服务初始化失败:', error);
    }
  }

  /**
   * 创建通知
   */
  static async createNotification(data: CreateNotificationRequest): Promise<INotification> {
    try {
      Logger.info(`创建通知: 用户ID=${data.userId}, 类型=${data.type}, 标题=${data.title}`);

      const notification = new Notification({
        userId: new mongoose.Types.ObjectId(data.userId),
        petId: data.petId ? new mongoose.Types.ObjectId(data.petId) : undefined,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        data: data.data ? {
          ...data.data,
          alertRuleId: data.data.alertRuleId ? new mongoose.Types.ObjectId(data.data.alertRuleId) : undefined
        } : undefined,
        priority: data.priority,
        scheduledFor: data.scheduledFor,
        expiresAt: data.expiresAt,
        channels: {
          inApp: {
            sent: false
          },
          email: {
            sent: false,
            deliveryStatus: 'pending'
          },
          push: {
            sent: false,
            deliveryStatus: 'pending'
          }
        },
        stats: {
          viewCount: 0,
          clickCount: 0
        }
      });

      const savedNotification = await notification.save();

      // 如果是立即发送的通知，尝试发送
      if (!data.scheduledFor || data.scheduledFor <= new Date()) {
        await this.sendNotification(savedNotification._id.toString(), data.channels);
      }

      Logger.info(`通知创建成功: ID=${savedNotification._id}`);
      return savedNotification;

    } catch (error) {
      Logger.error('创建通知失败:', error);
      throw new Error('创建通知失败');
    }
  }

  /**
   * 发送通知
   */
  static async sendNotification(
    notificationId: string,
    channels?: { inApp?: boolean; email?: boolean; push?: boolean }
  ): Promise<{
    inApp: boolean;
    email: boolean;
    push: boolean;
  }> {
    try {
      const notification = await Notification.findById(notificationId)
        .populate('user', 'username email preferences')
        .populate('pet', 'name type breed');

      if (!notification) {
        throw new Error('通知不存在');
      }

      const result = {
        inApp: false,
        email: false,
        push: false
      };

      const user = notification.user as any;
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户通知偏好
      const userPreferences = user.preferences || {};
      const shouldSendEmail = userPreferences.emailUpdates !== false;
      const shouldSendInApp = userPreferences.notifications !== false;

      // 发送应用内通知
      if ((channels?.inApp !== false) && shouldSendInApp && !notification.channels.inApp.sent) {
        await this.sendInAppNotification(notification);
        result.inApp = true;
      }

      // 发送邮件通知
      if ((channels?.email !== false) && shouldSendEmail && !notification.channels.email.sent) {
        await this.sendEmailNotification(notification, user);
        result.email = true;
      }

      // 发送推送通知
      if ((channels?.push !== false) && !notification.channels.push.sent) {
        await this.sendPushNotification(notification, user);
        result.push = true;
      }

      Logger.info(`通知发送完成: ID=${notificationId}, 应用内=${result.inApp}, 邮件=${result.email}, 推送=${result.push}`);
      return result;

    } catch (error) {
      Logger.error('发送通知失败:', error);
      throw new Error('发送通知失败');
    }
  }

  /**
   * 发送应用内通知
   */
  private static async sendInAppNotification(notification: INotification): Promise<void> {
    try {
      // 应用内通知只需要标记为已发送
      // 实际的推送可以通过WebSocket或Server-Sent Events实现
      await notification.markInAppSent();
      
      Logger.info(`应用内通知发送成功: 通知ID=${notification._id}`);
      
      // TODO: 如果有WebSocket连接，可以在这里推送实时通知
      // this.pushToWebSocket(notification.userId, notification);
      
    } catch (error) {
      Logger.error('发送应用内通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送邮件通知
   */
  private static async sendEmailNotification(notification: INotification, user: any): Promise<void> {
    try {
      if (!this.emailTransporter) {
        Logger.warn('邮件服务未初始化，跳过邮件发送');
        return;
      }

      const emailContent = this.generateEmailContent(notification);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@pethealth.com',
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      await this.emailTransporter.sendMail(mailOptions);
      await notification.markEmailSent(user.email);
      
      Logger.info(`邮件通知发送成功: 通知ID=${notification._id}, 邮箱=${user.email}`);
      
    } catch (error) {
      Logger.error('发送邮件通知失败:', error);
      
      // 更新邮件发送状态为失败
      notification.channels.email.deliveryStatus = 'failed';
      await notification.save();
      
      throw error;
    }
  }

  /**
   * 发送推送通知
   */
  private static async sendPushNotification(notification: INotification, user: any): Promise<void> {
    try {
      if (!this.pushConfig) {
        Logger.warn('推送服务未初始化，跳过推送发送');
        return;
      }

      // TODO: 实现推送通知逻辑
      // 这里需要集成Firebase Cloud Messaging或其他推送服务
      
      Logger.info(`推送通知发送成功: 通知ID=${notification._id}`);
      await notification.markPushSent([]);
      
    } catch (error) {
      Logger.error('发送推送通知失败:', error);
      
      // 更新推送发送状态为失败
      notification.channels.push.deliveryStatus = 'failed';
      await notification.save();
      
      throw error;
    }
  }

  /**
   * 生成邮件内容
   */
  private static generateEmailContent(notification: INotification): {
    subject: string;
    html: string;
    text: string;
  } {
    const pet = notification.pet as any;
    const petName = pet?.name || notification.data?.petName || '您的宠物';
    
    let subject = notification.title;
    let html = '';
    let text = notification.message;

    // 根据通知类型生成不同的邮件模板
    switch (notification.type) {
      case 'alert':
        subject = `🚨 ${petName}健康警报 - ${notification.title}`;
        html = this.generateAlertEmailHTML(notification, petName);
        break;
        
      case 'reminder':
        subject = `⏰ 提醒 - ${notification.title}`;
        html = this.generateReminderEmailHTML(notification, petName);
        break;
        
      case 'system':
        subject = `📢 系统通知 - ${notification.title}`;
        html = this.generateSystemEmailHTML(notification);
        break;
        
      default:
        html = this.generateDefaultEmailHTML(notification);
        break;
    }

    return { subject, html, text };
  }

  /**
   * 生成警报邮件HTML
   */
  private static generateAlertEmailHTML(notification: INotification, petName: string): string {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#dc3545'
    };
    
    const severity = notification.data?.severity || 'medium';
    const color = severityColors[severity];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .severity { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; background: ${color}; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 健康警报</h1>
            <h2>${petName}</h2>
          </div>
          <div class="content">
            <div class="alert-info">
              <h3>${notification.title}</h3>
              <p><strong>严重程度:</strong> <span class="severity">${severity.toUpperCase()}</span></p>
              <p><strong>异常类型:</strong> ${this.getAnomalyTypeDescription(notification.data?.anomalyType)}</p>
              <p><strong>详细信息:</strong></p>
              <p>${notification.message}</p>
            </div>
            ${notification.data?.actionUrl ? `<a href="${notification.data.actionUrl}" class="button">查看详情</a>` : ''}
            <p><strong>建议:</strong></p>
            <ul>
              <li>密切观察宠物状态</li>
              <li>记录相关症状</li>
              ${severity === 'high' ? '<li><strong>建议立即咨询兽医</strong></li>' : ''}
            </ul>
          </div>
          <div class="footer">
            <p>此邮件由宠物健康监测平台自动发送</p>
            <p>如不希望接收此类邮件，请在设置中关闭邮件通知</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成提醒邮件HTML
   */
  private static generateReminderEmailHTML(notification: INotification, petName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ 温馨提醒</h1>
            <h2>${petName}</h2>
          </div>
          <div class="content">
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
            ${notification.data?.actionUrl ? `<a href="${notification.data.actionUrl}" class="button">立即查看</a>` : ''}
          </div>
          <div class="footer">
            <p>此邮件由宠物健康监测平台自动发送</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成系统邮件HTML
   */
  private static generateSystemEmailHTML(notification: INotification): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 系统通知</h1>
          </div>
          <div class="content">
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
          </div>
          <div class="footer">
            <p>此邮件由宠物健康监测平台发送</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 生成默认邮件HTML
   */
  private static generateDefaultEmailHTML(notification: INotification): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
          </div>
          <div class="footer">
            <p>此邮件由宠物健康监测平台发送</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 获取异常类型描述
   */
  private static getAnomalyTypeDescription(anomalyType?: string): string {
    const descriptions = {
      frequency: '排便频率异常',
      health_decline: '健康状态恶化',
      pattern_change: '排便模式变化',
      consistency_change: '排便一致性变化'
    };
    
    return descriptions[anomalyType as keyof typeof descriptions] || '未知异常';
  }

  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(
    userId: string,
    options: {
      status?: 'unread' | 'read' | 'archived';
      type?: 'alert' | 'system' | 'community' | 'reminder';
      category?: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    notifications: INotification[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
    unreadCount: number;
  }> {
    try {
      const result = await (Notification as any).getUserNotifications(userId, options);
      const unreadCount = await (Notification as any).getUnreadCount(userId);
      
      return {
        ...result,
        unreadCount
      };
      
    } catch (error) {
      Logger.error('获取用户通知列表失败:', error);
      throw new Error('获取用户通知列表失败');
    }
  }

  /**
   * 标记通知为已读
   */
  static async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (!notification) {
        return false;
      }
      
      await notification.markAsRead();
      Logger.info(`通知标记为已读: ID=${notificationId}`);
      return true;
      
    } catch (error) {
      Logger.error('标记通知为已读失败:', error);
      throw new Error('标记通知为已读失败');
    }
  }

  /**
   * 批量标记通知为已读
   */
  static async markNotificationsAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        {
          _id: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) },
          userId: new mongoose.Types.ObjectId(userId)
        },
        {
          $set: {
            status: 'read',
            'channels.inApp.readAt': new Date(),
            $inc: { 'stats.viewCount': 1 },
            'stats.lastViewedAt': new Date()
          }
        }
      );
      
      Logger.info(`批量标记通知为已读: 更新${result.modifiedCount}条通知`);
      return result.modifiedCount || 0;
      
    } catch (error) {
      Logger.error('批量标记通知为已读失败:', error);
      throw new Error('批量标记通知为已读失败');
    }
  }

  /**
   * 删除通知
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (!result) {
        return false;
      }
      
      Logger.info(`通知删除成功: ID=${notificationId}`);
      return true;
      
    } catch (error) {
      Logger.error('删除通知失败:', error);
      throw new Error('删除通知失败');
    }
  }

  /**
   * 处理待发送的通知（定时任务用）
   */
  static async processPendingNotifications(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    try {
      Logger.info('开始处理待发送通知');
      
      const pendingNotifications = await (Notification as any).getPendingNotifications(50);
      
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const notification of pendingNotifications) {
        try {
          await this.sendNotification(notification._id.toString());
          successful++;
        } catch (error) {
          failed++;
          const errorMsg = `通知${notification._id}发送失败: ${error}`;
          Logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      Logger.info(`待发送通知处理完成: 处理${pendingNotifications.length}条, 成功${successful}条, 失败${failed}条`);
      
      return {
        processed: pendingNotifications.length,
        successful,
        failed,
        errors
      };
      
    } catch (error) {
      Logger.error('处理待发送通知失败:', error);
      throw new Error('处理待发送通知失败');
    }
  }

  /**
   * 清理过期通知
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const deletedCount = await (Notification as any).cleanupExpiredNotifications();
      Logger.info(`清理过期通知完成: 删除${deletedCount}条通知`);
      return deletedCount;
      
    } catch (error) {
      Logger.error('清理过期通知失败:', error);
      throw new Error('清理过期通知失败');
    }
  }

  /**
   * 获取通知统计
   */
  static async getNotificationStatistics(userId: string, days: number = 30): Promise<{
    totalNotifications: number;
    unreadCount: number;
    readCount: number;
    archivedCount: number;
    byType: { [key: string]: number };
    byCategory: { [key: string]: number };
    byPriority: { [key: string]: number };
    recentActivity: Array<{
      date: string;
      count: number;
    }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const pipeline = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $facet: {
            statusStats: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            typeStats: [
              { $group: { _id: '$type', count: { $sum: 1 } } }
            ],
            categoryStats: [
              { $group: { _id: '$category', count: { $sum: 1 } } }
            ],
            priorityStats: [
              { $group: { _id: '$priority', count: { $sum: 1 } } }
            ],
            dailyStats: [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ]
          }
        }
      ];
      
      const [result] = await Notification.aggregate(pipeline);
      
      // 处理统计结果
      const statusStats = result.statusStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
      
      const typeStats = result.typeStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
      
      const categoryStats = result.categoryStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
      
      const priorityStats = result.priorityStats.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
      
      const recentActivity = result.dailyStats.map((item: any) => ({
        date: item._id,
        count: item.count
      }));
      
      return {
        totalNotifications: Object.values(statusStats).reduce((sum: number, count: any) => sum + count, 0),
        unreadCount: statusStats.unread || 0,
        readCount: statusStats.read || 0,
        archivedCount: statusStats.archived || 0,
        byType: typeStats,
        byCategory: categoryStats,
        byPriority: priorityStats,
        recentActivity
      };
      
    } catch (error) {
      Logger.error('获取通知统计失败:', error);
      throw new Error('获取通知统计失败');
    }
  }
}