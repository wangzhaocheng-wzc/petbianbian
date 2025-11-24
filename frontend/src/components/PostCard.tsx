import React, { useState } from 'react';
import { MessageCircle, Share2, Eye, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { CommunityPost } from '../../../shared/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { LikeButton } from './LikeButton';
import { useI18n } from '../i18n/I18nProvider';

interface PostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  onLike?: (postId: string) => Promise<void>;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onEdit?: (post: CommunityPost) => void;
  onDelete?: (postId: string) => void;
  onClick?: (postId: string) => void;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onClick,
  className = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const { t, language } = useI18n();

  // 检查是否是当前用户的帖子
  const isOwner = currentUserId === post.userId;
  
  // 检查是否已点赞
  const isLiked = currentUserId ? post.interactions.likes.includes(currentUserId) : false;

  // 分类标签样式
  const getCategoryStyle = (category: string) => {
    const styles = {
      health: 'bg-green-100 text-green-800',
      help: 'bg-blue-100 text-blue-800',
      experience: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return styles[category as keyof typeof styles] || styles.general;
  };

  // 分类标签文本
  const getCategoryLabel = (category: string) => {
    return t(`community.categories.${category}`);
  };

  // 处理图片加载错误
  const handleImageError = (imageUrl: string) => {
    setImageError(prev => ({ ...prev, [imageUrl]: true }));
  };

  // 渲染图片网格
  const renderImages = () => {
    if (!post.images || post.images.length === 0) return null;

    const validImages = post.images.filter(img => !imageError[img]);
    if (validImages.length === 0) return null;

    const getGridClass = (count: number) => {
      if (count === 1) return 'grid-cols-1';
      if (count === 2) return 'grid-cols-2';
      if (count <= 4) return 'grid-cols-2';
      return 'grid-cols-3';
    };

    return (
      <div className={`grid gap-2 mt-3 ${getGridClass(validImages.length)}`}>
        {validImages.slice(0, 9).map((imageUrl, index) => (
          <div
            key={index}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
          >
            <img
              src={imageUrl}
              alt={t('community.imageUpload.alt.image', { index: index + 1 })}
              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
              onError={() => handleImageError(imageUrl)}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: 实现图片预览功能
              }}
            />
            {index === 8 && validImages.length > 9 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white font-medium">
                +{validImages.length - 9}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${className}`}>
      {/* 头部信息 */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {/* 用户头像 */}
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              {post.isAnonymous ? (
                <span className="text-orange-600 font-medium">
                  ?
                </span>
              ) : post.user?.avatar ? (
                <img
                  src={post.user.avatar}
                  alt={post.user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-orange-600 font-medium">
                  {post.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">
                  {post.isAnonymous ? t('community.user.anonymous') : (post.user?.username || t('community.user.anonymous'))}
                </h4>
                {!post.isAnonymous && post.user?.stats?.reputation && post.user.stats.reputation > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    {t('community.user.reputation', { value: post.user.stats.reputation })}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { 
                    addSuffix: true, 
                    locale: language === 'zh' ? zhCN : enUS 
                  })}
                </span>
                
                {/* 分类标签 */}
                <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryStyle(post.category)}`}>
                  {getCategoryLabel(post.category)}
                </span>
                
                {/* 置顶标识 */}
                {post.isSticky && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                    {t('community.flags.sticky')}
                  </span>
                )}
                
                {/* 精选标识 */}
                {post.isFeatured && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    {t('community.flags.featured')}
                  </span>
                )}
              </div>
              
              {/* 相关宠物信息 */}
              {post.pet && (
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-xs text-gray-500">{t('community.pet.about')}</span>
                  <span className="text-xs text-orange-600 font-medium">
                    {post.pet.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({post.pet.type === 'dog' ? t('community.pet.type.dog') : post.pet.type === 'cat' ? t('community.pet.type.cat') : t('community.pet.type.other')})
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* 操作菜单 */}
          {(isOwner || onShare) && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <MoreHorizontal size={16} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {isOwner && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(post);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Edit size={14} className="mr-2" />
                      {t('community.actions.edit')}
                    </button>
                  )}
                  
                  {isOwner && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('community.actions.confirmDeletePost'))) {
                          onDelete(post.id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Trash2 size={14} className="mr-2" />
                      {t('community.actions.delete')}
                    </button>
                  )}
                  
                  {onShare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(post.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Share2 size={14} className="mr-2" />
                      {t('community.actions.share')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 帖子内容 */}
      <div 
        className="px-4 cursor-pointer"
        onClick={() => onClick?.(post.id)}
      >
        {/* 标题 */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {post.title}
        </h3>
        
        {/* 内容预览 */}
        <div className="text-gray-700 text-sm line-clamp-3 mb-3">
          {post.content.replace(/[#*`\[\]()]/g, '').substring(0, 200)}
          {post.content.length > 200 && '...'}
        </div>
        
        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.slice(0, 5).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 5 && (
              <span className="text-xs text-gray-400">
                +{post.tags.length - 5}
              </span>
            )}
          </div>
        )}
        
        {/* 图片 */}
        {renderImages()}
      </div>

      {/* 底部操作栏 */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 点赞 */}
            <LikeButton
              isLiked={isLiked}
              likesCount={post.likesCount || post.interactions.likes.length}
              onToggle={async () => {
                if (!currentUserId) {
                  alert(t('community.loginRequired'));
                  return;
                }
                await onLike?.(post.id);
              }}
              size="sm"
            />
            
            {/* 评论 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComment?.(post.id);
              }}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <MessageCircle size={16} />
              <span>{post.commentsCount || post.comments.length}</span>
            </button>
            
            {/* 分享 */}
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(post.id);
                }}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-green-600 transition-colors"
              >
                <Share2 size={16} />
                <span>{post.interactions.shares}</span>
              </button>
            )}
          </div>
          
          {/* 浏览量 */}
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <Eye size={14} />
            <span>{post.interactions.views}</span>
          </div>
        </div>
      </div>
      
      {/* 点击遮罩，用于关闭菜单 */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};