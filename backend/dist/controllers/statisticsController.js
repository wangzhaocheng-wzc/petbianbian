"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsController = void 0;
const statisticsService_1 = require("../services/statisticsService");
const Pet_1 = __importDefault(require("../models/Pet"));
const logger_1 = require("../utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
class StatisticsController {
    /**
     * 获取健康趋势数据
     */
    static async getHealthTrends(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.id;
            const { days = '30', granularity = 'daily' } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(petId)) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权
            const pet = await Pet_1.default.findOne({ _id: petId, ownerId: userId });
            if (!pet) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const daysNum = Math.min(365, Math.max(7, parseInt(days))); // 限制在7-365天之间
            const trends = await statisticsService_1.StatisticsService.calculateHealthTrends(petId, daysNum, granularity);
            res.json({
                success: true,
                data: {
                    petId,
                    petName: pet.name,
                    days: daysNum,
                    granularity,
                    trends
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取健康趋势失败:', error);
            res.status(500).json({
                success: false,
                message: '获取健康趋势失败'
            });
        }
    }
    /**
     * 获取周期统计数据
     */
    static async getPeriodStatistics(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.id;
            const { period = 'month' } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(petId)) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权
            const pet = await Pet_1.default.findOne({ _id: petId, ownerId: userId });
            if (!pet) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const statistics = await statisticsService_1.StatisticsService.calculatePeriodStatistics(petId, period);
            res.json({
                success: true,
                data: {
                    petId,
                    petName: pet.name,
                    ...statistics
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取周期统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取周期统计失败'
            });
        }
    }
    /**
     * 获取异常模式检测结果
     */
    static async getAnomalyPatterns(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.id;
            const { window = '30' } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(petId)) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权
            const pet = await Pet_1.default.findOne({ _id: petId, ownerId: userId });
            if (!pet) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const windowDays = Math.min(90, Math.max(7, parseInt(window))); // 限制在7-90天之间
            const anomalies = await statisticsService_1.StatisticsService.detectAnomalyPatterns(petId, windowDays);
            // 按严重程度排序
            const sortedAnomalies = anomalies.sort((a, b) => {
                const severityOrder = { high: 3, medium: 2, low: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            });
            res.json({
                success: true,
                data: {
                    petId,
                    petName: pet.name,
                    analysisWindow: windowDays,
                    anomaliesCount: sortedAnomalies.length,
                    highSeverityCount: sortedAnomalies.filter(a => a.severity === 'high').length,
                    mediumSeverityCount: sortedAnomalies.filter(a => a.severity === 'medium').length,
                    lowSeverityCount: sortedAnomalies.filter(a => a.severity === 'low').length,
                    anomalies: sortedAnomalies
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取异常模式失败:', error);
            res.status(500).json({
                success: false,
                message: '获取异常模式失败'
            });
        }
    }
    /**
     * 获取对比分析结果
     */
    static async getComparisonAnalysis(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.id;
            const { period = 'month' } = req.query;
            if (!mongoose_1.default.Types.ObjectId.isValid(petId)) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权
            const pet = await Pet_1.default.findOne({ _id: petId, ownerId: userId });
            if (!pet) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const comparison = await statisticsService_1.StatisticsService.performComparisonAnalysis(petId, period);
            res.json({
                success: true,
                data: {
                    petId,
                    petName: pet.name,
                    ...comparison
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取对比分析失败:', error);
            res.status(500).json({
                success: false,
                message: '获取对比分析失败'
            });
        }
    }
    /**
     * 获取多宠物统计汇总
     */
    static async getMultiPetSummary(req, res) {
        try {
            const userId = req.user.id;
            const { period = 'month' } = req.query;
            // 获取用户的所有宠物
            const pets = await Pet_1.default.find({ ownerId: userId, isActive: true });
            if (pets.length === 0) {
                res.json({
                    success: true,
                    data: {
                        totalPets: 0,
                        petSummaries: [],
                        overallStatistics: {
                            totalRecords: 0,
                            averageHealthyPercentage: 0,
                            averageWarningPercentage: 0,
                            averageConcerningPercentage: 0,
                            totalAnomalies: 0
                        }
                    }
                });
                return;
            }
            // 并行获取每个宠物的统计数据
            const petSummaries = await Promise.all(pets.map(async (pet) => {
                try {
                    const [statistics, anomalies] = await Promise.all([
                        statisticsService_1.StatisticsService.calculatePeriodStatistics(pet._id.toString(), period),
                        statisticsService_1.StatisticsService.detectAnomalyPatterns(pet._id.toString(), 30)
                    ]);
                    return {
                        petId: pet._id,
                        petName: pet.name,
                        petType: pet.type,
                        petBreed: pet.breed,
                        petAvatar: pet.avatar,
                        statistics,
                        anomaliesCount: anomalies.length,
                        highSeverityAnomalies: anomalies.filter(a => a.severity === 'high').length,
                        lastAnalyzed: statistics.endDate
                    };
                }
                catch (error) {
                    logger_1.Logger.error(`获取宠物${pet.name}统计失败:`, error);
                    return {
                        petId: pet._id,
                        petName: pet.name,
                        petType: pet.type,
                        petBreed: pet.breed,
                        petAvatar: pet.avatar,
                        statistics: null,
                        anomaliesCount: 0,
                        highSeverityAnomalies: 0,
                        lastAnalyzed: null,
                        error: '统计数据获取失败'
                    };
                }
            }));
            // 计算整体统计
            const validSummaries = petSummaries.filter(s => s.statistics !== null);
            const overallStatistics = {
                totalRecords: validSummaries.reduce((sum, s) => sum + (s.statistics?.totalRecords || 0), 0),
                averageHealthyPercentage: validSummaries.length > 0
                    ? Math.round(validSummaries.reduce((sum, s) => sum + (s.statistics?.healthyPercentage || 0), 0) / validSummaries.length)
                    : 0,
                averageWarningPercentage: validSummaries.length > 0
                    ? Math.round(validSummaries.reduce((sum, s) => sum + (s.statistics?.warningPercentage || 0), 0) / validSummaries.length)
                    : 0,
                averageConcerningPercentage: validSummaries.length > 0
                    ? Math.round(validSummaries.reduce((sum, s) => sum + (s.statistics?.concerningPercentage || 0), 0) / validSummaries.length)
                    : 0,
                totalAnomalies: petSummaries.reduce((sum, s) => sum + s.anomaliesCount, 0),
                highSeverityAnomalies: petSummaries.reduce((sum, s) => sum + s.highSeverityAnomalies, 0)
            };
            res.json({
                success: true,
                data: {
                    period,
                    totalPets: pets.length,
                    activePets: validSummaries.length,
                    petSummaries,
                    overallStatistics
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取多宠物汇总失败:', error);
            res.status(500).json({
                success: false,
                message: '获取多宠物汇总失败'
            });
        }
    }
    /**
     * 获取用户整体统计概览
     */
    static async getUserOverview(req, res) {
        try {
            const userId = req.user.id;
            // 获取用户的所有宠物
            const pets = await Pet_1.default.find({ ownerId: userId, isActive: true });
            // 获取不同时间段的统计数据
            const [weekStats, monthStats, quarterStats] = await Promise.all([
                this.calculateUserPeriodStats(userId, 'week'),
                this.calculateUserPeriodStats(userId, 'month'),
                this.calculateUserPeriodStats(userId, 'quarter')
            ]);
            // 获取最近的异常情况
            const recentAnomalies = await Promise.all(pets.map(async (pet) => {
                try {
                    const anomalies = await statisticsService_1.StatisticsService.detectAnomalyPatterns(pet._id.toString(), 7);
                    return anomalies.map(anomaly => ({
                        ...anomaly,
                        petId: pet._id,
                        petName: pet.name
                    }));
                }
                catch (error) {
                    return [];
                }
            }));
            const flattenedAnomalies = recentAnomalies.flat()
                .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
                .slice(0, 10); // 最近10个异常
            res.json({
                success: true,
                data: {
                    totalPets: pets.length,
                    activePets: pets.filter(p => p.isActive).length,
                    periodStatistics: {
                        week: weekStats,
                        month: monthStats,
                        quarter: quarterStats
                    },
                    recentAnomalies: flattenedAnomalies,
                    summary: {
                        totalRecordsThisMonth: monthStats.totalRecords,
                        healthyRateThisMonth: monthStats.healthyPercentage,
                        activeAnomalies: flattenedAnomalies.filter(a => a.severity === 'high').length,
                        averageFrequencyPerWeek: monthStats.frequencyPerWeek
                    }
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取用户概览失败:', error);
            res.status(500).json({
                success: false,
                message: '获取用户概览失败'
            });
        }
    }
    // 私有辅助方法
    static async calculateUserPeriodStats(userId, period) {
        const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
        const days = daysMap[period];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const { PoopRecord } = await Promise.resolve().then(() => __importStar(require('../models/PoopRecord')));
        const pipeline = [
            {
                $match: {
                    userId: new mongoose_1.default.Types.ObjectId(userId),
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
                    uniquePets: { $addToSet: '$petId' }
                }
            }
        ];
        const [result] = await PoopRecord.aggregate(pipeline);
        if (!result) {
            return {
                period,
                totalRecords: 0,
                healthyCount: 0,
                warningCount: 0,
                concerningCount: 0,
                healthyPercentage: 0,
                warningPercentage: 0,
                concerningPercentage: 0,
                averageConfidence: 0,
                frequencyPerWeek: 0,
                activePets: 0
            };
        }
        const healthyPercentage = result.totalRecords > 0 ? Math.round((result.healthyCount / result.totalRecords) * 100) : 0;
        const warningPercentage = result.totalRecords > 0 ? Math.round((result.warningCount / result.totalRecords) * 100) : 0;
        const concerningPercentage = result.totalRecords > 0 ? Math.round((result.concerningCount / result.totalRecords) * 100) : 0;
        const frequencyPerWeek = Math.round((result.totalRecords / days) * 7 * 10) / 10;
        return {
            period,
            totalRecords: result.totalRecords,
            healthyCount: result.healthyCount,
            warningCount: result.warningCount,
            concerningCount: result.concerningCount,
            healthyPercentage,
            warningPercentage,
            concerningPercentage,
            averageConfidence: Math.round(result.avgConfidence || 0),
            frequencyPerWeek,
            activePets: result.uniquePets.length
        };
    }
}
exports.StatisticsController = StatisticsController;
//# sourceMappingURL=statisticsController.js.map