import React, { useState } from 'react';
import { resolveImageUrl } from '@/utils/imageUrlResolver';
import { PoopRecord, Pet } from '../../../../shared/types';
import { AnalysisInterface } from '../AnalysisInterface';
import { AnalysisService } from '../../services/analysisService';
import TouchButton from '../common/TouchButton';
import { useMobile } from '../../hooks/useMobile';
import {
  ArrowLeft,
  Share2,
  Save,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Calendar,

  MapPin,
  Thermometer,
  Droplets
} from 'lucide-react';

interface AnalysisResultsDisplayProps {
  record: PoopRecord;
  pet: Pet;
  isNew?: boolean;
  onBack?: () => void;
  onSave?: (record: PoopRecord) => void;
  onRetakePhoto?: () => void;
  onViewHistory?: () => void;
  onShareToCommunity?: (record: PoopRecord) => void;
}

export const AnalysisResultsDisplay: React.FC<AnalysisResultsDisplayProps> = ({
  record,
  pet,
  isNew = false,
  onBack,
  onSave,
  onRetakePhoto,
  onViewHistory,
  onShareToCommunity
}) => {
  const { isMobile } = useMobile();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (!onSave || !isNew) return;
    
    setIsSaving(true);
    try {
      await onSave(record);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!onShareToCommunity) return;
    
    setIsSharing(true);
    try {
      await onShareToCommunity(record);
    } catch (error) {
      console.error('分享失败:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const getHealthStatusInfo = () => {
    const { healthStatus } = record.analysis;
    
    switch (healthStatus) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          title: '健康状态',
          subtitle: '一切正常',
          description: '您的宠物便便状态健康，继续保持良好的饮食习惯。',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          badgeColor: 'bg-green-100 text-green-800'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
          title: '需要关注',
          subtitle: '轻微异常',
          description: '检测到一些需要注意的情况，建议观察并适当调整饮食。',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        };
      case 'concerning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
          title: '建议就医',
          subtitle: '异常状态',
          description: '检测到明显异常，建议尽快咨询兽医进行专业诊断。',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          badgeColor: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: <Info className="w-8 h-8 text-gray-500" />,
          title: '分析完成',
          subtitle: '查看结果',
          description: '已完成分析，请查看详细结果。',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const statusInfo = getHealthStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {onBack && (
                <TouchButton
                  onClick={onBack}
                  variant="ghost"
                  size="sm"
                  icon={ArrowLeft}
                  className="text-gray-400 hover:text-gray-600"
                />
              )}
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">分析结果</h1>
                <p className="text-sm text-gray-500">{pet.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isNew && (
                <TouchButton
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={saveSuccess}
                  variant={saveSuccess ? "outline" : "primary"}
                  size="sm"
                  icon={saveSuccess ? CheckCircle : Save}
                >
                  {saveSuccess ? '已保存' : isSaving ? '保存中...' : '保存'}
                </TouchButton>
              )}
              
              <TouchButton
                onClick={handleShare}
                loading={isSharing}
                variant="outline"
                size="sm"
                icon={Share2}
              >
                {isMobile ? '' : '分享'}
              </TouchButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 主要结果展示 */}
        <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2 rounded-xl p-6 mb-6`}>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {statusInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className={`text-xl sm:text-2xl font-bold ${statusInfo.textColor}`}>
                    {statusInfo.title}
                  </h2>
                  <p className={`text-sm ${statusInfo.textColor} opacity-75`}>
                    {statusInfo.subtitle}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badgeColor}`}>
                  {record.analysis.confidence}% 置信度
                </div>
              </div>
              <p className={`text-base ${statusInfo.textColor} mb-4`}>
                {statusInfo.description}
              </p>
              
              {/* 时间和环境信息 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{new Date(record.timestamp).toLocaleString('zh-CN')}</span>
                </div>
                {record.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>位置记录</span>
                  </div>
                )}
                {record.weather && (
                  <div className="flex items-center space-x-2">
                    {record.weather.temperature && (
                      <div className="flex items-center">
                        <Thermometer className="w-4 h-4 mr-1" />
                        <span>{record.weather.temperature}°C</span>
                      </div>
                    )}
                    {record.weather.humidity && (
                      <div className="flex items-center">
                        <Droplets className="w-4 h-4 mr-1" />
                        <span>{record.weather.humidity}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 图片展示 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">分析图片</h3>
          <div className="relative">
            <img
              src={resolveImageUrl(record.imageUrl)}
              alt="便便分析图片"
              className="w-full h-64 sm:h-80 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowFullImage(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/pwa-192x192.png';
              }}
            />
            <button
              onClick={() => setShowFullImage(true)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>
          
          {onRetakePhoto && (
            <div className="mt-4 text-center">
              <TouchButton
                onClick={onRetakePhoto}
                variant="outline"
                size="sm"
                icon={RefreshCw}
              >
                重新拍照
              </TouchButton>
            </div>
          )}
        </div>

        {/* 分析界面组件 */}
        <AnalysisInterface
          record={record}
          pet={pet}
          isNew={isNew}
          onSave={onSave}
          onRetakePhoto={onRetakePhoto}
          onViewHistory={onViewHistory}
          onShareToCommunity={onShareToCommunity}
        />

        {/* 快速操作 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {onViewHistory && (
              <TouchButton
                onClick={onViewHistory}
                variant="outline"
                fullWidth
                icon={TrendingUp}
              >
                查看历史记录
              </TouchButton>
            )}
            
            <TouchButton
              onClick={async () => {
                try {
                  const blob = await AnalysisService.exportRecords(record.petId, 'pdf');
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${pet.name}-健康报告.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error('导出失败:', error);
                }
              }}
              variant="outline"
              fullWidth
              icon={Download}
            >
              导出报告
            </TouchButton>
            
            <TouchButton
              onClick={handleShare}
              loading={isSharing}
              variant="outline"
              fullWidth
              icon={Share2}
            >
              分享结果
            </TouchButton>
          </div>
        </div>
      </div>

      {/* 全屏图片查看 */}
      {showFullImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-full max-h-full p-4">
            <img
              src={resolveImageUrl(record.imageUrl)}
              alt="便便分析图片"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};