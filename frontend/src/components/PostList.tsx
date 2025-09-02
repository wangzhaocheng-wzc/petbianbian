import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import { PostCard } from './PostCard';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../hooks/useAuth';
import { useMobile } from '../hooks/useMobile';
import { CommunityPost, PostsListRequest } from '../../../shared/types';
import PullToRefresh from './mobile/PullToRefresh';
import TouchButton from './common/TouchButton';

interface PostListProps {
  onCreatePost?: () => void;
  onEditPost?: (post: CommunityPost) => void;
  onViewPost?: (postId: string) => void;
  className?: string;
}

export const PostList: React.FC<PostListProps> = ({
  onCreatePost,
  onEditPost,
  onViewPost,
  className = ''
}) => {
  const { user } = useAuth();
  const { isMobile } = useMobile();
  const {
    posts,
    loading,
    error,
    pagination,
    categories,
    fetchPosts,
    deletePost,
    toggleLikePost,
    clearError
  } = useCommunity();

  const [filters, setFilters] = useState<PostsListRequest>({
    page: 1,
    limit: 10,
    category: 'all',
    sort: 'latest'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 排序选项
  const sortOptions = [
    { value: 'latest', label: '最新发布' },
    { value: 'popular', label: '最多点赞' },
    { value: 'views', label: '最多浏览' },
    { value: 'comments', label: '最多评论' }
  ];

  // 获取帖子列表
  const loadPosts = useCallback((newFilters?: Partial<PostsListRequest>) => {
    const params = { ...filters, ...newFilters };
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (selectedTags.length > 0) {
      params.tags = selectedTags;
    }
    fetchPosts(params);
  }, [filters, searchTerm, selectedTags, fetchPosts]);

  // 初始加载
  useEffect(() => {
    loadPosts();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    loadPosts({ page: 1 });
  };

  // 处理分类切换
  const handleCategoryChange = (category: string) => {
    const newFilters = { ...filters, category, page: 1 };
    setFilters(newFilters);
    loadPosts(newFilters);
  };

  // 处理排序切换
  const handleSortChange = (sort: string) => {
    const newFilters = { ...filters, sort: sort as 'latest' | 'popular' | 'views' | 'comments', page: 1 };
    setFilters(newFilters);
    loadPosts(newFilters);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadPosts(newFilters);
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理点赞
  const handleLike = async (postId: string) => {
    if (!user) {
      alert('请先登录');
      return;
    }
    try {
      await toggleLikePost(postId);
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  // 处理评论
  const handleComment = (postId: string) => {
    onViewPost?.(postId);
  };

  // 处理分享
  const handleShare = async (postId: string) => {
    try {
      const url = `${window.location.origin}/community/posts/${postId}`;
      if (navigator.share) {
        await navigator.share({
          title: '分享帖子',
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

  // 处理删除
  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 处理下拉刷新
  const handleRefresh = async () => {
    await loadPosts({ page: 1 });
  };

  // 渲染分页
  const renderPagination = () => {
    if (pagination.total <= 1) return null;

    const pages = [];
    const maxPages = 5;
    const startPage = Math.max(1, pagination.current - Math.floor(maxPages / 2));
    const endPage = Math.min(pagination.total, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 text-sm rounded ${
            i === pagination.current
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => handlePageChange(pagination.current - 1)}
          disabled={pagination.current === 1}
          className="px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        
        {pages}
        
        <button
          onClick={() => handlePageChange(pagination.current + 1)}
          disabled={pagination.current === pagination.total}
          className="px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* 头部操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索帖子..."
                className="w-full pl-10 pr-16 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 touch:text-base"
              />
              <Search size={20} className="absolute left-3 top-3.5 text-gray-400" />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2 px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 active:bg-orange-800"
              >
                搜索
              </button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <TouchButton
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'outline'}
              size="md"
              icon={Filter}
            >
              <span className="hidden xs:inline">筛选</span>
            </TouchButton>

            <TouchButton
              onClick={() => loadPosts({ page: 1 })}
              disabled={loading}
              variant="outline"
              size="md"
              icon={RefreshCw}
              loading={loading}
            >
              <span className="hidden xs:inline">刷新</span>
            </TouchButton>

            {user && onCreatePost && (
              <TouchButton
                onClick={onCreatePost}
                variant="primary"
                size="md"
                icon={Plus}
              >
                <span className="hidden xs:inline">发布帖子</span>
                <span className="xs:hidden">发布</span>
              </TouchButton>
            )}
          </div>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 分类筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryChange(category.name)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        filters.category === category.name
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {category.label} ({category.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* 排序选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  排序方式
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 帖子列表 */}
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          <div className="space-y-4">
            {loading && posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">加载中...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">暂无帖子</p>
                {user && onCreatePost && (
                  <TouchButton
                    onClick={onCreatePost}
                    variant="primary"
                    icon={Plus}
                  >
                    发布第一个帖子
                  </TouchButton>
                )}
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                  onEdit={onEditPost}
                  onDelete={handleDelete}
                  onClick={onViewPost}
                />
              ))
            )}
          </div>
        </PullToRefresh>
      ) : (
        <div className="space-y-4">
          {loading && posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">暂无帖子</p>
              {user && onCreatePost && (
                <TouchButton
                  onClick={onCreatePost}
                  variant="primary"
                  icon={Plus}
                >
                  发布第一个帖子
                </TouchButton>
              )}
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
                onEdit={onEditPost}
                onDelete={handleDelete}
                onClick={onViewPost}
              />
            ))
          )}
        </div>
      )}

      {/* 分页 */}
      {renderPagination()}

      {/* 加载更多指示器 */}
      {loading && posts.length > 0 && (
        <div className="text-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      )}
    </div>
  );
};