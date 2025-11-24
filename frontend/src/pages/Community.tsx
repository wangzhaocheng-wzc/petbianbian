import React, { useState } from 'react';
import { PostList } from '../components/PostList';
import { PostEditor } from '../components/PostEditor';
import { PostDetail } from '../components/PostDetail';
import { PostPreview } from '../components/PostPreview';
import { usePets } from '../hooks/usePets';
import { useCommunity } from '../hooks/useCommunity';
import { useAuth } from '../hooks/useAuth';
import { CommunityPost, CreatePostRequest, UpdatePostRequest } from '../../../shared/types';
import { useI18n } from '../i18n/I18nProvider';

type ViewMode = 'list' | 'create' | 'edit' | 'detail' | 'preview';

const Community: React.FC = () => {
  const { user } = useAuth();
  const { pets } = usePets();
  const { createPost, updatePost } = useCommunity();
  const { t } = useI18n();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CreatePostRequest | UpdatePostRequest | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // 处理创建帖子
  const handleCreatePost = () => {
    if (!user) {
      alert(t('community.loginRequired'));
      return;
    }
    setSelectedPost(null);
    setViewMode('create');
  };

  // 处理编辑帖子
  const handleEditPost = (post: CommunityPost) => {
    setSelectedPost(post);
    setViewMode('edit');
  };

  // 处理查看帖子详情
  const handleViewPost = (postId: string) => {
    setSelectedPostId(postId);
    setViewMode('detail');
  };

  // 处理保存帖子
  const handleSavePost = async (data: CreatePostRequest | UpdatePostRequest) => {
    setIsPublishing(true);
    try {
      if (selectedPost) {
        // 更新帖子
        await updatePost(selectedPost.id, data as UpdatePostRequest);
      } else {
        // 创建新帖子
        await createPost(data as CreatePostRequest);
      }
      setViewMode('list');
      setSelectedPost(null);
      setPreviewData(null);
    } catch (error) {
      // 错误已在hook中处理
      throw error;
    } finally {
      setIsPublishing(false);
    }
  };

  // 处理取消操作
  const handleCancel = () => {
    setViewMode('list');
    setSelectedPost(null);
    setSelectedPostId(null);
    setPreviewData(null);
  };

  // 处理预览
  const handlePreview = (data: CreatePostRequest | UpdatePostRequest) => {
    setPreviewData(data);
    setViewMode('preview');
  };

  // 处理从预览返回编辑
  const handleBackToEdit = () => {
    setViewMode(selectedPost ? 'edit' : 'create');
  };

  // 处理从预览直接发布
  const handlePublishFromPreview = async () => {
    if (previewData) {
      await handleSavePost(previewData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('community.title')}
          </h1>
          <p className="text-gray-600">
            {t('community.subtitle')}
          </p>
        </div>

        {/* 内容区域 */}
        {viewMode === 'list' && (
          <PostList
            onCreatePost={handleCreatePost}
            onEditPost={handleEditPost}
            onViewPost={handleViewPost}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="max-w-4xl mx-auto">
            <PostEditor
              post={selectedPost || undefined}
              pets={pets}
              onSave={handleSavePost}
              onCancel={handleCancel}
              onPreview={handlePreview}
            />
          </div>
        )}

        {viewMode === 'detail' && selectedPostId && (
          <div className="max-w-4xl mx-auto">
            <PostDetail
              postId={selectedPostId}
              onBack={handleCancel}
            />
          </div>
        )}

        {viewMode === 'preview' && previewData && (
          <PostPreview
            data={previewData}
            onClose={handleCancel}
            onEdit={handleBackToEdit}
            onPublish={handlePublishFromPreview}
            isPublishing={isPublishing}
          />
        )}
      </div>
    </div>
  );
};

export default Community;