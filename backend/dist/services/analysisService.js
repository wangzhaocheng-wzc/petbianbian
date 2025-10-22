"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PoopRecord_1 = require("../models/PoopRecord");
const logger_1 = require("../utils/logger");
const pgSyncService_1 = require("./pgSyncService");
class AnalysisService {
    /**
     * 创建分析记录
     */
    static async createAnalysisRecord(params) {
        try {
            const record = new PoopRecord_1.PoopRecord({
                userId: params.userId,
                petId: params.petId,
                imageUrl: params.imageUrl,
                analysis: {
                    healthStatus: params.result.healthStatus,
                    shape: params.result.shape,
                    confidence: params.result.confidence,
                    details: params.result.details,
                    recommendations: params.result.recommendations,
                    detectedFeatures: params.result.detectedFeatures
                },
                timestamp: new Date(),
                shared: false
            });
            await record.save();
            // PG双写（若未建立用户或宠物映射则自动跳过）
            (0, pgSyncService_1.upsertPoopRecord)(String(record.userId), String(record.petId), record);
            return record;
        }
        catch (error) {
            logger_1.Logger.error('创建分析记录失败:', error);
            throw error;
        }
    }
    /**
     * 获取分析记录列表
     */
    static async getAnalysisRecords(query) {
        try {
            const { userId, petId, startDate, endDate, healthStatus, page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = query;
            const filter = {};
            if (userId)
                filter.userId = userId;
            if (petId)
                filter.petId = petId;
            if (healthStatus)
                filter['analysis.healthStatus'] = healthStatus;
            if (startDate || endDate) {
                filter.timestamp = {};
                if (startDate)
                    filter.timestamp.$gte = startDate;
                if (endDate)
                    filter.timestamp.$lte = endDate;
            }
            const total = await PoopRecord_1.PoopRecord.countDocuments(filter);
            const records = await PoopRecord_1.PoopRecord.find(filter)
                .sort({ [sortBy]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec();
            return {
                records,
                total
            };
        }
        catch (error) {
            logger_1.Logger.error('获取分析记录列表失败:', error);
            throw error;
        }
    }
    /**
     * 获取单个分析记录
     */
    static async getAnalysisRecord(id, userId) {
        try {
            const filter = { _id: id };
            if (userId)
                filter.userId = userId;
            const record = await PoopRecord_1.PoopRecord.findOne(filter);
            return record;
        }
        catch (error) {
            logger_1.Logger.error('获取分析记录失败:', error);
            throw error;
        }
    }
    /**
     * 更新分析记录
     */
    static async updateAnalysisRecord(id, userId, updateData) {
        try {
            const record = await PoopRecord_1.PoopRecord.findOneAndUpdate({ _id: id, userId }, { $set: updateData }, { new: true });
            return record;
        }
        catch (error) {
            logger_1.Logger.error('更新分析记录失败:', error);
            throw error;
        }
    }
    /**
     * 分享分析记录
     */
    static async shareAnalysisRecord(id, userId, params) {
        try {
            const record = await PoopRecord_1.PoopRecord.findOneAndUpdate({ _id: id, userId }, {
                $set: {
                    shared: true,
                    shareType: params.shareType,
                    shareWith: params.shareWith || []
                }
            }, { new: true });
            return record;
        }
        catch (error) {
            logger_1.Logger.error('分享分析记录失败:', error);
            throw error;
        }
    }
    /**
     * 删除分析记录
     */
    static async deleteAnalysisRecord(id) {
        try {
            const result = await PoopRecord_1.PoopRecord.deleteOne({ _id: id });
            if (result.deletedCount && result.deletedCount > 0) {
                // 删除PG中的对应记录
                (0, pgSyncService_1.deletePoopRecord)(String(id));
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.Logger.error('删除分析记录失败:', error);
            throw error;
        }
    }
    /**
     * 批量删除分析记录
     */
    static async batchDeleteRecords(recordIds) {
        try {
            const result = await PoopRecord_1.PoopRecord.deleteMany({
                _id: { $in: recordIds.map(id => new mongoose_1.default.Types.ObjectId(id)) }
            });
            // 同步删除PG中的对应记录
            for (const rid of recordIds) {
                (0, pgSyncService_1.deletePoopRecord)(String(rid));
            }
            return {
                success: true,
                message: `成功删除${result.deletedCount}条记录`
            };
        }
        catch (error) {
            logger_1.Logger.error('批量删除分析记录失败:', error);
            throw error;
        }
    }
    /**
     * 获取分析统计
     */
    static async getAnalysisStatistics(params) {
        try {
            const { userId, petId, startDate, endDate } = params;
            const filter = { userId, petId };
            if (startDate || endDate) {
                filter.timestamp = {};
                if (startDate)
                    filter.timestamp.$gte = startDate;
                if (endDate)
                    filter.timestamp.$lte = endDate;
            }
            // 获取所有符合条件的记录
            const records = await PoopRecord_1.PoopRecord.find(filter);
            // 计算统计数据
            const statistics = {
                totalRecords: records.length,
                healthStatusDistribution: {},
                shapeDistribution: {},
                averageConfidence: 0,
                commonSymptoms: [],
                timeDistribution: []
            };
            // 临时存储症状计数
            const symptomsCount = {};
            let totalConfidence = 0;
            // 按日期分组的记录计数
            const dateCount = {};
            records.forEach((record) => {
                // 健康状态分布
                const healthStatus = record.analysis.healthStatus;
                statistics.healthStatusDistribution[healthStatus] =
                    (statistics.healthStatusDistribution[healthStatus] || 0) + 1;
                // 形状分布
                const shape = record.analysis.shape;
                statistics.shapeDistribution[shape] =
                    (statistics.shapeDistribution[shape] || 0) + 1;
                // 置信度累加
                totalConfidence += record.analysis.confidence;
                // 症状统计
                if (record.symptoms) {
                    record.symptoms.forEach((symptom) => {
                        symptomsCount[symptom] = (symptomsCount[symptom] || 0) + 1;
                    });
                }
                // 时间分布
                const date = record.timestamp.toISOString().split('T')[0];
                dateCount[date] = (dateCount[date] || 0) + 1;
            });
            // 计算平均置信度
            statistics.averageConfidence = records.length > 0
                ? totalConfidence / records.length
                : 0;
            // 转换症状计数为数组并排序
            statistics.commonSymptoms = Object.entries(symptomsCount)
                .map(([symptom, count]) => ({ symptom, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5); // 只取前5个最常见的症状
            // 转换时间分布为数组并排序
            statistics.timeDistribution = Object.entries(dateCount)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));
            return statistics;
        }
        catch (error) {
            logger_1.Logger.error('获取分析统计失败:', error);
            throw error;
        }
    }
}
exports.AnalysisService = AnalysisService;
//# sourceMappingURL=analysisService.js.map