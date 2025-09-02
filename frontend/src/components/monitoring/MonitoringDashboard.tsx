import React, { useState, useEffect } from 'react';
import { Activity, Server, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    fileSystem: 'accessible' | 'error';
  };
  metrics: {
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpuUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  loadAverage: number[];
  uptime: number;
}

const MonitoringDashboard: React.FC = () => {
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const [healthResponse, systemResponse] = await Promise.all([
        fetch('/api/monitoring/health'),
        fetch('/api/monitoring/system', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthCheck(healthData.data);
      }

      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        setSystemInfo(systemData.data);
      }

      setError(null);
    } catch (err) {
      setError('获取监控数据失败');
      console.error('Monitoring data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 30000); // 每30秒刷新
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'accessible':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
      case 'disconnected':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'accessible':
        return 'text-green-600 bg-green-50';
      case 'degraded':
      case 'disconnected':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
        <button
          onClick={fetchMonitoringData}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">系统监控</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            自动刷新
          </label>
          <button
            onClick={fetchMonitoringData}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            手动刷新
          </button>
        </div>
      </div>

      {/* 系统状态概览 */}
      {healthCheck && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">系统状态</p>
                <p className={`text-lg font-semibold ${getStatusColor(healthCheck.status)}`}>
                  {healthCheck.status === 'healthy' ? '健康' : 
                   healthCheck.status === 'degraded' ? '降级' : '异常'}
                </p>
              </div>
              {getStatusIcon(healthCheck.status)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">运行时间</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatUptime(healthCheck.uptime)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">每分钟请求</p>
                <p className="text-lg font-semibold text-gray-900">
                  {healthCheck.metrics.requestsPerMinute}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">错误率</p>
                <p className="text-lg font-semibold text-gray-900">
                  {healthCheck.metrics.errorRate.toFixed(2)}%
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* 服务状态 */}
      {healthCheck && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">服务状态</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Server className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="font-medium">数据库</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(healthCheck.services.database)}
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${getStatusColor(healthCheck.services.database)}`}>
                    {healthCheck.services.database === 'connected' ? '已连接' : 
                     healthCheck.services.database === 'disconnected' ? '未连接' : '错误'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Server className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="font-medium">Redis</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(healthCheck.services.redis)}
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${getStatusColor(healthCheck.services.redis)}`}>
                    {healthCheck.services.redis === 'connected' ? '已连接' : 
                     healthCheck.services.redis === 'disconnected' ? '未连接' : '错误'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Server className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="font-medium">文件系统</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(healthCheck.services.fileSystem)}
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${getStatusColor(healthCheck.services.fileSystem)}`}>
                    {healthCheck.services.fileSystem === 'accessible' ? '可访问' : '错误'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 性能指标 */}
      {healthCheck && systemInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">内存使用情况</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">堆内存使用</span>
                  <span className="text-sm font-medium">
                    {formatBytes(healthCheck.metrics.memoryUsage.heapUsed)} / {formatBytes(healthCheck.metrics.memoryUsage.heapTotal)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ 
                      width: `${(healthCheck.metrics.memoryUsage.heapUsed / healthCheck.metrics.memoryUsage.heapTotal) * 100}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">系统内存</span>
                  <span className="text-sm font-medium">
                    {formatBytes(systemInfo.totalMemory - systemInfo.freeMemory)} / {formatBytes(systemInfo.totalMemory)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">CPU 使用情况</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CPU 使用率</span>
                  <span className="text-sm font-medium">{healthCheck.metrics.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${healthCheck.metrics.cpuUsage}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">CPU 核心数</p>
                    <p className="text-lg font-semibold">{systemInfo.cpuCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">负载平均值</p>
                    <p className="text-lg font-semibold">{systemInfo.loadAverage[0].toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 系统信息 */}
      {systemInfo && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">系统信息</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">操作系统</p>
                <p className="font-medium">{systemInfo.platform}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">架构</p>
                <p className="font-medium">{systemInfo.arch}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Node.js 版本</p>
                <p className="font-medium">{systemInfo.nodeVersion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">系统运行时间</p>
                <p className="font-medium">{formatUptime(systemInfo.uptime)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;