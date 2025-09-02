import api from './api';

export interface SystemStats {
  users: {
    total: number;
    active: number;
    verified: number;
    admins: number;
    moderators: number;
  };
  content: {
    posts: {
      total: number;
      published: number;
      pending: number;
      rejected: number;
    };
    comments: {
      total: number;
      pending: number;
      rejected: number;
    };
  };
  reports: {
    total: number;
    pending: number;
    resolved: number;
    dismissed: number;
  };
  recentActivity: {
    users: number;
    posts: number;
    comments: number;
    reports: number;
  };
}

export interface UserData {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    location?: string;
    bio?: string;
  };
  stats: {
    totalAnalysis: number;
    totalPosts: number;
    reputation: number;
  };
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  users: UserData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AdminService {
  // 获取系统统计信息
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get('/admin/stats');
    return response.data.data;
  }

  // 获取用户列表
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/admin/users?${queryParams}`);
    return response.data.data;
  }

  // 用户操作
  async activateUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/activate`);
    return response.data;
  }

  async deactivateUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/deactivate`);
    return response.data;
  }

  async verifyUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/verify`);
    return response.data;
  }

  async unverifyUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/unverify`);
    return response.data;
  }

  async promoteUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/promote`);
    return response.data;
  }

  async demoteUser(userId: string) {
    const response = await api.post(`/admin/users/${userId}/demote`);
    return response.data;
  }
}

export default new AdminService();