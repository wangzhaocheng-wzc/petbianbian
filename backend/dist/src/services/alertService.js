"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
const AlertRule_1 = require("../models/AlertRule");
const anomalyDetectionService_1 = require("./anomalyDetectionService");
const logger_1 = require("../utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
class AlertService {
    /**
     * 创建提醒规则
     */
    static async createAlertRule(data) {
        try {
            logger_1.Logger.info(`创建提醒规则: 用户ID=${data.userId}, 规则名称=${data.name}`);
            const rule = new AlertRule_1.AlertRule({
                userId: new mongoose_1.default.Types.ObjectId(data.userId),
                petId: data.petId ? new mongoose_1.default.Types.ObjectId(data.petId) : undefined,
                name: data.name,
                description: data.description,
                triggers: data.triggers,
                notifications: data.notifications,
                frequency: {
                    maxPerDay: data.frequency?.maxPerDay || 3,
                    maxPerWeek: data.frequency?.maxPerWeek || 10,
                    cooldownHours: data.frequency?.cooldownHours || 6
                },
                customConditions: data.customConditions,
                stats: {
                    totalTriggered: 0,
                    totalNotificationsSent: 0
                }
            });
            const savedRule = await rule.save();
            logger_1.Logger.info(`提醒规则创建成功: ID=${savedRule._id}`);
            return savedRule;
        }
        catch (error) {
            logger_1.Logger.error('创建提醒规则失败:', error);
            throw new Error('创建提醒规则失败');
        }
    }
    /**
     * 获取用户的提醒规则列表
     */
    static async getUserAlertRules(userId, petId, includeInactive = false) {
        try {
            const filter = {
                userId: new mongoose_1.default.Types.ObjectId(userId)
            };
            if (!includeInactive) {
                filter.isActive = true;
            }
            if (petId) {
                filter.$or = [
                    { petId: new mongoose_1.default.Types.ObjectId(petId) },
                    { petId: { $exists: false } }
                ];
            }
            const rules = await AlertRule_1.AlertRule.find(filter)
                .populate('pet', 'name type breed avatar')
                .sort({ createdAt: -1 });
            logger_1.Logger.info(`获取用户提醒规则: 用户ID=${userId}, 找到${rules.length}条规则`);
            return rules;
        }
        catch (error) {
            logger_1.Logger.error('获取用户提醒规则失败:', error);
            throw new Error('获取用户提醒规则失败');
        }
    }
    /**
     * 更新提醒规则
     */
    static async updateAlertRule(ruleId, updates) {
        try {
            const rule = await AlertRule_1.AlertRule.findByIdAndUpdate(ruleId, { $set: updates }, { new: true, runValidators: true }).populate('pet', 'name type breed avatar');
            if (!rule) {
                logger_1.Logger.warn(`提醒规则不存在: ID=${ruleId}`);
                return null;
            }
            logger_1.Logger.info(`提醒规则更新成功: ID=${ruleId}`);
            return rule;
        }
        catch (error) {
            logger_1.Logger.error('更新提醒规则失败:', error);
            throw new Error('更新提醒规则失败');
        }
    }
    /**
     * 删除提醒规则
     */
    static async deleteAlertRule(ruleId) {
        try {
            const result = await AlertRule_1.AlertRule.findByIdAndDelete(ruleId);
            if (!result) {
                logger_1.Logger.warn(`提醒规则不存在: ID=${ruleId}`);
                return false;
            }
            logger_1.Logger.info(`提醒规则删除成功: ID=${ruleId}`);
            return true;
        }
        catch (error) {
            logger_1.Logger.error('删除提醒规则失败:', error);
            throw new Error('删除提醒规则失败');
        }
    }
    /**
     * 检查并触发提醒
     */
    static async checkAndTriggerAlerts(petId, userId) {
        try {
            logger_1.Logger.info(`检查提醒触发: 宠物ID=${petId}, 用户ID=${userId}`);
            // 获取用户的活跃提醒规则
            const activeRules = await AlertRule_1.AlertRule.getActiveRulesForUser(userId, petId);
            if (activeRules.length === 0) {
                logger_1.Logger.info('没有找到活跃的提醒规则');
                return [];
            }
            // 执行异常检测
            const anomalies = await anomalyDetectionService_1.AnomalyDetectionService.detectAnomalies(petId);
            if (anomalies.length === 0) {
                logger_1.Logger.info('没有检测到异常，无需触发提醒');
                return [];
            }
            const triggerResults = [];
            // 检查每个异常是否匹配提醒规则
            for (const anomaly of anomalies) {
                for (const rule of activeRules) {
                    if (rule.canTrigger() && rule.matchesAnomaly(anomaly)) {
                        logger_1.Logger.info(`触发提醒规则: ${rule.name}, 异常类型: ${anomaly.anomalyType}`);
                        // 发送通知
                        const notificationsSent = await this.sendNotifications(rule, anomaly, petId);
                        // 记录触发
                        await rule.recordTrigger();
                        // 更新通知发送统计
                        rule.stats.totalNotificationsSent += Object.values(notificationsSent).filter(Boolean).length;
                        await rule.save();
                        triggerResults.push({
                            ruleId: rule._id.toString(),
                            ruleName: rule.name,
                            anomaly,
                            petId,
                            petName: rule.pet?.name,
                            userId,
                            notificationsSent,
                            triggeredAt: new Date()
                        });
                    }
                }
            }
            logger_1.Logger.info(`提醒检查完成: 触发了${triggerResults.length}个提醒`);
            return triggerResults;
        }
        catch (error) {
            logger_1.Logger.error('检查提醒触发失败:', error);
            throw new Error('检查提醒触发失败');
        }
    }
    /**
     * 发送通知
     */
    static async sendNotifications(rule, anomaly, petId) {
        const result = {
            inApp: false,
            email: false,
            push: false
        };
        try {
            // 应用内通知
            if (rule.notifications.inApp) {
                await this.sendInAppNotification(rule, anomaly, petId);
                result.inApp = true;
            }
            // 邮件通知
            if (rule.notifications.email) {
                await this.sendEmailNotification(rule, anomaly, petId);
                result.email = true;
            }
            // 推送通知（预留）
            if (rule.notifications.push) {
                await this.sendPushNotification(rule, anomaly, petId);
                result.push = true;
            }
        }
        catch (error) {
            logger_1.Logger.error('发送通知失败:', error);
        }
        return result;
    }
    /**
     * 发送应用内通知
     */
    static async sendInAppNotification(rule, anomaly, petId) {
        try {
            const { NotificationService } = await Promise.resolve().then(() => __importStar(require('./notificationService')));
            await NotificationService.createNotification({
                userId: rule.userId.toString(),
                petId: petId,
                type: 'alert',
                category: this.mapAnomalyTypeToCategory(anomaly.anomalyType),
                title: `${rule.name} - ${this.getAnomalyTypeTitle(anomaly.anomalyType)}`,
                message: anomaly.description,
                data: {
                    alertRuleId: rule._id.toString(),
                    anomalyType: anomaly.anomalyType,
                    severity: anomaly.severity,
                    petName: rule.pet?.name,
                    actionUrl: `/pets/${petId}/health`,
                    metadata: {
                        confidence: anomaly.confidence,
                        recommendations: anomaly.recommendations,
                        triggerData: anomaly.triggerData
                    }
                },
                priority: this.mapSeverityToPriority(anomaly.severity),
                channels: {
                    inApp: true,
                    email: false,
                    push: false
                }
            });
            logger_1.Logger.info(`应用内通知创建成功: 规则=${rule.name}, 异常=${anomaly.anomalyType}, 宠物=${petId}`);
        }
        catch (error) {
            logger_1.Logger.error('发送应用内通知失败:', error);
            throw error;
        }
    }
    /**
     * 发送邮件通知
     */
    static async sendEmailNotification(rule, anomaly, petId) {
        try {
            const { NotificationService } = await Promise.resolve().then(() => __importStar(require('./notificationService')));
            await NotificationService.createNotification({
                userId: rule.userId.toString(),
                petId: petId,
                type: 'alert',
                category: this.mapAnomalyTypeToCategory(anomaly.anomalyType),
                title: `${rule.name} - ${this.getAnomalyTypeTitle(anomaly.anomalyType)}`,
                message: `${anomaly.description}\n\n建议措施：\n${anomaly.recommendations.slice(0, 3).map(r => `• ${r}`).join('\n')}`,
                data: {
                    alertRuleId: rule._id.toString(),
                    anomalyType: anomaly.anomalyType,
                    severity: anomaly.severity,
                    petName: rule.pet?.name,
                    actionUrl: `/pets/${petId}/health`,
                    metadata: {
                        confidence: anomaly.confidence,
                        recommendations: anomaly.recommendations,
                        triggerData: anomaly.triggerData
                    }
                },
                priority: this.mapSeverityToPriority(anomaly.severity),
                channels: {
                    inApp: false,
                    email: true,
                    push: false
                }
            });
            logger_1.Logger.info(`邮件通知创建成功: 规则=${rule.name}, 异常=${anomaly.anomalyType}, 宠物=${petId}`);
        }
        catch (error) {
            logger_1.Logger.error('发送邮件通知失败:', error);
            throw error;
        }
    }
    /**
     * 发送推送通知
     */
    static async sendPushNotification(rule, anomaly, petId) {
        try {
            const { NotificationService } = await Promise.resolve().then(() => __importStar(require('./notificationService')));
            await NotificationService.createNotification({
                userId: rule.userId.toString(),
                petId: petId,
                type: 'alert',
                category: this.mapAnomalyTypeToCategory(anomaly.anomalyType),
                title: `${this.getAnomalyTypeTitle(anomaly.anomalyType)}`,
                message: anomaly.description,
                data: {
                    alertRuleId: rule._id.toString(),
                    anomalyType: anomaly.anomalyType,
                    severity: anomaly.severity,
                    petName: rule.pet?.name,
                    actionUrl: `/pets/${petId}/health`,
                    metadata: {
                        confidence: anomaly.confidence,
                        recommendations: anomaly.recommendations.slice(0, 2),
                        triggerData: anomaly.triggerData
                    }
                },
                priority: this.mapSeverityToPriority(anomaly.severity),
                channels: {
                    inApp: false,
                    email: false,
                    push: true
                }
            });
            logger_1.Logger.info(`推送通知创建成功: 规则=${rule.name}, 异常=${anomaly.anomalyType}, 宠物=${petId}`);
        }
        catch (error) {
            logger_1.Logger.error('发送推送通知失败:', error);
            throw error;
        }
    }
    /**
     * 映射异常类型到通知分类
     */
    static mapAnomalyTypeToCategory(anomalyType) {
        const mapping = {
            'health_decline': 'health',
            'frequency': 'frequency',
            'pattern_change': 'pattern',
            'consistency_change': 'pattern'
        };
        return mapping[anomalyType] || 'general';
    }
    /**
     * 映射严重程度到优先级
     */
    static mapSeverityToPriority(severity) {
        const mapping = {
            'low': 'low',
            'medium': 'normal',
            'high': 'high'
        };
        return mapping[severity] || 'normal';
    }
    /**
     * 获取异常类型标题
     */
    static getAnomalyTypeTitle(anomalyType) {
        const titles = {
            'frequency': '排便频率异常',
            'health_decline': '健康状态恶化',
            'pattern_change': '排便模式变化',
            'consistency_change': '排便一致性变化'
        };
        return titles[anomalyType] || '健康异常';
    }
    /**
     * 为新用户创建默认提醒规则
     */
    static async createDefaultRulesForUser(userId) {
        try {
            const count = await AlertRule_1.AlertRule.createDefaultRules(userId);
            logger_1.Logger.info(`为用户创建默认提醒规则: 用户ID=${userId}, 创建${count}条规则`);
            return count;
        }
        catch (error) {
            logger_1.Logger.error('创建默认提醒规则失败:', error);
            return 0;
        }
    }
    /**
     * 获取提醒统计
     */
    static async getAlertStatistics(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const rules = await AlertRule_1.AlertRule.find({
                userId: new mongoose_1.default.Types.ObjectId(userId)
            });
            const totalRules = rules.length;
            const activeRules = rules.filter(r => r.isActive).length;
            const totalTriggered = rules.reduce((sum, r) => sum + r.stats.totalTriggered, 0);
            const totalNotificationsSent = rules.reduce((sum, r) => sum + r.stats.totalNotificationsSent, 0);
            // 最近触发的规则
            const recentTriggers = rules
                .filter(r => r.stats.lastTriggered && r.stats.lastTriggered >= startDate)
                .map(r => ({
                ruleName: r.name,
                triggeredAt: r.stats.lastTriggered,
                anomalyType: r.triggers.anomalyTypes[0] || 'unknown',
                severity: r.triggers.severityLevels[0] || 'unknown'
            }))
                .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
                .slice(0, 10);
            // 规则性能
            const rulePerformance = rules.map(r => ({
                ruleName: r.name,
                totalTriggered: r.stats.totalTriggered,
                lastTriggered: r.stats.lastTriggered,
                isActive: r.isActive
            }));
            return {
                totalRules,
                activeRules,
                totalTriggered,
                totalNotificationsSent,
                recentTriggers,
                rulePerformance
            };
        }
        catch (error) {
            logger_1.Logger.error('获取提醒统计失败:', error);
            throw new Error('获取提醒统计失败');
        }
    }
    /**
     * 批量检查所有用户的提醒（定时任务用）
     */
    static async batchCheckAlerts() {
        try {
            logger_1.Logger.info('开始批量检查提醒');
            // 获取所有有活跃提醒规则的用户
            const activeRules = await AlertRule_1.AlertRule.find({ isActive: true })
                .populate('user', '_id username')
                .populate('pet', '_id name');
            const userPetMap = new Map();
            // 按用户和宠物分组
            activeRules.forEach(rule => {
                const userId = rule.userId.toString();
                if (!userPetMap.has(userId)) {
                    userPetMap.set(userId, new Set());
                }
                if (rule.petId) {
                    userPetMap.get(userId).add(rule.petId.toString());
                }
            });
            let totalUsersChecked = 0;
            let totalAlertsTriggered = 0;
            const errors = [];
            // 为每个用户的每个宠物检查提醒
            for (const [userId, petIds] of userPetMap) {
                try {
                    totalUsersChecked++;
                    for (const petId of petIds) {
                        const triggerResults = await this.checkAndTriggerAlerts(petId, userId);
                        totalAlertsTriggered += triggerResults.length;
                    }
                }
                catch (error) {
                    const errorMsg = `用户${userId}提醒检查失败: ${error}`;
                    logger_1.Logger.error(errorMsg);
                    errors.push(errorMsg);
                }
            }
            logger_1.Logger.info(`批量检查提醒完成: 检查${totalUsersChecked}个用户, 触发${totalAlertsTriggered}个提醒`);
            return {
                totalUsersChecked,
                totalAlertsTriggered,
                errors
            };
        }
        catch (error) {
            logger_1.Logger.error('批量检查提醒失败:', error);
            throw new Error('批量检查提醒失败');
        }
    }
}
exports.AlertService = AlertService;
//# sourceMappingURL=alertService.js.map