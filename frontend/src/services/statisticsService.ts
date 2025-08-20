import api from './api';

export interface HealthTrendPoint {
  date: string;
  healthy: number;
  warning: number;
  concerning: number;
  total: number;
  healthyPercentage: number;
  warningPercentage: number;
  concerningPercentage: number;
}

export interface PeriodStatistics {
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  totalRecords: number;
  healthyCount: number;
  warningCount: number;
  concerningCount: number;
  healthyPercentage: number;
  warningPercentage: number;
  concerningPercentage: number;
  averageConfidence: number;
  frequencyPerWeek: number;
  shapeDistribution: { [key: string]: number };
  symptomsFrequency: { [key: string]: number };
}

export interface AnomalyPattern {
  type: 'sudden_decline' | 'persistent_warning' | 'frequency_drop' | 'confidence_drop' | 'shape_change';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  affectedPeriod: {
    start: string;
    end: string;
  };
  metrics: {
    [key: string]: number | string;
  };
  recommendations: string[];
}

export interface ComparisonAnalysis {
  currentPeriod: PeriodStatistics;
  previousPeriod: PeriodStatistics;
  changes: {
    healthyChange: number;
    warningChange: number;
    concerningChange: number;
    confidenceChange: number;
    frequencyChange: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  significantChanges: string[];
}

export interface PetSummary {
  petId: string;
  petName: string;
  petType: string;
  petBreed?: string;
  petAvatar?: string;
  statistics: PeriodStatistics | null;
  anomaliesCount: number;
  highSeverityAnomalies: number;
  lastAnalyzed: string | null;
  error?: string;
}

export interface MultiPetSummary {
  period: string;
  totalPets: number;
  activePets: number;
  petSummaries: PetSummary[];
  overallStatistics: {
    totalRecords: number;
    averageHealthyPercentage: number;
    averageWarningPercentage: number;
    averageConcerningPercentage: number;
    totalAnomalies: number;
    highSeverityAnomalies: number;
  };
}

export interface UserOverview {
  totalPets: number;
  activePets: number;
  periodStatistics: {
    week: PeriodStatistics;
    month: PeriodStatistics;
    quarter: PeriodStatistics;
  };
  recentAnomalies: (AnomalyPattern & { petId: string; petName: string })[];
  summary: {
    totalRecordsThisMonth: number;
    healthyRateThisMonth: number;
    activeAnomalies: number;
    averageFrequencyPerWeek: number;
  };
}

class StatisticsService {
  /**
   * 获取健康趋势数据
   */
  async getHealthTrends(
    petId: string, 
    days: number = 30, 
    granularity: 'daily' | 'weekly' = 'daily'
  ): Promise<{ petId: string; petName: string; days: number; granularity: string; trends: HealthTrendPoint[] }> {
    const response = await api.get(`/statistics/trends/health/${petId}?days=${days}&granularity=${granularity}`);
    return response.data.data;
  }

  /**
   * 获取周期统计数据
   */
  async getPeriodStatistics(
    petId: string, 
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<PeriodStatistics & { petId: string; petName: string }> {
    const response = await api.get(`/statistics/period/${petId}?period=${period}`);
    return response.data.data;
  }

  /**
   * 获取异常模式检测结果
   */
  async getAnomalyPatterns(
    petId: string, 
    window: number = 30
  ): Promise<{
    petId: string;
    petName: string;
    analysisWindow: number;
    anomaliesCount: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
    anomalies: AnomalyPattern[];
  }> {
    const response = await api.get(`/statistics/anomalies/${petId}?window=${window}`);
    return response.data.data;
  }

  /**
   * 获取对比分析结果
   */
  async getComparisonAnalysis(
    petId: string, 
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<ComparisonAnalysis & { petId: string; petName: string }> {
    const response = await api.get(`/statistics/comparison/${petId}?period=${period}`);
    return response.data.data;
  }

  /**
   * 获取多宠物统计汇总
   */
  async getMultiPetSummary(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<MultiPetSummary> {
    const response = await api.get(`/statistics/summary/multi-pet?period=${period}`);
    return response.data.data;
  }

  /**
   * 获取用户整体统计概览
   */
  async getUserOverview(): Promise<UserOverview> {
    const response = await api.get('/statistics/overview/user');
    return response.data.data;
  }
}

export default new StatisticsService();