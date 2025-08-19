import { Router } from 'express';

const router = Router();

// 获取用户信息
router.get('/profile', (req, res) => {
  // TODO: 实现获取用户信息逻辑
  res.json({ message: '获取用户信息功能待实现' });
});

// 更新用户信息
router.put('/profile', (req, res) => {
  // TODO: 实现更新用户信息逻辑
  res.json({ message: '更新用户信息功能待实现' });
});

// 上传用户头像
router.post('/avatar', (req, res) => {
  // TODO: 实现头像上传逻辑
  res.json({ message: '头像上传功能待实现' });
});

export default router;