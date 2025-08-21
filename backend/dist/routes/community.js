"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const cache_1 = require("../middleware/cache");
const communityController_1 = require("../controllers/communityController");
const router = (0, express_1.Router)();
// 帖子相关路由
router.get('/posts', (0, cache_1.cacheMiddleware)(cache_1.CacheConfigs.communityPosts), communityController_1.getPosts); // 获取帖子列表
router.get('/posts/:id', (0, cache_1.cacheMiddleware)({
    ttl: 300,
    keyGenerator: (req) => `community:post:${req.params.id}`
}), communityController_1.getPost); // 获取单个帖子详情
router.post('/posts', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.createPost); // 创建新帖子
router.put('/posts/:id', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.updatePost); // 更新帖子
router.delete('/posts/:id', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.deletePost); // 删除帖子
router.post('/posts/:id/like', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.toggleLikePost); // 点赞/取消点赞帖子
// 评论相关路由
router.get('/posts/:id/comments', (0, cache_1.cacheMiddleware)({
    ttl: 180,
    keyGenerator: (req) => `community:post:${req.params.id}:comments`
}), communityController_1.getComments); // 获取帖子评论
router.post('/posts/:id/comments', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.createComment); // 创建评论
router.post('/comments/:commentId/like', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.toggleLikeComment); // 点赞/取消点赞评论
router.delete('/comments/:commentId', auth_1.authenticateToken, (0, cache_1.invalidateCacheMiddleware)(['community:*']), communityController_1.deleteComment); // 删除评论
exports.default = router;
//# sourceMappingURL=community.js.map