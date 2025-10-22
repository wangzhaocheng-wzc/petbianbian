import { Request, Response } from 'express';
import { NotificationService, CreateNotificationRequest } from '../services/notificationService';
import { Logger } from '../utils/logger';
import { validationResult } from 'express-validator';

// 扩展Request接口以包含用户信息
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username?: string;
  };
}

export class NotificationController {
  // 动态选择底层服务，避免在未配置 Postgres 时模块加载即崩溃
  private static async getBaseService() {
    if (process.env.DB_PRIMARY === 'postgres') {
      const { PGNotificationService } = await import('../services/pgNotificationService');
      return PGNotificationService as any;
    }
    return NotificationService as any;
  }
  /**
   * 创建通知
   */
  static async createNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const notificationData: CreateNotificationRequest = {
        userId,
        ...req.body
      };

      const Service = await NotificationController.getBaseService();
      const notification = await Service.createNotification(notificationData as any);

      res.status(201).json({
        success: true,
        message: '通知创建成功',
        data: notification
      });

    } catch (error) {
      Logger.error('创建通知失败:', error);
      res.status(500).json({
        success: false,
        message: '创建通知失败'
      });
    }
  }

  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const {
        status,
        type,
        category,
        priority,
        page = '1',
        limit = '20'
      } = req.query;

      const options = {
        status: status as 'unread' | 'read' | 'archived',
        type: type as 'alert' | 'system' | 'community' | 'reminder',
        category: category as 'health' | 'frequency' | 'pattern' | 'emergency' | 'general',
        priority: priority as 'low' | 'normal' | 'high' | 'urgent',
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const Service = await NotificationController.getBaseService();
      const result = await Service.getUserNotifications(userId, options);

      res.json({
        success: true,
        message: '获取通知列表成功',
        data: result
      });

    } catch (error) {
      Logger.error('获取通知列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取通知列表失败'
      });
    }
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      let unreadCount = 0;
      const Base: any = await NotificationController.getBaseService();
      if (typeof Base.getUnreadCount === 'function') {
        unreadCount = await Base.getUnreadCount(userId);
      } else {
        const result = await NotificationService.getUserNotifications(userId, {} as any);
        unreadCount = (result as any).unreadCount ?? 0;
      }

      res.json({
        success: true,
        message: '获取未读通知数量成功',
        data: {
          unreadCount
        }
      });

    } catch (error) {
      Logger.error('获取未读通知数量失败:', error);
      res.status(500).json({
        success: false,
        message: '获取未读通知数量失败'
      });
    }
  }

  /**
   * 标记通知为已读
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const { notificationId } = req.params;

      const Service = await NotificationController.getBaseService();
      const success = await Service.markNotificationAsRead(notificationId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: '通知不存在'
        });
        return;
      }

      res.json({
        success: true,
        message: '通知已标记为已读'
      });

    } catch (error) {
      Logger.error('标记通知为已读失败:', error);
      res.status(500).json({
        success: false,
        message: '标记通知为已读失败'
      });
    }
  }

  /**
   * 批量标记通知为已读
   */
  static async markMultipleAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const { notificationIds } = req.body;

      const Service = await NotificationController.getBaseService();
      const updatedCount = await Service.markNotificationsAsRead(notificationIds, userId);

      res.json({
        success: true,
        message: '通知批量标记为已读成功',
        data: {
          updatedCount
        }
      });

    } catch (error) {
      Logger.error('批量标记通知为已读失败:', error);
      res.status(500).json({
        success: false,
        message: '批量标记通知为已读失败'
      });
    }
  }

  /**
   * 删除通知
   */
  static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const { notificationId } = req.params;

      const Service = await NotificationController.getBaseService();
      const success = await Service.deleteNotification(notificationId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: '通知不存在'
        });
        return;
      }

      res.json({
        success: true,
        message: '通知删除成功'
      });

    } catch (error) {
      Logger.error('删除通知失败:', error);
      res.status(500).json({
        success: false,
        message: '删除通知失败'
      });
    }
  }

  /**
   * 获取通知统计
   */
  static async getNotificationStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const { days = '30' } = req.query;

      const Service = await NotificationController.getBaseService();
      const statistics = await Service.getNotificationStatistics(
        userId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        message: '获取通知统计成功',
        data: statistics
      });

    } catch (error) {
      Logger.error('获取通知统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取通知统计失败'
      });
    }
  }

  /**
   * 发送测试通知
   */
  static async sendTestNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      const testNotification: CreateNotificationRequest = {
        userId,
        type: 'system',
        category: 'general',
        title: '测试通知',
        message: '这是一条测试通知，用于验证通知系统是否正常工作。',
        priority: 'normal',
        channels: {
          inApp: true,
          email: req.body.includeEmail === true,
          push: req.body.includePush === true
        }
      };

      const Service = await NotificationController.getBaseService();
      const notification = await Service.createNotification(testNotification as any);

      res.json({
        success: true,
        message: '测试通知发送成功',
        data: notification
      });

    } catch (error) {
      Logger.error('发送测试通知失败:', error);
      res.status(500).json({
        success: false,
        message: '发送测试通知失败'
      });
    }
  }

  /**
   * 处理待发送通知（管理员功能）
   */
  static async processPendingNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 这里应该添加管理员权限检查
      // if (!req.user?.isAdmin) { ... }
      const Base: any = await NotificationController.getBaseService();
      if (typeof Base.processPendingNotifications !== 'function') {
        res.status(501).json({ success: false, message: 'Postgres 模式下暂未实现该功能' });
        return;
      }
      const result = await Base.processPendingNotifications();

      res.json({
        success: true,
        message: '待发送通知处理完成',
        data: result
      });

    } catch (error) {
      Logger.error('处理待发送通知失败:', error);
      res.status(500).json({
        success: false,
        message: '处理待发送通知失败'
      });
    }
  }

  /**
   * 清理过期通知（管理员功能）
   */
  static async cleanupExpiredNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 这里应该添加管理员权限检查
      // if (!req.user?.isAdmin) { ... }
      const Base: any = await NotificationController.getBaseService();
      if (typeof Base.cleanupExpiredNotifications !== 'function') {
        res.status(501).json({ success: false, message: 'Postgres 模式下暂未实现该功能' });
        return;
      }
      const deletedCount = await Base.cleanupExpiredNotifications();

      res.json({
        success: true,
        message: '过期通知清理完成',
        data: {
          deletedCount
        }
      });

    } catch (error) {
      Logger.error('清理过期通知失败:', error);
      res.status(500).json({
        success: false,
        message: '清理过期通知失败'
      });
    }
  }

  /**
   * 获取通知设置
   */
  static async getNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      // 这里应该从用户设置中获取通知偏好
      // 暂时返回默认设置
      const settings = {
        inApp: {
          enabled: true,
          categories: {
            health: true,
            frequency: true,
            pattern: true,
            emergency: true,
            general: true
          }
        },
        email: {
          enabled: true,
          categories: {
            health: true,
            frequency: false,
            pattern: true,
            emergency: true,
            general: false
          },
          frequency: 'immediate' // immediate, daily, weekly
        },
        push: {
          enabled: false,
          categories: {
            health: true,
            frequency: false,
            pattern: false,
            emergency: true,
            general: false
          }
        }
      };

      res.json({
        success: true,
        message: '获取通知设置成功',
        data: settings
      });

    } catch (error) {
      Logger.error('获取通知设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取通知设置失败'
      });
    }
  }

  /**
   * 更新通知设置
   */
  static async updateNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        });
        return;
      }

      // 这里应该更新用户的通知设置
      // 暂时返回成功响应
      const updatedSettings = req.body;

      res.json({
        success: true,
        message: '通知设置更新成功',
        data: updatedSettings
      });

    } catch (error) {
      Logger.error('更新通知设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新通知设置失败'
      });
    }
  }
}