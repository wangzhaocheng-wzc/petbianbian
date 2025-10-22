import { PoopRecord, IPoopRecord } from '../models/PoopRecord';
import { Logger } from '../utils/logger';
import mongoose from 'mongoose';
import { getPostgresPool } from '../config/postgres';

// 异常检测结果接口
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

// 健康模式分析结果
export interface HealthPatternAnalysis {
  averageFrequency: number; // 平均每周次数
  dominantHealthStatus: 'healthy' | 'warning' | 'concerning';
  healthStatusDistribution: {
    healthy: number;
    warning: number;
    concerning: number;
  };
  consistencyPattern: {
    [key: string]: number; // shape type -> count
  };
  timePatterns: {
    morningCount: number;
    afternoonCount: number;
    eveningCount: number;
  };
}

// 异常检测规则配置
export interface AnomalyDetectionRules {
  frequencyThreshold: {
    minPerWeek: number;
    maxPerWeek: number;
  };
  healthDeclineThreshold: {
    concerningRatio: number; // 异常状态占比阈值
    consecutiveConcerning: number; // 连续异常次数阈值
  };
  patternChangeThreshold: {
    shapeVariationLimit: number; // 形状变化限制
    consistencyChangeRatio: number; // 一致性变化比例
  };
}

export class AnomalyDetectionService {
  // 默认检测规则
  private static readonly DEFAULT_RULES: AnomalyDetectionRules = {
    frequencyThreshold: {
      minPerWeek: 3, // 每周最少3次
      maxPerWeek: 21 // 每周最多21次（每天3次）
    },
    healthDeclineThreshold: {
      concerningRatio: 0.4, // 40%异常状态触发警告
      consecutiveConcerning: 3 // 连续3次异常状态
    },
    patternChangeThreshold: {
      shapeVariationLimit: 4, // 形状类型变化超过4种
      consistencyChangeRatio: 0.7 // 70%的记录与历史模式不符
    }
  };

  private static async fetchRecords(
    petId: string,
    startDate: Date,
    endDate?: Date
  ): Promise<any[]> {
    const DB_PRIMARY = process.env.DB_PRIMARY || 'postgres';
    if (DB_PRIMARY === 'postgres') {
      try {
        const pool = await getPostgresPool();
        const params: any[] = [petId, startDate];
        let sql = `SELECT shape, health_status, confidence, timestamp FROM poop_records WHERE pet_id = $1 AND timestamp >= $2`;
        if (endDate) {
          sql += ` AND timestamp < $3`;
          params.push(endDate);
        }
        sql += ` ORDER BY timestamp DESC`;
        const { rows } = await pool.query(sql, params);
        return rows.map((r: any) => ({
          analysis: {
            shape: r.shape,
            healthStatus: r.health_status,
            confidence: typeof r.confidence === 'number' ? r.confidence : Number(r.confidence)
          },
          timestamp: new Date(r.timestamp)
        }));
      } catch (err: any) {
        Logger.warn(`Postgres poop_records 查询失败或不存在: ${err?.message || err}`);
        return [];
      }
    } else {
      // MongoDB 分支：仅当 ID 有效时查询，否则返回空数据，避免抛错
      if (!mongoose.Types.ObjectId.isValid(petId)) {
        return [];
      }
      const query: any = {
        petId: new mongoose.Types.ObjectId(petId),
        timestamp: endDate ? { $gte: startDate, $lt: endDate } : { $gte: startDate }
      };
      return PoopRecord.find(query).sort({ timestamp: -1 });
    }
  }

  /**
   * 检测宠物健康异常
   */
  static async detectAnomalies(
    petId: string,
    analysisWindow: number = 14, // 分析窗口（天）
    baselineWindow: number = 30, // 基线窗口（天）
    rules?: Partial<AnomalyDetectionRules>
  ): Promise<AnomalyDetectionResult[]> {
    try {
      Logger.info(`开始异常检测: 宠物ID=${petId}, 分析窗口=${analysisWindow}天`);

      const detectionRules = { ...this.DEFAULT_RULES, ...rules };
      const anomalies: AnomalyDetectionResult[] = [];

      // 获取分析窗口内的记录
      const analysisStartDate = new Date();
      analysisStartDate.setDate(analysisStartDate.getDate() - analysisWindow);

      // 获取基线窗口内的记录（用于建立正常模式）
      const baselineStartDate = new Date();
      baselineStartDate.setDate(baselineStartDate.getDate() - baselineWindow);

      const [analysisRecords, baselineRecords] = await Promise.all([
        this.fetchRecords(petId, analysisStartDate),
        this.fetchRecords(petId, baselineStartDate, analysisStartDate)
      ]);

      if (analysisRecords.length === 0) {
        Logger.info('分析窗口内无记录，跳过异常检测');
        return [];
      }

      // 1. 频率异常检测
      const frequencyAnomaly = await this.detectFrequencyAnomaly(
        analysisRecords,
        baselineRecords,
        analysisWindow,
        detectionRules.frequencyThreshold
      );
      if (frequencyAnomaly.isAnomalous) {
        anomalies.push(frequencyAnomaly);
      }

      // 2. 健康状态恶化检测
      const healthDeclineAnomaly = await this.detectHealthDecline(
        analysisRecords,
        baselineRecords,
        detectionRules.healthDeclineThreshold
      );
      if (healthDeclineAnomaly.isAnomalous) {
        anomalies.push(healthDeclineAnomaly);
      }

      // 3. 模式变化检测
      const patternChangeAnomaly = await this.detectPatternChange(
        analysisRecords,
        baselineRecords,
        detectionRules.patternChangeThreshold
      );
      if (patternChangeAnomaly.isAnomalous) {
        anomalies.push(patternChangeAnomaly);
      }

      // 4. 一致性变化检测
      const consistencyAnomaly = await this.detectConsistencyChange(
        analysisRecords,
        baselineRecords
      );
      if (consistencyAnomaly.isAnomalous) {
        anomalies.push(consistencyAnomaly);
      }

      Logger.info(`异常检测完成: 发现${anomalies.length}个异常`);
      return anomalies;

    } catch (error) {
      Logger.error('异常检测失败:', error);
      throw new Error('异常检测失败');
    }
  }

  /**
   * 检测频率异常
   */
  private static async detectFrequencyAnomaly(
    analysisRecords: IPoopRecord[],
    baselineRecords: IPoopRecord[],
    analysisWindow: number,
    threshold: { minPerWeek: number; maxPerWeek: number }
  ): Promise<AnomalyDetectionResult> {
    const currentFrequency = (analysisRecords.length / analysisWindow) * 7;
    const baselineFrequency = baselineRecords.length > 0 
      ? (baselineRecords.length / 30) * 7 
      : 7; // 默认每周7次

    let isAnomalous = false;
    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '';
    const recommendations: string[] = [];

    if (currentFrequency < threshold.minPerWeek) {
      isAnomalous = true;
      severity = currentFrequency < threshold.minPerWeek * 0.5 ? 'high' : 'medium';
      description = `排便频率过低：当前每周${currentFrequency.toFixed(1)}次，低于正常范围`;
      recommendations.push('增加纤维素摄入，确保充足饮水');
      recommendations.push('增加运动量，促进肠道蠕动');
      if (severity === 'high') {
        recommendations.push('建议立即咨询兽医');
      }
    } else if (currentFrequency > threshold.maxPerWeek) {
      isAnomalous = true;
      severity = currentFrequency > threshold.maxPerWeek * 1.5 ? 'high' : 'medium';
      description = `排便频率过高：当前每周${currentFrequency.toFixed(1)}次，高于正常范围`;
      recommendations.push('检查是否有肠道感染或食物不耐受');
      recommendations.push('暂时改为易消化食物');
      if (severity === 'high') {
        recommendations.push('建议立即咨询兽医');
      }
    }

    const confidence = Math.min(95, Math.abs(currentFrequency - baselineFrequency) / baselineFrequency * 100);

    return {
      isAnomalous,
      anomalyType: 'frequency',
      severity,
      confidence,
      description: description || '排便频率正常',
      recommendations,
      triggerData: {
        currentValue: currentFrequency,
        expectedValue: baselineFrequency,
        threshold: isAnomalous ? (currentFrequency < threshold.minPerWeek ? threshold.minPerWeek : threshold.maxPerWeek) : 0,
        timeframe: `${analysisWindow}天`
      }
    };
  }

