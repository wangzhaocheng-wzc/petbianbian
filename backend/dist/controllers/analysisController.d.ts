import { Request, Response } from 'express';
export declare class AnalysisController {
    /**
     * 上传图片进行分析
     */
    static uploadForAnalysis(req: Request, res: Response): Promise<void>;
    /**
     * 获取分析记录
     */
    static getAnalysisRecords(req: Request, res: Response): Promise<void>;
    /**
     * 获取分析统计
     */
    static getAnalysisStatistics(req: Request, res: Response): Promise<void>;
    /**
     * 获取单个分析记录
     */
    static getAnalysisRecord(req: Request, res: Response): Promise<void>;
    /**
     * 删除分析记录
     */
    static deleteAnalysisRecord(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=analysisController.d.ts.map