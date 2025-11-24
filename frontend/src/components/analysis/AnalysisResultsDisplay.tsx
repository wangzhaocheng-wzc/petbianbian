import React, { useEffect, useState } from 'react';
import { resolveBestImageUrl } from '@/utils/imageUrlResolver';
import { PoopRecord, Pet } from '../../../../shared/types';
import { AnalysisInterface } from '../AnalysisInterface';
import { AnalysisService } from '../../services/analysisService';
import TouchButton from '../common/TouchButton';
import { useMobile } from '../../hooks/useMobile';
import { useI18n } from '../../i18n/I18nProvider';
import {
  ArrowLeft,
  Share2,
  Save,
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
  const { t, language } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const url = await resolveBestImageUrl(record.imageUrl);
      if (!alive) return;
      setImgSrc(url);
    })();
    return () => { alive = false; };
  }, [record.imageUrl]);

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
          title: t('status.healthy'),
          subtitle: t('analysis.results.completed'),
          description: t('analysis.results.description'),
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          badgeColor: 'bg-green-100 text-green-800'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
          title: t('status.warning'),
          subtitle: t('analysis.results.viewDetails'),
          description: t('analysis.results.description'),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        };
      case 'concerning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
          title: t('status.concerning'),
          subtitle: t('analysis.results.viewDetails'),
          description: t('analysis.results.description'),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          badgeColor: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: <Info className="w-8 h-8 text-gray-500" />,
          title: t('analysis.results.completed'),
          subtitle: t('analysis.results.viewDetails'),
          description: t('analysis.results.description'),
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
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{t('analysis.results.title')}</h1>
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
                  {saveSuccess ? t('analysis.results.saved') : isSaving ? t('analysis.results.saving') : t('analysis.results.save')}
                </TouchButton>
              )}
              
              <TouchButton
                onClick={handleShare}
                loading={isSharing}
                variant="outline"
                size="sm"
                icon={Share2}
              >
                {isMobile ? '' : t('analysis.results.share')}
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
                  {record.analysis.confidence}% {t('analysis.results.confidence')}
                </div>
              </div>
              <p className={`text-base ${statusInfo.textColor} mb-4`}>
                {statusInfo.description}
              </p>
              
              {/* 时间和环境信息 */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{new Date(record.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
                </div>
                {record.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{t('analysis.results.locationRecorded')}</span>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analysis.results.title')}</h3>
          <div className="relative overflow-hidden w-full h-64 sm:h-80 rounded-lg border border-gray-200">
            {/* 删除图片后不显示图片 */}
            {imgSrc && imgSrc !== '/pwa-192x192.png' ? (
              <OptimizedImage
                src={imgSrc}
                alt={t('analysis.results.title')}
                className="w-full h-full object-cover rounded-lg"
                width={undefined}
                height={undefined}
                placeholder="/pwa-192x192.png"
                lazy={true}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">{t('analysis.results.noImage')}</span>
              </div>
            )}
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
                {t('analysis.results.retakePhoto')}
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analysis.results.quickActions')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {onViewHistory && (
              <TouchButton
                onClick={onViewHistory}
                variant="outline"
                fullWidth
                icon={TrendingUp}
              >
                {t('analysis.results.viewHistory')}
              </TouchButton>
            )}
            
            
            <TouchButton
              onClick={handleShare}
              loading={isSharing}
              variant="outline"
              fullWidth
              icon={Share2}
            >
              {t('analysis.results.shareResult')}
            </TouchButton>
          </div>
        </div>
      </div>

      {/* 全屏图片查看 */}
      {showFullImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-full max-h-full p-4">
            <OptimizedImage
              src={imgSrc || '/pwa-192x192.png'}
              alt={t('analysis.results.title')}
              className="max-w-full max-h-full object-contain"
              width={undefined}
              height={undefined}
              placeholder="/pwa-192x192.png"
              lazy={false}
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
