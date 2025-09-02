import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import comparisonService, { HealthTrendsComparison } from '../../services/comparisonService';

interface HealthTrendsChartProps {
  petIds: string[];
  days: number;
}

const HealthTrendsChart: React.FC<HealthTrendsChartProps> = ({ petIds, days }) => {
  const [trendsData, setTrendsData] = useState<HealthTrendsComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (petIds.length >= 2) {
      loadTrendsData();
    }
  }, [petIds, days]);

  const loadTrendsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await comparisonService.getPetHealthTrends(petIds, days);
      setTrendsData(data);
    } catch (error: any) {
      console.error('加载健康趋势数据失败:', error);
      setError(error.message || '加载健康趋势数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 颜色配置
  const petColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  // 准备图表数据
  const chartData = trendsData?.trends.map(trend => {
    const dataPoint: any = { date: trend.date };
    trend.pets.forEach((pet, index) => {
      dataPoint[pet.petName] = pet.healthPercentage;
    });
    return dataPoint;
  }) || [];

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{entry.dataKey}:</span>
                </div>
                <span className="text-sm font-medium text-gray-900 ml-2">
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600">加载趋势数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">加载失败</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={loadTrendsData}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!trendsData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <p className="text-gray-500 mb-2">暂无趋势数据</p>
          <p className="text-gray-400 text-sm">所选宠物在此期间没有健康记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 趋势摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">对比天数</div>
          <div className="text-2xl font-bold text-gray-900">{trendsData.summary.totalDays}天</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">对比宠物数</div>
          <div className="text-2xl font-bold text-gray-900">{trendsData.summary.petsCompared}只</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">整体趋势</div>
          <div className={`text-2xl font-bold ${
            trendsData.summary.averageHealthTrend === 'improving' 
              ? 'text-green-600' 
              : trendsData.summary.averageHealthTrend === 'declining' 
              ? 'text-red-600' 
              : 'text-gray-600'
          }`}>
            {comparisonService.getTrendText(trendsData.summary.averageHealthTrend)}
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: '健康率 (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {trendsData.trends.length > 0 && trendsData.trends[0].pets.map((pet, index) => (
              <Line
                key={pet.petId}
                type="monotone"
                dataKey={pet.petName}
                stroke={petColors[index % petColors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 趋势分析 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">趋势分析</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {trendsData.summary.averageHealthTrend === 'improving' && (
            <p>• 整体健康趋势向好，宠物们的健康状况在改善中</p>
          )}
          {trendsData.summary.averageHealthTrend === 'declining' && (
            <p>• 整体健康趋势下降，建议关注宠物的饮食和生活习惯</p>
          )}
          {trendsData.summary.averageHealthTrend === 'stable' && (
            <p>• 整体健康趋势稳定，继续保持当前的护理方式</p>
          )}
          <p>• 建议定期监测健康状况，及时发现异常变化</p>
          <p>• 如发现持续下降趋势，建议咨询兽医专业意见</p>
        </div>
      </div>
    </div>
  );
};

export default HealthTrendsChart;