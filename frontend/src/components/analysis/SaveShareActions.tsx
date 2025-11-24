import React, { useState } from 'react';
import { PoopRecord } from '../../../../shared/types';
import { AnalysisService } from '../../services/analysisService';
import TouchButton from '../common/TouchButton';
import { useMobile } from '../../hooks/useMobile';
import { useI18n } from '../../i18n/I18nProvider';
import {
  Save,
  Share2,
  Copy,
  Check,
  Heart,
  MessageSquare,
  Users,
  BookmarkPlus,
  ExternalLink,
  Mail,
  X
} from 'lucide-react';

interface SaveShareActionsProps {
  record: PoopRecord;
  petName: string;
  isNew?: boolean;
  isSaved?: boolean;
  onSave?: (record: PoopRecord) => void;
  onShareToCommunity?: (record: PoopRecord) => void;
  className?: string;
}

export const SaveShareActions: React.FC<SaveShareActionsProps> = ({
  record,
  petName,
  isNew = false,
  isSaved = false,
  onSave,
  onShareToCommunity,
  className = ''
}) => {
  const { isMobile } = useMobile();
  const { t, language } = useI18n();
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(isSaved);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const handleSave = async () => {
    if (!onSave || saveSuccess) return;
    
    setIsSaving(true);
    try {
      await onSave(record);
      setSaveSuccess(true);
      setTimeout(() => {
        // 保持保存状态，不重置
      }, 2000);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareToCommunity = async () => {
    if (!onShareToCommunity) return;
    
    setIsSharing(true);
    try {
      await onShareToCommunity(record);
      setShowShareModal(false);
    } catch (error) {
      console.error('Share to community failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const generateShareUrl = () => {
    const url = `${window.location.origin}/analysis/record/${record.id}`;
    setShareUrl(url);
    return url;
  };

  const handleCopyUrl = async () => {
    const url = shareUrl || generateShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleExternalShare = (platform: string) => {
    const url = shareUrl || generateShareUrl();
    const previewTitle = t('analysisResult.sharePreviewTitle');
    const detailsText = record.analysis.healthStatusDescription || t('analysis.results.viewDetails');
    const text = `${previewTitle}: ${detailsText}`;
    const emailSubjectPrefix = t('analysisResult.emailSubjectPrefix');

    const shareUrls: Record<string, string> = {
      wechat: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      weibo: `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      qq: `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(`${emailSubjectPrefix} ${petName}`)}&body=${encodeURIComponent(text + '\n\n' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    };

    const targetUrl = shareUrls[platform];
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'width=600,height=400');
    }
  };

  const getHealthStatusText = (status: string) => {
    if (['healthy', 'warning', 'concerning'].includes(status)) {
      return t(`status.${status}`);
    }
    return t('status.unknown');
  };

  return (
    <>
      <div className={`flex flex-wrap gap-3 ${className}`}>
        {/* 保存记录按钮 */}
        {isNew && onSave && (
          <TouchButton
            onClick={handleSave}
            loading={isSaving}
            disabled={saveSuccess}
            variant={saveSuccess ? "outline" : "primary"}
            size={isMobile ? "sm" : "md"}
            icon={saveSuccess ? BookmarkPlus : Save}
            className={saveSuccess ? "text-green-600 border-green-300 bg-green-50" : ""}
          >
            {saveSuccess ? t('analysis.results.saved') : isSaving ? t('analysis.results.saving') : t('analysisResult.saveRecord')}
          </TouchButton>
        )}

        {/* 分享按钮 */}
        <TouchButton
          onClick={() => {
            generateShareUrl();
            setShowShareModal(true);
          }}
          variant="outline"
          size={isMobile ? "sm" : "md"}
          icon={Share2}
        >
          {t('analysis.results.shareResult')}
        </TouchButton>

        {/* 分享到社区按钮 */}
        {onShareToCommunity && (
          <TouchButton
            onClick={handleShareToCommunity}
            loading={isSharing}
            variant="outline"
            size={isMobile ? "sm" : "md"}
            icon={Users}
          >
            {isSharing ? `${t('analysis.results.share')}...` : t('analysisResult.shareToCommunity')}
          </TouchButton>
        )}

        {/* 导出功能已移除 */}
      </div>

      {/* 分享模态框 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{t('analysisResult.shareModalTitle')}</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Analysis preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    record.analysis.healthStatus === 'healthy' ? 'bg-green-400' :
                    record.analysis.healthStatus === 'warning' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`} />
                  <span className="font-medium text-gray-900">
                    {t('analysisResult.sharePreviewTitle')} - {petName}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('analysis.detail.statusLabel')}: {getHealthStatusText(record.analysis.healthStatus)} • 
                  {t('analysis.results.confidence')}: {record.analysis.confidence}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(record.timestamp).toLocaleString(language === 'zh' ? t('analysis.dateLocale_zh') : t('analysis.dateLocale_en'))}
                </p>
              </div>

              {/* Share link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('analysisResult.shareLinkLabel')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                  />
                  <TouchButton
                    onClick={handleCopyUrl}
                    size="sm"
                    variant={copySuccess ? "outline" : "primary"}
                    icon={copySuccess ? Check : Copy}
                  >
                    {copySuccess ? t('analysisResult.copied') : t('analysisResult.copy')}
                  </TouchButton>
                </div>
              </div>

              {/* Share to community */}
              {onShareToCommunity && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('analysisResult.shareToCommunity')}
                  </label>
                  <TouchButton
                    onClick={handleShareToCommunity}
                    loading={isSharing}
                    fullWidth
                    variant="primary"
                    icon={Users}
                  >
                    {isSharing ? `${t('analysis.results.share')}...` : t('analysisResult.shareToCommunity')}
                  </TouchButton>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('analysisResult.communityHint')}
                  </p>
                </div>
              )}

              {/* External share options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('analysisResult.shareToOtherPlatforms')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExternalShare('wechat')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{t('analysisResult.wechat')}</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('email')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{t('analysisResult.email')}</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('weibo')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-red-600" />
                    <span className="text-sm">{t('analysisResult.weibo')}</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('qq')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{t('analysisResult.qq')}</span>
                  </button>
                </div>
              </div>

              {/* Share hint */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Heart className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">{t('analysisResult.shareHintTitle')}</p>
                    <p className="text-xs text-blue-800">{t('analysisResult.shareHintLong')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
              <TouchButton
                onClick={() => setShowShareModal(false)}
                variant="outline"
                size="sm"
              >
                {t('analysisResult.close')}
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
