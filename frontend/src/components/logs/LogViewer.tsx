import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, RefreshCw, AlertTriangle, Info, AlertCircle, Bug } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  type?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}

interface LogQuery {
  level?: string[];
  type?: string[];
  startDate?: string;
  endDate?: string;
  userId?: string;
  ip?: string;
  endpoint?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // 过滤器状态
  const [filters, setFilters] = useState<LogQuery>({
    limit: pageSize,
    offset: 0
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const logLevels = ['error', 'warn', 'info', 'http', 'debug'];
  const logTypes = ['application', 'access', 'error', 'security', 'performance', 'database', 'auth', 'api'];

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/logs/query?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('获取日志失败');
      }

      const data = await response.json();
      setLogs(data.data.logs);
      setTotal(data.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      offset: 0
    }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof LogQuery, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0
    }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const offset = (page - 1) * pageSize;
    setFilters(prev => ({ ...prev, offset }));
    setCurrentPage(page);
  };

  const exportLogs = async (format: 'json' | 'csv') => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'limit' && key !== 'offset') {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      queryParams.append('format', format);

      const response = await fetch(`/api/logs/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('导出日志失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出日志失败');
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <Bug className="w-4 h-4 text-gray-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'debug':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 头部控制栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">日志管理</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            过滤器
          </button>
          <button
            onClick={() => exportLogs('json')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            导出JSON
          </button>
          <button
            onClick={() => exportLogs('csv')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索日志内容..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          搜索
        </button>
      </div>

      {/* 过滤器面板 */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日志级别</label>
              <select
                multiple
                value={filters.level || []}
                onChange={(e) => handleFilterChange('level', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                {logLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日志类型</label>
              <select
                multiple
                value={filters.type || []}
                onChange={(e) => handleFilterChange('type', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                {logTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="datetime-local"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="datetime-local"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户ID</label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
                placeholder="输入用户ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IP地址</label>
              <input
                type="text"
                value={filters.ip || ''}
                onChange={(e) => handleFilterChange('ip', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
                placeholder="输入IP地址"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">端点</label>
              <input
                type="text"
                value={filters.endpoint || ''}
                onChange={(e) => handleFilterChange('endpoint', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
                placeholder="输入API端点"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ limit: pageSize, offset: 0 });
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                清除过滤器
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              日志记录 ({total} 条)
            </h3>
            {loading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {logs.map((log, index) => (
            <div key={index} className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getLogLevelIcon(log.level)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      {log.type && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {log.type}
                        </span>
                      )}
                      {log.method && log.statusCode && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.statusCode >= 400 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {log.method} {log.statusCode}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-gray-900 mb-2">{log.message}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    {log.requestId && (
                      <div>
                        <span className="font-medium">请求ID:</span> {log.requestId}
                      </div>
                    )}
                    {log.userId && (
                      <div>
                        <span className="font-medium">用户ID:</span> {log.userId}
                      </div>
                    )}
                    {log.ip && (
                      <div>
                        <span className="font-medium">IP:</span> {log.ip}
                      </div>
                    )}
                    {log.responseTime && (
                      <div>
                        <span className="font-medium">响应时间:</span> {log.responseTime}ms
                      </div>
                    )}
                  </div>
                  
                  {log.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-red-800 font-medium">{log.error.name}: {log.error.message}</p>
                      {log.error.stack && (
                        <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                          {log.error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} 条，共 {total} 条
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 border rounded text-sm ${
                        page === currentPage
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;