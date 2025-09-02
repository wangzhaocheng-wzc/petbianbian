import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { ModerationStats } from '../../services/moderationService';
import { SystemStats } from '../../services/adminService';
import adminService from '../../services/adminService';
import { TrendingUp, Users, FileText, AlertTriangle, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Props {
  stats: ModerationStats | null;
}

const ModerationDashboard: React.FC<Props> = ({ stats }) => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSystemStats();
      setSystemStats(data);
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const pendingData = {
    labels: ['帖子', '评论', '举报'],
    datasets: [
      {
        data: [stats.pending.posts, stats.pending.comments, stats.pending.reports],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        borderWidth: 1,
      },
    ],
  };

  const processedData = {
    labels: ['拒绝的帖子', '拒绝的评论', '已处理举报'],
    datasets: [
      {
        label: '已处理内容',
        data: [stats.processed.rejectedPosts, stats.processed.rejectedComments, stats.processed.resolvedReports],
        backgroundColor: '#EF4444',
        borderWidth: 1,
      },
    ],
  };

  const recentActivityData = {
    labels: ['帖子', '评论', '举报'],
    datasets: [
      {
        label: '近期活动',
        data: [stats.recentActivity.posts, stats.recentActivity.comments, stats.recentActivity.reports],
        backgroundColor: '#8B5CF6',
        borderWidth: 1,
      },
    ],
  };

  // 系统概览数据
  const systemOverviewData = systemStats ? {
    labels: ['用户', '帖子', '评论', '举报'],
    datasets: [
      {
        label: '总数',
        data: [
          systemStats.users.total,
          systemStats.content.posts.total,
          systemStats.content.comments.total,
          systemStats.reports.total
        ],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 1,
      },
    ],
  } : null;

  // 用户角色分布
  const userRoleData = systemStats ? {
    labels: ['普通用户', '版主', '管理员'],
    datasets: [
      {
        data: [
          systemStats.users.total - systemStats.users.moderators - systemStats.users.admins,
          systemStats.users.moderators,
          systemStats.users.admins
        ],
        backgroundColor: ['#6B7280', '#3B82F6', '#EF4444'],
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <div className="space-y-6">
      {/* 系统概览卡片 */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">总用户数</p>
                <p className="text-3xl font-bold">{systemStats.users.total}</p>
                <p className="text-blue-100 text-sm">活跃: {systemStats.users.active}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">总帖子数</p>
                <p className="text-3xl font-bold">{systemStats.content.posts.total}</p>
                <p className="text-green-100 text-sm">已发布: {systemStats.content.posts.published}</p>
              </div>
              <FileText className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">待处理举报</p>
                <p className="text-3xl font-bold">{systemStats.reports.pending}</p>
                <p className="text-yellow-100 text-sm">总举报: {systemStats.reports.total}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">近期活动</p>
                <p className="text-3xl font-bold">{systemStats.recentActivity.users + systemStats.recentActivity.posts}</p>
                <p className="text-purple-100 text-sm">新用户+帖子</p>
              </div>
              <Activity className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 系统概览图表 */}
        {systemOverviewData && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">系统数据概览</h3>
            <div className="h-80">
              <Bar 
                data={systemOverviewData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* 待审核内容分布 */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">待审核内容分布</h3>
          <div className="h-80">
            <Pie 
              data={pendingData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed}`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>

        {/* 用户角色分布 */}
        {userRoleData && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">用户角色分布</h3>
            <div className="h-80">
              <Pie 
                data={userRoleData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${context.parsed}`;
                        }
                      }
                    }
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 内容审核统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">已处理内容统计</h3>
          <div className="h-80">
            <Bar 
              data={processedData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">近7天审核活动</h3>
          <div className="h-80">
            <Bar 
              data={recentActivityData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* 系统健康状态 */}
      {systemStats && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">系统健康状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {((systemStats.users.active / systemStats.users.total) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-blue-700">用户活跃率</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {((systemStats.content.posts.published / systemStats.content.posts.total) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-green-700">内容通过率</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {systemStats.content.posts.pending + systemStats.content.comments.pending}
              </div>
              <div className="text-sm text-yellow-700">待审核内容</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {((systemStats.reports.pending / Math.max(systemStats.reports.total, 1)) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-red-700">待处理举报率</div>
            </div>
          </div>
        </div>
      )}

      {/* 详细统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-blue-900 mb-2">待审核</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-700">帖子:</span>
              <span className="font-medium text-blue-900">{stats.pending.posts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">评论:</span>
              <span className="font-medium text-blue-900">{stats.pending.comments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">举报:</span>
              <span className="font-medium text-blue-900">{stats.pending.reports}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">总计:</span>
                <span className="font-bold text-blue-900">{stats.pending.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-red-900 mb-2">已处理</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-red-700">拒绝帖子:</span>
              <span className="font-medium text-red-900">{stats.processed.rejectedPosts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">拒绝评论:</span>
              <span className="font-medium text-red-900">{stats.processed.rejectedComments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">处理举报:</span>
              <span className="font-medium text-red-900">{stats.processed.resolvedReports}</span>
            </div>
            <div className="border-t border-red-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-700 font-medium">总计:</span>
                <span className="font-bold text-red-900">{stats.processed.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <h4 className="text-lg font-medium text-purple-900 mb-2">近期活动</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-purple-700">帖子审核:</span>
              <span className="font-medium text-purple-900">{stats.recentActivity.posts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">评论审核:</span>
              <span className="font-medium text-purple-900">{stats.recentActivity.comments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">举报处理:</span>
              <span className="font-medium text-purple-900">{stats.recentActivity.reports}</span>
            </div>
            <div className="border-t border-purple-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-purple-700 font-medium">总计:</span>
                <span className="font-bold text-purple-900">{stats.recentActivity.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationDashboard;