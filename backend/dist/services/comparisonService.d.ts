export interface PetComparisonData {
    petId: string;
    petName: string;
    petType: string;
    breed?: string;
    age?: number;
    weight?: number;
    avatar?: string;
    statistics: {
        totalRecords: number;
        healthyCount: number;
        warningCount: number;
        concerningCount: number;
        healthyPercentage: number;
        warningPercentage: number;
        concerningPercentage: number;
        averagePerWeek: number;
        lastAnalysisDate?: Date;
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
}
export interface ComparisonAnalysis {
    pets: PetComparisonData[];
    comparison: {
        healthiestPet: {
            petId: string;
            petName: string;
            healthyPercentage: number;
        };
        mostConcerningPet: {
            petId: string;
            petName: string;
            concerningPercentage: number;
        };
        averageHealthPercentage: number;
        totalRecordsCompared: number;
        comparisonPeriod: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
    };
    insights: string[];
    recommendations: string[];
}
export declare class ComparisonService {
    /**
     * 获取多个宠物的对比分析数据
     */
    static getMultiPetComparison(userId: string, petIds: string[], days?: number): Promise<ComparisonAnalysis>;
    /**
     * 获取单个宠物的对比数据
     */
    private static getPetComparisonData;
    /**
     * 生成对比分析结果
     */
    private static generateComparisonAnalysis;
    /**
     * 生成洞察信息
     */
    private static generateInsights;
    /**
     * 生成建议信息
     */
    private static generateRecommendations;
    /**
     * 获取宠物健康趋势对比
     */
    static getPetHealthTrends(userId: string, petIds: string[], days?: number): Promise<{
        trends: Array<{
            date: string;
            pets: Array<{
                petId: string;
                petName: string;
                healthy: number;
                warning: number;
                concerning: number;
                total: number;
                healthPercentage: number;
            }>;
        }>;
        summary: {
            totalDays: number;
            petsCompared: number;
            averageHealthTrend: 'improving' | 'stable' | 'declining';
        };
    }>;
}
//# sourceMappingURL=comparisonService.d.ts.map