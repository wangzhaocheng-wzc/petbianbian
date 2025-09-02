import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, Plus, FileText } from 'lucide-react';
import RecordsList from '../components/RecordsList';
import RecordDetail from '../components/RecordDetail';
import RecordStatistics from '../components/RecordStatistics';
import HealthReportGenerator from '../components/reports/HealthReportGenerator';
import HealthReportDisplay from '../components/reports/HealthReportDisplay';
import { useRecords, useRecordStatistics } from '../hooks/useRecords';
import { HealthRecord } from '../services/recordsService';
import { HealthReportData } from '../services/reportService';
import { useAuth } from '../hooks/useAuth';
import { usePets } from '../hooks/usePets';

const Records: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'reports'>('list');
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedPetForReport, setSelectedPetForReport] = useState<string>('');
  const [reportData, setReportData] = useState<HealthReportData | null>(null);

  // 获取宠物列表
  const { pets } = usePets();

  // 使用记录管理Hook
  const {
    records,
    pagination,
    filters,
    loading: recordsLoading,
    error: recordsError,
    updateFilters,
    resetFilters,
    deleteRecord,
    updateRecord,
    batchDeleteRecords,
    setError: setRecordsError
  } = useRecords();

  // 使用统计Hook
  const {
    statistics,
    aggregationSummary,
    loading: statsLoading,
    error: statsError,
    fetchStatistics,
    fetchAggregationSummary,
    setError: setStatsError
  } = useRecordStatistics();

  // 获取统计数据
  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStatistics(selectedPeriod);
      fetchAggregationSummary();
    }
  }, [activeTab, selectedPeriod, fetchStatistics, fetchAggregationSummary]);

  const handleViewRecord = (record: HealthRecord) => {
    setSelectedRecord(record);
    setShowRecordDetail(true);
  };

  const handleEditRecord = (record: HealthRecord) => {
    setSelectedRecord(record);
    setShowRecordDetail(true);
  };

  const handleDeleteRecord = async (record: HealthRecord) => {
    if (window.confirm('确定要删除这条记录吗？此操作不可撤销。')) {
      const success = await deleteRecord(record.id);
      if (success) {
        // 可以显示成功消息
        console.log('记录删除成功');
      }
    }
  };

  const handleBatchDelete = async (recordIds: string[]) => {
    if (window.confirm(`确定要删除选中的 ${recordIds.length} 条记录吗？此操作不可撤销。`)) {
      const result = await batchDeleteRecords(recordIds);
      if (result) {
        console.log(`成功删除 ${result.deletedCount} 条记录`);
      }
    }
  };

  const handleUpdateRecord = async (data: any) => {
    if (selectedRecord) {
      const updatedRecord = await updateRecord(selectedRecord.id, data);
      if (updatedRecord) {
        setSelectedRecord(updatedRecord);
        console.log('记录更新成功');
      }
    }
  };

  const handleDeleteFromDetail = async () => {
    if (selectedRecord) {
      const success = await deleteRecord(selectedRecord.id);
      if (success) {
        setShowRecordDetail(false);
        setSelectedRecord(null);
        console.log('记录删除成功');
      }
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    fetchStatistics(period);
  };

  const handleReportGenerated = (data: HealthReportData) => {
    setReportData(data);
  };

  // 当切换到报告标签时，自动选择第一个宠物
  useEffect(() => {
    if (activeTab === 'reports' && pets.length > 0 && !selectedPetForReport) {
      setSelectedPetForReport(pets[0].id);
    }
  }, [activeTab, pets, selectedPetForReport]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">健康记录</h1>
              <p className="mt-2 text-gray-600">查看和管理宠物的健康分析记录</p>
            </div>
            <button
              onClick={() => window.location.href = '/analysis'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              新增记录
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {(recordsError || statsError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">
              {recordsError || statsError}
            </p>
            <button
              onClick={() => {
                setRecordsError(null);
                setStatsError(null);
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              关闭
            </button>
          </div>
        )}

        {/* 标签页导航 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('list')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'list'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                记录列表
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                统计分析
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                健康报告
              </button>
            </nav>
          </div>
        </div>

        {/* 内容区域 */}
        {activeTab === 'list' ? (
          <RecordsList
            records={records}
            pagination={pagination}
            filters={filters}
            loading={recordsLoading}
            onFiltersChange={updateFilters}
            onViewRecord={handleViewRecord}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onBatchDelete={handleBatchDelete}
          />
        ) : activeTab === 'stats' ? (
          <RecordStatistics
            statistics={statistics}
            petSummaries={aggregationSummary?.petSummaries || []}
            loading={statsLoading}
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />
        ) : (
          <div className="space-y-6">
            {/* 宠物选择 */}
            {pets.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">选择宠物</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pets.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => {
                        setSelectedPetForReport(pet.id);
                        setReportData(null); // 清除之前的报告数据
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedPetForReport === pet.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                          {pet.avatar ? (
                            <img
                              src={pet.avatar}
                              alt={pet.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500 text-lg font-medium">
                              {pet.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{pet.name}</h4>
                          <p className="text-sm text-gray-500">
                            {pet.type === 'dog' ? '狗狗' : pet.type === 'cat' ? '猫咪' : '其他'}
                            {pet.breed && ` · ${pet.breed}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 报告生成器 */}
            {selectedPetForReport && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <HealthReportGenerator
                    petId={selectedPetForReport}
                    petName={pets.find(p => p.id === selectedPetForReport)?.name || ''}
                    onReportGenerated={handleReportGenerated}
                  />
                </div>
                <div className="lg:col-span-2">
                  {reportData ? (
                    <HealthReportDisplay reportData={reportData} />
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">生成健康报告</h3>
                      <p className="text-gray-500">
                        点击左侧的"生成报告数据"按钮来查看详细的健康分析报告
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 无宠物提示 */}
            {pets.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无宠物</h3>
                <p className="text-gray-500 mb-4">
                  请先添加宠物信息才能生成健康报告
                </p>
                <button
                  onClick={() => window.location.href = '/pets'}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  添加宠物
                </button>
              </div>
            )}
          </div>
        )}

        {/* 记录详情弹窗 */}
        {selectedRecord && (
          <RecordDetail
            record={selectedRecord}
            isOpen={showRecordDetail}
            onClose={() => {
              setShowRecordDetail(false);
              setSelectedRecord(null);
            }}
            onUpdate={handleUpdateRecord}
            onDelete={handleDeleteFromDetail}
          />
        )}
      </div>
    </div>
  );
};

export default Records;