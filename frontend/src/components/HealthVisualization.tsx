import React from 'react';
import { AnalysisStatisticsResponse } from '../../../shared/types';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface HealthVisualizationProps {
  statistics: AnalysisStatisticsResponse['data'];
  className?: string;
}

export const HealthVisualization: React.FC<HealthVisualizationProps> = ({
  statistics,
  className = ''
}) => {
  if (!statistics) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <p className="text-gray-500 text-center">暂无统计数据</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '改善中';
      case 'declining':
        return '下降中';
      default:
        return '稳定';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'consult':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'monitor':
        return <Activity className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return '紧急处理';
      case 'consult':
        return '建议咨询';
      case 'monitor':
        return '持续观察';
      default:
        return '无需担心';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">健康状态分析</h2>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            {statistics.period} ({statistics.days}天)
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 总体统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{statistics.totalAnalysis}</div>
            <div className="text-sm text-gray-600">总分析次数</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{statistics.healthyPercentage}%</div>
            <div className="text-sm text-gray-600">健康状态</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{statistics.warningPercentage}%</div>
            <div className="text-sm text-gray-600">需要关注</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{statistics.concerningPercentage}%</div>
            <div className="text-sm text-gray-600">异常状态</div>
          </div>
        </div>

        {/* 健康评估 */}
        {statistics.healthAssessment && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">健康评估</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 当前状态 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">当前状态</span>
                  <div className="flex items-center">
                    {getTrendIcon(statistics.healthAssessment.trend)}
                    <span className="ml-1 text-sm text-gray-600">
                      {getTrendText(statistics.healthAssessment.trend)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-900 font-medium">{statistics.healthAssessment.currentStatus}</p>
              </div>

              {/* 风险等级 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">风险等级</span>
                  <div className="flex items-center">
                    {getUrgencyIcon(statistics.healthAssessment.urgency)}
                    <span className="ml-1 text-sm text-gray-600">
                      {getUrgencyText(statistics.healthAssessment.urgency)}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(statistics.healthAssessment.riskLevel)}`}>
                  {statistics.healthAssessment.riskLevel === 'low' ? '低风险' : 
                   statistics.healthAssessment.riskLevel === 'medium' ? '中风险' : '高风险'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 趋势图表 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">健康趋势</h3>
          <div className="h-64 bg-gray-50 rounded-lg p-4">
            {/* 简单的条形图展示 */}
            <div className="h-full flex items-end justify-between space-x-1">
              {statistics.trends.slice(-14).map((trend, index) => {
                const total = trend.healthy + trend.warning + trend.concerning;
                const maxHeight = 200;
                const healthyHeight = total > 0 ? (trend.healthy / Math.max(...statistics.trends.map(t => t.total))) * maxHeight : 0;
                const warningHeight = total > 0 ? (trend.warning / Math.max(...statistics.trends.map(t => t.total))) * maxHeight : 0;
                const concerningHeight = total > 0 ? (trend.concerning / Math.max(...statistics.trends.map(t => t.total))) * maxHeight : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="flex flex-col-reverse items-center w-full max-w-6">
                      {concerningHeight > 0 && (
                        <div 
                          className="w-full bg-red-400 rounded-t"
                          style={{ height: `${concerningHeight}px` }}
                          title={`异常: ${trend.concerning}`}
                        />
                      )}
                      {warningHeight > 0 && (
                        <div 
                          className="w-full bg-yellow-400"
                          style={{ height: `${warningHeight}px` }}
                          title={`警告: ${trend.warning}`}
                        />
                      )}
                      {healthyHeight > 0 && (
                        <div 
                          className="w-full bg-green-400 rounded-b"
                          style={{ height: `${healthyHeight}px` }}
                          title={`健康: ${trend.healthy}`}
                        />
                      )}
                      {total === 0 && (
                        <div className="w-full h-1 bg-gray-200 rounded" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 transform rotate-45 origin-left">
                      {new Date(trend.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 图例 */}
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
              <span className="text-sm text-gray-600">健康</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
              <span className="text-sm text-gray-600">警告</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
              <span className="text-sm text-gray-600">异常</span>
            </div>
          </div>
        </div>

        {/* 健康建议 */}
        {statistics.healthAssessment?.recommendations && statistics.healthAssessment.recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">健康建议</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2">
                {statistics.healthAssessment.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start text-sm text-blue-800">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 更新时间 */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            最后更新: {new Date(statistics.lastUpdated).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>
    </div>
  );
};