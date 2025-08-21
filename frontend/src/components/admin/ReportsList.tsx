import React, { useState, useEffect } from 'react';
import { AlertTriangle, User, MessageSquare, FileText, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import moderationService, { Report } from '../../services/moderationService';

interface Props {
  onUpdate: () => void;
}

const ReportsList: React.FC<Props> = ({ onUpdate }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    targetType: '',
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
    loadReports();
  }, [filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await moderationService.getReports(filters);
      setReports(data.reports || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportDecision = async (reportId: string, decision: 'resolve' | 'dismiss', notes?: string) => {
    try {
      setProcessing(true);
      await moderationService.moderateDecision({
        type: 'report',
        id: reportId,
        decision: decision === 'resolve' ? 'approve' : 'reject',
        notes
      });
      await loadReports();
      onUpdate();
    } catch (error) {
      console.error('Failed to handle report:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getReasonText = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      spam: '垃圾信息',
      inappropriate: '不当内容',
      harassment: '骚扰行为',
      misinformation: '虚假信息',
      other: '其他'
    };
    return reasonMap[reason] || reason;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewed: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: '待处理',
      reviewed: '已审核',
      resolved: '已解决',
      dismissed: '已驳回'
    };
    return statusMap[status] || status;
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTargetTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      post: '帖子',
      comment: '评论',
      user: '用户'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="reviewed">已审核</option>
              <option value="resolved">已解决</option>
              <option value="dismissed">已驳回</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              举报类型
            </label>
            <select
              value={filters.targetType}
              onChange={(e) => setFilters({ ...filters, targetType: e.target.value, page: 1 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全部类型</option>
              <option value="post">帖子</option>
              <option value="comment">评论</option>
              <option value="user">用户</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: 'pending', targetType: '', page: 1, limit: 20 })}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      {/* 举报列表 */}
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到举报</h3>
          <p className="mt-1 text-sm text-gray-500">当前筛选条件下没有举报记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report._id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 举报信息头部 */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                      {getTargetTypeIcon(report.targetType)}
                      <span className="text-sm font-medium text-gray-900">
                        {getTargetTypeText(report.targetType)}举报
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {getStatusText(report.status)}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      {getReasonText(report.reason)}
                    </span>
                  </div>

                  {/* 举报详情 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">举报人:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {report.reporterId?.username || '未知用户'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">举报时间:</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                    </div>
                    {report.reviewerId && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">处理人:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {report.reviewerId.username}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">处理时间:</span>
                          <span className="text-sm text-gray-900">
                            {formatDate(report.updatedAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 举报描述 */}
                  {report.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">举报描述:</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* 被举报内容 */}
                  {report.targetContent && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">被举报内容:</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        {report.targetType === 'post' && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">
                              {report.targetContent.title}
                            </h5>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {report.targetContent.content}
                            </p>
                          </div>
                        )}
                        {report.targetType === 'comment' && (
                          <p className="text-sm text-gray-700">
                            {report.targetContent.content}
                          </p>
                        )}
                        {report.targetType === 'user' && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              用户: {report.targetContent.username}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 处理备注 */}
                  {report.reviewNotes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">处理备注:</h4>
                      <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-md">
                        {report.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                {report.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleReportDecision(report._id, 'resolve')}
                      disabled={processing}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      解决
                    </button>
                    <button
                      onClick={() => handleReportDecision(report._id, 'dismiss')}
                      disabled={processing}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      驳回
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
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

export default ReportsList;