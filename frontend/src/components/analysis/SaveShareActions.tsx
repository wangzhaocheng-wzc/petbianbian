import React, { useState } from 'react';
import { PoopRecord } from '../../../../shared/types';
import { AnalysisService } from '../../services/analysisService';
import TouchButton from '../common/TouchButton';
import { useMobile } from '../../hooks/useMobile';
import {
  Save,
  Share2,
  Download,
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
      console.error('保存失败:', error);
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
      console.error('分享到社区失败:', error);
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
      console.error('复制失败:', err);
    }
  };

  const handleExternalShare = (platform: string) => {
    const url = shareUrl || generateShareUrl();
    const text = `我的宠物${petName}的健康分析结果：${record.analysis.healthStatusDescription || '查看详情'}`;
    
    const shareUrls: Record<string, string> = {
      wechat: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      weibo: `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      qq: `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(`${petName}的健康分析报告`)}&body=${encodeURIComponent(text + '\n\n' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    };

    const targetUrl = shareUrls[platform];
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'width=600,height=400');
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '健康';
      case 'warning':
        return '需要关注';
      case 'concerning':
        return '建议就医';
      default:
        return '已分析';
    }
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
            {saveSuccess ? '已保存' : isSaving ? '保存中...' : '保存记录'}
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
          分享结果
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
            分享到社区
          </TouchButton>
        )}

        {/* 导出报告按钮 */}
        <TouchButton
          onClick={async () => {
            try {
              const blob = await AnalysisService.exportRecords(record.petId, 'pdf', {
                startDate: new Date(record.timestamp).toISOString().split('T')[0],
                endDate: new Date(record.timestamp).toISOString().split('T')[0]
              });
              
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${petName}-分析报告-${new Date(record.timestamp).toLocaleDateString()}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } catch (error) {
              console.error('导出失败:', error);
            }
          }}
          variant="outline"
          size={isMobile ? "sm" : "md"}
          icon={Download}
        >
          {isMobile ? '' : '导出报告'}
        </TouchButton>
      </div>

      {/* 分享模态框 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">分享分析结果</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 分析结果预览 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    record.analysis.healthStatus === 'healthy' ? 'bg-green-400' :
                    record.analysis.healthStatus === 'warning' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`} />
                  <span className="font-medium text-gray-900">
                    {petName}的健康分析
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  状态: {getHealthStatusText(record.analysis.healthStatus)} • 
                  置信度: {record.analysis.confidence}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(record.timestamp).toLocaleString('zh-CN')}
                </p>
              </div>

              {/* 分享链接 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分享链接
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
                    {copySuccess ? '已复制' : '复制'}
                  </TouchButton>
                </div>
              </div>

              {/* 分享到社区 */}
              {onShareToCommunity && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    分享到社区
                  </label>
                  <TouchButton
                    onClick={handleShareToCommunity}
                    loading={isSharing}
                    fullWidth
                    variant="primary"
                    icon={Users}
                  >
                    {isSharing ? '分享中...' : '分享到宠物社区'}
                  </TouchButton>
                  <p className="text-xs text-gray-500 mt-2">
                    分享到社区可以帮助其他宠物主人了解类似情况
                  </p>
                </div>
              )}

              {/* 外部分享选项 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  分享到其他平台
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExternalShare('wechat')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm">微信</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('email')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">邮件</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('weibo')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-red-600" />
                    <span className="text-sm">微博</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('qq')}
                    className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">QQ</span>
                  </button>
                </div>
              </div>

              {/* 分享说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Heart className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">分享提示</p>
                    <p className="text-xs text-blue-800">
                      分享的记录将包含分析结果和健康建议，但不会包含您的个人隐私信息。
                      分享可以帮助其他宠物主人了解类似的健康情况。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
              <TouchButton
                onClick={() => setShowShareModal(false)}
                variant="outline"
                size="sm"
              >
                关闭
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};