import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Heart,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  PieChart
} from 'lucide-react';
import { StatisticsOverview, PetSummary } from '../services/recordsService';

interface RecordStatisticsProps {
  statistics: StatisticsOverview | null;
  petSummaries: PetSummary[];
  loading: boolean;
  onPeriodChange: (period: string) => void;
  selectedPeriod: string;
}

const RecordStatistics: React.FC<RecordStatisticsProps> = ({
  statistics,
  petSummaries,
  loading,
  onPeriodChange,
  selectedPeriod
}) => {
  const periods = [
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '本年' }
  ];

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'concerning':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              健康统计概览
            </h2>
            <div className="flex items-center gap-2">
              {periods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => onPeriodChange(period.value)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    selectedPeriod === period.value
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {statistics && (
          <div className="p-6">
            {/* 关键指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">总记录数</p>
                    <p className="text-2xl font-bold text-blue-900">{statistics.totalRecords}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  平均每周 {statistics.averagePerWeek} 条
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">健康记录</p>
                    <p className="text-2xl font-bold text-green-900">{statistics.healthyCount}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-green-600 mt-2">
                  占比 {statistics.healthyPercentage}%
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">警告记录</p>
                    <p className="text-2xl font-bold text-yellow-900">{statistics.warningCount}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  占比 {statistics.warningPercentage}%
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 font-medium">异常记录</p>
                    <p className="text-2xl font-bold text-red-900">{statistics.concerningCount}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-xs text-red-600 mt-2">
                  占比 {statistics.concerningPercentage}%
                </p>
              </div>
            </div>

            {/* 健康状态分布图 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                健康状态分布
              </h3>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* 这里可以集成图表库，现在用简单的进度条代替 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">健康</span>
                      <span className="text-sm font-medium text-green-600">
                        {statistics.healthyPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${statistics.healthyPercentage}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">警告</span>
                      <span className="text-sm font-medium text-yellow-600">
                        {statistics.warningPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${statistics.warningPercentage}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">异常</span>
                      <span className="text-sm font-medium text-red-600">
                        {statistics.concerningPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${statistics.concerningPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  平均置信度：<span className="font-medium">{statistics.avgConfidence}%</span>
                </p>
                <p className="text-sm text-gray-600">
                  监测宠物数：<span className="font-medium">{statistics.uniquePetsCount}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 宠物汇总 */}
      {petSummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              宠物健康汇总
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {petSummaries.map((pet) => (
                <div key={pet.petId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{pet.petName}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {pet.petType}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">总记录</span>
                      <span className="font-medium">{pet.totalRecords}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">健康率</span>
                      <span className="font-medium text-green-600">{pet.healthyPercentage}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">平均置信度</span>
                      <span className="font-medium">{pet.avgConfidence}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600">健康 {pet.healthyCount}</span>
                      <span className="text-yellow-600">警告 {pet.warningCount}</span>
                      <span className="text-red-600">异常 {pet.concerningCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${pet.healthyPercentage}%` }}
                        ></div>
                        <div 
                          className="bg-yellow-500" 
                          style={{ width: `${(pet.warningCount / pet.totalRecords) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-red-500" 
                          style={{ width: `${(pet.concerningCount / pet.totalRecords) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    最近记录：{formatDate(pet.lastRecord)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!statistics && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无统计数据</h3>
          <p className="text-gray-600">开始记录宠物健康数据后，这里将显示详细的统计信息</p>
        </div>
      )}
    </div>
  );
};

export default RecordStatistics;