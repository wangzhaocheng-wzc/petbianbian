import express from 'express';
import { body, param, query } from 'express-validator';
import { AlertController } from '../controllers/alertController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 验证规则
const createAlertRuleValidation = [
  body('name')
    .notEmpty()
    .withMessage('规则名称不能为空')
    .isLength({ max: 100 })
    .withMessage('规则名称不能超过100个字符'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述不能超过500个字符'),
  
  body('petId')
    .optional()
    .isUUID()
    .withMessage('宠物ID必须是UUID格式'),
  
  body('triggers.anomalyTypes')
    .isArray({ min: 1 })
    .withMessage('至少选择一种异常类型')
    .custom((value) => {
      const validTypes = ['frequency', 'health_decline', 'pattern_change', 'consistency_change'];
      return value.every((type: string) => validTypes.includes(type));
    })
    .withMessage('异常类型无效'),
  
  body('triggers.severityLevels')
    .isArray({ min: 1 })
    .withMessage('至少选择一种严重程度')
    .custom((value) => {
      const validLevels = ['low', 'medium', 'high'];
      return value.every((level: string) => validLevels.includes(level));
    })
    .withMessage('严重程度无效'),
  
  body('triggers.minimumConfidence')
    .isInt({ min: 0, max: 100 })
    .withMessage('置信度必须在0-100之间'),
  
  body('notifications.inApp')
    .isBoolean()
    .withMessage('应用内通知设置必须是布尔值'),
  
  body('notifications.email')
    .isBoolean()
    .withMessage('邮件通知设置必须是布尔值'),
  
  body('frequency.maxPerDay')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('每日最大次数必须在1-10之间'),
  
  body('frequency.maxPerWeek')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每周最大次数必须在1-50之间'),
  
  body('frequency.cooldownHours')
    .optional()
    .isInt({ min: 1, max: 72 })
    .withMessage('冷却时间必须在1-72小时之间')
];

const updateAlertRuleValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('规则名称不能为空')
    .isLength({ max: 100 })
    .withMessage('规则名称不能超过100个字符'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述不能超过500个字符'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值'),
  
  body('triggers.minimumConfidence')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('置信度必须在0-100之间')
];

const mongoIdValidation = [
  param('ruleId')
    .isUUID()
    .withMessage('规则ID必须是UUID格式')
];

const petIdValidation = [
  param('petId')
    .isUUID()
    .withMessage('宠物ID必须是UUID格式')
];

// 提醒规则管理路由
router.post(
  '/rules',
  authenticateToken,
  createAlertRuleValidation,
  AlertController.createAlertRule
);

router.get(
  '/rules',
  authenticateToken,
  [
    query('petId')
      .optional()
      .isUUID()
      .withMessage('宠物ID必须是UUID格式'),
    query('includeInactive')
      .optional()
      .isBoolean()
      .withMessage('includeInactive必须是布尔值')
  ],
  AlertController.getUserAlertRules
);

router.put(
  '/rules/:ruleId',
  authenticateToken,
  [...mongoIdValidation, ...updateAlertRuleValidation],
  AlertController.updateAlertRule
);

router.delete(
  '/rules/:ruleId',
  authenticateToken,
  mongoIdValidation,
  AlertController.deleteAlertRule
);

// 异常检测路由
router.get(
  '/anomalies/:petId',
  authenticateToken,
  [
    ...petIdValidation,
    query('analysisWindow')
      .optional()
      .isInt({ min: 1, max: 90 })
      .withMessage('分析窗口必须在1-90天之间'),
    query('baselineWindow')
      .optional()
      .isInt({ min: 7, max: 365 })
      .withMessage('基线窗口必须在7-365天之间')
  ],
  AlertController.getAnomalyDetection
);

router.get(
  '/health-pattern/:petId',
  authenticateToken,
  [
    ...petIdValidation,
    query('days')
      .optional()
      .isInt({ min: 7, max: 365 })
      .withMessage('天数必须在7-365之间')
  ],
  AlertController.getHealthPattern
);

// 提醒触发路由
router.post(
  '/trigger/:petId',
  authenticateToken,
  petIdValidation,
  AlertController.triggerAlertCheck
);

// 统计和管理路由
router.get(
  '/statistics',
  authenticateToken,
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('天数必须在1-365之间')
  ],
  AlertController.getAlertStatistics
);

router.post(
  '/default-rules',
  authenticateToken,
  AlertController.createDefaultRules
);

router.get(
  '/templates',
  authenticateToken,
  AlertController.getAlertRuleTemplates
);

// 管理员路由
router.post(
  '/batch-check',
  authenticateToken,
  // TODO: 添加管理员权限验证中间件
  AlertController.batchCheckAlerts
);

export default router;