import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Share2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { HealthRecord, RecordFilters } from '../services/recordsService';

interface RecordsListProps {
  records: HealthRecord[];
  pagination: any;
  filters: RecordFilters;
  loading: boolean;
  onFiltersChange: (filters: Partial<RecordFilters>) => void;
  onViewRecord: (record: HealthRecord) => void;
  onEditRecord: (record: HealthRecord) => void;
  onDeleteRecord: (record: HealthRecord) => void;
  onBatchDelete?: (recordIds: string[]) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({
  records,
  pagination,
  filters,
  loading,
  onFiltersChange,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onBatchDelete
}) => {
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(record => record.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedRecords.length > 0 && onBatchDelete) {
      onBatchDelete(selectedRecords);
      setSelectedRecords([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ search: searchTerm, page: 1 });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ page });
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'concerning':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'concerning':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索记录..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* 工具按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>

            {selectedRecords.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                删除选中 ({selectedRecords.length})
              </button>
            )}
          </div>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 健康状态筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  健康状态
                </label>
                <select
                  value={filters.healthStatus || ''}
                  onChange={(e) => onFiltersChange({ healthStatus: e.target.value as any, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">全部</option>
                  <option value="healthy">健康</option>
                  <option value="warning">警告</option>
                  <option value="concerning">异常</option>
                </select>
              </div>

              {/* 日期范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => onFiltersChange({ startDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => onFiltersChange({ endDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  onFiltersChange({ 
                    healthStatus: undefined, 
                    startDate: undefined, 
                    endDate: undefined, 
                    search: undefined,
                    page: 1 
                  });
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                清除筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 记录列表 */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无记录</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRecords.length === records.length && records.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  宠物
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  健康状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  置信度
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  备注
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {record.pet.avatar ? (
                        <img
                          src={record.pet.avatar}
                          alt={record.pet.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                          <span className="text-xs text-gray-500">
                            {record.pet.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.pet.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.pet.breed || record.pet.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {getHealthStatusIcon(record.analysis.healthStatus)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getHealthStatusColor(record.analysis.healthStatus)}`}>
                        {record.analysis.healthStatusDescription}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {record.analysis.confidence}%
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatDate(record.timestamp)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {record.userNotes || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewRecord(record)}
                        className="text-blue-600 hover:text-blue-800"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditRecord(record)}
                        className="text-green-600 hover:text-green-800"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRecord(record)}
                        className="text-red-600 hover:text-red-800"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {record.isShared && (
                        <Share2 className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {((pagination.page - 1) * pagination.limit) + 1} 到{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
            共 {pagination.total} 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              第 {pagination.page} 页，共 {pagination.totalPages} 页
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsList;