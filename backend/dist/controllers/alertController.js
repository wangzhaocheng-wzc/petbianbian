"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertController = void 0;
const alertService_1 = require("../services/alertService");
const anomalyDetectionService_1 = require("../services/anomalyDetectionService");
const logger_1 = require("../utils/logger");
const express_validator_1 = require("express-validator");
class AlertController {
    /**
     * 创建提醒规则
     */
    static async createAlertRule(req, res) {
        try {
            // 验证输入
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: '输入验证失败',
                    errors: errors.array()
                });
                return;
            }
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const ruleData = {
                userId,
                ...req.body
            };
            const rule = await alertService_1.AlertService.createAlertRule(ruleData);
            res.status(201).json({
                success: true,
                message: '提醒规则创建成功',
                data: rule
            });
        }
        catch (error) {
            logger_1.Logger.error('创建提醒规则失败:', error);
            res.status(500).json({
                success: false,
                message: '创建提醒规则失败'
            });
        }
    }
    /**
     * 获取用户的提醒规则列表
     */
    static async getUserAlertRules(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { petId, includeInactive } = req.query;
            const rules = await alertService_1.AlertService.getUserAlertRules(userId, petId, includeInactive === 'true');
            res.json({
                success: true,
                message: '获取提醒规则成功',
                data: {
                    rules,
                    total: rules.length
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取提醒规则失败:', error);
            res.status(500).json({
                success: false,
                message: '获取提醒规则失败'
            });
        }
    }
    /**
     * 更新提醒规则
     */
    static async updateAlertRule(req, res) {
        try {
            // 验证输入
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: '输入验证失败',
                    errors: errors.array()
                });
                return;
            }
            const { ruleId } = req.params;
            const updates = req.body;
            const rule = await alertService_1.AlertService.updateAlertRule(ruleId, updates);
            if (!rule) {
                res.status(404).json({
                    success: false,
                    message: '提醒规则不存在'
                });
                return;
            }
            res.json({
                success: true,
                message: '提醒规则更新成功',
                data: rule
            });
        }
        catch (error) {
            logger_1.Logger.error('更新提醒规则失败:', error);
            res.status(500).json({
                success: false,
                message: '更新提醒规则失败'
            });
        }
    }
    /**
     * 删除提醒规则
     */
    static async deleteAlertRule(req, res) {
        try {
            const { ruleId } = req.params;
            const success = await alertService_1.AlertService.deleteAlertRule(ruleId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    message: '提醒规则不存在'
                });
                return;
            }
            res.json({
                success: true,
                message: '提醒规则删除成功'
            });
        }
        catch (error) {
            logger_1.Logger.error('删除提醒规则失败:', error);
            res.status(500).json({
                success: false,
                message: '删除提醒规则失败'
            });
        }
    }
    /**
     * 手动触发提醒检查
     */
    static async triggerAlertCheck(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { petId } = req.params;
            const triggerResults = await alertService_1.AlertService.checkAndTriggerAlerts(petId, userId);
            res.json({
                success: true,
                message: '提醒检查完成',
                data: {
                    triggeredAlerts: triggerResults,
                    totalTriggered: triggerResults.length
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('触发提醒检查失败:', error);
            res.status(500).json({
                success: false,
                message: '触发提醒检查失败'
            });
        }
    }
    /**
     * 获取异常检测结果
     */
    static async getAnomalyDetection(req, res) {
        try {
            const { petId } = req.params;
            const { analysisWindow, baselineWindow } = req.query;
            const anomalies = await anomalyDetectionService_1.AnomalyDetectionService.detectAnomalies(petId, analysisWindow ? parseInt(analysisWindow) : undefined, baselineWindow ? parseInt(baselineWindow) : undefined);
            const summary = await anomalyDetectionService_1.AnomalyDetectionService.getAnomalyDetectionSummary(petId);
            res.json({
                success: true,
                message: '异常检测完成',
                data: {
                    anomalies,
                    summary
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('异常检测失败:', error);
            res.status(500).json({
                success: false,
                message: '异常检测失败'
            });
        }
    }
    /**
     * 获取健康模式分析
     */
    static async getHealthPattern(req, res) {
        try {
            const { petId } = req.params;
            const { days } = req.query;
            const pattern = await anomalyDetectionService_1.AnomalyDetectionService.analyzeHealthPattern(petId, days ? parseInt(days) : undefined);
            res.json({
                success: true,
                message: '健康模式分析完成',
                data: pattern
            });
        }
        catch (error) {
            logger_1.Logger.error('健康模式分析失败:', error);
            res.status(500).json({
                success: false,
                message: '健康模式分析失败'
            });
        }
    }
    /**
     * 获取提醒统计
     */
    static async getAlertStatistics(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const { days } = req.query;
            const statistics = await alertService_1.AlertService.getAlertStatistics(userId, days ? parseInt(days) : undefined);
            res.json({
                success: true,
                message: '获取提醒统计成功',
                data: statistics
            });
        }
        catch (error) {
            logger_1.Logger.error('获取提醒统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取提醒统计失败'
            });
        }
    }
    /**
     * 创建默认提醒规则
     */
    static async createDefaultRules(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: '用户未认证'
                });
                return;
            }
            const count = await alertService_1.AlertService.createDefaultRulesForUser(userId);
            res.json({
                success: true,
                message: '默认提醒规则创建成功',
                data: {
                    createdCount: count
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('创建默认提醒规则失败:', error);
            res.status(500).json({
                success: false,
                message: '创建默认提醒规则失败'
            });
        }
    }
    /**
     * 批量检查提醒（管理员功能）
     */
    static async batchCheckAlerts(req, res) {
        try {
            // 这里应该添加管理员权限检查
            // if (!req.user?.isAdmin) { ... }
            const result = await alertService_1.AlertService.batchCheckAlerts();
            res.json({
                success: true,
                message: '批量检查提醒完成',
                data: result
            });
        }
        catch (error) {
            logger_1.Logger.error('批量检查提醒失败:', error);
            res.status(500).json({
                success: false,
                message: '批量检查提醒失败'
            });
        }
    }
    /**
     * 获取提醒规则模板
     */
    static async getAlertRuleTemplates(req, res) {
        try {
            const templates = [
                {
                    id: 'health_decline',
                    name: '健康状态恶化警告',
                    description: '当宠物健康状态持续恶化时发送警告',
                    category: 'health',
                    triggers: {
                        anomalyTypes: ['health_decline'],
                        severityLevels: ['medium', 'high'],
                        minimumConfidence: 70
                    },
                    notifications: {
                        inApp: true,
                        email: true
                    },
                    frequency: {
                        maxPerDay: 2,
                        maxPerWeek: 5,
                        cooldownHours: 12
                    }
                },
                {
                    id: 'frequency_anomaly',
                    name: '排便频率异常',
                    description: '当排便频率过高或过低时发送提醒',
                    category: 'frequency',
                    triggers: {
                        anomalyTypes: ['frequency'],
                        severityLevels: ['medium', 'high'],
                        minimumConfidence: 60
                    },
                    notifications: {
                        inApp: true,
                        email: false
                    },
                    frequency: {
                        maxPerDay: 1,
                        maxPerWeek: 3,
                        cooldownHours: 24
                    }
                },
                {
                    id: 'pattern_change',
                    name: '排便模式变化',
                    description: '当排便模式发生显著变化时发送通知',
                    category: 'pattern',
                    triggers: {
                        anomalyTypes: ['pattern_change', 'consistency_change'],
                        severityLevels: ['high'],
                        minimumConfidence: 80
                    },
                    notifications: {
                        inApp: true,
                        email: true
                    },
                    frequency: {
                        maxPerDay: 1,
                        maxPerWeek: 2,
                        cooldownHours: 48
                    }
                },
                {
                    id: 'emergency_alert',
                    name: '紧急健康警报',
                    description: '检测到严重健康问题时立即发送警报',
                    category: 'emergency',
                    triggers: {
                        anomalyTypes: ['health_decline', 'frequency', 'consistency_change'],
                        severityLevels: ['high'],
                        minimumConfidence: 85
                    },
                    notifications: {
                        inApp: true,
                        email: true,
                        push: true
                    },
                    frequency: {
                        maxPerDay: 5,
                        maxPerWeek: 10,
                        cooldownHours: 2
                    }
                }
            ];
            res.json({
                success: true,
                message: '获取提醒规则模板成功',
                data: {
                    templates,
                    total: templates.length
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取提醒规则模板失败:', error);
            res.status(500).json({
                success: false,
                message: '获取提醒规则模板失败'
            });
        }
    }
}
exports.AlertController = AlertController;
//# sourceMappingURL=alertController.js.map