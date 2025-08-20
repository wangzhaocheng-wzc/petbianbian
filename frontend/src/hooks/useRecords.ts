import { useState, useEffect, useCallback } from 'react';
import recordsService, { 
  RecordFilters, 
  RecordsResponse, 
  HealthRecord, 
  StatisticsOverview,
  PetStatistics,
  AggregationSummary
} from '../services/recordsService';

export const useRecords = (initialFilters: RecordFilters = {}) => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [filters, setFilters] = useState<RecordFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (newFilters?: RecordFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const filtersToUse = newFilters || filters;
      const response = await recordsService.getRecords(filtersToUse);
      
      setRecords(response.records);
      setPagination(response.pagination);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '获取记录失败');
      console.error('获取记录失败:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<RecordFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchRecords(updatedFilters);
  }, [filters, fetchRecords]);

  const resetFilters = useCallback(() => {
    const resetFilters = { page: 1, limit: 10 };
    setFilters(resetFilters);
    fetchRecords(resetFilters);
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      await recordsService.deleteRecord(id);
      // 重新获取记录列表
      fetchRecords();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || '删除记录失败');
      return false;
    }
  }, [fetchRecords]);

  const updateRecord = useCallback(async (id: string, data: any) => {
    try {
      const updatedRecord = await recordsService.updateRecord(id, data);
      // 更新本地记录
      setRecords(prev => prev.map(record => 
        record.id === id ? updatedRecord : record
      ));
      return updatedRecord;
    } catch (err: any) {
      setError(err.response?.data?.message || '更新记录失败');
      return null;
    }
  }, []);

  const batchDeleteRecords = useCallback(async (recordIds: string[]) => {
    try {
      const result = await recordsService.batchDeleteRecords(recordIds);
      // 重新获取记录列表
      fetchRecords();
      return result;
    } catch (err: any) {
      setError(err.response?.data?.message || '批量删除失败');
      return null;
    }
  }, [fetchRecords]);

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    pagination,
    filters,
    loading,
    error,
    fetchRecords,
    updateFilters,
    resetFilters,
    deleteRecord,
    updateRecord,
    batchDeleteRecords,
    setError
  };
};

export const useRecordDetail = (id: string) => {
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const recordData = await recordsService.getRecordById(id);
      setRecord(recordData);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '获取记录详情失败');
      console.error('获取记录详情失败:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateRecord = useCallback(async (data: any) => {
    if (!id) return null;
    
    try {
      const updatedRecord = await recordsService.updateRecord(id, data);
      setRecord(updatedRecord);
      return updatedRecord;
    } catch (err: any) {
      setError(err.response?.data?.message || '更新记录失败');
      return null;
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  return {
    record,
    loading,
    error,
    fetchRecord,
    updateRecord,
    setError
  };
};

export const useRecordStatistics = () => {
  const [statistics, setStatistics] = useState<StatisticsOverview | null>(null);
  const [petStatistics, setPetStatistics] = useState<{ [petId: string]: PetStatistics }>({});
  const [aggregationSummary, setAggregationSummary] = useState<AggregationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async (period: string = 'month') => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await recordsService.getStatisticsOverview(period);
      setStatistics(stats);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '获取统计数据失败');
      console.error('获取统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPetStatistics = useCallback(async (petId: string, period: string = 'month') => {
    try {
      const stats = await recordsService.getPetStatistics(petId, period);
      setPetStatistics(prev => ({ ...prev, [petId]: stats }));
      return stats;
    } catch (err: any) {
      setError(err.response?.data?.message || '获取宠物统计失败');
      return null;
    }
  }, []);

  const fetchAggregationSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const summary = await recordsService.getAggregationSummary();
      setAggregationSummary(summary);
      
    } catch (err: any) {
      setError(err.response?.data?.message || '获取汇总数据失败');
      console.error('获取汇总数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    statistics,
    petStatistics,
    aggregationSummary,
    loading,
    error,
    fetchStatistics,
    fetchPetStatistics,
    fetchAggregationSummary,
    setError
  };
};