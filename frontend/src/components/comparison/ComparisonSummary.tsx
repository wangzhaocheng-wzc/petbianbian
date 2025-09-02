import React from 'react';
import { Trophy, AlertTriangle, BarChart3, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import comparisonService, { ComparisonAnalysis } from '../../services/comparisonService';

interface ComparisonSummaryProps {
  data: ComparisonAnalysis;
}

const ComparisonSummary: React.FC<ComparisonSummaryProps> = ({ data }) => {
  const { comparison, pets } = data;

  // 计算整体趋势
  const calculateOverallTrend = () => {
    const recentTrends = pets.map(pet => {
      if (pet.trends.length < 7) return 'stable';
      return comparisonService.calculateHealthTrend(pet.trends);
    });

    const improvingCount = recentTrends.filter(trend => trend === 'improving').length;
    const decliningCount = recentTrends.filter(trend => trend === 'declining').length;

    if (improvingCount > decliningCount) return 'improving';
    if (decliningCount > improvingCount) return 'declining';
    return 'stable';
  };

  const overallTrend = calculateOverallTrend();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 最健康的宠物 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-700">最健康宠物</h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-gray-900">
            {comparison.healthiestPet.petName}
          </p>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-lg font-semibold text-green-600">
              {comparison.healthiestPet.healthyPercentage}%
            </span>
          </div>
          <p className="text-sm text-gray-500">健康率最高</p>
        </div>
      </div>

      {/* 需要关注的宠物 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-700">需要关注</h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-gray-900">
            {comparison.mostConcerningPet.petName}
          </p>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-lg font-semibold text-red-600">
              {comparison.mostConcerningPet.concerningPercentage}%
            </span>
          </div>
          <p className="text-sm text-gray-500">异常率最高</p>
        </div>
      </div>

      {/* 平均健康率 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-blue-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-700">平均健康率</h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-gray-900">
            {comparison.averageHealthPercentage}%
          </p>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              comparison.averageHealthPercentage >= 80 
                ? 'bg-green-500' 
                : comparison.averageHealthPercentage >= 60 
                ? 'bg-yellow-500' 
                : 'bg-red-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              comparison.averageHealthPercentage >= 80 
                ? 'text-green-600' 
                : comparison.averageHealthPercentage >= 60 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`}>
              {comparison.averageHealthPercentage >= 80 
                ? '整体良好' 
                : comparison.averageHealthPercentage >= 60 
                ? '需要关注' 
                : '需要改善'
              }
            </span>
          </div>
          <p className="text-sm text-gray-500">
            基于 {comparison.totalRecordsCompared} 条记录
          </p>
        </div>
      </div>

      {/* 对比周期 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-purple-500 mr-2" />
            <h3 className="text-sm font-medium text-gray-700">对比周期</h3>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-gray-900">
            {comparison.comparisonPeriod.days}天
          </p>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTrendColor(overallTrend)}`}>
            {getTrendIcon(overallTrend)}
            <span className="ml-1">
              {comparisonService.getTrendText(overallTrend)}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {new Date(comparison.comparisonPeriod.startDate).toLocaleDateString()} - {new Date(comparison.comparisonPeriod.endDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* 详细对比信息 */}
      <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">宠物健康状况概览</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map((pet, index) => {
            const petTrend = pet.trends.length >= 7 ? comparisonService.calculateHealthTrend(pet.trends) : 'stable';
            
            return (
              <div key={pet.petId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                    {pet.avatar ? (
                      <img
                        src={pet.avatar}
                        alt={pet.petName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 font-medium">
                        {pet.petName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{pet.petName}</h4>
                    <p className="text-sm text-gray-500">
                      {comparisonService.getPetTypeText(pet.petType)}
                      {pet.age && ` · ${comparisonService.formatAge(pet.age)}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">健康率:</span>
                    <span className="text-sm font-medium text-green-600">
                      {pet.statistics.healthyPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">警告率:</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {pet.statistics.warningPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">异常率:</span>
                    <span className="text-sm font-medium text-red-600">
                      {pet.statistics.concerningPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">记录数:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {pet.statistics.totalRecords}条
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">趋势:</span>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTrendColor(petTrend)}`}>
                      {getTrendIcon(petTrend)}
                      <span className="ml-1">
                        {comparisonService.getTrendText(petTrend)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComparisonSummary;