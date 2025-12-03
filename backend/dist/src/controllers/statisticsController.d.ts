import { Request, Response } from 'express';
export declare class StatisticsController {
    /**
     * 获取健康趋势数据
     */
    static getHealthTrends(req: Request, res: Response): Promise<void>;
    /**
     * 获取周期统计数据
     */
    static getPeriodStatistics(req: Request, res: Response): Promise<void>;
    /**
     * 获取异常模式检测结果
     */
    static getAnomalyPatterns(req: Request, res: Response): Promise<void>;
    /**
     * 获取对比分析结果
     */
    static getComparisonAnalysis(req: Request, res: Response): Promise<void>;
    /**
     * 获取多宠物统计汇总
     */
    static getMultiPetSummary(req: Request, res: Response): Promise<void>;
    /**
     * 用户整体统计概览
     */
    static getUserOverview(req: Request, res: Response): Promise<void>;
    private static calculateUserPeriodStats;
}
//# sourceMappingURL=statisticsController.d.ts.map