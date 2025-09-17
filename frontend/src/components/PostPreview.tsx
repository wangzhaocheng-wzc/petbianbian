import React from 'react';
import { X, Edit, Send } from 'lucide-react';
import { CreatePostRequest, UpdatePostRequest } from '../../../shared/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PostPreviewProps {
  data: CreatePostRequest | UpdatePostRequest;
  onClose: () => void;
  onEdit: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
  className?: string;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  data,
  onClose,
  onEdit,
  onPublish,
  isPublishing = false,
  className = ''
}) => {
  // 分类标签映射
  const categoryLabels = {
    general: '日常分享',
    health: '健康分享',
    help: '求助问答',
    experience: '经验分享'
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${className}`}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">帖子预览</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 预览内容 */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6">
            {/* 帖子头部信息 */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-medium">我</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">我的帖子</div>
                <div className="text-sm text-gray-500">刚刚</div>
              </div>
            </div>

            {/* 分类标签 */}
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {categoryLabels[data.category as keyof typeof categoryLabels] || data.category}
              </span>
            </div>

            {/* 帖子标题 */}
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              {data.title}
            </h1>

            {/* 帖子内容 */}
            <div className="prose prose-sm max-w-none mb-6">
              <div 
                className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: data.content }}
              />
            </div>

            {/* 图片预览 */}
            {data.images && data.images.length > 0 && (
              <div className="mb-6">
                <div className={`grid gap-2 ${
                  data.images.length === 1 ? 'grid-cols-1' :
                  data.images.length === 2 ? 'grid-cols-2' :
                  data.images.length === 3 ? 'grid-cols-3' :
                  'grid-cols-2 md:grid-cols-3'
                }`}>
                  {data.images.map((imageUrl, index) => (
                    <div key={index} className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={imageUrl}
                        alt={`图片 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 标签 */}
            {data.tags && data.tags.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 预览提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs">i</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    这是您帖子的预览效果。确认无误后可以发布，或返回继续编辑。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onEdit}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Edit size={16} className="mr-2" />
            继续编辑
          </button>
          
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} className="mr-2" />
            {isPublishing ? '发布中...' : '确认发布'}
          </button>
        </div>
      </div>
    </div>
  );
};