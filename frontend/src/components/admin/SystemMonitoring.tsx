import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Users, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import adminService, { SystemStats } from '../../services/adminService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const SystemMonitoring: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // 每30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSystemStats();
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>加载失败</div>;
  }

  // 计算系统健康指标
  const userActiveRate = (stats.users.active / stats.users.total) * 100;
  const contentApprovalRate = (stats.content.posts.published / stats.content.posts.total) * 100;
  const reportResolutionRate = ((stats.reports.resolved + stats.reports.dismissed) / stats.reports.total) * 100;

  // 获取健康状态颜色
  const getHealthColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-50 border-green-200';
    if (rate >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // 模拟趋势数据（实际项目中应该从后端获取历史数据）
  const trendData = {
    labels: ['7天前', '6天前', '5天前', '4天前', '3天前', '2天前', '1天前', '今天'],
    datasets: [
      {
        label: '新用户',
        data: [12, 19, 15, 25, 22, 18, 24, stats.recentActivity.users],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: '新帖子',
        data: [8, 15, 12, 18, 16, 14, 20, stats.recentActivity.posts],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
      {
        label: '新举报',
        data: [2, 5, 3, 7, 4, 6, 8, stats.recentActivity.reports],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* 系统状态概览 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            系统监控面板
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="text-center p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{stats.users.total}</div>
            <div className="text-sm text-blue-700">总用户数</div>
            <div className="text-xs text-blue-600 mt-1">
              活跃: {stats.users.active} ({userActiveRate.toFixed(1)}%)
            </div>
          </div>

          <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
            <Server className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{stats.content.posts.total}</div>
            <div className="text-sm text-green-700">总内容数</div>
            <div className="text-xs text-green-600 mt-1">
              已发布: {stats.content.posts.published} ({contentApprovalRate.toFixed(1)}%)
            </div>
          </div>

          <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Database className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">
              {stats.content.posts.pending + stats.content.comments.pending}
            </div>
            <div className="text-sm text-yellow-700">待审核内容</div>
            <div className="text-xs text-yellow-600 mt-1">
              帖子: {stats.content.posts.pending} | 评论: {stats.content.comments.pending}
            </div>
          </div>

          <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{stats.reports.pending}</div>
            <div className="text-sm text-red-700">待处理举报</div>
            <div className="text-xs text-red-600 mt-1">
              总举报: {stats.reports.total}
            </div>
          </div>
        </div>

        {/* 系统健康指标 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-4 rounded-lg border ${getHealthBg(userActiveRate)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">用户活跃率</div>
                <div className={`text-2xl font-bold ${getHealthColor(userActiveRate)}`}>
                  {userActiveRate.toFixed(1)}%
                </div>
              </div>
              {userActiveRate >= 80 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {stats.users.active} / {stats.users.total} 用户活跃
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${getHealthBg(contentApprovalRate)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">内容通过率</div>
                <div className={`text-2xl font-bold ${getHealthColor(contentApprovalRate)}`}>
                  {contentApprovalRate.toFixed(1)}%
                </div>
              </div>
              {contentApprovalRate >= 80 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {stats.content.posts.published} / {stats.content.posts.total} 帖子已发布
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${getHealthBg(reportResolutionRate)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">举报处理率</div>
                <div className={`text-2xl font-bold ${getHealthColor(reportResolutionRate)}`}>
                  {reportResolutionRate.toFixed(1)}%
                </div>
              </div>
              {reportResolutionRate >= 80 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {stats.reports.resolved + stats.reports.dismissed} / {stats.reports.total} 举报已处理
            </div>
          </div>
        </div>
      </div>

      {/* 活动趋势图 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          近期活动趋势
        </h3>
        <div className="h-80">
          <Line
            data={trendData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                },
              },
              scales: {
                x: {
                  display: true,
                  title: {
                    display: true,
                    text: '时间'
                  }
                },
                y: {
                  display: true,
                  title: {
                    display: true,
                    text: '数量'
                  },
                  beginAtZero: true,
                }
              },
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              }
            }}
          />
        </div>
      </div>

      {/* 详细统计表格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">用户统计</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">总用户数</span>
              <span className="font-medium">{stats.users.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">活跃用户</span>
              <span className="font-medium text-green-600">{stats.users.active}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">已验证用户</span>
              <span className="font-medium text-blue-600">{stats.users.verified}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">管理员</span>
              <span className="font-medium text-red-600">{stats.users.admins}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">版主</span>
              <span className="font-medium text-purple-600">{stats.users.moderators}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">内容统计</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">总帖子数</span>
              <span className="font-medium">{stats.content.posts.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">已发布帖子</span>
              <span className="font-medium text-green-600">{stats.content.posts.published}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">待审核帖子</span>
              <span className="font-medium text-yellow-600">{stats.content.posts.pending}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">被拒绝帖子</span>
              <span className="font-medium text-red-600">{stats.content.posts.rejected}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">总评论数</span>
              <span className="font-medium">{stats.content.comments.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;