import React, { useState, useEffect } from 'react';
import { User, Search, Shield, Ban, CheckCircle, XCircle, Eye, FileText, Calendar, Phone, MapPin } from 'lucide-react';
import adminService, { UserData, UserListResponse } from '../../services/adminService';
import moderationService, { UserViolationStats } from '../../services/moderationService';



const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userViolations, setUserViolations] = useState<UserViolationStats | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
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
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers(filters);
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'verify' | 'unverify' | 'promote' | 'demote') => {
    try {
      setProcessing(true);
      
      switch (action) {
        case 'activate':
          await adminService.activateUser(userId);
          break;
        case 'deactivate':
          await adminService.deactivateUser(userId);
          break;
        case 'verify':
          await adminService.verifyUser(userId);
          break;
        case 'unverify':
          await adminService.unverifyUser(userId);
          break;
        case 'promote':
          await adminService.promoteUser(userId);
          break;
        case 'demote':
          await adminService.demoteUser(userId);
          break;
      }
      
      await loadUsers();
      if (selectedUser && selectedUser._id === userId) {
        const updatedUser = users.find(u => u._id === userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    } finally {
      setProcessing(false);
    }
  };

  const handleViewUser = async (user: UserData) => {
    setSelectedUser(user);
    try {
      const violations = await moderationService.getUserViolationStats(user._id);
      setUserViolations(violations);
    } catch (error) {
      console.error('Failed to load user violations:', error);
      setUserViolations(null);
    }
    setShowUserModal(true);
  };

  const getRoleColor = (role: string) => {
    const colorMap: { [key: string]: string } = {
      admin: 'bg-red-100 text-red-800',
      moderator: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: '管理员',
      moderator: '版主',
      user: '用户'
    };
    return roleMap[role] || role;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusColor = (isActive: boolean, isVerified: boolean) => {
    if (!isActive) return 'bg-red-100 text-red-800';
    if (isVerified) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (isActive: boolean, isVerified: boolean) => {
    if (!isActive) return '已禁用';
    if (isVerified) return '已验证';
    return '未验证';
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
      {/* 搜索和筛选 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜索用户
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder="搜索用户名或邮箱..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全部角色</option>
              <option value="user">用户</option>
              <option value="moderator">版主</option>
              <option value="admin">管理员</option>
            </select>
          </div>
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
              <option value="active">活跃</option>
              <option value="inactive">禁用</option>
              <option value="verified">已验证</option>
              <option value="unverified">未验证</option>
            </select>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      {users.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到用户</h3>
          <p className="mt-1 text-sm text-gray-500">当前筛选条件下没有用户记录</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后登录
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatar ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.avatar}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.isActive, user.isVerified)}`}>
                        {getStatusText(user.isActive, user.isVerified)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-3 w-3 text-gray-400" />
                          <span>{user.stats.totalPosts} 帖子</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Eye className="h-3 w-3 text-gray-400" />
                          <span>{user.stats.totalAnalysis} 分析</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : '从未登录'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {user.isActive ? (
                          <button
                            onClick={() => handleUserAction(user._id, 'deactivate')}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user._id, 'activate')}
                            disabled={processing}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {user.role === 'user' && (
                          <button
                            onClick={() => handleUserAction(user._id, 'promote')}
                            disabled={processing}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* 用户详情模态框 */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">用户详情</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {selectedUser.avatar ? (
                    <img
                      className="h-16 w-16 rounded-full object-cover"
                      src={selectedUser.avatar}
                      alt=""
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-medium text-gray-900">
                    {selectedUser.username}
                  </h4>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                      {getRoleText(selectedUser.role)}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.isActive, selectedUser.isVerified)}`}>
                      {getStatusText(selectedUser.isActive, selectedUser.isVerified)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 个人资料 */}
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3">个人资料</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.profile.firstName && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">姓名:</span>
                      <span className="text-sm text-gray-900">
                        {selectedUser.profile.firstName} {selectedUser.profile.lastName}
                      </span>
                    </div>
                  )}
                  {selectedUser.profile.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">电话:</span>
                      <span className="text-sm text-gray-900">{selectedUser.profile.phone}</span>
                    </div>
                  )}
                  {selectedUser.profile.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">位置:</span>
                      <span className="text-sm text-gray-900">{selectedUser.profile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">注册时间:</span>
                    <span className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                </div>
                {selectedUser.profile.bio && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">个人简介:</span>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                      {selectedUser.profile.bio}
                    </p>
                  </div>
                )}
              </div>

              {/* 统计信息 */}
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3">活动统计</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedUser.stats.totalPosts}</div>
                    <div className="text-sm text-gray-600">发布帖子</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedUser.stats.totalAnalysis}</div>
                    <div className="text-sm text-gray-600">健康分析</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedUser.stats.reputation}</div>
                    <div className="text-sm text-gray-600">声誉值</div>
                  </div>
                </div>
              </div>

              {/* 违规统计 */}
              {userViolations && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-3">违规记录</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{userViolations.rejectedPosts}</div>
                      <div className="text-sm text-gray-600">被拒帖子</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{userViolations.rejectedComments}</div>
                      <div className="text-sm text-gray-600">被拒评论</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-yellow-600">{userViolations.reports}</div>
                      <div className="text-sm text-gray-600">被举报次数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-600">{userViolations.totalViolations}</div>
                      <div className="text-sm text-gray-600">总违规次数</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {selectedUser.isActive ? (
                  <button
                    onClick={() => handleUserAction(selectedUser._id, 'deactivate')}
                    disabled={processing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    禁用用户
                  </button>
                ) : (
                  <button
                    onClick={() => handleUserAction(selectedUser._id, 'activate')}
                    disabled={processing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    激活用户
                  </button>
                )}
                {!selectedUser.isVerified && (
                  <button
                    onClick={() => handleUserAction(selectedUser._id, 'verify')}
                    disabled={processing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    验证用户
                  </button>
                )}
                {selectedUser.role === 'user' && (
                  <button
                    onClick={() => handleUserAction(selectedUser._id, 'promote')}
                    disabled={processing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    提升为版主
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;