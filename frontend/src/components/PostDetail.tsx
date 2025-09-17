import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Share2, Eye, MoreHorizontal, Edit } from 'lucide-react';
import { usePost } from '../hooks/useCommunity';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../hooks/useAuth';
import { CommunityPost } from '../../../shared/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LikeButton } from './LikeButton';
import { CommentList } from './CommentList';

interface PostDetailProps {
  postId: string;
  onBack?: () => void;
  onEdit?: (post: CommunityPost) => void;
  className?: string;
}

export const PostDetail: React.FC<PostDetailProps> = ({
  postId,
  onBack,
  onEdit,
  className = ''
}) => {
  const { user } = useAuth();
  const { toggleLikePost } = useCommunity();
  const {
    post,
    comments,
    loading,
    error,
    commentsPagination,
    fetchPost,
    fetchComments,
    createComment,
    toggleLikeComment,

  } = usePost(postId);

  const [showMenu, setShowMenu] = useState(false);

  // 检查是否是帖子作者
  const isPostOwner = user && post && user.id === post.userId;
  
  // 检查是否已点赞帖子
  const isPostLiked = user && post ? post.interactions.likes.includes(user.id) : false;

  // 处理帖子点赞
  const handlePostLike = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }
    try {
      await toggleLikePost(postId);
      // 重新获取帖子数据以更新点赞状态
      await fetchPost(postId);
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  // 处理评论提交
  const handleCommentSubmit = async (content: string, parentId?: string) => {
    await createComment(postId, {
      content,
      parentId
    });
  };

  // 处理评论点赞
  const handleCommentLike = async (commentId: string) => {
    await toggleLikeComment(commentId);
  };

  // 处理分享
  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: post?.title,
          text: post?.content.substring(0, 100),
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  // 渲染Markdown内容
  const renderContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 underline">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2" />')
      .replace(/\n/g, '<br />');
  };

  if (loading && !post) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchPost(postId)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          重试
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">帖子不存在</p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* 头部导航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} className="mr-2" />
          返回列表
        </button>
        
        {isPostOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <MoreHorizontal size={20} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-10 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onEdit?.(post);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Edit size={14} className="mr-2" />
                  编辑
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 帖子内容 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        {/* 帖子头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                {post.isAnonymous ? (
                  <span className="text-orange-600 font-medium text-lg">
                    ?
                  </span>
                ) : post.user?.avatar ? (
                  <img
                    src={post.user.avatar}
                    alt={post.user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-orange-600 font-medium text-lg">
                    {post.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">
                  {post.isAnonymous ? '匿名用户' : (post.user?.username || '匿名用户')}
                </h4>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { 
                    addSuffix: true, 
                    locale: zhCN 
                  })}
                </p>
              </div>
            </div>
          </div>
          
          {/* 标题 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          
          {/* 标签和分类 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
              {post.category === 'health' ? '健康分享' : 
               post.category === 'help' ? '求助问答' :
               post.category === 'experience' ? '经验分享' : '日常分享'}
            </span>
            
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        
        {/* 帖子正文 */}
        <div className="p-6">
          <div 
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />
          
          {/* 图片 */}
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {post.images.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    // TODO: 实现图片预览功能
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* 帖子操作栏 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <LikeButton
                isLiked={isPostLiked}
                likesCount={post.likesCount || post.interactions.likes.length}
                onToggle={handlePostLike}
                size="lg"
              />
              
              <div className="flex items-center space-x-2 text-gray-500">
                <MessageCircle size={20} />
                <span>{post.commentsCount || post.comments.length}</span>
              </div>
              
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors"
              >
                <Share2 size={20} />
                <span>分享</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-400">
              <Eye size={16} />
              <span>{post.interactions.views}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 评论区 */}
      <CommentList
        comments={comments}
        currentUserId={user?.id}
        currentUserAvatar={user?.avatar}
        currentUserUsername={user?.username}
        totalComments={commentsPagination.totalItems}
        loading={loading}
        hasMore={commentsPagination.current < commentsPagination.total}
        onLoadMore={() => fetchComments(postId, commentsPagination.current + 1)}
        onCreateComment={handleCommentSubmit}
        onLikeComment={handleCommentLike}
      />
      
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