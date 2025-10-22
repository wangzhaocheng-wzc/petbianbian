import { IPoopRecord } from '../models/PoopRecord';
import { AIAnalysisResult } from './aiService';
interface CreateAnalysisParams {
    userId: string;
    petId: string;
    imageUrl: string;
    result: AIAnalysisResult;
}
interface AnalysisQuery {
    userId?: string;
    petId?: string;
    startDate?: Date;
    endDate?: Date;
    healthStatus?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
interface ShareAnalysisParams {
    shareType: 'public' | 'private' | 'specific';
    shareWith?: string[];
}
interface AnalysisStatistics {
    totalRecords: number;
    healthStatusDistribution: {
        [key: string]: number;
    };
    shapeDistribution: {
        [key: string]: number;
    };
    averageConfidence: number;
    commonSymptoms: {
        symptom: string;
        count: number;
    }[];
    timeDistribution: {
        date: string;
        count: number;
    }[];
}
export declare class AnalysisService {
    /**
     * 创建分析记录
     */
    static createAnalysisRecord(params: CreateAnalysisParams): Promise<IPoopRecord>;
    /**
     * 获取分析记录列表
     */
    static getAnalysisRecords(query: AnalysisQuery): Promise<{
        records: IPoopRecord[];
        total: number;
    }>;
    /**
     * 获取单个分析记录
     */
    static getAnalysisRecord(id: string, userId?: string): Promise<IPoopRecord | null>;
    /**
     * 更新分析记录
     */
    static updateAnalysisRecord(id: string, userId: string, updateData: Partial<IPoopRecord>): Promise<IPoopRecord | null>;
    /**
     * 分享分析记录
     */
    static shareAnalysisRecord(id: string, userId: string, params: ShareAnalysisParams): Promise<IPoopRecord | null>;
    /**
     * 删除分析记录
     */
    static deleteAnalysisRecord(id: string): Promise<boolean>;
    /**
     * 批量删除分析记录
     */
    static batchDeleteRecords(recordIds: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 获取分析统计
     */
    static getAnalysisStatistics(params: {
        userId: string;
        petId: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<AnalysisStatistics>;
}
export {};
//# sourceMappingURL=analysisService.d.ts.map