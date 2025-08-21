import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, TrendingUp, Eye, CheckCircle } from 'lucide-react';
import moderationService, { ModerationStats } from '../services/moderationService';
import { useAuth } from '../hooks/useAuth';
import ModerationDashboard from '../components/admin/ModerationDashboard';
import PendingContent from '../components/admin/PendingContent';
import ReportsList from '../components/admin/ReportsList';
import UserManagement from '../components/admin/UserManagement';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await moderationService.getModerationStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load moderation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查管理员权限
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">权限不足</h3>
          <p className="mt-1 text-sm text-gray-500">您没有访问管理后台的权限</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', name: '概览', icon: TrendingUp },
    { id: 'pending', name: '待审核', icon: Eye, badge: stats?.pending.total },
    { id: 'reports', name: '举报管理', icon: AlertTriangle, badge: stats?.pending.reports },
    { id: 'users', name: '用户管理', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-orange-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">管理后台</h1>
            </div>
            <div className="text-sm text-gray-500">
              欢迎，{user.username}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        待审核内容
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.pending.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        待处理举报
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.pending.reports}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        已处理内容
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.processed.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        近7天活动
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.recentActivity.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 标签导航 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                    {tab.badge && tab.badge > 0 && (
                      <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && <ModerationDashboard stats={stats} />}
                {activeTab === 'pending' && <PendingContent onUpdate={loadStats} />}
                {activeTab === 'reports' && <ReportsList onUpdate={loadStats} />}
                {activeTab === 'users' && <UserManagement />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;