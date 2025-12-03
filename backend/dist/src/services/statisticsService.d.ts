export interface HealthTrendPoint {
    date: string;
    healthy: number;
    warning: number;
    concerning: number;
    total: number;
    healthyPercentage: number;
    warningPercentage: number;
    concerningPercentage: number;
}
export interface PeriodStatistics {
    period: 'week' | 'month' | 'quarter' | 'year';
    startDate: Date;
    endDate: Date;
    totalRecords: number;
    healthyCount: number;
    warningCount: number;
    concerningCount: number;
    healthyPercentage: number;
    warningPercentage: number;
    concerningPercentage: number;
    averageConfidence: number;
    frequencyPerWeek: number;
    shapeDistribution: {
        [key: string]: number;
    };
    symptomsFrequency: {
        [key: string]: number;
    };
}
export interface AnomalyPattern {
    type: 'sudden_decline' | 'persistent_warning' | 'frequency_drop' | 'confidence_drop' | 'shape_change';
    severity: 'low' | 'medium' | 'high';
    description: string;
    detectedAt: Date;
    affectedPeriod: {
        start: Date;
        end: Date;
    };
    metrics: {
        [key: string]: number | string;
    };
    recommendations: string[];
}
export interface ComparisonAnalysis {
    currentPeriod: PeriodStatistics;
    previousPeriod: PeriodStatistics;
    changes: {
        healthyChange: number;
        warningChange: number;
        concerningChange: number;
        confidenceChange: number;
        frequencyChange: number;
    };
    trend: 'improving' | 'stable' | 'declining';
    significantChanges: string[];
}
export declare class StatisticsService {
    /**
     * 计算健康趋势分析
     */
    static calculateHealthTrends(petId: string, days?: number, granularity?: 'daily' | 'weekly'): Promise<HealthTrendPoint[]>;
    /**
     * 计算周期统计数据
     */
    static calculatePeriodStatistics(petId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<PeriodStatistics>;
    /**
     * 异常模式识别
     */
    static detectAnomalyPatterns(petId: string, analysisWindow?: number): Promise<AnomalyPattern[]>;
    /**
     * 对比分析（当前周期 vs 上一周期）
     */
    static performComparisonAnalysis(petId: string, period?: 'week' | 'month' | 'quarter'): Promise<ComparisonAnalysis>;
    private static calculatePeriodStatisticsForDateRange;
    private static detectSuddenHealthDecline;
    private static detectPersistentWarning;
    private static detectFrequencyDrop;
    private static detectConfidenceDrop;
    private static detectShapePatternChange;
    private static getWeekNumber;
    private static getWeekStartDate;
}
//# sourceMappingURL=statisticsService.d.ts.map