import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { OfflineStorage, OfflineQueue } from '../utils/offlineStorage';

// 离线API服务包装器
export class OfflineApiService {
  private static instance: OfflineApiService;
  private baseURL: string;

  private constructor() {
    this.baseURL = '/api';
  }

  static getInstance(): OfflineApiService {
    if (!OfflineApiService.instance) {
      OfflineApiService.instance = new OfflineApiService();
    }
    return OfflineApiService.instance;
  }

  // 带离线支持的GET请求
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = `get_${url}_${JSON.stringify(config?.params || {})}`;
    
    try {
      // 尝试网络请求
      const response: AxiosResponse<T> = await axios.get(`${this.baseURL}${url}`, config);
      
      // 缓存成功的响应
      await OfflineStorage.setItem(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      // 网络请求失败时，尝试从缓存获取
      if (!navigator.onLine) {
        const cachedData = OfflineStorage.getItem<T>(cacheKey);
        if (cachedData) {
          console.log('从缓存返回数据:', url);
          return cachedData;
        }
      }
      throw error;
    }
  }

  // 带离线队列支持的POST请求
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axios.post(`${this.baseURL}${url}`, data, config);
      return response.data;
    } catch (error) {
      // 如果离线，添加到队列
      if (!navigator.onLine) {
        const success = OfflineQueue.addToQueue({
          type: 'POST',
          url: `${this.baseURL}${url}`,
          method: 'POST',
          data,
          timestamp: Date.now()
        });
        
        if (success) {
          console.log('请求已添加到离线队列:', url);
          // 返回一个临时响应，表示请求已排队
          return { message: '请求已排队，将在网络恢复时处理' } as T;
        }
      }
      throw error;
    }
  }

  // 带离线队列支持的PUT请求
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axios.put(`${this.baseURL}${url}`, data, config);
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        const success = OfflineQueue.addToQueue({
          type: 'PUT',
          url: `${this.baseURL}${url}`,
          method: 'PUT',
          data,
          timestamp: Date.now()
        });
        
        if (success) {
          console.log('PUT请求已添加到离线队列:', url);
          return { message: '请求已排队，将在网络恢复时处理' } as T;
        }
      }
      throw error;
    }
  }

  // 带离线队列支持的DELETE请求
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axios.delete(`${this.baseURL}${url}`, config);
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        const success = OfflineQueue.addToQueue({
          type: 'DELETE',
          url: `${this.baseURL}${url}`,
          method: 'DELETE',
          timestamp: Date.now()
        });
        
        if (success) {
          console.log('DELETE请求已添加到离线队列:', url);
          return { message: '请求已排队，将在网络恢复时处理' } as T;
        }
      }
      throw error;
    }
  }

  // 获取缓存的数据
  getCachedData<T>(url: string, params?: any): T | null {
    const cacheKey = `get_${url}_${JSON.stringify(params || {})}`;
    return OfflineStorage.getItem<T>(cacheKey);
  }

  // 清除特定URL的缓存
  clearCache(url: string, params?: any): boolean {
    const cacheKey = `get_${url}_${JSON.stringify(params || {})}`;
    return OfflineStorage.removeItem(cacheKey);
  }

  // 清除所有缓存
  clearAllCache(): boolean {
    return OfflineStorage.clear();
  }
}

// 导出单例实例
export const offlineApi = OfflineApiService.getInstance();

// 便捷的API方法
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => offlineApi.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => offlineApi.post<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => offlineApi.put<T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => offlineApi.delete<T>(url, config),
  getCached: <T>(url: string, params?: any) => offlineApi.getCachedData<T>(url, params),
  clearCache: (url: string, params?: any) => offlineApi.clearCache(url, params),
  clearAllCache: () => offlineApi.clearAllCache(),
};