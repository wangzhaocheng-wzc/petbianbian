import { Request, Response } from 'express';
interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        username?: string;
        email: string;
    };
}
export declare class AlertController {
    /**
     * 创建提醒规则
     */
    static createAlertRule(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取用户的提醒规则列表
     */
    static getUserAlertRules(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 更新提醒规则
     */
    static updateAlertRule(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 删除提醒规则
     */
    static deleteAlertRule(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 手动触发提醒检查
     */
    static triggerAlertCheck(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取异常检测结果
     */
    static getAnomalyDetection(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取健康模式分析
     */
    static getHealthPattern(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取提醒统计
     */
    static getAlertStatistics(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 创建默认提醒规则
     */
    static createDefaultRules(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 批量检查提醒（管理员功能）
     */
    static batchCheckAlerts(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * 获取提醒规则模板
     */
    static getAlertRuleTemplates(req: AuthenticatedRequest, res: Response): Promise<void>;
}
export {};
//# sourceMappingURL=alertController.d.ts.map