import { IPoopRecord } from '../models/PoopRecord';
import { AIAnalysisResult } from './aiService';
export interface CreateAnalysisRecordRequest {
    petId: string;
    userId: string;
    imageUrl: string;
    thumbnailUrl?: string;
    analysis: AIAnalysisResult;
    userNotes?: string;
    symptoms?: string[];
    timestamp?: Date;
    location?: {
        latitude: number;
        longitude: number;
    };
    weather?: {
        temperature: number;
        humidity: number;
    };
    isShared?: boolean;
}
export interface AnalysisRecordQuery {
    petId?: string;
    userId?: string;
    healthStatus?: 'healthy' | 'warning' | 'concerning';
    startDate?: Date;
    endDate?: Date;
    isShared?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'timestamp' | 'confidence';
    sortOrder?: 'asc' | 'desc';
}
export declare class HealthAdviceGenerator {
    /**
     * 根据分析结果生成健康建议
     */
    static generateAdvice(analysis: AIAnalysisResult, symptoms?: string[]): string[];
    /**
     * 生成健康状态判断
     */
    static assessHealthStatus(analysis: AIAnalysisResult, recentRecords?: IPoopRecord[]): {
        currentStatus: string;
        trend: 'improving' | 'stable' | 'declining';
        riskLevel: 'low' | 'medium' | 'high';
        urgency: 'none' | 'monitor' | 'consult' | 'urgent';
    };
    private static getStatusDescription;
}
export declare class AnalysisService {
    /**
     * 创建分析记录
     */
    static createAnalysisRecord(data: CreateAnalysisRecordRequest): Promise<IPoopRecord>;
    /**
     * 获取分析记录列表
     */
    static getAnalysisRecords(query: AnalysisRecordQuery): Promise<{
        records: IPoopRecord[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * 获取单个分析记录
     */
    static getAnalysisRecord(id: string): Promise<IPoopRecord | null>;
    /**
     * 更新分析记录
     */
    static updateAnalysisRecord(id: string, updates: Partial<CreateAnalysisRecordRequest>): Promise<IPoopRecord | null>;
    /**
     * 删除分析记录
     */
    static deleteAnalysisRecord(id: string): Promise<boolean>;
    /**
     * 获取健康统计
     */
    static getHealthStatistics(petId: string, days?: number): Promise<any>;
    /**
     * 获取健康趋势
     */
    static getHealthTrends(petId: string, days?: number): Promise<any[]>;
    /**
     * 填充缺失的日期数据
     */
    private static fillMissingDates;
    /**
     * 获取健康评估
     */
    static getHealthAssessment(petId: string): Promise<any>;
}
//# sourceMappingURL=analysisService.d.ts.map