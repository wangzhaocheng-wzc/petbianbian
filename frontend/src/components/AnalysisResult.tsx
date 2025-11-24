import React, { useState } from 'react';
import { resolveImageUrl } from '@/utils/imageUrlResolver';
import { PoopRecord } from '../../../shared/types';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Calendar,
  MapPin,
  Thermometer,
  Droplets,
  Share2,
  Edit3,
  Trash2,
  Save,
  Copy,
  MessageCircle,
  Heart,
  BookmarkPlus
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface AnalysisResultProps {
  record: PoopRecord;
  onEdit?: (record: PoopRecord) => void;
  onDelete?: (recordId: string) => void;
  onShare?: (record: PoopRecord) => void;
  onSave?: (record: PoopRecord) => void;
  onExport?: (record: PoopRecord) => void;
  onAddToFavorites?: (record: PoopRecord) => void;
  showActions?: boolean;
  isNew?: boolean;
  isSaved?: boolean;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({
  record,
  onEdit,
  onDelete,
  onShare,
  onSave,
  onExport,
  onAddToFavorites,
  showActions = true,
  isNew = false,
  isSaved = false
}) => {
  const { t, language } = useI18n();
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  // 获取健康状态图标和颜色
  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'concerning':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Eye className="w-6 h-6 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'concerning':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(date).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/analysis/record/${record.id}`;
    setShareUrl(url);
    setShowShareModal(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleSaveRecord = () => {
    if (onSave) {
      onSave(record);
    }
  };

  // 导出功能已移除

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* 头部信息 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getHealthStatusIcon(record.analysis.healthStatus)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {record.analysis.healthStatusDescription || t('analysis.results.title')}
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(record.timestamp)}
              </p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-1">
              {/* 保存记录按钮 */}
              {isNew && onSave && (
                <button
                  onClick={handleSaveRecord}
                  className={`p-2 rounded-lg transition-colors ${
                    isSaved 
                      ? 'text-green-500 bg-green-50' 
                      : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                  }`}
                  title={isSaved ? t('analysis.results.saved') : t('analysisResult.saveRecord')}
                  disabled={isSaved}
                >
                  {isSaved ? <BookmarkPlus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                </button>
              )}
              
              {/* 分享按钮 */}
              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title={t('analysisResult.shareRecord')}
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              {/* 导出功能已移除 */}
              
              {/* 编辑按钮 */}
              {onEdit && (
                <button
                  onClick={() => onEdit(record)}
                  className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  title={t('analysisResult.editRecord')}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              
              {/* 删除按钮 */}
              {onDelete && (
                <button
                  onClick={() => onDelete(record.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('analysisResult.deleteRecord')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* 图片展示 */}
        <div className="mb-4">
          <img
            src={resolveImageUrl(record.imageUrl)}
            alt={t('analysis.results.title')}
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/pwa-192x192.png';
            }}
          />
        </div>

        {/* 分析结果 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 健康状态 */}
          <div className={`p-3 rounded-lg border ${getHealthStatusColor(record.analysis.healthStatus)}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{t('analysis.detail.healthStatusLabel')}</span>
              <span className="text-sm">{record.analysis.confidence}% {t('analysis.results.confidence')}</span>
            </div>
            <p className="text-sm mt-1">{record.analysis.healthStatusDescription}</p>
          </div>

          {/* 形状类型 */}
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <span className="font-medium text-gray-700">{t('analysis.detail.shapeType')}</span>
            <p className="text-sm text-gray-600 mt-1">
              {record.analysis.shapeDescription || record.analysis.shape}
            </p>
          </div>
        </div>

        {/* 检测特征 */}
        {record.analysis.detectedFeatures && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">{t('analysis.detail.detectedFeatures')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">{t('analysis.detail.color')}</p>
                <p className="text-sm font-medium">{record.analysis.detectedFeatures.color}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">{t('analysis.detail.texture')}</p>
                <p className="text-sm font-medium">{record.analysis.detectedFeatures.texture}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">{t('analysis.detail.consistency')}</p>
                <p className="text-sm font-medium">{record.analysis.detectedFeatures.consistency}</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">{t('analysis.detail.size')}</p>
                <p className="text-sm font-medium">{record.analysis.detectedFeatures.size}</p>
              </div>
            </div>
          </div>
        )}

        {/* 详细分析 */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">{t('analysis.detail.title')}</h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            {record.analysis.details}
          </p>
        </div>

        {/* 健康建议 */}
        {record.analysis.recommendations && record.analysis.recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">{t('analysisResult.healthAdviceTitle')}</h4>
            <ul className="space-y-1">
              {record.analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 用户备注 */}
        {record.userNotes && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">{t('analysisResult.userNotesTitle')}</h4>
            <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
              {record.userNotes}
            </p>
          </div>
        )}

        {/* 相关症状 */}
        {record.symptoms && record.symptoms.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">{t('analysisResult.relatedSymptomsTitle')}</h4>
            <div className="flex flex-wrap gap-2">
              {record.symptoms.map((symptom, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 环境信息 */}
        {(record.location || record.weather) && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="font-medium text-gray-900 mb-2">{t('analysisResult.environmentInfoTitle')}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {record.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>
                    {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {record.weather && (
                <>
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
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 分享模态框 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('analysisResult.shareModalTitle')}</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 分享链接 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('analysisResult.shareLinkLabel')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      copySuccess
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {copySuccess ? t('analysisResult.copied') : t('analysisResult.copy')}
                  </button>
                </div>
              </div>

              {/* 分享选项 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('analysisResult.shareTo')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const text = `${t('analysisResult.sharePreviewTitle')}: ${record.analysis.healthStatusDescription || t('analysis.results.viewDetails')}`;
                      const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{t('analysisResult.wechat')}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (onShare) {
                        onShare(record);
                      }
                      setShowShareModal(false);
                    }}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm">{t('analysisResult.community')}</span>
                  </button>
                </div>
              </div>

              {/* 分享说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>{t('analysisResult.shareHintTitle')}：</strong> {t('analysisResult.shareHint')}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {t('analysisResult.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
