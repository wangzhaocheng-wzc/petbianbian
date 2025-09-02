import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import comparisonService, { PetForComparison, ComparisonAnalysis } from '../services/comparisonService';
import PetSelector from '../components/comparison/PetSelector';
import ComparisonChart from '../components/comparison/ComparisonChart';
import ComparisonSummary from '../components/comparison/ComparisonSummary';
import HealthTrendsChart from '../components/comparison/HealthTrendsChart';
import InsightsPanel from '../components/comparison/InsightsPanel';

const PetComparison: React.FC = () => {
  const [pets, setPets] = useState<PetForComparison[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonAnalysis | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // 加载宠物列表
  useEffect(() => {
    loadPets();
  }, []);

  // 当选择的宠物或天数改变时，重新加载对比数据
  useEffect(() => {
    if (selectedPetIds.length >= 2) {
      loadComparisonData();
    } else {
      setComparisonData(null);
    }
  }, [selectedPetIds, days]);

  const loadPets = async () => {
    try {
      setInitialLoading(true);
      const petsData = await comparisonService.getPetsForComparison();
      setPets(petsData);
      
      // 自动选择前两个有记录的宠物
      const petsWithRecords = petsData.filter(pet => pet.recordCount > 0);
      if (petsWithRecords.length >= 2) {
        setSelectedPetIds([petsWithRecords[0].id, petsWithRecords[1].id]);
      }
    } catch (error) {
      console.error('加载宠物列表失败:', error);
      setError('加载宠物列表失败，请刷新页面重试');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadComparisonData = async () => {
    if (selectedPetIds.length < 2) return;

    try {
      setLoading(true);
      setError(null);
      const data = await comparisonService.getMultiPetComparison(selectedPetIds, days);
      setComparisonData(data);
    } catch (error: any) {
      console.error('加载对比数据失败:', error);
      setError(error.message || '加载对比数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePetSelectionChange = (petIds: string[]) => {
    setSelectedPetIds(petIds);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-8 w-8 text-orange-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">多宠物健康对比</h1>
          </div>
          <p className="text-gray-600">
            对比多个宠物的健康状况，发现健康趋势和潜在问题
          </p>
        </div>

        {/* 宠物选择器 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <PetSelector
            pets={pets}
            selectedPetIds={selectedPetIds}
            onSelectionChange={handlePetSelectionChange}
            days={days}
            onDaysChange={handleDaysChange}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 选择提示 */}
        {selectedPetIds.length < 2 && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-blue-900 mb-2">选择宠物进行对比</h3>
            <p className="text-blue-700">
              请至少选择2个宠物来查看健康对比分析。建议选择有健康记录的宠物以获得更准确的分析结果。
            </p>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">正在分析对比数据...</p>
          </div>
        )}

        {/* 对比结果 */}
        {comparisonData && !loading && (
          <div className="space-y-6">
            {/* 对比摘要 */}
            <ComparisonSummary data={comparisonData} />

            {/* 健康状况对比图表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <BarChart3 className="h-6 w-6 text-orange-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">健康状况对比</h2>
              </div>
              <ComparisonChart data={comparisonData} />
            </div>

            {/* 健康趋势图表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <TrendingUp className="h-6 w-6 text-orange-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">健康趋势对比</h2>
              </div>
              <HealthTrendsChart petIds={selectedPetIds} days={days} />
            </div>

            {/* 洞察和建议 */}
            <InsightsPanel data={comparisonData} />
          </div>
        )}

        {/* 无数据提示 */}
        {selectedPetIds.length >= 2 && comparisonData && comparisonData.comparison.totalRecordsCompared === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Calendar className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-yellow-900 mb-2">暂无对比数据</h3>
            <p className="text-yellow-700">
              所选宠物在过去{days}天内没有健康记录。请尝试：
            </p>
            <ul className="text-yellow-700 mt-2 space-y-1">
              <li>• 增加对比天数范围</li>
              <li>• 选择其他有记录的宠物</li>
              <li>• 为宠物添加更多健康记录</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetComparison;