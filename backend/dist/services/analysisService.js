"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = exports.HealthAdviceGenerator = void 0;
const PoopRecord_1 = require("../models/PoopRecord");
const logger_1 = require("../utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
// 健康建议生成器
class HealthAdviceGenerator {
    /**
     * 根据分析结果生成健康建议
     */
    static generateAdvice(analysis, symptoms) {
        const baseAdvice = [...analysis.recommendations];
        const additionalAdvice = [];
        // 根据健康状态添加建议
        switch (analysis.healthStatus) {
            case 'healthy':
                additionalAdvice.push('保持良好的饮食和运动习惯');
                if (analysis.confidence < 80) {
                    additionalAdvice.push('建议继续观察，如有异常及时记录');
                }
                break;
            case 'warning':
                additionalAdvice.push('建议调整饮食结构，增加纤维素摄入');
                additionalAdvice.push('确保宠物有充足的饮水');
                if (symptoms && symptoms.length > 0) {
                    additionalAdvice.push('注意观察相关症状的变化');
                }
                break;
            case 'concerning':
                additionalAdvice.push('强烈建议咨询专业兽医');
                additionalAdvice.push('暂时改为易消化的食物');
                additionalAdvice.push('密切监控宠物的整体状态');
                break;
        }
        // 根据形状类型添加特定建议
        switch (analysis.shape) {
            case 'type1':
            case 'type2':
                additionalAdvice.push('增加水分摄入，考虑添加益生菌');
                break;
            case 'type6':
            case 'type7':
                additionalAdvice.push('暂时减少食物摄入，观察是否改善');
                break;
        }
        // 根据症状添加建议
        if (symptoms) {
            if (symptoms.includes('食欲不振')) {
                additionalAdvice.push('监控食欲变化，必要时就医');
            }
            if (symptoms.includes('呕吐')) {
                additionalAdvice.push('暂时禁食4-6小时，然后少量多餐');
            }
            if (symptoms.includes('精神萎靡')) {
                additionalAdvice.push('立即咨询兽医，可能需要紧急处理');
            }
        }
        return [...baseAdvice, ...additionalAdvice];
    }
    /**
     * 生成健康状态判断
     */
    static assessHealthStatus(analysis, recentRecords) {
        let riskLevel = 'low';
        let urgency = 'none';
        // 基于当前分析结果判断
        switch (analysis.healthStatus) {
            case 'healthy':
                riskLevel = 'low';
                urgency = 'none';
                break;
            case 'warning':
                riskLevel = 'medium';
                urgency = 'monitor';
                break;
            case 'concerning':
                riskLevel = 'high';
                urgency = analysis.shape === 'type7' ? 'urgent' : 'consult';
                break;
        }
        // 分析趋势
        let trend = 'stable';
        if (recentRecords && recentRecords.length >= 3) {
            const recentStatuses = recentRecords
                .slice(0, 3)
                .map(record => record.analysis.healthStatus);
            const healthyCount = recentStatuses.filter(s => s === 'healthy').length;
            const concerningCount = recentStatuses.filter(s => s === 'concerning').length;
            if (healthyCount > concerningCount && recentStatuses[0] === 'healthy') {
                trend = 'improving';
            }
            else if (concerningCount > healthyCount) {
                trend = 'declining';
                if (urgency === 'none')
                    urgency = 'monitor';
                if (urgency === 'monitor')
                    urgency = 'consult';
            }
        }
        return {
            currentStatus: this.getStatusDescription(analysis.healthStatus),
            trend,
            riskLevel,
            urgency
        };
    }
    static getStatusDescription(status) {
        const descriptions = {
            healthy: '健康状态良好',
            warning: '需要关注的状态',
            concerning: '异常状态，需要处理'
        };
        return descriptions[status] || '未知状态';
    }
}
exports.HealthAdviceGenerator = HealthAdviceGenerator;
class AnalysisService {
    /**
     * 创建分析记录
     */
    static async createAnalysisRecord(data) {
        try {
            logger_1.Logger.info(`创建分析记录: 宠物ID=${data.petId}, 用户ID=${data.userId}`);
            // 生成增强的健康建议
            const enhancedRecommendations = HealthAdviceGenerator.generateAdvice(data.analysis, data.symptoms);
            // 创建记录
            const record = new PoopRecord_1.PoopRecord({
                petId: new mongoose_1.default.Types.ObjectId(data.petId),
                userId: new mongoose_1.default.Types.ObjectId(data.userId),
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl,
                analysis: {
                    ...data.analysis,
                    recommendations: enhancedRecommendations
                },
                userNotes: data.userNotes,
                symptoms: data.symptoms,
                timestamp: data.timestamp || new Date(),
                location: data.location,
                weather: data.weather,
                isShared: data.isShared || false
            });
            const savedRecord = await record.save();
            logger_1.Logger.info(`分析记录创建成功: ID=${savedRecord._id}`);
            return savedRecord;
        }
        catch (error) {
            logger_1.Logger.error('创建分析记录失败:', error);
            throw new Error('创建分析记录失败');
        }
    }
    /**
     * 获取分析记录列表
     */
    static async getAnalysisRecords(query) {
        try {
            const { petId, userId, healthStatus, startDate, endDate, isShared, page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc' } = query;
            // 构建查询条件
            const filter = {};
            if (petId)
                filter.petId = new mongoose_1.default.Types.ObjectId(petId);
            if (userId)
                filter.userId = new mongoose_1.default.Types.ObjectId(userId);
            if (healthStatus)
                filter['analysis.healthStatus'] = healthStatus;
            if (isShared !== undefined)
                filter.isShared = isShared;
            if (startDate || endDate) {
                filter.timestamp = {};
                if (startDate)
                    filter.timestamp.$gte = startDate;
                if (endDate)
                    filter.timestamp.$lte = endDate;
            }
            // 构建排序
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            // 执行查询
            const skip = (page - 1) * limit;
            const [records, total] = await Promise.all([
                PoopRecord_1.PoopRecord.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .populate('pet', 'name type breed')
                    .populate('user', 'username avatar'),
                PoopRecord_1.PoopRecord.countDocuments(filter)
            ]);
            logger_1.Logger.info(`获取分析记录: 查询到${records.length}条记录，总计${total}条`);
            return {
                records,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            logger_1.Logger.error('获取分析记录失败:', error);
            throw new Error('获取分析记录失败');
        }
    }
    /**
     * 获取单个分析记录
     */
    static async getAnalysisRecord(id) {
        try {
            const record = await PoopRecord_1.PoopRecord.findById(id)
                .populate('pet', 'name type breed avatar')
                .populate('user', 'username avatar');
            if (!record) {
                logger_1.Logger.warn(`分析记录不存在: ID=${id}`);
                return null;
            }
            return record;
        }
        catch (error) {
            logger_1.Logger.error('获取分析记录失败:', error);
            throw new Error('获取分析记录失败');
        }
    }
    /**
     * 更新分析记录
     */
    static async updateAnalysisRecord(id, updates) {
        try {
            const record = await PoopRecord_1.PoopRecord.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
            if (!record) {
                logger_1.Logger.warn(`分析记录不存在: ID=${id}`);
                return null;
            }
            logger_1.Logger.info(`分析记录更新成功: ID=${id}`);
            return record;
        }
        catch (error) {
            logger_1.Logger.error('更新分析记录失败:', error);
            throw new Error('更新分析记录失败');
        }
    }
    /**
     * 删除分析记录
     */
    static async deleteAnalysisRecord(id) {
        try {
            const result = await PoopRecord_1.PoopRecord.findByIdAndDelete(id);
            if (!result) {
                logger_1.Logger.warn(`分析记录不存在: ID=${id}`);
                return false;
            }
            logger_1.Logger.info(`分析记录删除成功: ID=${id}`);
            return true;
        }
        catch (error) {
            logger_1.Logger.error('删除分析记录失败:', error);
            throw new Error('删除分析记录失败');
        }
    }
    /**
     * 获取健康统计
     */
    static async getHealthStatistics(petId, days = 30) {
        try {
            const statistics = await PoopRecord_1.PoopRecord.getHealthStatistics(petId, days);
            // 计算平均每周次数
            const totalDays = days;
            const averagePerWeek = statistics.totalRecords > 0
                ? Math.round((statistics.totalRecords / totalDays) * 7 * 10) / 10
                : 0;
            return {
                ...statistics,
                averagePerWeek,
                period: `${days}天`,
                lastUpdated: new Date()
            };
        }
        catch (error) {
            logger_1.Logger.error('获取健康统计失败:', error);
            throw new Error('获取健康统计失败');
        }
    }
    /**
     * 获取健康趋势
     */
    static async getHealthTrends(petId, days = 30) {
        try {
            const trends = await PoopRecord_1.PoopRecord.getHealthTrends(petId, days);
            // 填充缺失的日期
            const filledTrends = this.fillMissingDates(trends, days);
            logger_1.Logger.info(`获取健康趋势: 宠物ID=${petId}, ${filledTrends.length}天数据`);
            return filledTrends;
        }
        catch (error) {
            logger_1.Logger.error('获取健康趋势失败:', error);
            throw new Error('获取健康趋势失败');
        }
    }
    /**
     * 填充缺失的日期数据
     */
    static fillMissingDates(trends, days) {
        const result = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const existingData = trends.find(t => t._id === dateString);
            result.push({
                date: dateString,
                healthy: existingData?.healthy || 0,
                warning: existingData?.warning || 0,
                concerning: existingData?.concerning || 0,
                total: (existingData?.healthy || 0) + (existingData?.warning || 0) + (existingData?.concerning || 0)
            });
        }
        return result;
    }
    /**
     * 获取健康评估
     */
    static async getHealthAssessment(petId) {
        try {
            // 获取最近的记录
            const recentRecords = await PoopRecord_1.PoopRecord.find({ petId: new mongoose_1.default.Types.ObjectId(petId) })
                .sort({ timestamp: -1 })
                .limit(10);
            if (recentRecords.length === 0) {
                return {
                    status: 'no_data',
                    message: '暂无分析记录',
                    recommendations: ['开始记录宠物的排便情况以获得健康评估']
                };
            }
            const latestRecord = recentRecords[0];
            const assessment = HealthAdviceGenerator.assessHealthStatus(latestRecord.analysis, recentRecords);
            return {
                ...assessment,
                lastAnalysis: latestRecord.timestamp,
                totalRecords: recentRecords.length,
                recommendations: latestRecord.analysis.recommendations
            };
        }
        catch (error) {
            logger_1.Logger.error('获取健康评估失败:', error);
            throw new Error('获取健康评估失败');
        }
    }
}
exports.AnalysisService = AnalysisService;
//# sourceMappingURL=analysisService.js.map