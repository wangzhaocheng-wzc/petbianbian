"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisController = void 0;
const fileService_1 = require("../services/fileService");
const aiService_1 = require("../services/aiService");
const analysisService_1 = require("../services/analysisService");
const logger_1 = require("../utils/logger");
const pdfkit_1 = __importDefault(require("pdfkit"));
class AnalysisController {
    /**
     * 上传图片进行分析
     */
    static async uploadForAnalysis(req, res) {
        try {
            const file = req.file;
            const userId = req.user.userId;
            const { petId } = req.body;
            if (!file) {
                res.status(400).json({
                    success: false,
                    message: '未找到上传的图片'
                });
                return;
            }
            // 保存图片
            const imageUrl = await fileService_1.FileService.saveImage(file.buffer, file.originalname, 'analysis');
            // 预处理图片
            const processedImage = await aiService_1.AIService.preprocessImage(file.buffer);
            // 验证图片内容
            const isValidContent = await aiService_1.AIService.validatePoopContent(processedImage);
            if (!isValidContent) {
                res.status(400).json({
                    success: false,
                    message: '上传的图片不是有效的便便图片'
                });
                return;
            }
            // 调用AI服务进行分析
            const analysisResult = await aiService_1.AIService.analyzePoopImage(processedImage);
            // 创建分析记录
            const record = await analysisService_1.AnalysisService.createAnalysisRecord({
                userId,
                petId,
                imageUrl,
                result: analysisResult
            });
            res.json({
                success: true,
                data: record
            });
        }
        catch (error) {
            logger_1.Logger.error('图片上传分析失败:', error);
            res.status(500).json({
                success: false,
                message: '图片上传分析失败'
            });
        }
    }
    /**
     * 获取分析记录列表
     */
    static async getAnalysisRecords(req, res) {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;
            const query = { ...req.query, userId, petId };
            const result = await analysisService_1.AnalysisService.getAnalysisRecords(query);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.Logger.error('获取分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '获取分析记录失败'
            });
        }
    }
    /**
     * 获取单个分析记录
     */
    static async getAnalysisRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const record = await analysisService_1.AnalysisService.getAnalysisRecord(id, userId);
            if (!record) {
                res.status(404).json({
                    success: false,
                    message: '分析记录不存在'
                });
                return;
            }
            res.json({
                success: true,
                data: record
            });
        }
        catch (error) {
            logger_1.Logger.error('获取分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '获取分析记录失败'
            });
        }
    }
    /**
     * 更新分析记录
     */
    static async updateAnalysisRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;
            const updatedRecord = await analysisService_1.AnalysisService.updateAnalysisRecord(id, userId, updateData);
            if (!updatedRecord) {
                res.status(404).json({
                    success: false,
                    message: '分析记录不存在'
                });
                return;
            }
            res.json({
                success: true,
                data: updatedRecord
            });
        }
        catch (error) {
            logger_1.Logger.error('更新分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '更新分析记录失败'
            });
        }
    }
    /**
     * 分享分析记录
     */
    static async shareAnalysisRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { shareType, shareWith } = req.body;
            const sharedRecord = await analysisService_1.AnalysisService.shareAnalysisRecord(id, userId, {
                shareType,
                shareWith
            });
            if (!sharedRecord) {
                res.status(404).json({
                    success: false,
                    message: '分析记录不存在'
                });
                return;
            }
            res.json({
                success: true,
                data: sharedRecord
            });
        }
        catch (error) {
            logger_1.Logger.error('分享分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '分享分析记录失败'
            });
        }
    }
    /**
     * 删除分析记录
     */
    static async deleteAnalysisRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const result = await analysisService_1.AnalysisService.deleteAnalysisRecord(id);
            if (!result) {
                res.status(404).json({
                    success: false,
                    message: '分析记录不存在'
                });
                return;
            }
            res.json({
                success: true,
                message: '分析记录删除成功'
            });
        }
        catch (error) {
            logger_1.Logger.error('删除分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '删除分析记录失败'
            });
        }
    }
    /**
     * 批量删除分析记录
     */
    static async batchDeleteRecords(req, res) {
        try {
            const { recordIds } = req.body;
            const userId = req.user.userId;
            if (!Array.isArray(recordIds) || recordIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: '请提供要删除的记录ID列表'
                });
                return;
            }
            const result = await analysisService_1.AnalysisService.batchDeleteRecords(recordIds);
            res.json(result);
        }
        catch (error) {
            logger_1.Logger.error('批量删除分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '批量删除分析记录失败'
            });
        }
    }
    /**
     * 获取分析统计
     */
    static async getAnalysisStatistics(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.userId;
            const { startDate, endDate } = req.query;
            const statistics = await analysisService_1.AnalysisService.getAnalysisStatistics({
                userId,
                petId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });
            res.json({
                success: true,
                data: statistics
            });
        }
        catch (error) {
            logger_1.Logger.error('获取分析统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取分析统计失败'
            });
        }
    }
    /**
     * 导出分析记录为CSV
     */
    static async exportAnalysisRecordsCSV(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.userId;
            const { startDate, endDate } = req.query;
            const { records } = await analysisService_1.AnalysisService.getAnalysisRecords({
                userId,
                petId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });
            // 生成CSV内容
            let csvContent = '日期,健康状态,形状,置信度,详细信息,建议\n';
            records.forEach(record => {
                csvContent += `${new Date(record.createdAt).toLocaleDateString()},`;
                csvContent += `${record.analysis.healthStatus},`;
                csvContent += `${record.analysis.shape},`;
                csvContent += `${record.analysis.confidence}%,`;
                csvContent += `"${record.analysis.details}",`;
                csvContent += `"${record.analysis.recommendations.join('; ')}"\n`;
            });
            // 设置响应头
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=analysis-records-${petId}-${Date.now()}.csv`);
            // 发送CSV内容
            res.send(csvContent);
        }
        catch (error) {
            logger_1.Logger.error('导出分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '导出分析记录失败'
            });
        }
    }
    /**
     * 导出分析记录为PDF
     */
    static async exportAnalysisRecordsPDF(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.userId;
            const { startDate, endDate } = req.query;
            const { records } = await analysisService_1.AnalysisService.getAnalysisRecords({
                userId,
                petId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });
            // 创建PDF文档
            const doc = new pdfkit_1.default();
            // 设置响应头
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=analysis-records-${petId}-${Date.now()}.pdf`);
            // 将PDF流式传输到响应
            doc.pipe(res);
            // 添加标题
            doc.fontSize(20).text('便便分析记录报告', { align: 'center' });
            doc.moveDown();
            // 添加记录
            records.forEach(record => {
                doc.fontSize(14).text(`日期: ${new Date(record.createdAt).toLocaleDateString()}`);
                doc.fontSize(12).text(`健康状态: ${record.analysis.healthStatus}`);
                doc.text(`形状: ${record.analysis.shape}`);
                doc.text(`置信度: ${record.analysis.confidence}%`);
                doc.text(`详细信息: ${record.analysis.details}`);
                doc.text(`建议: ${record.analysis.recommendations.join('; ')}`);
                doc.moveDown();
            });
            // 结束PDF文档
            doc.end();
        }
        catch (error) {
            logger_1.Logger.error('导出分析记录失败:', error);
            res.status(500).json({
                success: false,
                message: '导出分析记录失败'
            });
        }
    }
}
exports.AnalysisController = AnalysisController;
//# sourceMappingURL=analysisController.js.map