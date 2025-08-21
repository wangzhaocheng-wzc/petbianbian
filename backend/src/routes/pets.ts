import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { cacheMiddleware, invalidateCacheMiddleware, CacheConfigs, InvalidationPatterns } from '../middleware/cache';
import {
  getPets,
  getPetById,
  createPet,
  updatePet,
  deletePet
} from '../controllers/petController';

const router = Router();

// 所有宠物路由都需要认证
router.use(authenticateToken);

// 获取用户的宠物列表
router.get('/', cacheMiddleware(CacheConfigs.petData), getPets);

// 添加新宠物
router.post('/', 
  invalidateCacheMiddleware(['user:*:pets']), 
  createPet
);

// 获取特定宠物信息
router.get('/:id', cacheMiddleware(CacheConfigs.petData), getPetById);

// 更新宠物信息
router.put('/:id', 
  invalidateCacheMiddleware(['pet:*', 'user:*:pets']), 
  updatePet
);

// 删除宠物
router.delete('/:id', 
  invalidateCacheMiddleware(['pet:*', 'user:*:pets', 'poop:*', 'stats:*']), 
  deletePet
);

export default router;