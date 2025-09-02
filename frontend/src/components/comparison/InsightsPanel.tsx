import React from 'react';
import { Lightbulb, Heart, AlertTriangle, CheckCircle } from 'lucide-react';
import { ComparisonAnalysis } from '../../services/comparisonService';

interface InsightsPanelProps {
  data: ComparisonAnalysis;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ data }) => {
  const { insights, recommendations } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 洞察分析 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">智能洞察</h2>
        </div>
        
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无洞察分析</p>
            <p className="text-gray-400 text-sm mt-1">需要更多数据来生成智能洞察</p>
          </div>
        )}
      </div>

      {/* 健康建议 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Heart className="h-6 w-6 text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">健康建议</h2>
        </div>
        
        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => {
              // 根据建议内容确定图标和颜色
              const isUrgent = recommendation.includes('咨询兽医') || recommendation.includes('异常');
              const isWarning = recommendation.includes('调整') || recommendation.includes('关注');
              
              let icon, colorClass;
              if (isUrgent) {
                icon = <AlertTriangle className="h-4 w-4 text-red-500" />;
                colorClass = 'bg-red-100';
              } else if (isWarning) {
                icon = <AlertTriangle className="h-4 w-4 text-yellow-500" />;
                colorClass = 'bg-yellow-100';
              } else {
                icon = <CheckCircle className="h-4 w-4 text-green-500" />;
                colorClass = 'bg-green-100';
              }

              return (
                <div key={index} className="flex items-start">
                  <div className={`flex-shrink-0 w-6 h-6 ${colorClass} rounded-full flex items-center justify-center mr-3 mt-0.5`}>
                    {icon}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{recommendation}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无健康建议</p>
            <p className="text-gray-400 text-sm mt-1">需要更多数据来生成个性化建议</p>
          </div>
        )}
      </div>

      {/* 对比总结 */}
      <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">对比总结</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">对比宠物数</div>
            <div className="text-2xl font-bold text-gray-900">{data.pets.length}只</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">总记录数</div>
            <div className="text-2xl font-bold text-gray-900">{data.comparison.totalRecordsCompared}条</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">平均健康率</div>
            <div className={`text-2xl font-bold ${
              data.comparison.averageHealthPercentage >= 80 
                ? 'text-green-600' 
                : data.comparison.averageHealthPercentage >= 60 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`}>
              {data.comparison.averageHealthPercentage}%
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-white rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">关键发现</h4>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              • <strong>{data.comparison.healthiestPet.petName}</strong> 是健康状况最好的宠物，健康率达到 
              <span className="font-semibold text-green-600"> {data.comparison.healthiestPet.healthyPercentage}%</span>
            </p>
            <p>
              • <strong>{data.comparison.mostConcerningPet.petName}</strong> 需要更多关注，异常率为 
              <span className="font-semibold text-red-600"> {data.comparison.mostConcerningPet.concerningPercentage}%</span>
            </p>
            <p>
              • 对比期间为 <strong>{data.comparison.comparisonPeriod.days}天</strong>，
              从 {new Date(data.comparison.comparisonPeriod.startDate).toLocaleDateString()} 
              到 {new Date(data.comparison.comparisonPeriod.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;