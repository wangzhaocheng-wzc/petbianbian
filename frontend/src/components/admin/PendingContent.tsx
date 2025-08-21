import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, MessageSquare, FileText, Clock, User } from 'lucide-react';
import moderationService, { PendingContent as PendingContentType } from '../../services/moderationService';

interface Props {
  onUpdate: () => void;
}

const PendingContent: React.FC<Props> = ({ onUpdate }) => {
  const [content, setContent] = useState<PendingContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingContent();
  }, []);

  const loadPendingContent = async () => {
    try {
      setLoading(true);
      const data = await moderationService.getPendingContent();
      setContent(data);
    } catch (error) {
      console.error('Failed to load pending content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (
    type: 'post' | 'comment',
    id: string,
    decision: 'approve' | 'reject',
    notes?: string
  ) => {
    try {
      setProcessing(true);
      await moderationService.moderateDecision({ type, id, decision, notes });
      await loadPendingContent();
      onUpdate();
    } catch (error) {
      console.error('Failed to make moderation decision:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchDecision = async (decision: 'approve' | 'reject') => {
    if (selectedItems.size === 0) return;

    try {
      setProcessing(true);
      const items = Array.from(selectedItems).map(item => {
        const [type, id] = item.split(':');
        return { type: type as 'post' | 'comment', id, decision };
      });

      await moderationService.batchModerate(items);
      setSelectedItems(new Set());
      await loadPendingContent();
      onUpdate();
    } catch (error) {
      console.error('Failed to batch moderate:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelection = (type: string, id: string) => {
    const key = `${type}:${id}`;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!content) {
    return <div>加载失败</div>;
  }

  const totalPending = content.posts.length + content.comments.length;

  return (
    <div className="space-y-6">
      {/* 批量操作 */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              已选择 {selectedItems.size} 项内容
            </span>
            <div className="space-x-2">
              <button
                onClick={() => handleBatchDecision('approve')}
                disabled={processing}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                批量通过
              </button>
              <button
                onClick={() => handleBatchDecision('reject')}
                disabled={processing}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                批量拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      {totalPending === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">没有待审核内容</h3>
          <p className="mt-1 text-sm text-gray-500">所有内容都已审核完毕</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 待审核帖子 */}
          {content.posts.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                待审核帖子 ({content.posts.length})
              </h3>
              <div className="space-y-4">
                {content.posts.map((post) => (
                  <div key={post._id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`post:${post._id}`)}
                          onChange={() => toggleSelection('post', post._id)}
                          className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {post.userId?.username || '未知用户'}
                            </span>
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {formatDate(post.createdAt)}
                            </span>
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            {post.title}
                          </h4>
                          <p className="text-gray-700 mb-3 line-clamp-3">
                            {post.content}
                          </p>
                          {post.images && post.images.length > 0 && (
                            <div className="flex space-x-2 mb-3">
                              {post.images.slice(0, 3).map((image: string, index: number) => (
                                <img
                                  key={index}
                                  src={image}
                                  alt=""
                                  className="h-16 w-16 object-cover rounded"
                                />
                              ))}
                              {post.images.length > 3 && (
                                <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                                  +{post.images.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              {post.interactions?.views || 0}
                            </span>
                            <span className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {post.comments?.length || 0}
                            </span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              {post.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleDecision('post', post._id, 'approve')}
                          disabled={processing}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          通过
                        </button>
                        <button
                          onClick={() => handleDecision('post', post._id, 'reject')}
                          disabled={processing}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 待审核评论 */}
          {content.comments.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                待审核评论 ({content.comments.length})
              </h3>
              <div className="space-y-4">
                {content.comments.map((comment) => (
                  <div key={comment._id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`comment:${comment._id}`)}
                          onChange={() => toggleSelection('comment', comment._id)}
                          className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {comment.userId?.username || '未知用户'}
                            </span>
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">
                            {comment.content}
                          </p>
                          {comment.postId && (
                            <div className="text-sm text-gray-500">
                              回复帖子: {comment.postId.title || '未知帖子'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleDecision('comment', comment._id, 'approve')}
                          disabled={processing}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          通过
                        </button>
                        <button
                          onClick={() => handleDecision('comment', comment._id, 'reject')}
                          disabled={processing}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingContent;