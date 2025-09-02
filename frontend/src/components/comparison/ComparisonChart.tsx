import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import comparisonService, { ComparisonAnalysis } from '../../services/comparisonService';

interface ComparisonChartProps {
  data: ComparisonAnalysis;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  // 准备柱状图数据
  const barChartData = data.pets.map(pet => ({
    name: pet.petName,
    健康: pet.statistics.healthyPercentage,
    警告: pet.statistics.warningPercentage,
    异常: pet.statistics.concerningPercentage,
    总记录数: pet.statistics.totalRecords
  }));

  // 准备饼图数据
  const pieChartData = data.pets.map(pet => ({
    name: pet.petName,
    value: pet.statistics.healthyPercentage,
    totalRecords: pet.statistics.totalRecords
  }));

  // 颜色配置
  const colors = {
    healthy: '#10B981',
    warning: '#F59E0B',
    concerning: '#EF4444'
  };

  const petColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pet = data.pets.find(p => p.petName === label);
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
            {pet && (
              <div className="pt-2 border-t border-gray-200 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">总记录数:</span>
                  <span className="font-medium text-gray-900">{pet.statistics.totalRecords}条</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">平均每周:</span>
                  <span className="font-medium text-gray-900">{pet.statistics.averagePerWeek}次</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // 饼图工具提示
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">健康率: {data.value}%</p>
          <p className="text-sm text-gray-600">记录数: {data.totalRecords}条</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* 健康状况对比柱状图 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">健康状况分布对比</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: '百分比 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="健康" 
                stackId="a" 
                fill={colors.healthy}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="警告" 
                stackId="a" 
                fill={colors.warning}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="异常" 
                stackId="a" 
                fill={colors.concerning}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 健康率对比饼图 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">健康率对比</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={petColors[index % petColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 详细统计表格 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">详细统计数据</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  宠物
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  总记录数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  健康率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  警告率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  异常率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均每周
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最近记录
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.pets.map((pet, index) => (
                <tr key={pet.petId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                        {pet.avatar ? (
                          <img
                            src={pet.avatar}
                            alt={pet.petName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 text-sm font-medium">
                            {pet.petName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pet.petName}</div>
                        <div className="text-sm text-gray-500">
                          {comparisonService.getPetTypeText(pet.petType)}
                          {pet.breed && ` · ${pet.breed}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pet.statistics.totalRecords}条
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-600">
                        {pet.statistics.healthyPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-yellow-600">
                        {pet.statistics.warningPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-red-600">
                        {pet.statistics.concerningPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pet.statistics.averagePerWeek}次
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pet.statistics.lastAnalysisDate
                      ? new Date(pet.statistics.lastAnalysisDate).toLocaleDateString()
                      : '无记录'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonChart;