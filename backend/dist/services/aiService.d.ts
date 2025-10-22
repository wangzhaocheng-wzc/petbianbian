export interface AIAnalysisResult {
    shape: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6' | 'type7';
    healthStatus: 'healthy' | 'warning' | 'concerning';
    confidence: number;
    details: string;
    recommendations: string[];
    detectedFeatures: {
        color: string;
        texture: string;
        consistency: string;
        size: string;
    };
}
export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
}
export declare class AIService {
    /**
     * 图片预处理和格式转换
     */
    static preprocessImage(imageBuffer: Buffer): Promise<ProcessedImage>;
    /**
     * 验证图片是否包含便便内容
     */
    static validatePoopContent(processedImage: ProcessedImage): Promise<boolean>;
    /**
     * 执行AI分析
     */
    static analyzePoopImage(processedImage: ProcessedImage): Promise<AIAnalysisResult>;
    /**
     * 生成模拟分析结果
     */
    private static generateMockAnalysis;
    /**
     * 验证分析结果
     */
    static validateAnalysisResult(result: AIAnalysisResult): boolean;
    /**
     * 获取形状类型描述
     */
    static getShapeDescription(shape: string): string;
    /**
     * 获取健康状态描述
     */
    static getHealthStatusDescription(status: string): string;
}
//# sourceMappingURL=aiService.d.ts.map