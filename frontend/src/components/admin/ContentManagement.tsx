import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Search, Filter, Eye, Edit, Trash2, Flag, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';

interface Post {
  _id: string;
  title: string;
  content: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  category: string;
  status: 'published' | 'draft' | 'archived';
  moderationStatus: 'approved' | 'pending' | 'rejected';
  interactions: {
    likes: string[];
    views: number;
    shares: number;
  };
  comments: string[];
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  content: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  postId: {
    _id: string;
    title: string;
  };
  moderationStatus: 'approved' | 'pending' | 'rejected';
  likes: string[];
  createdAt: string;
}

const ContentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    moderationStatus: '',
    category: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (activeTab === 'posts') {
      loadPosts();
    } else {
      loadComments();
    }
  }, [activeTab, filters]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/admin/posts?${queryParams}`);
      const data = response.data.data;
      setPosts(data.posts || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get(`/admin/comments?${queryParams}`);
      const data = response.data.data;
      setComments(data.comments || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentAction = async (
    type: 'post' | 'comment',
    id: string,
    action: 'approve' | 'reject' | 'delete'
  ) => {
    try {
      setProcessing(true);
      await api.post(`/admin/${type}s/${id}/${action}`);
      
      if (activeTab === 'posts') {
        await loadPosts();
      } else {
        await loadComments();
      }
    } catch (error) {
      console.error(`Failed to ${action} ${type}:`, error);
    } finally {
      setProcessing(false);
    }
  };

  const getModerationStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getModerationStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      approved: '已通过',
      pending: '待审核',
      rejected: '已拒绝'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      moderationStatus: '',
      category: '',
      page: 1,
      limit: 20
    });
  };

  return (
    <div className="space-y-6">
      {/* 标签切换 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`${
              activeTab === 'posts'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="h-5 w-5 mr-2" />
            帖子管理
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`${
              activeTab === 'comments'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            评论管理
          </button>
        </nav>
      </div>

      {/* 筛选器 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜索内容
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder="搜索标题或内容..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              审核状态
            </label>
            <select
              value={filters.moderationStatus}
              onChange={(e) => setFilters({ ...filters, moderationStatus: e.target.value, page: 1 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全部状态</option>
              <option value="approved">已通过</option>
              <option value="pending">待审核</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
          {activeTab === 'posts' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">全部分类</option>
                <option value="health">健康分享</option>
                <option value="help">求助问答</option>
                <option value="experience">经验分享</option>
                <option value="general">其他</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <Filter className="h-4 w-4 mr-1" />
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 内容列表 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'posts' ? (
            posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到帖子</h3>
                <p className="mt-1 text-sm text-gray-500">当前筛选条件下没有帖子记录</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post._id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModerationStatusColor(post.moderationStatus)}`}>
                          {getModerationStatusText(post.moderationStatus)}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {post.category}
                        </span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {post.title}
                      </h4>
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>作者: {post.userId.username}</span>
                        <span>发布: {formatDate(post.createdAt)}</span>
                        <span className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {post.interactions.views}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {post.comments.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {post.moderationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction('post', post._id, 'approve')}
                            disabled={processing}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            通过
                          </button>
                          <button
                            onClick={() => handleContentAction('post', post._id, 'reject')}
                            disabled={processing}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            拒绝
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleContentAction('post', post._id, 'delete')}
                        disabled={processing}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到评论</h3>
                <p className="mt-1 text-sm text-gray-500">当前筛选条件下没有评论记录</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModerationStatusColor(comment.moderationStatus)}`}>
                          {getModerationStatusText(comment.moderationStatus)}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">
                        {comment.content}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>作者: {comment.userId.username}</span>
                        <span>帖子: {comment.postId.title}</span>
                        <span>发布: {formatDate(comment.createdAt)}</span>
                        <span>{comment.likes.length} 点赞</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {comment.moderationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleContentAction('comment', comment._id, 'approve')}
                            disabled={processing}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            通过
                          </button>
                          <button
                            onClick={() => handleContentAction('comment', comment._id, 'reject')}
                            disabled={processing}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            拒绝
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleContentAction('comment', comment._id, 'delete')}
                        disabled={processing}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示第 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
            共 {pagination.total} 条记录
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              第 {pagination.page} / {pagination.totalPages} 页
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, pagination.page + 1) })}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;