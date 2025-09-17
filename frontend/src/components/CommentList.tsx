import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Comment } from '../../../shared/types';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  comments: Comment[];
  currentUserId?: string;
  currentUserAvatar?: string;
  currentUserUsername?: string;
  totalComments: number;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onCreateComment: (content: string, parentId?: string) => Promise<void>;
  onLikeComment: (commentId: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onReportComment?: (commentId: string) => void;
  className?: string;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  currentUserId,
  currentUserAvatar,
  currentUserUsername,
  totalComments,
  loading = false,
  hasMore = false,
  onLoadMore,
  onCreateComment,
  onLikeComment,
  onDeleteComment,
  onReportComment,
  className = ''
}) => {
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const handleCommentSubmit = async () => {
    if (!currentUserId) {
      alert('请先登录');
      return;
    }

    if (!commentText.trim()) {
      alert('请输入评论内容');
      return;
    }

    setSubmittingComment(true);
    try {
      await onCreateComment(commentText.trim(), replyTo?.id);
      setCommentText('');
      setReplyTo(null);
    } catch (error) {
      console.error('发布评论失败:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ id: commentId, username });
    setCommentText(`@${username} `);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    setCommentText('');
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          评论 ({totalComments})
        </h3>
        
        {/* 发表评论 */}
        {currentUserId ? (
          <div className="mb-6">
            {replyTo && (
              <div className="mb-2 text-sm text-gray-500 flex items-center justify-between">
                <span>回复 @{replyTo.username}</span>
                <button
                  onClick={handleCancelReply}
                  className="text-orange-600 hover:text-orange-700"
                >
                  取消
                </button>
              </div>
            )}
            
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt={currentUserUsername}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-orange-600 text-sm font-medium">
                    {currentUserUsername?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={replyTo ? `回复 @${replyTo.username}...` : "写下你的评论..."}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  maxLength={2000}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500">
                    {commentText.length}/2000
                  </span>
                  
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!commentText.trim() || submittingComment}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} className="mr-2" />
                    {submittingComment ? '发布中...' : '发布评论'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 mb-2">登录后可以发表评论</p>
            <button 
              onClick={() => navigate('/login')}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              立即登录
            </button>
          </div>
        )}
        
        {/* 评论列表 */}
        <div>
          {loading && comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">加载评论中...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">暂无评论，来发表第一个评论吧！</p>
            </div>
          ) : (
            <div>
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onLike={onLikeComment}
                  onReply={handleReply}
                  onDelete={onDeleteComment}
                  onReport={onReportComment}
                />
              ))}
              
              {/* 加载更多评论 */}
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={onLoadMore}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {loading ? '加载中...' : '加载更多评论'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};