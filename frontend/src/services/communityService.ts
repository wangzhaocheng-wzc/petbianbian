import axios from 'axios';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并重定向到登录页
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
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
    formData.append('image', file);
    
    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};