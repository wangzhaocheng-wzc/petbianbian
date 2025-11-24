import React, { useState, useEffect } from 'react';
import { PoopRecord, Pet, AnalysisStatisticsResponse } from '../../../shared/types';
import { AnalysisResult } from './AnalysisResult';
import { HealthVisualization } from './HealthVisualization';
import { AnalysisService } from '../services/analysisService';
import TouchButton from './common/TouchButton';
import { useI18n } from '../i18n/I18nProvider';
import { 
  Save, 
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
  const { t, language } = useI18n();
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

  // 导出功能已移除

  const getHealthStatusSummary = () => {
    const { healthStatus } = record.analysis;
    
    switch (healthStatus) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          title: t('healthStatus.healthy.title'),
          description: t('healthStatus.healthy.description'),
          color: 'bg-green-50 border-green-200 text-green-800'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-yellow-500" />,
          title: t('healthStatus.warning.title'),
          description: t('healthStatus.warning.description'),
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
        };
      case 'concerning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          title: t('healthStatus.concerning.title'),
          description: t('healthStatus.concerning.description'),
          color: 'bg-red-50 border-red-200 text-red-800'
        };
      default:
        return {
          icon: <Eye className="w-6 h-6 text-gray-500" />,
          title: t('analysis.results.completed'),
          description: t('analysis.results.description'),
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
                <span>{record.analysis.confidence}% {t('analysis.results.confidence')}</span>
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
                  {isSaved ? t('analysis.results.saved') : t('analysisResult.saveRecord')}
                </TouchButton>
              )}
              
              <TouchButton
                onClick={handleShareToCommunity}
                loading={isSharing}
                size="sm"
                variant="outline"
                icon={Users}
              >
                {t('analysisResult.shareToCommunity')}
              </TouchButton>
              
              {onRetakePhoto && (
                <TouchButton
                  onClick={onRetakePhoto}
                  size="sm"
                  variant="outline"
                  icon={Camera}
                >
                  {t('analysis.results.retakePhoto')}
                </TouchButton>
              )}
              
              <TouchButton
                onClick={() => setShowActions(!showActions)}
                size="sm"
                variant="ghost"
                icon={showActions ? RefreshCw : BarChart3}
              >
                {showActions ? t('analysis.actions.collapse') : t('analysis.actions.moreActions')}
              </TouchButton>
            </div>
          </div>
        </div>
      </div>

      {/* 扩展操作面板 */}
      {showActions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analysis.actions.title')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 导出功能已移除 */}
            
            {onEdit && (
              <TouchButton
                onClick={() => onEdit(record)}
                variant="outline"
                size="sm"
                icon={Edit3}
                fullWidth
              >
                {t('analysisResult.editRecord')}
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
                {t('analysis.results.viewHistory')}
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
                {t('analysisResult.deleteRecord')}
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
              <h3 className="text-lg font-medium text-blue-900 mb-2">{t('analysisResult.healthAdviceTitle')}</h3>
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
                      {t('analysis.detail.urgencyLabel')}: {
                        healthAdvice.urgency === 'urgent' ? t('analysis.detail.urgency.urgent') :
                        healthAdvice.urgency === 'consult' ? t('analysis.detail.urgency.consult') :
                        t('analysis.detail.urgency.monitor')
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('petInfo.title')}</h3>
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
              <p>
                {t('petInfo.breed')}: {pet.breed || t('petInfo.unknown')} • {t('petInfo.type')}: {pet.type === 'dog' ? t('petInfo.typeDog') : pet.type === 'cat' ? t('petInfo.typeCat') : t('petInfo.typeOther')}
              </p>
              {pet.age && (
                <p>
                  {t('petInfo.age')}: {Math.floor(pet.age / 12)}{t('petInfo.ageYears')}{pet.age % 12}{t('petInfo.ageMonths')}
                </p>
              )}
              {pet.weight && (
                <p>
                  {t('petInfo.weight')}: {pet.weight}{t('petInfo.weightUnit')}
                </p>
              )}
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
