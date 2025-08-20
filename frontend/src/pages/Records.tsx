import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, Plus } from 'lucide-react';
import RecordsList from '../components/RecordsList';
import RecordDetail from '../components/RecordDetail';
import RecordStatistics from '../components/RecordStatistics';
import { useRecords, useRecordStatistics } from '../hooks/useRecords';
import { HealthRecord } from '../services/recordsService';
import { useAuth } from '../hooks/useAuth';

const Records: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

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
        ) : (
          <RecordStatistics
            statistics={statistics}
            petSummaries={aggregationSummary?.petSummaries || []}
            loading={statsLoading}
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />
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