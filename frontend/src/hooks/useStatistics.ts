import { useState, useEffect, useCallback } from 'react';
import statisticsService, {
  HealthTrendPoint,
  PeriodStatistics,
  AnomalyPattern,
  ComparisonAnalysis,
  MultiPetSummary,
  UserOverview
} from '../services/statisticsService';

interface UseStatisticsOptions {
  petId?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
  trendDays?: number;
  granularity?: 'daily' | 'weekly';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseStatisticsReturn {
  // 数据状态
  trendData: HealthTrendPoint[];
  periodStats: PeriodStatistics | null;
  anomalies: AnomalyPattern[];
  comparison: ComparisonAnalysis | null;
  multiPetSummary: MultiPetSummary | null;
  userOverview: UserOverview | null;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // 操作方法
  loadTrends: (petId: string, days?: number, granularity?: 'daily' | 'weekly') => Promise<void>;
  loadPeriodStats: (petId: string, period?: 'week' | 'month' | 'quarter' | 'year') => Promise<void>;
  loadAnomalies: (petId: string, window?: number) => Promise<void>;
  loadComparison: (petId: string, period?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadMultiPetSummary: (period?: 'week' | 'month' | 'quarter' | 'year') => Promise<void>;
  loadUserOverview: () => Promise<void>;
  loadAllData: (petId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useStatistics = (options: UseStatisticsOptions = {}): UseStatisticsReturn => {
  const {
    petId,
    period = 'month',
    trendDays = 30,
    granularity = 'daily',
    autoRefresh = false,
    refreshInterval = 300000 // 5分钟
  } = options;

  // 数据状态
  const [trendData, setTrendData] = useState<HealthTrendPoint[]>([]);
  const [periodStats, setPeriodStats] = useState<PeriodStatistics | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyPattern[]>([]);
  const [comparison, setComparison] = useState<ComparisonAnalysis | null>(null);
  const [multiPetSummary, setMultiPetSummary] = useState<MultiPetSummary | null>(null);
  const [userOverview, setUserOverview] = useState<UserOverview | null>(null);

  // 加载状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载健康趋势数据
  const loadTrends = useCallback(async (
    targetPetId: string, 
    days: number = trendDays, 
    targetGranularity: 'daily' | 'weekly' = granularity
  ) => {
    try {
      setError(null);
      const response = await statisticsService.getHealthTrends(targetPetId, days, targetGranularity);
      setTrendData(response.trends);
    } catch (err) {
      console.error('加载健康趋势失败:', err);
      setError('加载健康趋势失败');
      throw err;
    }
  }, [trendDays, granularity]);

  // 加载周期统计数据
  const loadPeriodStats = useCallback(async (
    targetPetId: string, 
    targetPeriod: 'week' | 'month' | 'quarter' | 'year' = period
  ) => {
    try {
      setError(null);
      const response = await statisticsService.getPeriodStatistics(targetPetId, targetPeriod);
      setPeriodStats(response);
    } catch (err) {
      console.error('加载周期统计失败:', err);
      setError('加载周期统计失败');
      throw err;
    }
  }, [period]);

  // 加载异常检测数据
  const loadAnomalies = useCallback(async (targetPetId: string, window: number = 30) => {
    try {
      setError(null);
      const response = await statisticsService.getAnomalyPatterns(targetPetId, window);
      setAnomalies(response.anomalies);
    } catch (err) {
      console.error('加载异常检测失败:', err);
      setError('加载异常检测失败');
      throw err;
    }
  }, []);

  // 加载对比分析数据
  const loadComparison = useCallback(async (
    targetPetId: string, 
    targetPeriod: 'week' | 'month' | 'quarter' = period as 'week' | 'month' | 'quarter'
  ) => {
    try {
      setError(null);
      const response = await statisticsService.getComparisonAnalysis(targetPetId, targetPeriod);
      setComparison(response);
    } catch (err) {
      console.error('加载对比分析失败:', err);
      setError('加载对比分析失败');
      throw err;
    }
  }, [period]);

  // 加载多宠物汇总数据
  const loadMultiPetSummary = useCallback(async (
    targetPeriod: 'week' | 'month' | 'quarter' | 'year' = period
  ) => {
    try {
      setError(null);
      const response = await statisticsService.getMultiPetSummary(targetPeriod);
      setMultiPetSummary(response);
    } catch (err) {
      console.error('加载多宠物汇总失败:', err);
      setError('加载多宠物汇总失败');
      throw err;
    }
  }, [period]);

  // 加载用户概览数据
  const loadUserOverview = useCallback(async () => {
    try {
      setError(null);
      const response = await statisticsService.getUserOverview();
      setUserOverview(response);
    } catch (err) {
      console.error('加载用户概览失败:', err);
      setError('加载用户概览失败');
      throw err;
    }
  }, []);

  // 加载所有数据
  const loadAllData = useCallback(async (targetPetId: string) => {
    setLoading(true);
    try {
      setError(null);
      await Promise.all([
        loadTrends(targetPetId),
        loadPeriodStats(targetPetId),
        loadAnomalies(targetPetId),
        loadComparison(targetPetId)
      ]);
    } catch (err) {
      console.error('加载统计数据失败:', err);
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [loadTrends, loadPeriodStats, loadAnomalies, loadComparison]);

  // 刷新数据
  const refresh = useCallback(async () => {
    if (petId) {
      await loadAllData(petId);
    } else {
      await Promise.all([
        loadMultiPetSummary(),
        loadUserOverview()
      ]);
    }
  }, [petId, loadAllData, loadMultiPetSummary, loadUserOverview]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初始化加载数据
  useEffect(() => {
    if (petId) {
      loadAllData(petId);
    }
  }, [petId, loadAllData]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    // 数据状态
    trendData,
    periodStats,
    anomalies,
    comparison,
    multiPetSummary,
    userOverview,
    
    // 加载状态
    loading,
    error,
    
    // 操作方法
    loadTrends,
    loadPeriodStats,
    loadAnomalies,
    loadComparison,
    loadMultiPetSummary,
    loadUserOverview,
    loadAllData,
    refresh,
    clearError
  };
};

export default useStatistics;