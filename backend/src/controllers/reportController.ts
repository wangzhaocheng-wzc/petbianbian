import { Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { getPostgresPool } from '../config/postgres';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    type?: string;
    role?: string;
  };
}

/**
 * 获取健康报告数据
 */
export const getHealthReportData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const { petId } = req.params;
    const { days = 30 } = req.query;

    if (!petId) {
      return res.status(400).json({
        success: false,
        message: '请提供宠物ID'
      });
    }

    const daysNumber = parseInt(days as string, 10);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return res.status(400).json({
        success: false,
        message: '天数必须在1-365之间'
      });
    }

    const reportData = await ReportService.generateHealthReportData(
      userId,
      petId,
      daysNumber
    );

    res.json({
      success: true,
      message: '获取健康报告数据成功',
      data: reportData
    });

  } catch (error) {
    console.error('获取健康报告数据失败:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 生成并下载PDF健康报告
 */
export const downloadHealthReportPDF = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const { petId } = req.params;
    const { days = 30 } = req.query;

    if (!petId) {
      return res.status(400).json({
        success: false,
        message: '请提供宠物ID'
      });
    }

    const daysNumber = parseInt(days as string, 10);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return res.status(400).json({
        success: false,
        message: '天数必须在1-365之间'
      });
    }

    const pdfBuffer = await ReportService.generateHealthReportPDF(
      userId,
      petId,
      daysNumber
    );

    // 获取宠物信息用于文件名
    const Pet = require('../models/Pet').default;
    const pool = await getPostgresPool();
const petRes = await pool.query(
  'SELECT id, name FROM pets WHERE id = $1 LIMIT 1',
  [petId]
);
const pet = petRes.rows[0];
    const petName = pet ? pet.name : 'pet';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${petName}-健康报告-${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('生成PDF健康报告失败:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 生成并保存PDF健康报告
 */
export const generateHealthReportPDF = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const { petId } = req.params;
    const { days = 30 } = req.query;

    if (!petId) {
      return res.status(400).json({
        success: false,
        message: '请提供宠物ID'
      });
    }

    const daysNumber = parseInt(days as string, 10);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return res.status(400).json({
        success: false,
        message: '天数必须在1-365之间'
      });
    }

    const filePath = await ReportService.saveHealthReportPDF(
      userId,
      petId,
      daysNumber
    );

    res.json({
      success: true,
      message: '生成PDF健康报告成功',
      data: {
        filePath,
        downloadUrl: `${req.protocol}://${req.get('host')}/${filePath}`
      }
    });

  } catch (error) {
    console.error('生成PDF健康报告失败:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};