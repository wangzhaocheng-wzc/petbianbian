import { Request, Response } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import { FileService } from '../services/fileService';
import { APP_CONFIG } from '../config/constants';
import { AIService, AIAnalysisResult } from '../services/aiService';
import { AnalysisService } from '../services/analysisService';
import { Logger } from '../utils/logger';
import CommunityPost from '../models/CommunityPost';
import PDFDocument from 'pdfkit';
import path from 'path';

export class AnalysisController {
  /**
   * 上传图片进行分析
   */
  static async uploadForAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const userId = (req as any).user.userId;
      const { petId } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          message: '未找到上传的图片'
        });
        return;
      }

      // 兼容 diskStorage 与 memoryStorage：读取图片缓冲
      const imageBuffer = (file as any).buffer || await fs.promises.readFile((file as any).path);

      // 确定图片URL：若为diskStorage已落盘则直接使用其生成的文件名，否则走FileService保存
      let imageUrl: string;
      if ((file as any).filename) {
        imageUrl = FileService.generateFileUrl((file as any).filename, 'analysis');
      } else {
        imageUrl = await FileService.saveImage(imageBuffer, file.originalname, 'analysis');
      }

      // 预处理图片
      const processedImage = await AIService.preprocessImage(imageBuffer);

      // 验证图片内容
      const isValidContent = await AIService.validatePoopContent(processedImage);
      if (!isValidContent) {
        res.status(400).json({
          success: false,
          message: '上传的图片不是有效的便便图片'
        });
        return;
      }

      // 调用AI服务进行分析
      const analysisResult = await AIService.analyzePoopImage(processedImage);

      // 创建分析记录
      const record = await AnalysisService.createAnalysisRecord({
        userId,
        petId,
        imageUrl,
        result: analysisResult
      });

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      Logger.error('图片上传分析失败:', error);
      res.status(500).json({
        success: false,
        message: '图片上传分析失败'
      });
    }
  }

  /**
   * 获取分析记录列表
   */
  static async getAnalysisRecords(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { petId } = req.params;
      const query = { ...req.query, userId, petId };

      const result = await AnalysisService.getAnalysisRecords(query);
      
      res.json({
        success: true,
        data: result
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
   * 获取单个分析记录
   */
  static async getAnalysisRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const record = await AnalysisService.getAnalysisRecord(id, userId);
      
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

    } catch (error) {
      Logger.error('获取分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分析记录失败'
      });
    }
  }

  /**
   * 更新分析记录
   */
  static async updateAnalysisRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const updateData = req.body;

      const updatedRecord = await AnalysisService.updateAnalysisRecord(id, userId, updateData);
      
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

    } catch (error) {
      Logger.error('更新分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '更新分析记录失败'
      });
    }
  }

  /**
   * 分享分析记录
   */
  static async shareAnalysisRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const { shareType, shareWith } = req.body;

      const sharedRecord = await AnalysisService.shareAnalysisRecord(id, userId, {
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

    } catch (error) {
      Logger.error('分享分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '分享分析记录失败'
      });
    }
  }

  /**
   * 删除分析记录
   */
  static async deleteAnalysisRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const result = await AnalysisService.deleteAnalysisRecord(id);
      
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

    } catch (error) {
      Logger.error('删除分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '删除分析记录失败'
      });
    }
  }

  /**
   * 批量删除分析记录
   */
  static async batchDeleteRecords(req: Request, res: Response): Promise<void> {
    try {
      const { recordIds } = req.body;
      const userId = (req as any).user.userId;

      if (!Array.isArray(recordIds) || recordIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '请提供要删除的记录ID列表'
        });
        return;
      }

      const result = await AnalysisService.batchDeleteRecords(recordIds);

      res.json(result);

    } catch (error) {
      Logger.error('批量删除分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '批量删除分析记录失败'
      });
    }
  }

  /**
   * 获取分析统计
   */
  static async getAnalysisStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const userId = (req as any).user.userId;
      const { startDate, endDate } = req.query;

      const statistics = await AnalysisService.getAnalysisStatistics({
        userId,
        petId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: statistics
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
   * 导出分析记录为CSV
   */
  static async exportAnalysisRecordsCSV(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const userId = (req as any).user.userId;
      const { startDate, endDate } = req.query;

      const { records } = await AnalysisService.getAnalysisRecords({
        userId,
        petId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
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

    } catch (error) {
      Logger.error('导出分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '导出分析记录失败'
      });
    }
  }

  /**
   * 导出分析记录为PDF
   */
  static async exportAnalysisRecordsPDF(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const userId = (req as any).user.userId;
      const { startDate, endDate } = req.query;

      const { records } = await AnalysisService.getAnalysisRecords({
        userId,
        petId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      // 创建PDF文档
      const doc = new PDFDocument();
      
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

    } catch (error) {
      Logger.error('导出分析记录失败:', error);
      res.status(500).json({
        success: false,
        message: '导出分析记录失败'
      });
    }
  }
}