import React, { useState, useEffect } from 'react';
import { PoopRecord, Pet, AnalysisStatisticsResponse } from '../../../shared/types';
import { AnalysisResult } from './AnalysisResult';
import { HealthVisualization } from './HealthVisualization';
import { AnalysisService } from '../services/analysisService';
import TouchButton from './common/TouchButton';
import { 
  Save, 
  Download, 
  Edit3, 
  Trash2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BookmarkPlus,
  BarChart3,
  Camera,
  Lightbulb,
  RefreshCw,
  Eye,
  Users,
  Activity
} from 'lucide-react';

interface AnalysisInterfaceProps {
  record: PoopRecord;
  pet: Pet;
  isNew?: boolean;
  onSave?: (record: PoopRecord) => void;
  onEdit?: (record: PoopRecord) => void;
  onDelete?: (recordId: string) => void;
  onRetakePhoto?: () => void;
  onViewHistory?: () => void;
  onShareToCommunity?: (record: PoopRecord) => void;
}

export const AnalysisInterface: React.FC<AnalysisInterfaceProps> = ({
  record,
  pet,
  isNew = false,
  onSave,
  onEdit,
  onDelete,
  onRetakePhoto,
  onViewHistory,
  onShareToCommunity
}) => {
  const [isSaved, setIsSaved] = useState(!isNew);
  const [isSharing, setIsSharing] = useState(false);
  const [statistics, setStatistics] = useState<AnalysisStatisticsResponse['data'] | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showHealthAdvice, setShowHealthAdvice] = useState(false);
  const [healthAdvice, setHealthAdvice] = useState<any>(null);

  useEffect(() => {
    // 加载统计数据
    loadStatistics();
    // 如果是异常状态，自动显示健康建议
    if (record.analysis.healthStatus === 'concerning') {
      loadHealthAdvice();
      setShowHealthAdvice(true);
    }
  }, [record.petId]);

  const loadStatistics = async () => {
    try {
      const response = await AnalysisService.getAnalysisStatistics(record.petId, 'month');
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const loadHealthAdvice = async () => {
    try {
      const response = await AnalysisService.getHealthAdvice(record.petId);
      if (response.success && response.data) {
        setHealthAdvice(response.data);
      }
    } catch (error) {
      console.error('加载健康建议失败:', error);
    }
  };

  const handleSaveRecord = async () => {
    if (onSave && !isSaved) {
      try {
        await onSave(record);
        setIsSaved(true);
      } catch (error) {
        console.error('保存记录失败:', error);
      }
    }
  };

  const handleShareToCommunity = async () => {
    if (!onShareToCommunity) return;
    
    setIsSharing(true);
    try {
      await onShareToCommunity(record);
    } catch (error) {
      console.error('分享到社区失败:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportRecord = async () => {
    try {
      const blob = await AnalysisService.exportRecords(record.petId, 'pdf', {
        startDate: new Date(record.timestamp).toISOString().split('T')[0],
        endDate: new Date(record.timestamp).toISOString().split('T')[0]
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pet.name}-分析报告-${new Date(record.timestamp).toLocaleDateString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('导出记录失败:', error);
    }
  };

  const getHealthStatusSummary = () => {
    const { healthStatus } = record.analysis;
    
    switch (healthStatus) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          title: '健康状态良好',
          description: '您的宠物便便状态正常，继续保持良好的饮食和生活习惯。',
          color: 'bg-green-50 border-green-200 text-green-800'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-yellow-500" />,
          title: '需要关注',
          description: '检测到一些需要注意的情况，建议观察几天并调整饮食。',
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
        };
      case 'concerning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          title: '建议就医',
          description: '检测到异常情况，建议尽快咨询兽医进行专业诊断。',
          color: 'bg-red-50 border-red-200 text-red-800'
        };
      default:
        return {
          icon: <Eye className="w-6 h-6 text-gray-500" />,
          title: '分析完成',
          description: '已完成分析，请查看详细结果。',
          color: 'bg-gray-50 border-gray-200 text-gray-800'
        };
    }
  };

  const statusSummary = getHealthStatusSummary();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 分析结果概览 */}
      <div className={`p-4 sm:p-6 rounded-lg border-2 ${statusSummary.color}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {statusSummary.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg sm:text-xl font-semibold">
                {statusSummary.title}
              </h2>
              <div className="flex items-center space-x-2 text-sm">
                <Activity className="w-4 h-4" />
                <span>{record.analysis.confidence}% 置信度</span>
              </div>
            </div>
            <p className="text-sm sm:text-base mb-4">
              {statusSummary.description}
            </p>
            
            {/* 快速操作按钮 */}
            <div className="flex flex-wrap gap-2">
              {isNew && (
                <TouchButton
                  onClick={handleSaveRecord}
                  disabled={isSaved}
                  size="sm"
                  variant={isSaved ? "outline" : "primary"}
                  icon={isSaved ? BookmarkPlus : Save}
                >
                  {isSaved ? '已保存' : '保存记录'}
                </TouchButton>
              )}
              
              <TouchButton
                onClick={handleShareToCommunity}
                loading={isSharing}
                size="sm"
                variant="outline"
                icon={Users}
              >
                分享到社区
              </TouchButton>
              
              {onRetakePhoto && (
                <TouchButton
                  onClick={onRetakePhoto}
                  size="sm"
                  variant="outline"
                  icon={Camera}
                >
                  重新拍照
                </TouchButton>
              )}
              
              <TouchButton
                onClick={() => setShowActions(!showActions)}
                size="sm"
                variant="ghost"
                icon={showActions ? RefreshCw : BarChart3}
              >
                {showActions ? '收起' : '更多操作'}
              </TouchButton>
            </div>
          </div>
        </div>
      </div>

      {/* 扩展操作面板 */}
      {showActions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">操作选项</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TouchButton
              onClick={handleExportRecord}
              variant="outline"
              size="sm"
              icon={Download}
              fullWidth
            >
              导出报告
            </TouchButton>
            
            {onEdit && (
              <TouchButton
                onClick={() => onEdit(record)}
                variant="outline"
                size="sm"
                icon={Edit3}
                fullWidth
              >
                编辑记录
              </TouchButton>
            )}
            
            {onViewHistory && (
              <TouchButton
                onClick={onViewHistory}
                variant="outline"
                size="sm"
                icon={TrendingUp}
                fullWidth
              >
                查看历史
              </TouchButton>
            )}
            
            {onDelete && (
              <TouchButton
                onClick={() => onDelete(record.id)}
                variant="outline"
                size="sm"
                icon={Trash2}
                fullWidth
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                删除记录
              </TouchButton>
            )}
          </div>
        </div>
      )}

      {/* 健康建议面板 */}
      {showHealthAdvice && healthAdvice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900 mb-2">个性化健康建议</h3>
              <div className="space-y-2">
                {healthAdvice.advice.map((advice: string, index: number) => (
                  <p key={index} className="text-sm text-blue-800 flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {advice}
                  </p>
                ))}
              </div>
              
              {healthAdvice.urgency !== 'none' && (
                <div className="mt-4 p-3 bg-white border border-blue-300 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      建议处理时间: {
                        healthAdvice.urgency === 'urgent' ? '立即处理' :
                        healthAdvice.urgency === 'consult' ? '1-2天内咨询' :
                        '持续观察'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowHealthAdvice(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 详细分析结果 */}
      <AnalysisResult
        record={record}
        onEdit={onEdit}
        onDelete={onDelete}
        onShare={onShareToCommunity}
        onSave={isNew ? handleSaveRecord : undefined}
        onExport={handleExportRecord}
        showActions={false} // 我们在上面已经显示了操作按钮
        isNew={isNew}
        isSaved={isSaved}
      />

      {/* 健康状态可视化 */}
      {statistics && (
        <div className="mt-6">
          <HealthVisualization 
            statistics={statistics}
            className="shadow-sm"
          />
        </div>
      )}

      {/* 相关宠物信息 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">宠物信息</h3>
        <div className="flex items-start space-x-4">
          {pet.avatar ? (
            <img
              src={pet.avatar}
              alt={pet.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-medium text-gray-900">{pet.name}</h4>
            <div className="mt-1 space-y-1 text-sm text-gray-600">
              <p>品种: {pet.breed || '未知'} • 类型: {pet.type === 'dog' ? '狗' : pet.type === 'cat' ? '猫' : '其他'}</p>
              {pet.age && <p>年龄: {Math.floor(pet.age / 12)}岁{pet.age % 12}个月</p>}
              {pet.weight && <p>体重: {pet.weight}kg</p>}
            </div>
            {pet.description && (
              <p className="mt-2 text-sm text-gray-700">{pet.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 