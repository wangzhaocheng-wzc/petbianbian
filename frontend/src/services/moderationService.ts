import api from './api';

export interface Report {
  _id: string;
  reporterId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewerId?: {
    _id: string;
    username: string;
  };
  reviewNotes?: string;
  targetContent?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationStats {
  pending: {
    posts: number;
    comments: number;
    reports: number;
    total: number;
  };
  processed: {
    rejectedPosts: number;
    rejectedComments: number;
    resolvedReports: number;
    total: number;
  };
  recentActivity: {
    posts: number;
    comments: number;
    reports: number;
    total: number;
  };
}

export interface PendingContent {
  posts: any[];
  comments: any[];
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number[];
  };
}

export interface UserViolationStats {
  rejectedPosts: number;
  rejectedComments: number;
  reports: number;
  totalViolations: number;
}

class ModerationService {
  // 创建举报
  async createReport(data: {
    targetType: 'post' | 'comment' | 'user';
    targetId: string;
    reason: string;
    description?: string;
  }) {
    const response = await api.post('/moderation/reports', data);
    return response.data;
  }

  // 内容预审核
  async preModerate(data: { content: string; title?: string }) {
    const response = await api.post('/moderation/pre-moderate', data);
    return response.data;
  }

  // 获取待审核内容（管理员）
  async getPendingContent(page = 1, limit = 20): Promise<PendingContent> {
    const response = await api.get(`/moderation/pending?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  // 审核决定（管理员）
  async moderateDecision(data: {
    type: 'post' | 'comment' | 'report';
    id: string;
    decision: 'approve' | 'reject';
    notes?: string;
  }) {
    const response = await api.post('/moderation/decision', data);
    return response.data;
  }

  // 批量审核（管理员）
  async batchModerate(items: Array<{
    type: 'post' | 'comment';
    id: string;
    decision: 'approve' | 'reject';
  }>) {
    const response = await api.post('/moderation/batch', { items });
    return response.data;
  }

  // 获取举报列表（管理员）
  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    targetType?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/moderation/reports?${queryParams}`);
    return response.data.data;
  }

  // 获取用户违规统计（管理员）
  async getUserViolationStats(userId: string): Promise<UserViolationStats> {
    const response = await api.get(`/moderation/users/${userId}/violations`);
    return response.data.data;
  }

  // 获取审核统计（管理员）
  async getModerationStats(): Promise<ModerationStats> {
    const response = await api.get('/moderation/stats');
    return response.data.data;
  }
}

export default new ModerationService();