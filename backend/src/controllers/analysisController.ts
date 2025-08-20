import { Request, Response } from 'express';
import { FileService } from '../services/fileService';
import { AIService, AIAnalysisResult } from '../services/aiService';
import { AnalysisService } from '../services/analysisService';
import { Logger } from '../utils/logger';

export class AnalysisController {
  /**
   * 上传图片进行分析
   */
  static async uploadForAnalysis(req: Request, res: Response): Promise<void> {
    try {
      // 检查是否有文件上传
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '请选择要上传的图片文件'
        });
        return;
      }

      const file = req.file;
      const { petId, notes, symptoms } = req.body;

      // 验证必需参数
      if (!petId) {
        res.status(400).json({
          success: false,
          message: '请指定宠物ID'
        });
        return;
      }

      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: '只支持JPG、PNG、WebP格式的图片文件'
        });
        return;
      }

      // 验证文件大小 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        res.status(400).json({
          success: false,
          message: '文件大小不能超过10MB'
        });
        return;
      }

      // 生成文件URL
      const imageUrl = FileService.generateFileUrl(file.filename, 'analysis');

      // 执行AI分析流程
      let analysisResult: AIAnalysisResult;
      
      try {
        Logger.info(`开始AI分析流程，文件路径: ${file.path}`);
        
        // 1. 图片预处理
        const processedImage = await AIService.preprocessImage(file.path);
        Logger.info(`图片预处理完成，大小: ${processedImage.size} bytes`);
        
        // 2. 验证图片内容
        const isValidContent = await AIService.validatePoopContent(processedImage);
        Logger.info(`内容验证结果: ${isValidContent}`);
        if (!isValidContent) {
          res.status(400).json({
            success: false,
            message: '上传的图片不符合要求，请上传清晰的便便照片'
          });
          return;
        }
        
        // 3. 执行AI分析
        analysisResult = await AIService.analyzePoopImage(processedImage);
        Logger.info(`AI分析原始结果: ${JSON.stringify(analysisResult)}`);
        
        // 4. 验证分析结果
        if (!AIService.validateAnalysisResult(analysisResult)) {
          throw new Error('AI分析结果验证失败');
        }
        
        Logger.info(`AI分析完成: 形状=${analysisResult.shape}, 健康状态=${analysisResult.healthStatus}, 置信度=${analysisResult.confidence}%`);
        
      } catch (aiError) {
        Logger.error('AI分析过程失败:', aiError);
        if (aiError instanceof Error) {
          Logger.error('错误堆栈:', aiError.stack);
        }
        res.status(500).json({
          success: false,
          message: 'AI分析服务暂时不可用，请稍后重试'
        });
        return;
      }

      // 保存分析记录到数据库
      const savedRecord = await AnalysisService.createAnalysisRecord({
        petId,
        userId: (req as any).user.id, // 从认证中间件获取用户ID
        imageUrl,
        analysis: analysisResult,
        userNotes: notes || '',
        symptoms: symptoms ? symptoms.split(',').map((s: string) => s.trim()) : [],
        timestamp: new Date(),
        isShared: false
      });

      // 构造响应数据
      const responseData = {
        id: savedRecord._id,
        petId: savedRecord.petId,
        imageUrl: savedRecord.imageUrl,
        analysis: {
          shape: savedRecord.analysis.shape,
          healthStatus: savedRecord.analysis.healthStatus,
          confidence: savedRecord.analysis.confidence,
          details: savedRecord.analysis.details,
          recommendations: savedRecord.analysis.recommendations,
          detectedFeatures: savedRecord.analysis.detectedFeatures,
          shapeDescription: AIService.getShapeDescription(savedRecord.analysis.shape),
          healthStatusDescription: AIService.getHealthStatusDescription(savedRecord.analysis.healthStatus)
        },
        userNotes: savedRecord.userNotes,
        symptoms: savedRecord.symptoms,
        timestamp: savedRecord.timestamp,
        isShared: savedRecord.isShared
      };

      Logger.info(`图片分析完成并保存: ${file.filename}, 记录ID: ${savedRecord._id}`);

      res.json({
        success: true,
        message: '图片上传和分析成功',
        data: responseData
      });

    } catch (error) {
      Logger.error('图片分析失败:', error);
      res.status(500).json({
        success: false,
        message: '图片分析失败，请稍后重试'
      });
    }
  }

  /**
   * 获取分析记录
   */
  static async getAnalysisRecords(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        healthStatus, 
        startDate, 
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query;

      // 构建查询参数
      const query: any = {
        petId,
        userId: (req as any).user.id,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      if (healthStatus) query.healthStatus = healthStatus;
      if (startDate) query.startDate = new Date(startDate as string);
      if (endDate) query.endDate = new Date(endDate as string);

      // 获取记录和统计数据
      const [recordsResult, statistics] = await Promise.all([
        AnalysisService.getAnalysisRecords(query),
        AnalysisService.getHealthStatistics(petId as string, 30)
      ]);

      res.json({
        success: true,
        data: {
          records: recordsResult.records,
          pagination: {
            page: recordsResult.page,
            limit: Number(limit),
            total: recordsResult.total,
            totalPages: recordsResult.totalPages
          },
          statistics
        }
      });

    } catch (error) {
      Logger.error('获取分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分析记录失败'
      });
    }
  }

  /**
   * 获取分析统计
   */
  static async getAnalysisStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const { period = 'month' } = req.query; // week, month, quarter

      // 根据周期确定天数
      const daysMap = {
        week: 7,
        month: 30,
        quarter: 90
      };
      const days = daysMap[period as keyof typeof daysMap] || 30;

      // 获取统计数据和趋势数据
      const [statistics, trends, healthAssessment] = await Promise.all([
        AnalysisService.getHealthStatistics(petId as string, days),
        AnalysisService.getHealthTrends(petId as string, days),
        AnalysisService.getHealthAssessment(petId as string)
      ]);

      const responseData = {
        period,
        days,
        totalAnalysis: statistics.totalRecords,
        healthyPercentage: statistics.healthyPercentage,
        warningPercentage: statistics.warningPercentage,
        concerningPercentage: statistics.concerningPercentage,
        averagePerWeek: statistics.averagePerWeek,
        trends,
        healthAssessment,
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      Logger.error('获取分析统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分析统计失败'
      });
    }
  }

  /**
   * 获取单个分析记录
   */
  static async getAnalysisRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const record = await AnalysisService.getAnalysisRecord(id);
      if (!record) {
        res.status(404).json({
          success: false,
          message: '分析记录不存在'
        });
        return;
      }

      // 验证用户权限
      if (record.userId.toString() !== (req as any).user.id) {
        res.status(403).json({
          success: false,
          message: '无权限访问此记录'
        });
        return;
      }

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      Logger.error('获取分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分析记录失败'
      });
    }
  }

  /**
   * 删除分析记录
   */
  static async deleteAnalysisRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 先获取记录以获得文件路径
      const record = await AnalysisService.getAnalysisRecord(id);
      if (!record) {
        res.status(404).json({
          success: false,
          message: '分析记录不存在'
        });
        return;
      }

      // 验证用户权限
      if (record.userId.toString() !== (req as any).user.id) {
        res.status(403).json({
          success: false,
          message: '无权限删除此记录'
        });
        return;
      }

      // 删除数据库记录
      const deleted = await AnalysisService.deleteAnalysisRecord(id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          message: '删除记录失败'
        });
        return;
      }

      // TODO: 删除相关的图片文件
      // 这里可以添加文件删除逻辑

      Logger.info(`分析记录删除成功: ${id}`);

      res.json({
        success: true,
        message: '分析记录删除成功'
      });

    } catch (error) {
      Logger.error('删除分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '删除分析记录失败'
      });
    }
  }
}