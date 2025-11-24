import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import {
  CreatePostRequest,
  UpdatePostRequest,
  PostsListRequest,
  PostsListResponse,
  PostResponse,
  CreateCommentRequest,
  CommentsListResponse,
  CommentResponse,
  LikeResponse
} from '../../../shared/types';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
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
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('Community service: 尝试刷新token...');
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          
          const newAccessToken = response.data.data.access_token;
          localStorage.setItem('access_token', newAccessToken);
          
          // 重试原请求
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          console.log('Community service: Token刷新失败:', refreshError);
          // 只有在刷新token失败时才清除认证状态
          if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            // 不在这里触发登出事件，由主要的认证服务处理
          }
          return Promise.reject(refreshError);
        }
      } else {
        console.log('Community service: 没有refresh token');
        // 没有refresh token时，清除访问token
        localStorage.removeItem('access_token');
        // 不在这里触发登出事件，由主要的认证服务处理
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export const communityService = {
  // 获取帖子列表
  async getPosts(params: PostsListRequest = {}): Promise<PostsListResponse> {
    const response = await api.get('/community/posts', { params });
    return response.data;
  },

  // 获取单个帖子详情
  async getPost(id: string): Promise<PostResponse> {
    const response = await api.get(`/community/posts/${id}`);
    return response.data;
  },

  // 创建新帖子
  async createPost(data: CreatePostRequest): Promise<PostResponse> {
    const response = await api.post('/community/posts', data);
    return response.data;
  },

  // 更新帖子
  async updatePost(id: string, data: UpdatePostRequest): Promise<PostResponse> {
    const response = await api.put(`/community/posts/${id}`, data);
    return response.data;
  },

  // 删除帖子
  async deletePost(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/community/posts/${id}`);
    return response.data;
  },

  // 点赞/取消点赞帖子
  async toggleLikePost(id: string): Promise<LikeResponse> {
    const response = await api.post(`/community/posts/${id}/like`);
    return response.data;
  },

  // 获取帖子评论
  async getComments(postId: string, page = 1, limit = 20): Promise<CommentsListResponse> {
    const response = await api.get(`/community/posts/${postId}/comments`, {
      params: { page, limit }
    });
    return response.data;
  },

  // 创建评论
  async createComment(postId: string, data: CreateCommentRequest): Promise<CommentResponse> {
    const response = await api.post(`/community/posts/${postId}/comments`, data);
    return response.data;
  },

  // 点赞/取消点赞评论
  async toggleLikeComment(commentId: string): Promise<LikeResponse> {
    const response = await api.post(`/community/comments/${commentId}/like`);
    return response.data;
  },

  // 删除评论
  async deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/community/comments/${commentId}`);
    return response.data;
  },

  // 上传图片
  async uploadImage(file: File): Promise<{ success: boolean; data?: { url: string }; message?: string }> {
    const formData = new FormData();
    // 后端 /api/upload/community 期望字段名为 'images'，支持多文件
    formData.append('images', file);

    const response = await api.post('/upload/community', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // 兼容后端返回的数据结构：{ data: { files: [{ url, ... }], count } }
    const resp = response.data;
    if (resp?.success && resp?.data?.files?.length) {
      const first = resp.data.files[0];
      return { success: true, data: { url: first.url } };
    }
    return resp;
  }
};