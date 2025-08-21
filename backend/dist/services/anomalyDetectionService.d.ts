export interface AnomalyDetectionResult {
    isAnomalous: boolean;
    anomalyType: 'frequency' | 'health_decline' | 'pattern_change' | 'consistency_change' | 'none';
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    description: string;
    recommendations: string[];
    triggerData: {
        currentValue: number;
        expectedValue: number;
        threshold: number;
        timeframe: string;
    };
}
export interface HealthPatternAnalysis {
    averageFrequency: number;
    dominantHealthStatus: 'healthy' | 'warning' | 'concerning';
    healthStatusDistribution: {
        healthy: number;
        warning: number;
        concerning: number;
    };
    consistencyPattern: {
        [key: string]: number;
    };
    timePatterns: {
        morningCount: number;
        afternoonCount: number;
        eveningCount: number;
    };
}
export interface AnomalyDetectionRules {
    frequencyThreshold: {
        minPerWeek: number;
        maxPerWeek: number;
    };
    healthDeclineThreshold: {
        concerningRatio: number;
        consecutiveConcerning: number;
    };
    patternChangeThreshold: {
        shapeVariationLimit: number;
        consistencyChangeRatio: number;
    };
}
export declare class AnomalyDetectionService {
    private static readonly DEFAULT_RULES;
    /**
     * 检测宠物健康异常
     */
    static detectAnomalies(petId: string, analysisWindow?: number, // 分析窗口（天）
    baselineWindow?: number, // 基线窗口（天）
    rules?: Partial<AnomalyDetectionRules>): Promise<AnomalyDetectionResult[]>;
    /**
     * 检测频率异常
     */
    private static detectFrequencyAnomaly;
    /**
     * 检测健康状态恶化
     */
    private static detectHealthDecline;
    /**
     * 检测模式变化
     */
    private static detectPatternChange;
    /**
     * 检测一致性变化
     */
    private static detectConsistencyChange;
    /**
     * 获取形状分布
     */
    private static getShapeDistribution;
    /**
     * 计算模式相似度
     */
    private static calculatePatternSimilarity;
    /**
     * 分析健康模式
     */
    static analyzeHealthPattern(petId: string, days?: number): Promise<HealthPatternAnalysis>;
    /**
     * 获取异常检测摘要
     */
    static getAnomalyDetectionSummary(petId: string): Promise<{
        hasAnomalies: boolean;
        totalAnomalies: number;
        highSeverityCount: number;
        mediumSeverityCount: number;
        lowSeverityCount: number;
        mostRecentAnomaly?: AnomalyDetectionResult;
        overallRiskLevel: 'low' | 'medium' | 'high';
        recommendations: string[];
    }>;
}
//# sourceMappingURL=anomalyDetectionService.d.ts.map