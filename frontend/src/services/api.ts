import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { tokenManager } from '@/utils/helpers';

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 如果是401错误且不是重试请求
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // 检查是否是页面初始化请求，避免在页面加载时触发登出
      const isInitRequest = originalRequest.headers?.['X-Init-Request'] === 'true';
      
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const tokens = resp?.data?.data?.tokens;
          const accessToken = tokens?.access_token;
          const newRefreshToken = tokens?.refresh_token;

          if (!accessToken) {
            throw new Error('令牌刷新失败：未返回 access_token');
          }

          tokenManager.setAccessToken(accessToken);
          if (newRefreshToken) {
            tokenManager.setRefreshToken(newRefreshToken);
          }
          
          // 重试原请求
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // 刷新失败，清除令牌
          tokenManager.clearTokens();
          // 只有在非初始化请求时才触发登出事件
          if (!isInitRequest) {
            window.dispatchEvent(new CustomEvent('auth-logout'));
          }
          return Promise.reject(refreshError);
        }
      } else {
        // 没有刷新令牌，清除访问令牌
        tokenManager.clearTokens();
        // 只有在非初始化请求时才触发登出事件
        if (!isInitRequest) {
          window.dispatchEvent(new CustomEvent('auth-logout'));
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// 通用API方法
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.get(url, config).then(res => res.data),
    
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.post(url, data, config).then(res => res.data),
    
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.put(url, data, config).then(res => res.data),
    
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.delete(url, config).then(res => res.data),
    
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.patch(url, data, config).then(res => res.data),
};

export default api;