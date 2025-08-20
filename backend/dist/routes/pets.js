"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const petController_1 = require("../controllers/petController");
const router = (0, express_1.Router)();
// 所有宠物路由都需要认证
router.use(auth_1.authenticateToken);
// 获取用户的宠物列表
router.get('/', petController_1.getPets);
// 添加新宠物
router.post('/', petController_1.createPet);
// 获取特定宠物信息
router.get('/:id', petController_1.getPetById);
// 更新宠物信息
router.put('/:id', petController_1.updatePet);
// 删除宠物
router.delete('/:id', petController_1.deletePet);
exports.default = router;
//# sourceMappingURL=pets.js.map