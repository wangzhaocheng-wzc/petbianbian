import api from './api';

export interface RecordFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  petId?: string;
  healthStatus?: 'healthy' | 'warning' | 'concerning';
  shape?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  symptoms?: string[];
  minConfidence?: number;
  maxConfidence?: number;
  isShared?: boolean;
}

export interface RecordUpdateData {
  userNotes?: string;
  symptoms?: string[];
  isShared?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface HealthRecord {
  id: string;
  petId: string;
  pet: {
    _id: string;
    name: string;
    type: string;
    breed?: string;
    avatar?: string;
  };
  imageUrl: string;
  thumbnailUrl?: string;
  analysis: {
    shape: string;
    healthStatus: 'healthy' | 'warning' | 'concerning';
    confidence: number;
    details: string;
    recommendations: string[];
    detectedFeatures: {
      color: string;
      texture: string;
      consistency: string;
      size: string;
    };
    shapeDescription: string;
    healthStatusDescription: string;
  };
  userNotes?: string;
  symptoms?: string[];
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  weather?: {
    temperature: number;
    humidity: number;
  };
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecordsResponse {
  records: HealthRecord[];
  pagination: PaginationInfo;
  filters: RecordFilters;
}

export interface StatisticsOverview {
  period: string;
  days: number;
  totalRecords: number;
  healthyCount: number;
  warningCount: number;
  concerningCount: number;
  healthyPercentage: number;
  warningPercentage: number;
  concerningPercentage: number;
  avgConfidence: number;
  uniquePetsCount: number;
  averagePerWeek: number;
}

export interface PetStatistics {
  petId: string;
  petName: string;
  period: string;
  days: number;
  totalRecords: number;
  healthyCount: number;
  warningCount: number;
  concerningCount: number;
  healthyPercentage: number;
  warningPercentage: number;
  concerningPercentage: number;
  averagePerWeek: number;
}

export interface HealthTrend {
  _id: string;
  healthy: number;
  warning: number;
  concerning: number;
}

export interface PetSummary {
  petId: string;
  petName: string;
  petType: string;
  totalRecords: number;
  healthyCount: number;
  warningCount: number;
  concerningCount: number;
  healthyPercentage: number;
  avgConfidence: number;
  lastRecord: string;
  shapeDistribution: { [key: string]: number };
}

export interface AggregationSummary {
  petSummaries: PetSummary[];
  totalPets: number;
  totalRecords: number;
}

class RecordsService {
  /**
   * 获取记录列表
   */
  async getRecords(filters: RecordFilters = {}): Promise<RecordsResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await api.get(`/records?${params.toString()}`);
    return response.data.data;
  }

  /**
   * 获取单个记录详情
   */
  async getRecordById(id: string): Promise<HealthRecord> {
    const response = await api.get(`/records/${id}`);
    return response.data.data;
  }

  /**
   * 更新记录
   */
  async updateRecord(id: string, data: RecordUpdateData): Promise<HealthRecord> {
    const response = await api.put(`/records/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除记录
   */
  async deleteRecord(id: string): Promise<void> {
    await api.delete(`/records/${id}`);
  }

  /**
   * 获取统计概览
   */
  async getStatisticsOverview(period: string = 'month'): Promise<StatisticsOverview> {
    const response = await api.get(`/records/statistics/overview?period=${period}`);
    return response.data.data;
  }

  /**
   * 获取宠物统计
   */
  async getPetStatistics(petId: string, period: string = 'month'): Promise<PetStatistics> {
    const response = await api.get(`/records/statistics/pet/${petId}?period=${period}`);
    return response.data.data;
  }

  /**
   * 获取健康趋势
   */
  async getHealthTrends(petId: string, period: string = 'month'): Promise<{ petId: string; petName: string; period: string; days: number; trends: HealthTrend[] }> {
    const response = await api.get(`/records/trends/health/${petId}?period=${period}`);
    return response.data.data;
  }

  /**
   * 获取聚合汇总
   */
  async getAggregationSummary(): Promise<AggregationSummary> {
    const response = await api.get('/records/aggregation/summary');
    return response.data.data;
  }

  /**
   * 批量删除记录
   */
  async batchDeleteRecords(recordIds: string[]): Promise<{ deletedCount: number; requestedCount: number }> {
    const response = await api.post('/records/batch/delete', { recordIds });
    return response.data.data;
  }

  /**
   * 批量更新记录
   */
  async batchUpdateRecords(recordIds: string[], updateData: RecordUpdateData): Promise<{ modifiedCount: number; matchedCount: number; requestedCount: number }> {
    const response = await api.post('/records/batch/update', { recordIds, updateData });
    return response.data.data;
  }
}

export default new RecordsService();