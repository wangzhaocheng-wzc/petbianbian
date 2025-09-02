export interface HealthReportData {
    pet: {
        id: string;
        name: string;
        type: string;
        breed?: string;
        age?: number;
        weight?: number;
        avatar?: string;
    };
    owner: {
        id: string;
        username: string;
        email: string;
    };
    period: {
        startDate: Date;
        endDate: Date;
        days: number;
    };
    statistics: {
        totalRecords: number;
        healthyCount: number;
        warningCount: number;
        concerningCount: number;
        healthyPercentage: number;
        warningPercentage: number;
        concerningPercentage: number;
        averagePerWeek: number;
    };
    trends: Array<{
        date: string;
        healthy: number;
        warning: number;
        concerning: number;
        total: number;
    }>;
    shapeDistribution: Array<{
        shape: string;
        count: number;
        percentage: number;
    }>;
    recentRecords: Array<{
        id: string;
        timestamp: Date;
        healthStatus: string;
        shape: string;
        confidence: number;
        details: string;
        recommendations: string[];
    }>;
    healthAssessment: {
        currentStatus: string;
        trend: 'improving' | 'stable' | 'declining';
        riskLevel: 'low' | 'medium' | 'high';
        urgency: 'none' | 'monitor' | 'consult' | 'urgent';
        recommendations: string[];
    };
}
export declare class ReportService {
    /**
     * 生成宠物健康报告数据
     */
    static generateHealthReportData(userId: string, petId: string, days?: number): Promise<HealthReportData>;
    private static calculateStatistics;
    /**
     * 计算趋势数据
     */
    private static calculateTrends;
    /**
     * 计算形状分布
     */
    private static calculateShapeDistribution;
    /**
     * 生成健康评估
     */
    private static generateHealthAssessment;
    static generateHealthReportPDF(userId: string, petId: string, days?: number): Promise<Buffer>;
    /**
     * 生成PDF内容
     */
    private static generatePDFContent;
    /**
     * 辅助方法 - 获取宠物类型文本
     */
    private static getPetTypeText;
    /**
     * 辅助方法 - 格式化年龄
     */
    private static formatAge;
    /**
     * 辅助方法 - 获取健康状态文本
     */
    private static getHealthStatusText;
    /**
     * 辅助方法 - 获取形状描述
     */
    private static getShapeDescription;
    /**
     * 辅助方法 - 获取趋势文本
     */
    private static getTrendText;
    /**
     * 辅助方法 - 获取风险等级文本
     */
    private static getRiskLevelText;
    /**
     * 辅助方法 - 获取紧急程度文本
     */
    private static getUrgencyText;
    /**
     * 保存PDF报告到文件
     */
    static saveHealthReportPDF(userId: string, petId: string, days?: number): Promise<string>;
}
//# sourceMappingURL=reportService.d.ts.map