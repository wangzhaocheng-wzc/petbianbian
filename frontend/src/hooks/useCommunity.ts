import { useState, useEffect, useCallback } from 'react';
import { communityService } from '../services/communityService';
import {
  CommunityPost,
  Comment,
  CreatePostRequest,
  UpdatePostRequest,
  PostsListRequest,
  CreateCommentRequest
} from '../../../shared/types';

export const useCommunity = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pageSize: 10,
    totalItems: 0
  });
  const [categories, setCategories] = useState<Array<{
    name: string;
    label: string;
    count: number;
  }>>([]);

  // 获取帖子列表
  const fetchPosts = useCallback(async (params: PostsListRequest = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.getPosts(params);
      if (response.success && response.data) {
        setPosts(response.data.posts);
        setPagination(response.data.pagination);
        setCategories(response.data.categories);
      } else {
        setError(response.message || '获取帖子列表失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '获取帖子列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建帖子
  const createPost = useCallback(async (data: CreatePostRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.createPost(data);
      if (response.success && response.data) {
        // 将新帖子添加到列表顶部
        setPosts(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        throw new Error(response.message || '创建帖子失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '创建帖子失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新帖子
  const updatePost = useCallback(async (id: string, data: UpdatePostRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.updatePost(id, data);
      if (response.success && response.data) {
        // 更新列表中的帖子
        setPosts(prev => prev.map(post => 
          post.id === id ? response.data! : post
        ));
        return response.data;
      } else {
        throw new Error(response.message || '更新帖子失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '更新帖子失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除帖子
  const deletePost = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.deletePost(id);
      if (response.success) {
        // 从列表中移除帖子
        setPosts(prev => prev.filter(post => post.id !== id));
        return true;
      } else {
        throw new Error(response.message || '删除帖子失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '删除帖子失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 点赞帖子
  const toggleLikePost = useCallback(async (id: string) => {
    try {
      const response = await communityService.toggleLikePost(id);
      if (response.success && response.data) {
        // 更新帖子的点赞状态
        setPosts(prev => prev.map(post => {
          if (post.id === id) {
            return {
              ...post,
              likesCount: response.data!.likesCount,
              interactions: {
                ...post.interactions,
                likes: response.data!.isLiked 
                  ? [...post.interactions.likes, 'current-user'] // 简化处理
                  : post.interactions.likes.filter(userId => userId !== 'current-user')
              }
            };
          }
          return post;
        }));
        return response.data;
      } else {
        throw new Error(response.message || '点赞操作失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '点赞操作失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    posts,
    loading,
    error,
    pagination,
    categories,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    toggleLikePost,
    clearError: () => setError(null)
  };
};

export const usePost = (postId?: string) => {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentsPagination, setCommentsPagination] = useState({
    current: 1,
    total: 0,
    pageSize: 20,
    totalItems: 0
  });

  // 获取帖子详情
  const fetchPost = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.getPost(id);
      if (response.success && response.data) {
        setPost(response.data);
      } else {
        setError(response.message || '获取帖子详情失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '获取帖子详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取评论列表
  const fetchComments = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.getComments(id, page);
      if (response.success && response.data) {
        if (page === 1) {
          setComments(response.data.comments);
        } else {
          setComments(prev => [...prev, ...response.data!.comments]);
        }
        setCommentsPagination(response.data.pagination);
      } else {
        setError(response.message || '获取评论失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '获取评论失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建评论
  const createComment = useCallback(async (postId: string, data: CreateCommentRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityService.createComment(postId, data);
      if (response.success && response.data) {
        // 将新评论添加到列表
        setComments(prev => [...prev, response.data!]);
        return response.data;
      } else {
        throw new Error(response.message || '发布评论失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '发布评论失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 点赞评论
  const toggleLikeComment = useCallback(async (commentId: string) => {
    try {
      const response = await communityService.toggleLikeComment(commentId);
      if (response.success && response.data) {
        // 更新评论的点赞状态
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likesCount: response.data!.likesCount,
              likes: response.data!.isLiked 
                ? [...comment.likes, 'current-user'] // 简化处理
                : comment.likes.filter(userId => userId !== 'current-user')
            };
          }
          return comment;
        }));
        return response.data;
      } else {
        throw new Error(response.message || '点赞操作失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '点赞操作失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // 初始化时获取帖子详情
  useEffect(() => {
    if (postId) {
      fetchPost(postId);
      fetchComments(postId);
    }
  }, [postId, fetchPost, fetchComments]);

  return {
    post,
    comments,
    loading,
    error,
    commentsPagination,
    fetchPost,
    fetchComments,
    createComment,
    toggleLikeComment,
    clearError: () => setError(null)
  };
};