  /**
   * 检测健康状态恶化
   */
  private static async detectHealthDecline(
    analysisRecords: IPoopRecord[],
    baselineRecords: IPoopRecord[],
    threshold: { concerningRatio: number; consecutiveConcerning: number }
  ): Promise<AnomalyDetectionResult> {
    const concerningCount = analysisRecords.filter(r => r.analysis.healthStatus === 'concerning').length;
    const concerningRatio = concerningCount / analysisRecords.length;

    // 检查连续异常状态
    let consecutiveConcerning = 0;
    let maxConsecutive = 0;
    for (const record of analysisRecords) {
      if (record.analysis.healthStatus === 'concerning') {
        consecutiveConcerning++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveConcerning);
      } else {
        consecutiveConcerning = 0;
      }
    }

    const isRatioAnomalous = concerningRatio > threshold.concerningRatio;
    const isConsecutiveAnomalous = maxConsecutive >= threshold.consecutiveConcerning;
    const isAnomalous = isRatioAnomalous || isConsecutiveAnomalous;

    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '';
    const recommendations: string[] = [];

    if (isAnomalous) {
      if (concerningRatio > 0.7 || maxConsecutive >= 5) {
        severity = 'high';
        description = `严重健康恶化：${(concerningRatio * 100).toFixed(1)}%的记录显示异常状态`;
        recommendations.push('立即咨询兽医，可能需要紧急处理');
        recommendations.push('暂停当前饮食，改为处方食品');
      } else if (concerningRatio > 0.5 || maxConsecutive >= threshold.consecutiveConcerning) {
        severity = 'medium';
        description = `健康状态恶化：连续${maxConsecutive}次或${(concerningRatio * 100).toFixed(1)}%记录异常`;
        recommendations.push('建议咨询兽医');
        recommendations.push('调整饮食结构，增加益生菌');
      } else {
        severity = 'low';
        description = `轻微健康恶化：需要密切观察`;
        recommendations.push('密切观察宠物状态');
        recommendations.push('记录相关症状');
      }
    }

    const confidence = Math.min(95, concerningRatio * 100);

