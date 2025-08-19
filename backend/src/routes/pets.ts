import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
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
router.get('/', getPets);

// 添加新宠物
router.post('/', createPet);

// 获取特定宠物信息
router.get('/:id', getPetById);

// 更新宠物信息
router.put('/:id', updatePet);

// 删除宠物
router.delete('/:id', deletePet);

export default router;