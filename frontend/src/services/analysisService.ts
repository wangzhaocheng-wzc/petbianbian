import axios from 'axios';
import { 
  AnalysisResponse, 
  AnalysisRecordsResponse, 
  AnalysisStatisticsResponse,
  PoopRecord 
} from '../../../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时，因为AI分析可能需要较长时间
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误和token刷新
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 避免在刷新token的请求上重试
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }
    
    // 只在访问需要认证的API时处理401错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          console.log('Analysis service: 尝试刷新token...');
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          
          const newAccessToken = response.data.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          
          // 重试原请求
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          console.log('Analysis service: Token刷新失败:', refreshError);
          // 只有在刷新token失败时才清除认证状态
          if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            // 不在这里触发登出事件，由主要的认证服务处理
          }
          return Promise.reject(refreshError);
        }
      } else {
        console.log('Analysis service: 没有refresh token');
        // 没有refresh token时，清除访问token
        localStorage.removeItem('accessToken');
        // 不在这里触发登出事件，由主要的认证服务处理
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
   }
 );

export class AnalysisService {
  /**
   * 上传图片进行分析
   */
  static async uploadForAnalysis(
    file: File, 
    petId: string, 
    notes?: string, 
    symptoms?: string
  ): Promise<AnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('petId', petId);
      if (notes) formData.append('notes', notes);
      if (symptoms) formData.append('symptoms', symptoms);

      const response = await api.post('/analysis/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('上传分析失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '上传分析失败',
        errors: error.response?.data?.errors
      };
    }
  }

  /**
   * 获取分析记录列表
   */
  static async getAnalysisRecords(
    petId: string,
    options: {
      page?: number;
      limit?: number;
      healthStatus?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<AnalysisRecordsResponse> {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.healthStatus) params.append('healthStatus', options.healthStatus);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await api.get(`/analysis/records/${petId}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('获取分析记录失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '获取分析记录失败'
      };
    }
  }

  /**
   * 获取单个分析记录
   */
  static async getAnalysisRecord(recordId: string): Promise<{ success: boolean; data?: PoopRecord; message?: string }> {
    try {
      const response = await api.get(`/analysis/record/${recordId}`);
      return response.data;
    } catch (error: any) {
      console.error('获取分析记录失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '获取分析记录失败'
      };
    }
  }

  /**
   * 获取分析统计数据
   */
  static async getAnalysisStatistics(
    petId: string,
    period: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<AnalysisStatisticsResponse> {
    try {
      const response = await api.get(`/analysis/statistics/${petId}?period=${period}`);
      return response.data;
    } catch (error: any) {
      console.error('获取分析统计失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '获取分析统计失败'
      };
    }
  }

  /**
   * 删除分析记录
   */
  static async deleteAnalysisRecord(recordId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/analysis/record/${recordId}`);
      return response.data;
    } catch (error: any) {
      console.error('删除分析记录失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '删除分析记录失败'
      };
    }
  }

  /**
   * 更新分析记录
   */
  static async updateAnalysisRecord(
    recordId: string,
    updates: {
      userNotes?: string;
      symptoms?: string[];
      isShared?: boolean;
    }
  ): Promise<{ success: boolean; data?: PoopRecord; message?: string }> {
    try {
      const response = await api.put(`/analysis/record/${recordId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('更新分析记录失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '更新分析记录失败'
      };
    }
  }

  /**
   * 分享分析记录到社区
   */
  static async shareToCommunity(recordId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/analysis/record/${recordId}/share`);
      return response.data;
    } catch (error: any) {
      console.error('分享记录失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '分享记录失败'
      };
    }
  }

  /**
   * 导出分析记录
   */
  static async exportRecords(
    petId: string,
    format: 'csv' | 'pdf' = 'csv',
    options: {
      startDate?: string;
      endDate?: string;
      healthStatus?: string;
    } = {}
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.healthStatus) params.append('healthStatus', options.healthStatus);

      const response = await api.get(`/analysis/export/${petId}?${params.toString()}`, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error: any) {
      console.error('导出记录失败:', error);
      throw new Error(error.response?.data?.message || '导出记录失败');
    }
  }

  /**
   * 获取健康建议
   */
  static async getHealthAdvice(petId: string): Promise<{
    success: boolean;
    data?: {
      advice: string[];
      riskLevel: 'low' | 'medium' | 'high';
      urgency: 'none' | 'monitor' | 'consult' | 'urgent';
      lastAnalysis?: Date;
    };
    message?: string;
  }> {
    try {
      const response = await api.get(`/analysis/advice/${petId}`);
      return response.data;
    } catch (error: any) {
      console.error('获取健康建议失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '获取健康建议失败'
      };
    }
  }

  /**
   * 批量删除分析记录
   */
  static async batchDeleteRecords(recordIds: string[]): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/analysis/batch-delete', { recordIds });
      return response.data;
    } catch (error: any) {
      console.error('批量删除记录失败:', error);
      return {
        success: false,
        message: error.response?.data?.message || '批量删除记录失败'
      };
    }
  }
}