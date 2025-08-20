import { Router } from 'express';
import { authenticateToken as auth } from '../middleware/auth';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  getComments,
  createComment,
  toggleLikeComment,
  deleteComment
} from '../controllers/communityController';

const router = Router();

// 帖子相关路由
router.get('/posts', getPosts);                    // 获取帖子列表
router.get('/posts/:id', getPost);                 // 获取单个帖子详情
router.post('/posts', auth, createPost);           // 创建新帖子
router.put('/posts/:id', auth, updatePost);        // 更新帖子
router.delete('/posts/:id', auth, deletePost);     // 删除帖子
router.post('/posts/:id/like', auth, toggleLikePost); // 点赞/取消点赞帖子

// 评论相关路由
router.get('/posts/:id/comments', getComments);    // 获取帖子评论
router.post('/posts/:id/comments', auth, createComment); // 创建评论
router.post('/comments/:commentId/like', auth, toggleLikeComment); // 点赞/取消点赞评论
router.delete('/comments/:commentId', auth, deleteComment); // 删除评论

export default router;