import React, { useState } from 'react';
import { PoopRecord } from '../../../shared/types';
import { AnalysisResult } from './AnalysisResult';
import { 
  Filter, 
  Search, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download
} from 'lucide-react';

interface AnalysisRecordsListProps {
  records: PoopRecord[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onFilter?: (filters: RecordFilters) => void;
  onRefresh?: () => void;
  onEdit?: (record: PoopRecord) => void;
  onDelete?: (recordId: string) => void;
  onShare?: (record: PoopRecord) => void;
  onExport?: () => void;
}

export interface RecordFilters {
  healthStatus?: 'healthy' | 'warning' | 'concerning' | '';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const AnalysisRecordsList: React.FC<AnalysisRecordsListProps> = ({
  records,
  loading = false,
  pagination,
  onPageChange,
  onFilter,
  onRefresh,
  onEdit,
  onDelete,
  onShare,
  onExport
}) => {
  const [filters, setFilters] = useState<RecordFilters>({
    healthStatus: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof RecordFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: RecordFilters = {
      healthStatus: '',
      startDate: '',
      endDate: '',
      search: ''
    };
    setFilters(emptyFilters);
    onFilter?.(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">分析记录</h2>
          <div className="flex items-center space-x-2">
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'text-orange-600 bg-orange-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4 mr-1" />
              筛选
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索记录..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* 筛选器 */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 健康状态筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  健康状态
                </label>
                <select
                  value={filters.healthStatus}
                  onChange={(e) => handleFilterChange('healthStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">全部</option>
                  <option value="healthy">健康</option>
                  <option value="warning">警告</option>
                  <option value="concerning">异常</option>
                </select>
              </div>

              {/* 开始日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* 结束日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* 清除筛选 */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  清除筛选
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 记录列表 */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
            <p className="text-gray-500">
              {hasActiveFilters ? '没有符合筛选条件的记录' : '还没有分析记录，开始上传图片进行分析吧！'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {records.map((record) => (
              <AnalysisResult
                key={record.id}
                record={record}
                onEdit={onEdit}
                onDelete={onDelete}
                onShare={onShare}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示第 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
              共 {pagination.total} 条记录
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一页
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange?.(pageNum)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        pageNum === pagination.page
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};