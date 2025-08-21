import { IAlertRule } from '../models/AlertRule';
import { AnomalyDetectionResult } from './anomalyDetectionService';
export interface CreateAlertRuleRequest {
    userId: string;
    petId?: string;
    name: string;
    description?: string;
    triggers: {
        anomalyTypes: ('frequency' | 'health_decline' | 'pattern_change' | 'consistency_change')[];
        severityLevels: ('low' | 'medium' | 'high')[];
        minimumConfidence: number;
    };
    notifications: {
        inApp: boolean;
        email: boolean;
        push?: boolean;
    };
    frequency?: {
        maxPerDay?: number;
        maxPerWeek?: number;
        cooldownHours?: number;
    };
    customConditions?: any;
}
export interface UpdateAlertRuleRequest extends Partial<CreateAlertRuleRequest> {
    isActive?: boolean;
}
export interface AlertTriggerResult {
    ruleId: string;
    ruleName: string;
    anomaly: AnomalyDetectionResult;
    petId?: string;
    petName?: string;
    userId: string;
    notificationsSent: {
        inApp: boolean;
        email: boolean;
        push: boolean;
    };
    triggeredAt: Date;
}
export declare class AlertService {
    /**
     * 创建提醒规则
     */
    static createAlertRule(data: CreateAlertRuleRequest): Promise<IAlertRule>;
    /**
     * 获取用户的提醒规则列表
     */
    static getUserAlertRules(userId: string, petId?: string, includeInactive?: boolean): Promise<IAlertRule[]>;
    /**
     * 更新提醒规则
     */
    static updateAlertRule(ruleId: string, updates: UpdateAlertRuleRequest): Promise<IAlertRule | null>;
    /**
     * 删除提醒规则
     */
    static deleteAlertRule(ruleId: string): Promise<boolean>;
    /**
     * 检查并触发提醒
     */
    static checkAndTriggerAlerts(petId: string, userId: string): Promise<AlertTriggerResult[]>;
    /**
     * 发送通知
     */
    private static sendNotifications;
    /**
     * 发送应用内通知
     */
    private static sendInAppNotification;
    /**
     * 发送邮件通知
     */
    private static sendEmailNotification;
    /**
     * 发送推送通知
     */
    private static sendPushNotification;
    /**
     * 映射异常类型到通知分类
     */
    private static mapAnomalyTypeToCategory;
    /**
     * 映射严重程度到优先级
     */
    private static mapSeverityToPriority;
    /**
     * 获取异常类型标题
     */
    private static getAnomalyTypeTitle;
    /**
     * 为新用户创建默认提醒规则
     */
    static createDefaultRulesForUser(userId: string): Promise<number>;
    /**
     * 获取提醒统计
     */
    static getAlertStatistics(userId: string, days?: number): Promise<{
        totalRules: number;
        activeRules: number;
        totalTriggered: number;
        totalNotificationsSent: number;
        recentTriggers: Array<{
            ruleName: string;
            triggeredAt: Date;
            anomalyType: string;
            severity: string;
        }>;
        rulePerformance: Array<{
            ruleName: string;
            totalTriggered: number;
            lastTriggered?: Date;
            isActive: boolean;
        }>;
    }>;
    /**
     * 批量检查所有用户的提醒（定时任务用）
     */
    static batchCheckAlerts(): Promise<{
        totalUsersChecked: number;
        totalAlertsTriggered: number;
        errors: string[];
    }>;
}
//# sourceMappingURL=alertService.d.ts.map