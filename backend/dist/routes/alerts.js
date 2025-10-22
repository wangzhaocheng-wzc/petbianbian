"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const alertController_1 = require("../controllers/alertController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 验证规则
const createAlertRuleValidation = [
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('规则名称不能为空')
        .isLength({ max: 100 })
        .withMessage('规则名称不能超过100个字符'),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('描述不能超过500个字符'),
    (0, express_validator_1.body)('petId')
        .optional()
        .isUUID()
        .withMessage('宠物ID必须是UUID格式'),
    (0, express_validator_1.body)('triggers.anomalyTypes')
        .isArray({ min: 1 })
        .withMessage('至少选择一种异常类型')
        .custom((value) => {
        const validTypes = ['frequency', 'health_decline', 'pattern_change', 'consistency_change'];
        return value.every((type) => validTypes.includes(type));
    })
        .withMessage('异常类型无效'),
    (0, express_validator_1.body)('triggers.severityLevels')
        .isArray({ min: 1 })
        .withMessage('至少选择一种严重程度')
        .custom((value) => {
        const validLevels = ['low', 'medium', 'high'];
        return value.every((level) => validLevels.includes(level));
    })
        .withMessage('严重程度无效'),
    (0, express_validator_1.body)('triggers.minimumConfidence')
        .isInt({ min: 0, max: 100 })
        .withMessage('置信度必须在0-100之间'),
    (0, express_validator_1.body)('notifications.inApp')
        .isBoolean()
        .withMessage('应用内通知设置必须是布尔值'),
    (0, express_validator_1.body)('notifications.email')
        .isBoolean()
        .withMessage('邮件通知设置必须是布尔值'),
    (0, express_validator_1.body)('frequency.maxPerDay')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('每日最大次数必须在1-10之间'),
    (0, express_validator_1.body)('frequency.maxPerWeek')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('每周最大次数必须在1-50之间'),
    (0, express_validator_1.body)('frequency.cooldownHours')
        .optional()
        .isInt({ min: 1, max: 72 })
        .withMessage('冷却时间必须在1-72小时之间')
];
const updateAlertRuleValidation = [
    (0, express_validator_1.body)('name')
        .optional()
        .notEmpty()
        .withMessage('规则名称不能为空')
        .isLength({ max: 100 })
        .withMessage('规则名称不能超过100个字符'),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('描述不能超过500个字符'),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('激活状态必须是布尔值'),
    (0, express_validator_1.body)('triggers.minimumConfidence')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('置信度必须在0-100之间')
];
const mongoIdValidation = [
    (0, express_validator_1.param)('ruleId')
        .isUUID()
        .withMessage('规则ID必须是UUID格式')
];
const petIdValidation = [
    (0, express_validator_1.param)('petId')
        .isUUID()
        .withMessage('宠物ID必须是UUID格式')
];
// 提醒规则管理路由
router.post('/rules', auth_1.authenticateToken, createAlertRuleValidation, alertController_1.AlertController.createAlertRule);
router.get('/rules', auth_1.authenticateToken, [
    (0, express_validator_1.query)('petId')
        .optional()
        .isUUID()
        .withMessage('宠物ID必须是UUID格式'),
    (0, express_validator_1.query)('includeInactive')
        .optional()
        .isBoolean()
        .withMessage('includeInactive必须是布尔值')
], alertController_1.AlertController.getUserAlertRules);
router.put('/rules/:ruleId', auth_1.authenticateToken, [...mongoIdValidation, ...updateAlertRuleValidation], alertController_1.AlertController.updateAlertRule);
router.delete('/rules/:ruleId', auth_1.authenticateToken, mongoIdValidation, alertController_1.AlertController.deleteAlertRule);
// 异常检测路由
router.get('/anomalies/:petId', auth_1.authenticateToken, [
    ...petIdValidation,
    (0, express_validator_1.query)('analysisWindow')
        .optional()
        .isInt({ min: 1, max: 90 })
        .withMessage('分析窗口必须在1-90天之间'),
    (0, express_validator_1.query)('baselineWindow')
        .optional()
        .isInt({ min: 7, max: 365 })
        .withMessage('基线窗口必须在7-365天之间')
], alertController_1.AlertController.getAnomalyDetection);
router.get('/health-pattern/:petId', auth_1.authenticateToken, [
    ...petIdValidation,
    (0, express_validator_1.query)('days')
        .optional()
        .isInt({ min: 7, max: 365 })
        .withMessage('天数必须在7-365之间')
], alertController_1.AlertController.getHealthPattern);
// 提醒触发路由
router.post('/trigger/:petId', auth_1.authenticateToken, petIdValidation, alertController_1.AlertController.triggerAlertCheck);
// 统计和管理路由
router.get('/statistics', auth_1.authenticateToken, [
    (0, express_validator_1.query)('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('天数必须在1-365之间')
], alertController_1.AlertController.getAlertStatistics);
router.post('/default-rules', auth_1.authenticateToken, alertController_1.AlertController.createDefaultRules);
router.get('/templates', auth_1.authenticateToken, alertController_1.AlertController.getAlertRuleTemplates);
// 管理员路由
router.post('/batch-check', auth_1.authenticateToken, 
// TODO: 添加管理员权限验证中间件
alertController_1.AlertController.batchCheckAlerts);
exports.default = router;
//# sourceMappingURL=alerts.js.map