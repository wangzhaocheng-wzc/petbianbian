import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, AlertTriangle, BarChart3, PieChart, Activity } from 'lucide-react';
import HealthTrendChart from './charts/HealthTrendChart';
import HealthDistributionChart from './charts/HealthDistributionChart';
import ShapeDistributionChart from './charts/ShapeDistributionChart';
import ComparisonChart from './charts/ComparisonChart';
import statisticsService, { 
  HealthTrendPoint, 
  PeriodStatistics, 
  AnomalyPattern, 
  ComparisonAnalysis 
} from '../services/statisticsService';

interface StatisticsDashboardProps {
  petId: string;
  petName: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ petId, petName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedTrendDays, setSelectedTrendDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'trends' | 'distribution' | 'comparison' | 'anomalies'>('trends');

  // 数据状态
  const [trendData, setTrendData] = useState<HealthTrendPoint[]>([]);
  const [periodStats, setPeriodStats] = useState<PeriodStatistics | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyPattern[]>([]);
  const [comparison, setComparison] = useState<ComparisonAnalysis | null>(null);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trendsResponse, statsResponse, anomaliesResponse, comparisonResponse] = await Promise.all([
        statisticsService.getHealthTrends(petId, selectedTrendDays, 'daily'),
        statisticsService.getPeriodStatistics(petId, selectedPeriod),
        statisticsService.getAnomalyPatterns(petId, 30),
        statisticsService.getComparisonAnalysis(petId, selectedPeriod)
      ]);

      setTrendData(trendsResponse.trends);
      setPeriodStats(statsResponse);
      setAnomalies(anomaliesResponse.anomalies);
      setComparison(comparisonResponse);
    } catch (err) {
      console.error('加载统计数据失败:', err);
      setError('加载统计数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (petId) {
      loadData();
    }
  }, [petId, selectedPeriod, selectedTrendDays]);

  const periodOptions = [
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' }
  ];

  const trendDaysOptions = [
    { value: 7, label: '7天' },
    { value: 14, label: '14天' },
    { value: 30, label: '30天' },
    { value: 60, label: '60天' },
    { value: 90, label: '90天' }
  ];

  const tabs = [
    { id: 'trends', label: '健康趋势', icon: TrendingUp },
    { id: 'distribution', label: '状态分布', icon: PieChart },
    { id: 'comparison', label: '对比分析', icon: BarChart3 },
    { id: 'anomalies', label: '异常检测', icon: AlertTriangle }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '未知';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">加载统计数据中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部控制区 */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-500" />
              {petName} 的健康统计
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              数据分析和健康趋势监控
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* 周期选择 */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 趋势天数选择 */}
            {activeTab === 'trends' && (
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTrendDays}
                  onChange={(e) => setSelectedTrendDays(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {trendDaysOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* 健康趋势 */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <HealthTrendChart
                data={trendData}
                title={`${selectedTrendDays}天健康趋势`}
                height={400}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HealthTrendChart
                  data={trendData}
                  title="健康率趋势 (%)"
                  height={250}
                  showPercentage={true}
                />
                
                {periodStats && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">统计摘要</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">总记录数：</span>
                        <span className="font-medium">{periodStats.totalRecords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">健康率：</span>
                        <span className="font-medium text-green-600">{periodStats.healthyPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">平均置信度：</span>
                        <span className="font-medium">{periodStats.averageConfidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">每周频率：</span>
                        <span className="font-medium">{periodStats.frequencyPerWeek}次</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 状态分布 */}
          {activeTab === 'distribution' && periodStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HealthDistributionChart
                healthyCount={periodStats.healthyCount}
                warningCount={periodStats.warningCount}
                concerningCount={periodStats.concerningCount}
                title="健康状态分布"
                size={300}
              />
              
              <ShapeDistributionChart
                shapeDistribution={periodStats.shapeDistribution}
                title="便便形状分布"
                height={350}
              />
            </div>
          )}

          {/* 对比分析 */}
          {activeTab === 'comparison' && comparison && (
            <ComparisonChart
              comparison={comparison}
              title={`${selectedPeriod === 'week' ? '周' : selectedPeriod === 'month' ? '月' : '季度'}度对比分析`}
              height={400}
            />
          )}

          {/* 异常检测 */}
          {activeTab === 'anomalies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800">检测到的异常模式</h4>
                <span className="text-sm text-gray-600">
                  共发现 {anomalies.length} 个异常
                </span>
              </div>
              
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-green-500 text-4xl mb-2">✅</div>
                  <p className="text-gray-600">未检测到异常模式</p>
                  <p className="text-gray-500 text-sm">宠物健康状况良好</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies.map((anomaly, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                            {getSeverityText(anomaly.severity)}风险
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(anomaly.detectedAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      
                      <h5 className="font-medium text-gray-800 mb-2">
                        {anomaly.description}
                      </h5>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        <p>影响期间：{new Date(anomaly.affectedPeriod.start).toLocaleDateString('zh-CN')} - {new Date(anomaly.affectedPeriod.end).toLocaleDateString('zh-CN')}</p>
                      </div>
                      
                      {anomaly.recommendations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">建议：</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {anomaly.recommendations.map((rec, recIndex) => (
                              <li key={recIndex} className="flex items-start">
                                <span className="text-orange-500 mr-1">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;