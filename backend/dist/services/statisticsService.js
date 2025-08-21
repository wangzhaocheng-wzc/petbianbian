"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const PoopRecord_1 = require("../models/PoopRecord");
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
class StatisticsService {
    /**
     * 计算健康趋势分析
     */
    static async calculateHealthTrends(petId, days = 30, granularity = 'daily') {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            let groupByFormat;
            let dateIncrement;
            if (granularity === 'weekly') {
                // 按周分组
                groupByFormat = "%Y-%U"; // 年-周数
                dateIncrement = 7;
            }
            else {
                // 按日分组
                groupByFormat = "%Y-%m-%d";
                dateIncrement = 1;
            }
            const pipeline = [
                {
                    $match: {
                        petId: new mongoose_1.default.Types.ObjectId(petId),
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            period: { $dateToString: { format: groupByFormat, date: "$timestamp" } },
                            healthStatus: '$analysis.healthStatus'
                        },
                        count: { $sum: 1 },
                        avgConfidence: { $avg: '$analysis.confidence' }
                    }
                },
                {
                    $group: {
                        _id: '$_id.period',
                        healthy: {
                            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'healthy'] }, '$count', 0] }
                        },
                        warning: {
                            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'warning'] }, '$count', 0] }
                        },
                        concerning: {
                            $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'concerning'] }, '$count', 0] }
                        },
                        avgConfidence: { $avg: '$avgConfidence' }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ];
            const results = await PoopRecord_1.PoopRecord.aggregate(pipeline);
            // 填充缺失的日期/周期
            const trendPoints = [];
            const currentDate = new Date(startDate);
            const endDate = new Date();
            while (currentDate <= endDate) {
                let periodKey;
                let displayDate;
                if (granularity === 'weekly') {
                    const year = currentDate.getFullYear();
                    const week = this.getWeekNumber(currentDate);
                    periodKey = `${year}-${week.toString().padStart(2, '0')}`;
                    displayDate = this.getWeekStartDate(currentDate).toISOString().split('T')[0];
                }
                else {
                    periodKey = currentDate.toISOString().split('T')[0];
                    displayDate = periodKey;
                }
                const data = results.find(r => r._id === periodKey);
                const healthy = data?.healthy || 0;
                const warning = data?.warning || 0;
                const concerning = data?.concerning || 0;
                const total = healthy + warning + concerning;
                trendPoints.push({
                    date: displayDate,
                    healthy,
                    warning,
                    concerning,
                    total,
                    healthyPercentage: total > 0 ? Math.round((healthy / total) * 100) : 0,
                    warningPercentage: total > 0 ? Math.round((warning / total) * 100) : 0,
                    concerningPercentage: total > 0 ? Math.round((concerning / total) * 100) : 0
                });
                currentDate.setDate(currentDate.getDate() + dateIncrement);
            }
            return trendPoints;
        }
        catch (error) {
            logger_1.Logger.error('计算健康趋势失败:', error);
            throw new Error('计算健康趋势失败');
        }
    }
    /**
     * 计算周期统计数据
     */
    static async calculatePeriodStatistics(petId, period) {
        try {
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
            const days = daysMap[period];
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const pipeline = [
                {
                    $match: {
                        petId: new mongoose_1.default.Types.ObjectId(petId),
                        timestamp: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRecords: { $sum: 1 },
                        healthyCount: {
                            $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'healthy'] }, 1, 0] }
                        },
                        warningCount: {
                            $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'warning'] }, 1, 0] }
                        },
                        concerningCount: {
                            $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'concerning'] }, 1, 0] }
                        },
                        avgConfidence: { $avg: '$analysis.confidence' },
                        shapes: { $push: '$analysis.shape' },
                        symptoms: { $push: '$symptoms' }
                    }
                }
            ];
            const [result] = await PoopRecord_1.PoopRecord.aggregate(pipeline);
            if (!result) {
                return {
                    period,
                    startDate,
                    endDate,
                    totalRecords: 0,
                    healthyCount: 0,
                    warningCount: 0,
                    concerningCount: 0,
                    healthyPercentage: 0,
                    warningPercentage: 0,
                    concerningPercentage: 0,
                    averageConfidence: 0,
                    frequencyPerWeek: 0,
                    shapeDistribution: {},
                    symptomsFrequency: {}
                };
            }
            // 计算百分比
            const healthyPercentage = result.totalRecords > 0
                ? Math.round((result.healthyCount / result.totalRecords) * 100)
                : 0;
            const warningPercentage = result.totalRecords > 0
                ? Math.round((result.warningCount / result.totalRecords) * 100)
                : 0;
            const concerningPercentage = result.totalRecords > 0
                ? Math.round((result.concerningCount / result.totalRecords) * 100)
                : 0;
            // 计算频率（每周平均次数）
            const frequencyPerWeek = Math.round((result.totalRecords / days) * 7 * 10) / 10;
            // 计算形状分布
            const shapeDistribution = {};
            result.shapes.forEach((shape) => {
                shapeDistribution[shape] = (shapeDistribution[shape] || 0) + 1;
            });
            // 计算症状频率
            const symptomsFrequency = {};
            result.symptoms.forEach((symptomArray) => {
                if (Array.isArray(symptomArray)) {
                    symptomArray.forEach(symptom => {
                        if (symptom) {
                            symptomsFrequency[symptom] = (symptomsFrequency[symptom] || 0) + 1;
                        }
                    });
                }
            });
            return {
                period,
                startDate,
                endDate,
                totalRecords: result.totalRecords,
                healthyCount: result.healthyCount,
                warningCount: result.warningCount,
                concerningCount: result.concerningCount,
                healthyPercentage,
                warningPercentage,
                concerningPercentage,
                averageConfidence: Math.round(result.avgConfidence || 0),
                frequencyPerWeek,
                shapeDistribution,
                symptomsFrequency
            };
        }
        catch (error) {
            logger_1.Logger.error('计算周期统计失败:', error);
            throw new Error('计算周期统计失败');
        }
    }
    /**
     * 异常模式识别
     */
    static async detectAnomalyPatterns(petId, analysisWindow = 30) {
        try {
            const anomalies = [];
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - analysisWindow);
            // 获取分析窗口内的所有记录
            const records = await PoopRecord_1.PoopRecord.find({
                petId: new mongoose_1.default.Types.ObjectId(petId),
                timestamp: { $gte: startDate, $lte: endDate }
            }).sort({ timestamp: 1 });
            if (records.length < 5) {
                return anomalies; // 数据不足，无法进行异常检测
            }
            // 1. 检测健康状态突然下降
            const healthDeclineAnomaly = this.detectSuddenHealthDecline(records);
            if (healthDeclineAnomaly) {
                anomalies.push(healthDeclineAnomaly);
            }
            // 2. 检测持续警告状态
            const persistentWarningAnomaly = this.detectPersistentWarning(records);
            if (persistentWarningAnomaly) {
                anomalies.push(persistentWarningAnomaly);
            }
            // 3. 检测频率异常下降
            const frequencyDropAnomaly = this.detectFrequencyDrop(records, analysisWindow);
            if (frequencyDropAnomaly) {
                anomalies.push(frequencyDropAnomaly);
            }
            // 4. 检测置信度持续下降
            const confidenceDropAnomaly = this.detectConfidenceDrop(records);
            if (confidenceDropAnomaly) {
                anomalies.push(confidenceDropAnomaly);
            }
            // 5. 检测形状模式突变
            const shapeChangeAnomaly = this.detectShapePatternChange(records);
            if (shapeChangeAnomaly) {
                anomalies.push(shapeChangeAnomaly);
            }
            return anomalies;
        }
        catch (error) {
            logger_1.Logger.error('异常模式识别失败:', error);
            throw new Error('异常模式识别失败');
        }
    }
    /**
     * 对比分析（当前周期 vs 上一周期）
     */
    static async performComparisonAnalysis(petId, period = 'month') {
        try {
            const currentStats = await this.calculatePeriodStatistics(petId, period);
            // 计算上一周期的统计数据
            const daysMap = { week: 7, month: 30, quarter: 90 };
            const days = daysMap[period];
            const previousEndDate = new Date();
            previousEndDate.setDate(previousEndDate.getDate() - days);
            const previousStartDate = new Date();
            previousStartDate.setDate(previousStartDate.getDate() - days * 2);
            const previousStats = await this.calculatePeriodStatisticsForDateRange(petId, previousStartDate, previousEndDate, period);
            // 计算变化
            const changes = {
                healthyChange: currentStats.healthyPercentage - previousStats.healthyPercentage,
                warningChange: currentStats.warningPercentage - previousStats.warningPercentage,
                concerningChange: currentStats.concerningPercentage - previousStats.concerningPercentage,
                confidenceChange: currentStats.averageConfidence - previousStats.averageConfidence,
                frequencyChange: currentStats.frequencyPerWeek - previousStats.frequencyPerWeek
            };
            // 判断总体趋势
            let trend;
            const healthyChange = changes.healthyChange;
            const concerningChange = changes.concerningChange;
            if (healthyChange > 10 || concerningChange < -10) {
                trend = 'improving';
            }
            else if (healthyChange < -10 || concerningChange > 10) {
                trend = 'declining';
            }
            else {
                trend = 'stable';
            }
            // 识别显著变化
            const significantChanges = [];
            if (Math.abs(changes.healthyChange) > 15) {
                significantChanges.push(`健康记录${changes.healthyChange > 0 ? '增加' : '减少'}了${Math.abs(changes.healthyChange)}%`);
            }
            if (Math.abs(changes.concerningChange) > 10) {
                significantChanges.push(`异常记录${changes.concerningChange > 0 ? '增加' : '减少'}了${Math.abs(changes.concerningChange)}%`);
            }
            if (Math.abs(changes.frequencyChange) > 1) {
                significantChanges.push(`排便频率${changes.frequencyChange > 0 ? '增加' : '减少'}了${Math.abs(changes.frequencyChange).toFixed(1)}次/周`);
            }
            if (Math.abs(changes.confidenceChange) > 10) {
                significantChanges.push(`分析置信度${changes.confidenceChange > 0 ? '提高' : '降低'}了${Math.abs(changes.confidenceChange)}%`);
            }
            return {
                currentPeriod: currentStats,
                previousPeriod: previousStats,
                changes,
                trend,
                significantChanges
            };
        }
        catch (error) {
            logger_1.Logger.error('对比分析失败:', error);
            throw new Error('对比分析失败');
        }
    }
    // 私有辅助方法
    static async calculatePeriodStatisticsForDateRange(petId, startDate, endDate, period) {
        const pipeline = [
            {
                $match: {
                    petId: new mongoose_1.default.Types.ObjectId(petId),
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRecords: { $sum: 1 },
                    healthyCount: {
                        $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'healthy'] }, 1, 0] }
                    },
                    warningCount: {
                        $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'warning'] }, 1, 0] }
                    },
                    concerningCount: {
                        $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'concerning'] }, 1, 0] }
                    },
                    avgConfidence: { $avg: '$analysis.confidence' },
                    shapes: { $push: '$analysis.shape' },
                    symptoms: { $push: '$symptoms' }
                }
            }
        ];
        const [result] = await PoopRecord_1.PoopRecord.aggregate(pipeline);
        if (!result) {
            return {
                period,
                startDate,
                endDate,
                totalRecords: 0,
                healthyCount: 0,
                warningCount: 0,
                concerningCount: 0,
                healthyPercentage: 0,
                warningPercentage: 0,
                concerningPercentage: 0,
                averageConfidence: 0,
                frequencyPerWeek: 0,
                shapeDistribution: {},
                symptomsFrequency: {}
            };
        }
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const healthyPercentage = result.totalRecords > 0 ? Math.round((result.healthyCount / result.totalRecords) * 100) : 0;
        const warningPercentage = result.totalRecords > 0 ? Math.round((result.warningCount / result.totalRecords) * 100) : 0;
        const concerningPercentage = result.totalRecords > 0 ? Math.round((result.concerningCount / result.totalRecords) * 100) : 0;
        const frequencyPerWeek = Math.round((result.totalRecords / days) * 7 * 10) / 10;
        const shapeDistribution = {};
        result.shapes.forEach((shape) => {
            shapeDistribution[shape] = (shapeDistribution[shape] || 0) + 1;
        });
        const symptomsFrequency = {};
        result.symptoms.forEach((symptomArray) => {
            if (Array.isArray(symptomArray)) {
                symptomArray.forEach(symptom => {
                    if (symptom) {
                        symptomsFrequency[symptom] = (symptomsFrequency[symptom] || 0) + 1;
                    }
                });
            }
        });
        return {
            period,
            startDate,
            endDate,
            totalRecords: result.totalRecords,
            healthyCount: result.healthyCount,
            warningCount: result.warningCount,
            concerningCount: result.concerningCount,
            healthyPercentage,
            warningPercentage,
            concerningPercentage,
            averageConfidence: Math.round(result.avgConfidence || 0),
            frequencyPerWeek,
            shapeDistribution,
            symptomsFrequency
        };
    }
    static detectSuddenHealthDecline(records) {
        if (records.length < 10)
            return null;
        const recentRecords = records.slice(-7); // 最近7条记录
        const earlierRecords = records.slice(-14, -7); // 之前7条记录
        const recentHealthyRate = recentRecords.filter(r => r.analysis.healthStatus === 'healthy').length / recentRecords.length;
        const earlierHealthyRate = earlierRecords.filter(r => r.analysis.healthStatus === 'healthy').length / earlierRecords.length;
        const decline = earlierHealthyRate - recentHealthyRate;
        if (decline > 0.4) { // 健康率下降超过40%
            return {
                type: 'sudden_decline',
                severity: decline > 0.6 ? 'high' : 'medium',
                description: `健康状态出现突然下降，健康率从${Math.round(earlierHealthyRate * 100)}%降至${Math.round(recentHealthyRate * 100)}%`,
                detectedAt: new Date(),
                affectedPeriod: {
                    start: recentRecords[0].timestamp,
                    end: recentRecords[recentRecords.length - 1].timestamp
                },
                metrics: {
                    previousHealthyRate: Math.round(earlierHealthyRate * 100),
                    currentHealthyRate: Math.round(recentHealthyRate * 100),
                    decline: Math.round(decline * 100)
                },
                recommendations: [
                    '建议立即关注宠物的饮食和生活环境',
                    '如果情况持续，请咨询兽医',
                    '增加观察频率，记录更多健康数据'
                ]
            };
        }
        return null;
    }
    static detectPersistentWarning(records) {
        if (records.length < 5)
            return null;
        const recentRecords = records.slice(-5);
        const warningCount = recentRecords.filter(r => r.analysis.healthStatus === 'warning').length;
        if (warningCount >= 4) { // 最近5次中有4次或以上是警告状态
            return {
                type: 'persistent_warning',
                severity: warningCount === 5 ? 'high' : 'medium',
                description: `持续出现警告状态，最近5次记录中有${warningCount}次为警告状态`,
                detectedAt: new Date(),
                affectedPeriod: {
                    start: recentRecords[0].timestamp,
                    end: recentRecords[recentRecords.length - 1].timestamp
                },
                metrics: {
                    warningCount,
                    totalRecords: recentRecords.length,
                    warningRate: Math.round((warningCount / recentRecords.length) * 100)
                },
                recommendations: [
                    '建议调整宠物的饮食结构',
                    '增加纤维摄入，确保充足饮水',
                    '如果持续一周以上，建议咨询兽医'
                ]
            };
        }
        return null;
    }
    static detectFrequencyDrop(records, windowDays) {
        if (records.length < 3)
            return null;
        const expectedFrequency = 1; // 期望每天至少1次
        const actualFrequency = records.length / windowDays;
        if (actualFrequency < 0.5) { // 实际频率低于期望的50%
            return {
                type: 'frequency_drop',
                severity: actualFrequency < 0.3 ? 'high' : 'medium',
                description: `排便频率异常偏低，平均每天${actualFrequency.toFixed(1)}次`,
                detectedAt: new Date(),
                affectedPeriod: {
                    start: records[0].timestamp,
                    end: records[records.length - 1].timestamp
                },
                metrics: {
                    actualFrequency: Math.round(actualFrequency * 10) / 10,
                    expectedFrequency,
                    recordCount: records.length,
                    windowDays
                },
                recommendations: [
                    '检查宠物是否有便秘问题',
                    '增加运动量和水分摄入',
                    '考虑调整饮食，增加纤维含量'
                ]
            };
        }
        return null;
    }
    static detectConfidenceDrop(records) {
        if (records.length < 5)
            return null;
        const recentRecords = records.slice(-5);
        const avgConfidence = recentRecords.reduce((sum, r) => sum + r.analysis.confidence, 0) / recentRecords.length;
        if (avgConfidence < 60) { // 平均置信度低于60%
            return {
                type: 'confidence_drop',
                severity: avgConfidence < 40 ? 'high' : 'medium',
                description: `分析置信度持续偏低，平均置信度为${Math.round(avgConfidence)}%`,
                detectedAt: new Date(),
                affectedPeriod: {
                    start: recentRecords[0].timestamp,
                    end: recentRecords[recentRecords.length - 1].timestamp
                },
                metrics: {
                    avgConfidence: Math.round(avgConfidence),
                    recordCount: recentRecords.length
                },
                recommendations: [
                    '建议上传更清晰的照片',
                    '确保照片光线充足，角度合适',
                    '如果持续出现低置信度，可能需要人工确认'
                ]
            };
        }
        return null;
    }
    static detectShapePatternChange(records) {
        if (records.length < 10)
            return null;
        const recentRecords = records.slice(-5);
        const earlierRecords = records.slice(-10, -5);
        // 计算形状分布
        const getShapeDistribution = (recordSet) => {
            const dist = {};
            recordSet.forEach(r => {
                dist[r.analysis.shape] = (dist[r.analysis.shape] || 0) + 1;
            });
            return dist;
        };
        const recentDist = getShapeDistribution(recentRecords);
        const earlierDist = getShapeDistribution(earlierRecords);
        // 检查是否有显著的形状模式变化
        const recentDominantShape = Object.keys(recentDist).reduce((a, b) => recentDist[a] > recentDist[b] ? a : b);
        const earlierDominantShape = Object.keys(earlierDist).reduce((a, b) => earlierDist[a] > earlierDist[b] ? a : b);
        if (recentDominantShape !== earlierDominantShape) {
            const shapeDescriptions = {
                type1: '硬球状',
                type2: '块状',
                type3: '裂纹香肠状',
                type4: '光滑香肠状',
                type5: '软块状',
                type6: '糊状',
                type7: '水状'
            };
            return {
                type: 'shape_change',
                severity: 'medium',
                description: `便便形状模式发生变化，从主要的${shapeDescriptions[earlierDominantShape]}变为${shapeDescriptions[recentDominantShape]}`,
                detectedAt: new Date(),
                affectedPeriod: {
                    start: recentRecords[0].timestamp,
                    end: recentRecords[recentRecords.length - 1].timestamp
                },
                metrics: {
                    previousDominantShape: earlierDominantShape,
                    currentDominantShape: recentDominantShape,
                    previousShapeDescription: shapeDescriptions[earlierDominantShape],
                    currentShapeDescription: shapeDescriptions[recentDominantShape]
                },
                recommendations: [
                    '观察宠物是否有其他症状',
                    '检查最近的饮食变化',
                    '如果伴随其他异常症状，建议咨询兽医'
                ]
            };
        }
        return null;
    }
    static getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
    static getWeekStartDate(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
        return new Date(d.setDate(diff));
    }
}
exports.StatisticsService = StatisticsService;
//# sourceMappingURL=statisticsService.js.map