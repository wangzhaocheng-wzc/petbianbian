import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import cacheService from '../services/cacheService';

const router = Router();

// 所有缓存管理路由都需要认证
router.use(authenticateToken);

// 获取缓存统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      message: '获取缓存统计成功',
      data: stats
    });
  } catch (error) {
    console.error('获取缓存统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存统计失败'
    });
  }
});

// 清除特定缓存
router.delete('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await cacheService.del(key);
    
    res.json({
      success: true,
      message: result ? '缓存删除成功' : '缓存不存在',
      data: { deleted: result }
    });
  } catch (error) {
    console.error('删除缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '删除缓存失败'
    });
  }
});

// 清除匹配模式的缓存
router.delete('/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const count = await cacheService.delPattern(pattern);
    
    res.json({
      success: true,
      message: `清除了 ${count} 个缓存项`,
      data: { deletedCount: count }
    });
  } catch (error) {
    console.error('清除缓存模式错误:', error);
    res.status(500).json({
      success: false,
      message: '清除缓存失败'
    });
  }
});

// 清除所有缓存
router.delete('/all', async (req, res) => {
  try {
    const result = await cacheService.clear();
    
    res.json({
      success: true,
      message: result ? '所有缓存已清除' : '清除缓存失败',
      data: { cleared: result }
    });
  } catch (error) {
    console.error('清除所有缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '清除所有缓存失败'
    });
  }
});

// 检查缓存键是否存在
router.get('/exists/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const exists = await cacheService.exists(key);
    
    res.json({
      success: true,
      message: '检查缓存成功',
      data: { exists }
    });
  } catch (error) {
    console.error('检查缓存错误:', error);
    res.status(500).json({
      success: false,
      message: '检查缓存失败'
    });
  }
});

// 设置缓存过期时间
router.put('/expire/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { ttl } = req.body;
    
    if (!ttl || typeof ttl !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'TTL必须是一个数字'
      });
    }
    
    const result = await cacheService.expire(key, ttl);
    
    res.json({
      success: true,
      message: result ? '设置过期时间成功' : '缓存键不存在',
      data: { updated: result }
    });
  } catch (error) {
    console.error('设置缓存过期时间错误:', error);
    res.status(500).json({
      success: false,
      message: '设置过期时间失败'
    });
  }
});

export default router;