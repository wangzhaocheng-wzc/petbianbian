import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, AlertTriangle, PieChart, ArrowLeft } from 'lucide-react';
import StatisticsDashboard from '../components/StatisticsDashboard';
import HealthDistributionChart from '../components/charts/HealthDistributionChart';
import { useStatistics } from '../hooks/useStatistics';
import { usePets } from '../hooks/usePets';

const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const { pets, loading: petsLoading } = usePets();
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  
  const {
    multiPetSummary,
    userOverview,
    loading: statsLoading,
    error,
    loadMultiPetSummary,
    loadUserOverview,
    clearError
  } = useStatistics({
    autoRefresh: true,
    refreshInterval: 300000 // 5分钟自动刷新
  });

  // 初始化加载数据
  useEffect(() => {
    loadMultiPetSummary();
    loadUserOverview();
  }, [loadMultiPetSummary, loadUserOverview]);

  // 自动选择第一个宠物
  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  const selectedPet = pets.find(pet => pet.id === selectedPetId);

  if (petsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载统计数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => {
                clearError();
                loadMultiPetSummary();
                loadUserOverview();
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              重新加载
            </button>
            <button
              onClick={() => navigate('/records')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回记录
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-4xl mb-4">🐕</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">还没有宠物</h2>
          <p className="text-gray-600 mb-4">请先添加宠物，然后开始记录健康数据</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/pets')}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              添加宠物
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部导航 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/records')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回记录
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="w-6 h-6 mr-2 text-orange-500" />
                健康统计分析
              </h1>
              <p className="text-gray-600 mt-1">
                深入了解宠物健康趋势和模式
              </p>
            </div>
            
            {pets.length > 1 && (
              <div className="mt-4 sm:mt-0">
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {pets.map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 用户概览卡片 */}
        {userOverview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PieChart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总宠物数</p>
                  <p className="text-2xl font-bold text-gray-900">{userOverview.totalPets}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">本月健康率</p>
                  <p className="text-2xl font-bold text-gray-900">{userOverview.summary.healthyRateThisMonth}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">本月记录数</p>
                  <p className="text-2xl font-bold text-gray-900">{userOverview.summary.totalRecordsThisMonth}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">活跃异常</p>
                  <p className="text-2xl font-bold text-gray-900">{userOverview.summary.activeAnomalies}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 多宠物概览 */}
        {multiPetSummary && multiPetSummary.petSummaries.length > 1 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                多宠物健康概览
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 整体健康分布 */}
                <HealthDistributionChart
                  healthyCount={multiPetSummary.overallStatistics.averageHealthyPercentage}
                  warningCount={multiPetSummary.overallStatistics.averageWarningPercentage}
                  concerningCount={multiPetSummary.overallStatistics.averageConcerningPercentage}
                  title="整体健康状态分布"
                  size={250}
                />
                
                {/* 宠物列表 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">宠物健康状况</h4>
                  {multiPetSummary.petSummaries.map(pet => (
                    <div
                      key={pet.petId}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPetId === pet.petId
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPetId(pet.petId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {pet.petAvatar ? (
                            <img
                              src={pet.petAvatar}
                              alt={pet.petName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 text-sm">
                                {pet.petType === 'dog' ? '🐕' : pet.petType === 'cat' ? '🐱' : '🐾'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{pet.petName}</p>
                            <p className="text-sm text-gray-500">{pet.petType}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800">
                            {pet.statistics?.healthyPercentage || 0}% 健康
                          </p>
                          <p className="text-xs text-gray-500">
                            {pet.statistics?.totalRecords || 0} 条记录
                          </p>
                          {pet.highSeverityAnomalies > 0 && (
                            <p className="text-xs text-red-600">
                              {pet.highSeverityAnomalies} 个高风险异常
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 详细统计面板 */}
        {selectedPet && (
          <StatisticsDashboard
            petId={selectedPetId}
            petName={selectedPet.name}
          />
        )}
      </div>
    </div>
  );
};

export default Statistics;