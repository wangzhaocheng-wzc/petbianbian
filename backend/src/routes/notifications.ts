import express from 'express';
import { body, param, query } from 'express-validator';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 验证规则
const createNotificationValidation = [
  body('type')
    .isIn(['alert', 'system', 'community', 'reminder'])
    .withMessage('通知类型无效'),
  
  body('category')
    .isIn(['health', 'frequency', 'pattern', 'emergency', 'general'])
    .withMessage('通知分类无效'),
  
  body('title')
    .notEmpty()
    .withMessage('标题不能为空')
    .isLength({ max: 200 })
    .withMessage('标题不能超过200个字符'),
  
  body('message')
    .notEmpty()
    .withMessage('消息内容不能为空')
    .isLength({ max: 1000 })
    .withMessage('消息内容不能超过1000个字符'),
  
  body('petId')
    .optional()
    .isMongoId()
    .withMessage('宠物ID格式无效'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('优先级无效'),
  
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('计划发送时间格式无效'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('过期时间格式无效')
];

const markMultipleAsReadValidation = [
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('通知ID列表不能为空')
    .custom((value) => {
      return value.every((id: string) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
    })
    .withMessage('通知ID格式无效')
];

const mongoIdValidation = [
  param('notificationId')
    .isMongoId()
    .withMessage('通知ID格式无效')
];

const updateSettingsValidation = [
  body('inApp.enabled')
    .optional()
    .isBoolean()
    .withMessage('应用内通知开关必须是布尔值'),
  
  body('email.enabled')
    .optional()
    .isBoolean()
    .withMessage('邮件通知开关必须是布尔值'),
  
  body('push.enabled')
    .optional()
    .isBoolean()
    .withMessage('推送通知开关必须是布尔值'),
  
  body('email.frequency')
    .optional()
    .isIn(['immediate', 'daily', 'weekly'])
    .withMessage('邮件通知频率无效')
];

// 通知管理路由
router.post(
  '/',
  authenticateToken,
  createNotificationValidation,
  NotificationController.createNotification
);

router.get(
  '/',
  authenticateToken,
  [
    query('status')
      .optional()
      .isIn(['unread', 'read', 'archived'])
      .withMessage('状态参数无效'),
    query('type')
      .optional()
      .isIn(['alert', 'system', 'community', 'reminder'])
      .withMessage('类型参数无效'),
    query('category')
      .optional()
      .isIn(['health', 'frequency', 'pattern', 'emergency', 'general'])
      .withMessage('分类参数无效'),
    query('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('优先级参数无效'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
  ],
  NotificationController.getUserNotifications
);

router.get(
  '/unread-count',
  authenticateToken,
  NotificationController.getUnreadCount
);

router.put(
  '/:notificationId/read',
  authenticateToken,
  mongoIdValidation,
  NotificationController.markAsRead
);

router.put(
  '/mark-read',
  authenticateToken,
  markMultipleAsReadValidation,
  NotificationController.markMultipleAsRead
);

router.delete(
  '/:notificationId',
  authenticateToken,
  mongoIdValidation,
  NotificationController.deleteNotification
);

// 统计和设置路由
router.get(
  '/statistics',
  authenticateToken,
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('天数必须在1-365之间')
  ],
  NotificationController.getNotificationStatistics
);

router.get(
  '/settings',
  authenticateToken,
  NotificationController.getNotificationSettings
);

router.put(
  '/settings',
  authenticateToken,
  updateSettingsValidation,
  NotificationController.updateNotificationSettings
);

// 测试和管理路由
router.post(
  '/test',
  authenticateToken,
  [
    body('includeEmail')
      .optional()
      .isBoolean()
      .withMessage('includeEmail必须是布尔值'),
    body('includePush')
      .optional()
      .isBoolean()
      .withMessage('includePush必须是布尔值')
  ],
  NotificationController.sendTestNotification
);

// 管理员路由
router.post(
  '/process-pending',
  authenticateToken,
  // TODO: 添加管理员权限验证中间件
  NotificationController.processPendingNotifications
);

router.post(
  '/cleanup-expired',
  authenticateToken,
  // TODO: 添加管理员权限验证中间件
  NotificationController.cleanupExpiredNotifications
);

export default router;