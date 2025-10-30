import api from './api';

export interface PreviewChange {
  model: string;
  docId: string;
  field: string;
  original: string;
  resolved: string;
  reason: string;
}

export interface GovernancePreviewResult {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  summary: {
    totalCandidates: number;
    byModel: Record<string, number>;
    byReason: Record<string, number>;
  };
  sampleChanges: PreviewChange[];
}

export interface GovernanceExecuteResult extends GovernancePreviewResult {
  updatedCount: number;
  failedCount: number;
  failures: Array<{ model: string; docId: string; field: string; error: string }>;
  reportFile?: string;
}

export interface GovernanceAnalyticsResponse {
  success: boolean;
  range: 'day' | 'week' | 'month';
  series: {
    progress: Array<{ date: string; processedCount: number; remainingCount: number; completionPct: number }>;
    quality: Array<{
      date: string;
      invalidRatio: number;
      uploadsPrefixAddedRatio: number;
      portRewriteRatio: number;
      relativeToAbsoluteRatio: number;
      protocolNormalizedRatio: number;
    }>;
    performance: {
      modelDurationsByDay: Record<string, Record<string, number>>;
      topSlowModels: Array<{ model: string; durationMs: number; date: string }>;
    };
  };
  breakdown: {
    remainingByModel: Record<string, number>;
    latestPreview: null | {
      totalCandidates: number;
      byModel: Record<string, number>;
      byReason: Record<string, number>;
    };
  };
}

const governanceService = {
  async preview(limitPerModel?: number): Promise<{ jobId: string; result: GovernancePreviewResult }> {
    const response = await api.post('/governance/image-url/preview', {
      limitPerModel: typeof limitPerModel === 'number' ? limitPerModel : undefined,
    });
    return response.data;
  },

  async getPreview(jobId: string): Promise<GovernancePreviewResult> {
    const response = await api.get(`/governance/image-url/preview/${jobId}`);
    return response.data.result;
  },

  async execute(jobId: string): Promise<GovernanceExecuteResult> {
    const response = await api.post('/governance/image-url/execute', { jobId });
    return response.data.result;
  },

  async getDailyAnalytics(range: 'day' | 'week' | 'month' = 'week'): Promise<GovernanceAnalyticsResponse> {
    const response = await api.get(`/governance/reports/daily`, { params: { range } });
    return response.data as GovernanceAnalyticsResponse;
  }
};

export default governanceService;