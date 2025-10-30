import { Request, Response } from 'express';
import { ImageUrlGovernanceService } from '../services/imageUrlGovernanceService';
import { MonitoringService } from '../services/monitoringService';
import { Logger } from '../utils/logger';

const monitoringService = MonitoringService.getInstance();

export const previewImageUrlCleanup = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { limitPerModel } = req.body || {};
    const { jobId, result } = await ImageUrlGovernanceService.previewAll(
      typeof limitPerModel === 'number' ? limitPerModel : 200
    );
    monitoringService.recordImageUrlRewrite('backend', 'preview_batch', 'all', Date.now() - start);
    res.json({ success: true, jobId, result });
  } catch (error) {
    monitoringService.recordError('/api/governance/image-url/preview', error as Error);
    Logger.error('治理预览失败', error);
    res.status(500).json({ success: false, message: '治理预览失败' });
  }
};

export const getImageUrlPreview = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = ImageUrlGovernanceService.getPreview(jobId);
    if (!result) {
      res.status(404).json({ success: false, message: '未找到预览任务或已过期' });
      return;
    }
    res.json({ success: true, result });
  } catch (error) {
    monitoringService.recordError('/api/governance/image-url/preview/:jobId', error as Error);
    Logger.error('获取治理预览失败', error);
    res.status(500).json({ success: false, message: '获取预览失败' });
  }
};

export const executeImageUrlCleanup = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { jobId } = req.body || {};
    if (!jobId || typeof jobId !== 'string') {
      res.status(400).json({ success: false, message: '缺少有效的jobId' });
      return;
    }
    const result = await ImageUrlGovernanceService.execute(jobId);
    monitoringService.recordImageUrlRewrite('backend', 'execute_batch', 'all', Date.now() - start);
    res.json({ success: true, result });
  } catch (error) {
    monitoringService.recordError('/api/governance/image-url/execute', error as Error);
    Logger.error('治理执行失败', error);
    res.status(500).json({ success: false, message: '治理执行失败' });
  }
};