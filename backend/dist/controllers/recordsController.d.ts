import { Request, Response } from 'express';
export declare class RecordsController {
    /**
     * 获取记录列表（支持复杂查询和筛选）
     */
    static getRecords(req: Request, res: Response): Promise<void>;
    /**
     * 获取单个记录详情
     */
    static getRecordById(req: Request, res: Response): Promise<void>;
    /**
     * 更新记录
     */
    static updateRecord(req: Request, res: Response): Promise<void>;
    /**
     * 删除记录
     */
    static deleteRecord(req: Request, res: Response): Promise<void>;
    /**
     * 获取统计概览
     */
    static getStatisticsOverview(req: Request, res: Response): Promise<void>;
    /**
     * 获取宠物记录统计
     */
    static getPetStatistics(req: Request, res: Response): Promise<void>;
    /**
     * 获取健康趋势数据
     */
    static getHealthTrends(req: Request, res: Response): Promise<void>;
    /**
     * 获取聚合汇总数据
     */
    static getAggregationSummary(req: Request, res: Response): Promise<void>;
    /**
     * 批量删除记录
     */
    static batchDeleteRecords(req: Request, res: Response): Promise<void>;
    /**
     * 批量更新记录
     */
    static batchUpdateRecords(req: Request, res: Response): Promise<void>;
    private static getShapeDescription;
    private static getHealthStatusDescription;
}
//# sourceMappingURL=recordsController.d.ts.map