    return {
      isAnomalous,
      anomalyType: 'health_decline',
      severity,
      confidence,
      description: description || '健康状态稳定',
      recommendations,
      triggerData: {
        currentValue: concerningRatio,
        expectedValue: threshold.concerningRatio,
        threshold: threshold.concerningRatio,
        timeframe: '分析窗口'
      }
    };
  }

  /**
   * 检测模式变化
   */
  private static async detectPatternChange(
    analysisRecords: IPoopRecord[],
    baselineRecords: IPoopRecord[],
    threshold: { shapeVariationLimit: number; consistencyChangeRatio: number }
  ): Promise<AnomalyDetectionResult> {
    if (baselineRecords.length === 0) {
      return {
        isAnomalous: false,
        anomalyType: 'pattern_change',
        severity: 'low',
        confidence: 0,
        description: '基线数据不足，无法检测模式变化',
        recommendations: [],
        triggerData: {
          currentValue: 0,
          expectedValue: 0,
          threshold: 0,
          timeframe: '基线窗口'
        }
      };
    }

    // 分析当前窗口的形状分布
    const currentShapes = this.getShapeDistribution(analysisRecords);
    const baselineShapes = this.getShapeDistribution(baselineRecords);

    // 计算形状变化程度
    const shapeVariation = Object.keys(currentShapes).length;
    const patternSimilarity = this.calculatePatternSimilarity(currentShapes, baselineShapes);

    const isShapeVariationAnomalous = shapeVariation > threshold.shapeVariationLimit;
    const isPatternChangeAnomalous = patternSimilarity < (1 - threshold.consistencyChangeRatio);
    const isAnomalous = isShapeVariationAnomalous || isPatternChangeAnomalous;

    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '';
    const recommendations: string[] = [];

    if (isAnomalous) {
      if (shapeVariation > 5 || patternSimilarity < 0.3) {
        severity = 'high';
        description = `严重模式变化：形状类型过多(${shapeVariation}种)或与历史模式差异过大`;
        recommendations.push('立即咨询兽医，排除疾病可能');
        recommendations.push('检查是否更换了食物或环境');
      } else {
        severity = 'medium';
        description = `模式变化：排便模式与历史记录存在显著差异`;
        recommendations.push('观察是否有其他症状');
        recommendations.push('考虑是否有饮食或环境变化');
      }
    }

    const confidence = Math.min(95, (1 - patternSimilarity) * 100);

    return {
      isAnomalous,
      anomalyType: 'pattern_change',
      severity,
      confidence,
      description: description || '排便模式稳定',
      recommendations,
      triggerData: {
        currentValue: patternSimilarity,
        expectedValue: 0.7,
        threshold: 1 - threshold.consistencyChangeRatio,
        timeframe: '模式对比'
      }
    };
  }

  /**
   * 检测一致性变化
   */
  private static async detectConsistencyChange(
    analysisRecords: IPoopRecord[],
    baselineRecords: IPoopRecord[]
  ): Promise<AnomalyDetectionResult> {
    if (analysisRecords.length < 3) {
      return {
        isAnomalous: false,
        anomalyType: 'consistency_change',
        severity: 'low',
        confidence: 0,
        description: '数据不足，无法检测一致性变化',
        recommendations: [],
        triggerData: {
          currentValue: 0,
          expectedValue: 0,
          threshold: 0,
          timeframe: '分析窗口'
        }
      };
    }

    // 计算形状一致性（连续记录之间的差异）
    let shapeChanges = 0;
    for (let i = 1; i < analysisRecords.length; i++) {
      const currentShape = parseInt(analysisRecords[i].analysis.shape.replace('type', ''));
      const previousShape = parseInt(analysisRecords[i-1].analysis.shape.replace('type', ''));
      if (Math.abs(currentShape - previousShape) > 2) {
        shapeChanges++;
      }
    }

    const inconsistencyRatio = shapeChanges / (analysisRecords.length - 1);
    const isAnomalous = inconsistencyRatio > 0.6; // 60%的记录之间存在显著变化

    let severity: 'low' | 'medium' | 'high' = 'low';
    let description = '';
    const recommendations: string[] = [];

    if (isAnomalous) {
      if (inconsistencyRatio > 0.8) {
        severity = 'high';
        description = `严重一致性问题：${(inconsistencyRatio * 100).toFixed(1)}%的记录存在显著变化`;
        recommendations.push('立即咨询兽医');
        recommendations.push('可能存在消化系统疾病');
      } else {
        severity = 'medium';
        description = `一致性变化：排便形状变化频繁，需要关注`;
        recommendations.push('观察饮食和环境因素');
        recommendations.push('考虑调整食物类型');
      }
    }

    const confidence = Math.min(95, inconsistencyRatio * 100);

    return {
      isAnomalous,
      anomalyType: 'consistency_change',
      severity,
      confidence,
      description: description || '排便一致性正常',
      recommendations,
      triggerData: {
        currentValue: inconsistencyRatio,
        expectedValue: 0.3,
        threshold: 0.6,
        timeframe: '连续记录对比'
      }
    };
  }

  /**
   * 获取形状分布
   */
  private static getShapeDistribution(records: IPoopRecord[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    records.forEach(record => {
      const shape = record.analysis.shape;
      distribution[shape] = (distribution[shape] || 0) + 1;
    });
    return distribution;
  }

  /**
   * 计算模式相似度
   */
  private static calculatePatternSimilarity(
    current: { [key: string]: number },
    baseline: { [key: string]: number }
  ): number {
    const allShapes = new Set([...Object.keys(current), ...Object.keys(baseline)]);
    let similarity = 0;
    let totalWeight = 0;

    for (const shape of allShapes) {
      const currentRatio = (current[shape] || 0) / Object.values(current).reduce((a, b) => a + b, 0);
      const baselineRatio = (baseline[shape] || 0) / Object.values(baseline).reduce((a, b) => a + b, 0);
      
      const weight = Math.max(currentRatio, baselineRatio);
      similarity += (1 - Math.abs(currentRatio - baselineRatio)) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  /**
   * 分析健康模式
   */
  static async analyzeHealthPattern(
    petId: string,
    days: number = 30
  ): Promise<HealthPatternAnalysis> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const records = await this.fetchRecords(petId, startDate);
      if (records.length === 0) {
        throw new Error('没有足够的数据进行模式分析');
      }
      const averageFrequency = (records.length / days) * 7;
      const healthStatusDistribution = {
        healthy: records.filter((r: any) => r.analysis.healthStatus === 'healthy').length,
        warning: records.filter((r: any) => r.analysis.healthStatus === 'warning').length,
        concerning: records.filter((r: any) => r.analysis.healthStatus === 'concerning').length
      };
      const dominantHealthStatus = Object.entries(healthStatusDistribution)
        .reduce((a, b) => (a[1] as number) > (b[1] as number) ? a : b)[0] as 'healthy' | 'warning' | 'concerning';
      const consistencyPattern = this.getShapeDistribution(records as IPoopRecord[]);
      const timePatterns = {
        morningCount: records.filter((r: any) => {
          const hour = new Date(r.timestamp).getHours();
          return hour >= 6 && hour < 12;
        }).length,
        afternoonCount: records.filter((r: any) => {
          const hour = new Date(r.timestamp).getHours();
          return hour >= 12 && hour < 18;
        }).length,
        eveningCount: records.filter((r: any) => {
          const hour = new Date(r.timestamp).getHours();
          return hour >= 18 || hour < 6;
        }).length
      };
      return {
        averageFrequency,
        dominantHealthStatus,
        healthStatusDistribution,
        consistencyPattern,
        timePatterns
      };
    } catch (error) {
      Logger.error('健康模式分析失败:', error);
      throw new Error('健康模式分析失败');
    }
  }

  /**
   * 获取异常检测摘要
   */
  static async getAnomalyDetectionSummary(petId: string): Promise<{
    hasAnomalies: boolean;
    totalAnomalies: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
    mostRecentAnomaly?: AnomalyDetectionResult;
    overallRiskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    try {
      const anomalies = await this.detectAnomalies(petId);
      
      const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
      const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length;
      const lowSeverityCount = anomalies.filter(a => a.severity === 'low').length;

      let overallRiskLevel: 'low' | 'medium' | 'high' = 'low';
      if (highSeverityCount > 0) {
        overallRiskLevel = 'high';
      } else if (mediumSeverityCount > 0) {
        overallRiskLevel = 'medium';
      }

      const allRecommendations = anomalies.flatMap(a => a.recommendations);
      const uniqueRecommendations = [...new Set(allRecommendations)];

      return {
        hasAnomalies: anomalies.length > 0,
        totalAnomalies: anomalies.length,
        highSeverityCount,
        mediumSeverityCount,
        lowSeverityCount,
        mostRecentAnomaly: anomalies.length > 0 ? anomalies[0] : undefined,
        overallRiskLevel,
        recommendations: uniqueRecommendations
      };

    } catch (error) {
      Logger.error('获取异常检测摘要失败:', error);
      throw new Error('获取异常检测摘要失败');
    }
  }
}