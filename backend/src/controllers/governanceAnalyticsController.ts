import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { MonitoringService } from '../services/monitoringService';
import { Logger } from '../utils/logger';

interface ProgressPoint {
  date: string;
  processedCount: number;
  remainingCount: number;
  completionPct: number;
}

interface QualityPoint {
  date: string;
  invalidRatio: number;
  uploadsPrefixAddedRatio: number;
  portRewriteRatio: number;
  relativeToAbsoluteRatio: number;
  protocolNormalizedRatio: number;
}

interface PerformanceSeries {
  modelDurationsByDay: Record<string, Record<string, number>>; // date -> { model: ms }
  topSlowModels: Array<{ model: string; durationMs: number; date: string }>;
}

const reportDir = path.join(__dirname, '../../logs/data-governance');

function listFilesSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    const txt = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

function parseRemainingFromMetrics(metricsText: string): Record<string, number> {
  const byModel: Record<string, number> = {};
  const lines = metricsText.split('\n');
  const re = /^image_url_governance_remaining\{model="([^"]+)"\}\s+([0-9]+(?:\.[0-9]+)?)\b/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const model = m[1];
      const val = parseFloat(m[2]);
      if (!Number.isNaN(val)) byModel[model] = val;
    }
  }
  return byModel;
}

function getDateKeyFromCleanupFilename(name: string): string | null {
  // image-url-cleanup-YYYY-MM-DDTHH-MM-SS-....json -> YYYY-MM-DD
  const m = name.match(/^image-url-cleanup-([0-9]{4}-[0-9]{2}-[0-9]{2})T/);
  return m ? m[1] : null;
}

function getDateKeyFromPreviewFilename(name: string): string | null {
  // daily-preview-YYYY-MM-DD.json -> YYYY-MM-DD
  const m = name.match(/^daily-preview-([0-9]{4}-[0-9]{2}-[0-9]{2})\.json$/);
  return m ? m[1] : null;
}

function addDays(base: Date, days: number): Date { const d = new Date(base); d.setDate(d.getDate() + days); return d; }

function rangeDateKeys(range: 'day'|'week'|'month'): string[] {
  const today = new Date();
  const count = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    keys.push(d.toISOString().slice(0,10));
  }
  return keys;
}

export const getDailyAnalytics = async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) as ('day'|'week'|'month') || 'week';
    const dateKeys = rangeDateKeys(range);
    const files = listFilesSafe(reportDir);

    const previewFiles = files.filter(f => f.startsWith('daily-preview-'));
    const cleanupFiles = files.filter(f => f.startsWith('image-url-cleanup-'));

    // 读取最新剩余量（Prometheus Gauge）
    const monitoring = MonitoringService.getInstance();
    const metricsText = await monitoring.getMetrics();
    const remainingByModel = parseRemainingFromMetrics(metricsText);
    const remainingTotal = Object.values(remainingByModel).reduce((a,b)=>a+(b||0),0);

    // 进度与质量时间序列
    const progressSeries: ProgressPoint[] = [];
    const qualitySeries: QualityPoint[] = [];
    const performanceSeries: PerformanceSeries = { modelDurationsByDay: {}, topSlowModels: [] };

    // 索引预览与执行数据
    const previewsByDay: Record<string, any> = {};
    for (const f of previewFiles) {
      const day = getDateKeyFromPreviewFilename(f);
      if (!day) continue;
      const data = readJsonSafe<any>(path.join(reportDir, f));
      if (data) previewsByDay[day] = data;
    }

    const processedByDay: Record<string, number> = {};
    const durationsByDayModel: Record<string, Record<string, number>> = {};
    for (const f of cleanupFiles) {
      const day = getDateKeyFromCleanupFilename(f);
      if (!day) continue;
      const data = readJsonSafe<any>(path.join(reportDir, f));
      if (!data) continue;
      processedByDay[day] = (processedByDay[day] || 0) + (data.updatedCount || 0);
      const mdl = data.modelDurationsMs || {};
      durationsByDayModel[day] = durationsByDayModel[day] || {};
      for (const [mName, ms] of Object.entries(mdl)) {
        durationsByDayModel[day][mName] = (durationsByDayModel[day][mName] || 0) + (ms as number);
      }
    }

    // 生成时间序列
    for (const day of dateKeys) {
      const preview = previewsByDay[day];
      const processed = processedByDay[day] || 0;
      const remaining = remainingTotal; // 当前剩余量（近似）
      const totalCandidates = preview?.summary?.totalCandidates || 0;
      const completionBase = totalCandidates > 0 ? totalCandidates : (processed + remaining) || 1;

      progressSeries.push({
        date: day,
        processedCount: processed,
        remainingCount: remaining,
        completionPct: Math.max(0, Math.min(1, processed / completionBase))
      });

      const byReason = preview?.summary?.byReason || {};
      const total = totalCandidates || 1;
      qualitySeries.push({
        date: day,
        invalidRatio: (byReason['invalid'] || 0) / total,
        uploadsPrefixAddedRatio: (byReason['uploads_prefix_added'] || 0) / total,
        portRewriteRatio: (byReason['port_rewrite'] || 0) / total,
        relativeToAbsoluteRatio: (byReason['relative_to_absolute'] || 0) / total,
        protocolNormalizedRatio: (byReason['protocol_normalized'] || 0) / total,
      });

      // 性能：按天-模型耗时
      if (durationsByDayModel[day]) {
        performanceSeries.modelDurationsByDay[day] = durationsByDayModel[day];
        for (const [model, ms] of Object.entries(durationsByDayModel[day])) {
          performanceSeries.topSlowModels.push({ model, durationMs: ms as number, date: day });
        }
      }
    }

    // Top慢模型排序
    performanceSeries.topSlowModels.sort((a,b)=>b.durationMs - a.durationMs);

    // 最新预览的分解信息（用于剩余仪表盘与钻取）
    const latestPreviewName = previewFiles.sort().reverse()[0];
    const latestPreview = latestPreviewName ? readJsonSafe<any>(path.join(reportDir, latestPreviewName)) : null;

    res.json({
      success: true,
      range,
      series: {
        progress: progressSeries,
        quality: qualitySeries,
        performance: performanceSeries,
      },
      breakdown: {
        remainingByModel,
        latestPreview: latestPreview ? {
          totalCandidates: latestPreview.summary?.totalCandidates || 0,
          byModel: latestPreview.summary?.byModel || {},
          byReason: latestPreview.summary?.byReason || {}
        } : null
      }
    });
  } catch (error) {
    Logger.error('获取治理每日分析失败', error);
    res.status(500).json({ success: false, message: '获取治理每日分析失败' });
  }
};