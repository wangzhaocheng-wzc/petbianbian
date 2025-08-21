"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 验证规则
const createNotificationValidation = [
    (0, express_validator_1.body)('type')
        .isIn(['alert', 'system', 'community', 'reminder'])
        .withMessage('通知类型无效'),
    (0, express_validator_1.body)('category')
        .isIn(['health', 'frequency', 'pattern', 'emergency', 'general'])
        .withMessage('通知分类无效'),
    (0, express_validator_1.body)('title')
        .notEmpty()
        .withMessage('标题不能为空')
        .isLength({ max: 200 })
        .withMessage('标题不能超过200个字符'),
    (0, express_validator_1.body)('message')
        .notEmpty()
        .withMessage('消息内容不能为空')
        .isLength({ max: 1000 })
        .withMessage('消息内容不能超过1000个字符'),
    (0, express_validator_1.body)('petId')
        .optional()
        .isMongoId()
        .withMessage('宠物ID格式无效'),
    (0, express_validator_1.body)('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('优先级无效'),
    (0, express_validator_1.body)('scheduledFor')
        .optional()
        .isISO8601()
        .withMessage('计划发送时间格式无效'),
    (0, express_validator_1.body)('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('过期时间格式无效')
];
const markMultipleAsReadValidation = [
    (0, express_validator_1.body)('notificationIds')
        .isArray({ min: 1 })
        .withMessage('通知ID列表不能为空')
        .custom((value) => {
        return value.every((id) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/));
    })
        .withMessage('通知ID格式无效')
];
const mongoIdValidation = [
    (0, express_validator_1.param)('notificationId')
        .isMongoId()
        .withMessage('通知ID格式无效')
];
const updateSettingsValidation = [
    (0, express_validator_1.body)('inApp.enabled')
        .optional()
        .isBoolean()
        .withMessage('应用内通知开关必须是布尔值'),
    (0, express_validator_1.body)('email.enabled')
        .optional()
        .isBoolean()
        .withMessage('邮件通知开关必须是布尔值'),
    (0, express_validator_1.body)('push.enabled')
        .optional()
        .isBoolean()
        .withMessage('推送通知开关必须是布尔值'),
    (0, express_validator_1.body)('email.frequency')
        .optional()
        .isIn(['immediate', 'daily', 'weekly'])
        .withMessage('邮件通知频率无效')
];
// 通知管理路由
router.post('/', auth_1.authenticateToken, createNotificationValidation, notificationController_1.NotificationController.createNotification);
router.get('/', auth_1.authenticateToken, [
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['unread', 'read', 'archived'])
        .withMessage('状态参数无效'),
    (0, express_validator_1.query)('type')
        .optional()
        .isIn(['alert', 'system', 'community', 'reminder'])
        .withMessage('类型参数无效'),
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(['health', 'frequency', 'pattern', 'emergency', 'general'])
        .withMessage('分类参数无效'),
    (0, express_validator_1.query)('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('优先级参数无效'),
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是正整数'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须在1-100之间')
], notificationController_1.NotificationController.getUserNotifications);
router.get('/unread-count', auth_1.authenticateToken, notificationController_1.NotificationController.getUnreadCount);
router.put('/:notificationId/read', auth_1.authenticateToken, mongoIdValidation, notificationController_1.NotificationController.markAsRead);
router.put('/mark-read', auth_1.authenticateToken, markMultipleAsReadValidation, notificationController_1.NotificationController.markMultipleAsRead);
router.delete('/:notificationId', auth_1.authenticateToken, mongoIdValidation, notificationController_1.NotificationController.deleteNotification);
// 统计和设置路由
router.get('/statistics', auth_1.authenticateToken, [
    (0, express_validator_1.query)('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('天数必须在1-365之间')
], notificationController_1.NotificationController.getNotificationStatistics);
router.get('/settings', auth_1.authenticateToken, notificationController_1.NotificationController.getNotificationSettings);
router.put('/settings', auth_1.authenticateToken, updateSettingsValidation, notificationController_1.NotificationController.updateNotificationSettings);
// 测试和管理路由
router.post('/test', auth_1.authenticateToken, [
    (0, express_validator_1.body)('includeEmail')
        .optional()
        .isBoolean()
        .withMessage('includeEmail必须是布尔值'),
    (0, express_validator_1.body)('includePush')
        .optional()
        .isBoolean()
        .withMessage('includePush必须是布尔值')
], notificationController_1.NotificationController.sendTestNotification);
// 管理员路由
router.post('/process-pending', auth_1.authenticateToken, 
// TODO: 添加管理员权限验证中间件
notificationController_1.NotificationController.processPendingNotifications);
router.post('/cleanup-expired', auth_1.authenticateToken, 
// TODO: 添加管理员权限验证中间件
notificationController_1.NotificationController.cleanupExpiredNotifications);
exports.default = router;
//# sourceMappingURL=notifications.js.map