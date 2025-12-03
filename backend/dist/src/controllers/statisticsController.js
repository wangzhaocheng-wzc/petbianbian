"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsController = void 0;
const statisticsService_1 = require("../services/statisticsService");
const logger_1 = require("../utils/logger");
const postgres_1 = require("../config/postgres");
class StatisticsController {
    /**
     * 获取健康趋势数据
     */
    static async getHealthTrends(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user?.userId;
            const { days = '30', granularity = 'daily' } = req.query;
            // 兼容 UUID 或 ObjectId，去除 ObjectId 校验
            if (!petId) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权（PG查询）
            const pool = await (0, postgres_1.getPostgresPool)();
            const petRes = await pool.query('SELECT id, name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true LIMIT 1', [petId, userId]);
            if (!petRes.rows[0]) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const pet = petRes.rows[0];
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
            const userId = req.user?.userId;
            const { period = 'month' } = req.query;
            // 兼容 UUID 或 ObjectId，去除 ObjectId 校验
            if (!petId) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 兼容 UUID，使用 PostgreSQL 查询 pets 表校验宠物所有权
            const pool = await (0, postgres_1.getPostgresPool)();
            const petsRes = await pool.query('SELECT id, name, type, breed, avatar FROM pets WHERE owner_id = $1 AND is_active = true', [userId]);
            const pets = petsRes.rows;
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
            // 验证宠物所有权（PG查询）
            const petRes = await pool.query('SELECT id, name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true LIMIT 1', [petId, userId]);
            if (!petRes.rows[0]) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const pet = petRes.rows[0];
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
            const userId = req.user?.userId;
            const { window = '30' } = req.query;
            // 兼容 UUID 或 ObjectId，去除 ObjectId 校验
            if (!petId) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权（PG查询）
            const pool = await (0, postgres_1.getPostgresPool)();
            const petRes = await pool.query('SELECT id, name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true LIMIT 1', [petId, userId]);
            if (!petRes.rows[0]) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const pet = petRes.rows[0];
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
            const userId = req.user?.userId;
            const { period = 'month' } = req.query;
            // 兼容 UUID 或 ObjectId，去除 ObjectId 校验
            if (!petId) {
                res.status(400).json({
                    success: false,
                    message: '无效的宠物ID'
                });
                return;
            }
            // 验证宠物所有权（PG查询，兼容UUID）并获取名称
            const pool = await (0, postgres_1.getPostgresPool)();
            const petRes = await pool.query('SELECT id, name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true LIMIT 1', [petId, userId]);
            if (!petRes.rows[0]) {
                res.status(404).json({
                    success: false,
                    message: '宠物不存在或无权限访问'
                });
                return;
            }
            const pet = petRes.rows[0];
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
            const userId = req.user?.userId;
            const { period = 'month' } = req.query;
            // 获取用户的所有宠物（PG查询）
            const pool = await (0, postgres_1.getPostgresPool)();
            const petsRes = await pool.query('SELECT id, name, type, breed, avatar_url, is_active FROM pets WHERE owner_id = $1 AND is_active = true', [userId]);
            const pets = petsRes.rows;
            // 获取不同时间段的统计数据
            const [weekStats, monthStats, quarterStats] = await Promise.all([
                StatisticsController.calculateUserPeriodStats(userId, 'week'),
                StatisticsController.calculateUserPeriodStats(userId, 'month'),
                StatisticsController.calculateUserPeriodStats(userId, 'quarter')
            ]);
            // 获取最近的异常情况
            const recentAnomalies = await Promise.all(pets.map(async (pet) => {
                try {
                    const anomalies = await statisticsService_1.StatisticsService.detectAnomalyPatterns(pet.id, 7);
                    return anomalies.map(anomaly => ({
                        ...anomaly,
                        petId: pet.id,
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
                    activePets: pets.filter(p => p.is_active).length,
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
    /**
     * 用户整体统计概览
     */
    static async getUserOverview(req, res) {
        try {
            const userId = req.user?.userId;
            const { period = 'month' } = req.query;
            if (!userId) {
                res.status(401).json({ success: false, message: '用户未认证' });
                return;
            }
            const overview = await StatisticsController.calculateUserPeriodStats(userId, period);
            res.json({ success: true, data: overview });
        }
        catch (error) {
            logger_1.Logger.error('获取用户概览失败:', error);
            res.status(500).json({ success: false, message: '获取用户概览失败' });
        }
    }
    // 私有辅助方法
    static async calculateUserPeriodStats(userId, period) {
        // 统计分析逻辑切换为 PG SQL 查询
        const pool = await (0, postgres_1.getPostgresPool)();
        const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
        const days = daysMap[period];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // 查询 poop_records 表统计数据
        const statsRes = await pool.query(`SELECT
         COUNT(*) AS total_records,
         SUM(CASE WHEN analysis->>'healthStatus' = 'healthy' THEN 1 ELSE 0 END) AS healthy_count,
         SUM(CASE WHEN analysis->>'healthStatus' = 'warning' THEN 1 ELSE 0 END) AS warning_count,
         SUM(CASE WHEN analysis->>'healthStatus' = 'concerning' THEN 1 ELSE 0 END) AS concerning_count,
         AVG((analysis->>'confidence')::float) AS avg_confidence,
         COUNT(DISTINCT pet_id) AS active_pets
       FROM poop_records
       WHERE owner_id = $1 AND timestamp >= $2 AND timestamp <= $3`, [userId, startDate, endDate]);
        const result = statsRes.rows[0];
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
        const healthyPercentage = result.total_records > 0 ? Math.round((result.healthy_count / result.total_records) * 100) : 0;
        const warningPercentage = result.total_records > 0 ? Math.round((result.warning_count / result.total_records) * 100) : 0;
        const concerningPercentage = result.total_records > 0 ? Math.round((result.concerning_count / result.total_records) * 100) : 0;
        const frequencyPerWeek = Math.round((result.total_records / days) * 7 * 10) / 10;
        return {
            period,
            totalRecords: Number(result.total_records),
            healthyCount: Number(result.healthy_count),
            warningCount: Number(result.warning_count),
            concerningCount: Number(result.concerning_count),
            healthyPercentage,
            warningPercentage,
            concerningPercentage,
            averageConfidence: Math.round(result.avg_confidence || 0),
            frequencyPerWeek,
            activePets: Number(result.active_pets)
        };
    }
}
exports.StatisticsController = StatisticsController;
//# sourceMappingURL=statisticsController.js.map