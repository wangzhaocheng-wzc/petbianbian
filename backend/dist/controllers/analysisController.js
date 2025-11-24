"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisController = void 0;
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const fileService_1 = require("../services/fileService");
const aiService_1 = require("../services/aiService");
const analysisService_1 = require("../services/analysisService");
const logger_1 = require("../utils/logger");
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const postgres_1 = require("../config/postgres");
class AnalysisController {
    /**
     * 上传图片进行分析
     */
    static async uploadForAnalysis(req, res) {
        try {
            const file = req.file;
            const userId = req.user.userId;
            const { petId, notes, symptoms } = req.body;
            if (!file) {
                res.status(400).json({
                    success: false,
                    message: '未找到上传的图片'
                });
                return;
            }
            // 兼容 diskStorage 与 memoryStorage：读取图片缓冲
            const imageBuffer = file.buffer || await fs_1.default.promises.readFile(file.path);
            // 确定图片URL：若为diskStorage已落盘则直接使用其生成的文件名，否则走FileService保存
            let imageUrl;
            if (file.filename) {
                const dest = file.destination || '';
                const type = dest.includes('avatars')
                    ? 'avatars'
                    : dest.includes('community')
                        ? 'community'
                        : 'analysis';
                imageUrl = fileService_1.FileService.generateFileUrl(file.filename, type);
            }
            else {
                imageUrl = await fileService_1.FileService.saveImage(imageBuffer, file.originalname, 'analysis');
            }
            // 预处理图片
            const processedImage = await aiService_1.AIService.preprocessImage(imageBuffer);
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
                result: analysisResult,
                userNotes: notes,
                symptoms
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
            const dbPrimary = process.env.DB_PRIMARY || 'postgres';
            const sharedRecord = dbPrimary === 'postgres'
                ? null
                : await analysisService_1.AnalysisService.shareAnalysisRecord(id, userId, {
                    shareType,
                    shareWith
                });
            if (!sharedRecord && dbPrimary !== 'postgres') {
                res.status(404).json({ success: false, message: '分析记录不存在' });
                return;
            }
            let createdPostId;
            if (dbPrimary === 'postgres') {
                const pool = await (0, postgres_1.getPostgresPool)();
                const recRes = await pool.query(`SELECT id, user_id, pet_id, image_url, shape, health_status, confidence, details, recommendations, detected_features, user_notes, symptoms, timestamp
           FROM poop_records WHERE id = $1 LIMIT 1`, [id]);
                const r = recRes.rows[0];
                if (!r) {
                    res.status(404).json({ success: false, message: '分析记录不存在' });
                    return;
                }
                const petNameRes = await pool.query('SELECT name FROM pets WHERE id = $1 LIMIT 1', [r.pet_id]);
                const petName = petNameRes.rows[0]?.name || '';
                const title = petName ? `${petName} 的便便分析分享` : '便便分析分享';
                const content = `${r.details || ''}\n健康状态: ${r.health_status || ''}\n置信度: ${r.confidence || 0}%`;
                const postRes = await pool.query(`INSERT INTO community_posts (user_id, pet_id, title, content, status, category, is_anonymous, views, shares, is_sticky, is_featured, moderation_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'published', 'health', false, 0, 0, false, false, 'approved', now(), now())
           RETURNING id`, [r.user_id, r.pet_id, title, content]);
                const postId = postRes.rows[0]?.id;
                createdPostId = postId ? String(postId) : undefined;
                if (createdPostId && r.image_url) {
                    await pool.query(`INSERT INTO post_images (post_id, url, position) VALUES ($1, $2, 1)`, [postId, r.image_url]);
                }
            }
            else if (sharedRecord) {
                const mongoUserId = new mongoose_1.default.Types.ObjectId(String(sharedRecord.userId));
                const mongoPetId = sharedRecord.petId ? new mongoose_1.default.Types.ObjectId(String(sharedRecord.petId)) : undefined;
                const title = '便便分析分享';
                const content = sharedRecord.analysis?.details || '';
                const images = sharedRecord.imageUrl ? [sharedRecord.imageUrl] : [];
                const post = await CommunityPost_1.default.create({
                    userId: mongoUserId,
                    petId: mongoPetId,
                    title,
                    content,
                    images,
                    tags: [],
                    category: 'health',
                    status: 'published',
                    isAnonymous: false,
                    interactions: { likes: [], views: 0, shares: 0 },
                    comments: [],
                    isSticky: false,
                    isFeatured: false,
                    moderationStatus: 'approved'
                });
                createdPostId = String(post._id);
            }
            res.json({ success: true, data: { sharedRecord, communityPostId: createdPostId } });
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
}
exports.AnalysisController = AnalysisController;
//# sourceMappingURL=analysisController.js.map