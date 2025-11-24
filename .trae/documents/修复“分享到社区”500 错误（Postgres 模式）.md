## 问题定位
- 分享接口 `POST /api/analysis/record/:id/share` 先调用了 Mongo 的 `AnalysisService.shareAnalysisRecord(id, userId, ...)`，当主库为 Postgres 时，`id` 是 UUID 而不是 Mongo ObjectId，导致 Mongoose 在 `findOneAndUpdate({_id: id})` 上抛出 Cast 错误，整个接口进入 `catch` 返回 500。

## 修复方案
- 在 `backend/src/controllers/analysisController.ts` 的 `shareAnalysisRecord` 中按主库分支处理：
  - Postgres 分支：
    - 跳过 Mongo 更新，直接从 `poop_records` 读取分析记录（字段：`user_id, pet_id, image_url, health_status, confidence, details` 等）。
    - 创建 `community_posts` 一条新帖子，`category='health'`，`status='published'`，内容包含分析详情、健康状态与置信度；如有 `image_url` 则插入 `post_images`。
    - 返回 `{ success: true, data: { communityPostId } }`。
  - Mongo 分支：
    - 保持原更新逻辑（将 `PoopRecord` 标记为已分享），并基于该记录创建 `CommunityPost`（标题、内容、images），返回 `{ communityPostId }`。
- 额外健壮性：
  - 当 Postgres 查询不到记录时返回 404，不再继续。
  - 去除或包裹 Mongo 更新调用避免在 Postgres 模式下触发 ObjectId 转换错误。

## 前端配合
- 保持现有 `AnalysisService.shareToCommunity(record.id)` 调用不变。
- 成功响应后（含 `communityPostId`）可选择在按钮回调中导航到社区详情页，以提升体验。

## 验证步骤
- 用 curl 发送：
  - `curl -X POST http://localhost:5050/api/analysis/record/<postgres记录UUID>/share -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' -d '{"shareType":"public"}'` 应返回 200，并包含 `communityPostId`。
- 前端点击“分享到社区”，在社区列表 `GET /api/community/posts` 能看到新帖子；如需要，使用返回的 `communityPostId` 跳转详情。

## 交付
- 更新后的控制器逻辑（仅在服务器端改动），避免 500 并完成分享发帖；保留原有的 Mongo 兼容路径。