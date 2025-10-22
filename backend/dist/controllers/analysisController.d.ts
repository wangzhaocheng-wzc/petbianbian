import { Request, Response } from 'express';
export declare class AnalysisController {
    /**
     * 上传图片进行分析
     */
    static uploadForAnalysis(req: Request, res: Response): Promise<void>;
    /**
     * 获取分析记录列表
     */
    static getAnalysisRecords(req: Request, res: Response): Promise<void>;
    /**
     * 获取单个分析记录
     */
    static getAnalysisRecord(req: Request, res: Response): Promise<void>;
    /**
     * 更新分析记录
     */
    static updateAnalysisRecord(req: Request, res: Response): Promise<void>;
    /**
     * 分享分析记录
     */
    static shareAnalysisRecord(req: Request, res: Response): Promise<void>;
    /**
     * 删除分析记录
     */
    static deleteAnalysisRecord(req: Request, res: Response): Promise<void>;
    /**
     * 批量删除分析记录
     */
    static batchDeleteRecords(req: Request, res: Response): Promise<void>;
    /**
     * 获取分析统计
     */
    static getAnalysisStatistics(req: Request, res: Response): Promise<void>;
    /**
     * 导出分析记录为CSV
     */
    static exportAnalysisRecordsCSV(req: Request, res: Response): Promise<void>;
    /**
     * 导出分析记录为PDF
     */
    static exportAnalysisRecordsPDF(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=analysisController.d.ts.map