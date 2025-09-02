import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getUsers,
  activateUser,
  deactivateUser,
  verifyUser,
  unverifyUser,
  promoteUser,
  demoteUser,
  getSystemStats,
  getPosts,
  getComments,
  moderatePost,
  moderateComment
} from '../controllers/adminController';

const router = express.Router();

// 所有管理员路由都需要管理员权限
router.use(authenticateToken);
router.use(requireRole(['admin']));

// 用户管理
router.get('/users', getUsers);
router.post('/users/:userId/activate', activateUser);
router.post('/users/:userId/deactivate', deactivateUser);
router.post('/users/:userId/verify', verifyUser);
router.post('/users/:userId/unverify', unverifyUser);
router.post('/users/:userId/promote', promoteUser);
router.post('/users/:userId/demote', demoteUser);

// 系统统计
router.get('/stats', getSystemStats);

// 内容管理
router.get('/posts', getPosts);
router.get('/comments', getComments);
router.post('/posts/:postId/:action', moderatePost);
router.post('/comments/:commentId/:action', moderateComment);

export default router;