import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Heart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import reportService, { HealthReportData } from '../../services/reportService';

interface HealthReportDisplayProps {
  reportData: HealthReportData;
}

const HealthReportDisplay: React.FC<HealthReportDisplayProps> = ({ reportData }) => {
  const { pet, owner, period, statistics, trends, shapeDistribution, recentRecords, healthAssessment } = reportData;

  // 健康状况饼图数据
  const healthPieData = [
    { name: '健康', value: statistics.healthyPercentage, color: '#10B981' },
    { name: '警告', value: statistics.warningPercentage, color: '#F59E0B' },
    { name: '异常', value: statistics.concerningPercentage, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // 形状分布柱状图数据
  const shapeBarData = shapeDistribution.map(item => ({
    shape: reportService.getShapeDescription(item.shape),
    count: item.count,
    percentage: item.percentage
  }));

  // 趋势线图数据
  const trendLineData = trends.map(item => ({
    date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    健康: item.healthy,
    警告: item.warning,
    异常: item.concerning
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-sm text-gray-600">{entry.dataKey}: {entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 报告标题 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">宠物健康报告</h1>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Heart className="h-4 w-4 mr-1" />
              <span>{pet.name}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">宠物姓名</div>
            <div className="font-medium text-gray-900">{pet.name}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">宠物类型</div>
            <div className="font-medium text-gray-900">
              {reportService.getPetTypeText(pet.type)}
              {pet.breed && ` · ${pet.breed}`}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">年龄体重</div>
            <div className="font-medium text-gray-900">
              {reportService.formatAge(pet.age)}
              {pet.weight && ` · ${pet.weight}kg`}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">报告周期</div>
            <div className="font-medium text-gray-900">{period.days}天</div>
          </div>
        </div>
      </div>

      {/* 健康状况摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">总记录数</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{statistics.totalRecords}</div>
          <p className="text-sm text-gray-500 mt-1">平均每周 {statistics.averagePerWeek} 次</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">健康率</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">{statistics.healthyPercentage}%</div>
          <p className="text-sm text-gray-500 mt-1">{statistics.healthyCount} 条健康记录</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">警告率</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-600">{statistics.warningPercentage}%</div>
          <p className="text-sm text-gray-500 mt-1">{statistics.warningCount} 条警告记录</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-700">异常率</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-600">{statistics.concerningPercentage}%</div>
          <p className="text-sm text-gray-500 mt-1">{statistics.concerningCount} 条异常记录</p>
        </div>
      </div>

      {/* 健康评估 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Activity className="h-6 w-6 text-purple-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">健康评估</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">当前状态</div>
            <div className="font-medium text-gray-900">{healthAssessment.currentStatus}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">健康趋势</div>
            <div className={`font-medium ${
              healthAssessment.trend === 'improving' ? 'text-green-600' :
              healthAssessment.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {reportService.getTrendText(healthAssessment.trend)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">风险等级</div>
            <div className={`font-medium ${
              healthAssessment.riskLevel === 'high' ? 'text-red-600' :
              healthAssessment.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {reportService.getRiskLevelText(healthAssessment.riskLevel)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">紧急程度</div>
            <div className={`font-medium ${
              healthAssessment.urgency === 'urgent' ? 'text-red-600' :
              healthAssessment.urgency === 'consult' ? 'text-red-500' :
              healthAssessment.urgency === 'monitor' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {reportService.getUrgencyText(healthAssessment.urgency)}
            </div>
          </div>
        </div>

        {/* 健康建议 */}
        {healthAssessment.recommendations.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">健康建议</h3>
            <div className="space-y-2">
              {healthAssessment.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 图表分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 健康状况分布饼图 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">健康状况分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {healthPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 形状分布柱状图 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">便便形状分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapeBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shape" 
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 健康趋势图 */}
      {trends.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-green-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">健康趋势</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="健康" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="警告" stroke="#F59E0B" strokeWidth={2} />
                <Line type="monotone" dataKey="异常" stroke="#EF4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 最近记录 */}
      {recentRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近记录</h2>
          <div className="space-y-4">
            {recentRecords.slice(0, 5).map((record, index) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.healthStatus === 'healthy' ? 'bg-green-100 text-green-800' :
                      record.healthStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reportService.getHealthStatusText(record.healthStatus)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {reportService.getShapeDescription(record.shape)}
                  </span>
                </div>
                {record.details && (
                  <p className="text-sm text-gray-600 mb-2">{record.details}</p>
                )}
                {record.recommendations.length > 0 && (
                  <div className="text-xs text-gray-500">
                    建议: {record.recommendations.slice(0, 2).join('；')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthReportDisplay;