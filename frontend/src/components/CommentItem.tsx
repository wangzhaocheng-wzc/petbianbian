import React, { useState } from 'react';
import { MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { Comment } from '../../../shared/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LikeButton } from './LikeButton';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onLike: (commentId: string) => Promise<void>;
  onReply: (commentId: string, username: string) => void;
  onDelete?: (commentId: string) => Promise<void>;
  onReport?: (commentId: string) => void;
  isReply?: boolean;
  className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onLike,
  onReply,
  onDelete,
  onReport,
  isReply = false,
  className = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = currentUserId === comment.userId;
  const isLiked = currentUserId ? comment.likes.includes(currentUserId) : false;

  const handleLike = async () => {
    if (!currentUserId) {
      alert('请先登录');
      return;
    }
    await onLike(comment.id);
  };

  const handleReply = () => {
    if (!currentUserId) {
      alert('请先登录');
      return;
    }
    onReply(comment.id, comment.user?.username || '用户');
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (!confirm('确定要删除这条评论吗？')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error('删除评论失败:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReport = () => {
    if (!onReport) return;
    if (!currentUserId) {
      alert('请先登录');
      return;
    }
    onReport(comment.id);
  };

  // 渲染Markdown内容
  const renderContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 underline">$1</a>')
      .replace(/\n/g, '<br />');
  };

  if (comment.isDeleted) {
    return (
      <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'} ${className}`}>
        <div className="text-gray-400 text-sm italic py-2">
          此评论已被删除
        </div>
      </div>
    );
  }

  return (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'} ${className}`}>
      <div className="flex space-x-3">
        {/* 用户头像 */}
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
          {comment.user?.avatar ? (
            <img
              src={comment.user.avatar}
              alt={comment.user.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-orange-600 text-sm font-medium">
              {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
        </div>
        
        <div className="flex-1">
          {/* 评论头部 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {comment.user?.username || '匿名用户'}
              </span>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { 
                  addSuffix: true, 
                  locale: zhCN 
                })}
              </span>
              {comment.moderationStatus === 'pending' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  审核中
                </span>
              )}
            </div>
            
            {/* 操作菜单 */}
            {(isOwner || onReport) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <MoreHorizontal size={14} />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-6 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {isOwner && onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                          setShowMenu(false);
                        }}
                        disabled={isDeleting}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50"
                      >
                        <Trash2 size={12} className="mr-2" />
                        {isDeleting ? '删除中...' : '删除'}
                      </button>
                    )}
                    
                    {!isOwner && onReport && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReport();
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Flag size={12} className="mr-2" />
                        举报
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 评论内容 */}
          <div 
            className="text-gray-700 text-sm mb-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderContent(comment.content) }}
          />
          
          {/* 评论操作 */}
          <div className="flex items-center space-x-4">
            <LikeButton
              isLiked={isLiked}
              likesCount={comment.likesCount || comment.likes.length}
              onToggle={handleLike}
              size="sm"
            />
            
            {currentUserId && (
              <button
                onClick={handleReply}
                className="text-xs text-gray-500 hover:text-orange-600 transition-colors"
              >
                回复
              </button>
            )}
          </div>
          
          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                  onReport={onReport}
                  isReply={true}
                />
              ))}
            </div>
          )}
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