"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.toggleLikeComment = exports.createComment = exports.getComments = exports.toggleLikePost = exports.deletePost = exports.updatePost = exports.createPost = exports.getPost = exports.getPosts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const Comment_1 = __importDefault(require("../models/Comment"));
const moderationService_1 = __importDefault(require("../services/moderationService"));
const postgres_1 = require("../config/postgres");
const moderationService = new moderationService_1.default();
// 兼容 Postgres UUID 与 Mongo ObjectId 的解析函数
async function resolveMongoObjectId(id, entity) {
    // 若本身是合法的ObjectId，直接使用
    if (mongoose_1.default.Types.ObjectId.isValid(id)) {
        return new mongoose_1.default.Types.ObjectId(id);
    }
    // 尝试通过 Postgres external_id 建立映射
    const table = entity === 'user' ? 'users' : 'pets';
    try {
        const pool = await (0, postgres_1.getPostgresPool)();
        const { rows } = await pool.query(`SELECT external_id FROM ${table} WHERE id = $1 LIMIT 1`, [String(id)]);
        const externalId = rows[0]?.external_id;
        if (externalId && mongoose_1.default.Types.ObjectId.isValid(externalId)) {
            return new mongoose_1.default.Types.ObjectId(externalId);
        }
        throw new Error(`无法通过Postgres映射${entity}ID: ${id}`);
    }
    catch (err) {
        throw err;
    }
}
// 获取帖子列表
const getPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, tags, search, sort = 'latest' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 构建筛选条件
            const whereClauses = ["p.status = 'published'", "p.moderation_status = 'approved'"];
            const params = [];
            let paramIndex = 1;
            if (category && category !== 'all') {
                whereClauses.push(`p.category = $${paramIndex++}`);
                params.push(category);
            }
            if (search) {
                whereClauses.push(`(p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }
            if (tags && (Array.isArray(tags) ? tags.length : 1)) {
                const tagsArray = Array.isArray(tags) ? tags : [String(tags)];
                whereClauses.push(`EXISTS (
          SELECT 1
          FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          WHERE pt.post_id = p.id AND t.name = ANY($${paramIndex}::text[])
        )`);
                params.push(tagsArray);
                paramIndex++;
            }
            const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
            // 排序
            let orderSql = 'p.is_sticky DESC, p.created_at DESC';
            switch (String(sort)) {
                case 'popular':
                    orderSql = 'COALESCE(likes.likes_count, 0) DESC, p.created_at DESC';
                    break;
                case 'views':
                    orderSql = 'p.views DESC, p.created_at DESC';
                    break;
                case 'comments':
                    orderSql = 'COALESCE(comments.count, 0) DESC, p.created_at DESC';
                    break;
            }
            // 统计总数
            const countSql = `
        SELECT COUNT(*)::int AS total
        FROM community_posts p
        ${whereSql}
      `;
            const countRes = await pool.query(countSql, params);
            const totalItems = countRes.rows[0]?.total || 0;
            // 分类统计（全局）
            const catRes = await pool.query(`
        SELECT p.category::text AS category, COUNT(*)::int AS count
        FROM community_posts p
        WHERE p.status = 'published' AND p.moderation_status = 'approved'
        GROUP BY p.category
      `);
            const categories = [
                { name: 'all', label: '全部', count: totalItems },
                { name: 'health', label: '健康分享', count: 0 },
                { name: 'help', label: '求助问答', count: 0 },
                { name: 'experience', label: '经验分享', count: 0 },
                { name: 'general', label: '日常分享', count: 0 }
            ];
            for (const row of catRes.rows) {
                const c = categories.find(cat => cat.name === row.category);
                if (c)
                    c.count = row.count;
            }
            // 数据查询（带聚合）
            const dataSql = `
        WITH imgs AS (
          SELECT post_id, array_agg(url ORDER BY position) AS images
          FROM post_images
          GROUP BY post_id
        ),
        tag_agg AS (
          SELECT pt.post_id, array_agg(t.name) AS tags
          FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          GROUP BY pt.post_id
        ),
        likes AS (
          SELECT post_id, array_agg(user_id::text) AS likes, COUNT(*)::int AS likes_count
          FROM post_likes
          GROUP BY post_id
        ),
        comments AS (
          SELECT post_id, COUNT(*)::int AS count
          FROM comments
          WHERE is_deleted = false
          GROUP BY post_id
        )
        SELECT
          p.id,
          p.user_id,
          p.pet_id,
          p.title,
          p.content,
          p.status::text AS status,
          p.category::text AS category,
          p.is_anonymous,
          p.views,
          p.shares,
          p.is_sticky,
          p.is_featured,
          p.moderation_status::text AS moderation_status,
          p.created_at,
          p.updated_at,
          COALESCE(imgs.images, ARRAY[]::text[]) AS images,
          COALESCE(tag_agg.tags, ARRAY[]::text[]) AS tags,
          COALESCE(likes.likes, ARRAY[]::text[]) AS likes,
          COALESCE(likes.likes_count, 0) AS likes_count,
          COALESCE(comments.count, 0) AS comments_count,
          u.id AS user_id_for_user,
          u.username AS user_username,
          u.avatar_url AS user_avatar_url,
          up.first_name AS user_first_name,
          up.last_name AS user_last_name,
          us.reputation AS user_reputation,
          pet.id AS pet_id_for_pet,
          pet.name AS pet_name,
          pet.type::text AS pet_type,
          pet.avatar_url AS pet_avatar_url,
          pet.breed AS pet_breed,
          pet.age AS pet_age,
          pet.weight AS pet_weight
        FROM community_posts p
        LEFT JOIN imgs ON imgs.post_id = p.id
        LEFT JOIN tag_agg ON tag_agg.post_id = p.id
        LEFT JOIN likes ON likes.post_id = p.id
        LEFT JOIN comments ON comments.post_id = p.id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_stats us ON us.user_id = u.id
        LEFT JOIN pets pet ON pet.id = p.pet_id
        ${whereSql}
        ORDER BY ${orderSql}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            const dataParams = params.concat([limitNum, offset]);
            const { rows } = await pool.query(dataSql, dataParams);
            // 映射为前端需要的结构
            const posts = rows.map((r) => ({
                id: String(r.id),
                userId: String(r.user_id),
                petId: r.pet_id ? String(r.pet_id) : undefined,
                title: r.title,
                content: r.content,
                images: r.images || [],
                tags: r.tags || [],
                category: r.category,
                status: r.status,
                isAnonymous: r.is_anonymous,
                interactions: {
                    likes: r.likes || [],
                    views: r.views || 0,
                    shares: r.shares || 0
                },
                comments: [],
                isSticky: r.is_sticky,
                isFeatured: r.is_featured,
                moderationStatus: r.moderation_status,
                likesCount: r.likes_count,
                commentsCount: r.comments_count,
                user: r.user_id_for_user ? {
                    id: String(r.user_id_for_user),
                    username: r.user_username,
                    avatar: r.user_avatar_url || undefined,
                    profile: {
                        firstName: r.user_first_name || undefined,
                        lastName: r.user_last_name || undefined
                    },
                    stats: {
                        reputation: r.user_reputation ?? 0
                    }
                } : undefined,
                pet: r.pet_id_for_pet ? {
                    id: String(r.pet_id_for_pet),
                    name: r.pet_name,
                    type: r.pet_type,
                    avatar: r.pet_avatar_url || undefined,
                    breed: r.pet_breed || undefined,
                    age: r.pet_age || undefined,
                    weight: r.pet_weight || undefined
                } : undefined,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));
            return res.json({
                success: true,
                data: {
                    posts,
                    pagination: {
                        current: pageNum,
                        total: Math.ceil(totalItems / limitNum),
                        pageSize: limitNum,
                        totalItems
                    },
                    categories
                }
            });
        }
        // Mongo 实现（回退）
        const skip = (pageNum - 1) * limitNum;
        let query = {
            status: 'published',
            moderationStatus: 'approved'
        };
        if (category && category !== 'all') {
            query.category = category;
        }
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            query.tags = { $in: tagArray };
        }
        let posts;
        let total;
        if (search) {
            query.$text = { $search: search };
            posts = await CommunityPost_1.default.find(query)
                .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .populate('userId', 'username avatar profile.firstName profile.lastName')
                .populate('petId', 'name type avatar breed')
                .lean();
            total = await CommunityPost_1.default.countDocuments(query);
        }
        else {
            let sortOption = { createdAt: -1 };
            switch (sort) {
                case 'popular':
                    sortOption = { 'interactions.likes': -1, createdAt: -1 };
                    break;
                case 'views':
                    sortOption = { 'interactions.views': -1, createdAt: -1 };
                    break;
                case 'comments':
                    sortOption = { comments: -1, createdAt: -1 };
                    break;
                default:
                    sortOption = { isSticky: -1, createdAt: -1 };
            }
            posts = await CommunityPost_1.default.find(query)
                .sort(sortOption)
                .limit(limitNum)
                .skip(skip)
                .populate('userId', 'username avatar profile.firstName profile.lastName')
                .populate('petId', 'name type avatar breed')
                .lean();
            total = await CommunityPost_1.default.countDocuments(query);
        }
        const categoryStats = await CommunityPost_1.default.aggregate([
            { $match: { status: 'published', moderationStatus: 'approved' } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const categories = [
            { name: 'all', label: '全部', count: total },
            { name: 'health', label: '健康分享', count: 0 },
            { name: 'help', label: '求助问答', count: 0 },
            { name: 'experience', label: '经验分享', count: 0 },
            { name: 'general', label: '日常分享', count: 0 }
        ];
        categoryStats.forEach(stat => {
            const category = categories.find(cat => cat.name === stat._id);
            if (category)
                category.count = stat.count;
        });
        return res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    current: pageNum,
                    total: Math.ceil(total / limitNum),
                    pageSize: limitNum,
                    totalItems: total
                },
                categories
            }
        });
    }
    catch (error) {
        console.error('获取帖子列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取帖子列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.getPosts = getPosts;
// 获取单个帖子详情
const getPost = async (req, res) => {
    try {
        const { id } = req.params;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 查询单个帖子详情
            const sql = `
        WITH imgs AS (
          SELECT post_id, array_agg(url ORDER BY position) AS images
          FROM post_images
          GROUP BY post_id
        ),
        tag_agg AS (
          SELECT pt.post_id, array_agg(t.name) AS tags
          FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          GROUP BY pt.post_id
        ),
        likes AS (
          SELECT post_id, array_agg(user_id::text) AS likes, COUNT(*)::int AS likes_count
          FROM post_likes
          GROUP BY post_id
        ),
        comments AS (
          SELECT post_id, COUNT(*)::int AS count
          FROM comments
          WHERE is_deleted = false
          GROUP BY post_id
        )
        SELECT
          p.id,
          p.user_id,
          p.pet_id,
          p.title,
          p.content,
          p.status::text AS status,
          p.category::text AS category,
          p.is_anonymous,
          p.views,
          p.shares,
          p.is_sticky,
          p.is_featured,
          p.moderation_status::text AS moderation_status,
          p.created_at,
          p.updated_at,
          COALESCE(imgs.images, ARRAY[]::text[]) AS images,
          COALESCE(tag_agg.tags, ARRAY[]::text[]) AS tags,
          COALESCE(likes.likes, ARRAY[]::text[]) AS likes,
          COALESCE(likes.likes_count, 0) AS likes_count,
          COALESCE(comments.count, 0) AS comments_count,
          u.id AS user_id_for_user,
          u.username AS user_username,
          u.avatar_url AS user_avatar_url,
          up.first_name AS user_first_name,
          up.last_name AS user_last_name,
          us.reputation AS user_reputation,
          pet.id AS pet_id_for_pet,
          pet.name AS pet_name,
          pet.type::text AS pet_type,
          pet.avatar_url AS pet_avatar_url,
          pet.breed AS pet_breed,
          pet.age AS pet_age,
          pet.weight AS pet_weight
        FROM community_posts p
        LEFT JOIN imgs ON imgs.post_id = p.id
        LEFT JOIN tag_agg ON tag_agg.post_id = p.id
        LEFT JOIN likes ON likes.post_id = p.id
        LEFT JOIN comments ON comments.post_id = p.id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_stats us ON us.user_id = u.id
        LEFT JOIN pets pet ON pet.id = p.pet_id
        WHERE p.id = $1
      `;
            const { rows } = await pool.query(sql, [id]);
            const r = rows[0];
            if (!r) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }
            if (r.status !== 'published' || r.moderation_status !== 'approved') {
                return res.status(403).json({ success: false, message: '帖子不可访问' });
            }
            // 异步增加浏览量
            pool.query('UPDATE community_posts SET views = views + 1 WHERE id = $1', [id]).catch(() => { });
            const post = {
                id: String(r.id),
                userId: String(r.user_id),
                petId: r.pet_id ? String(r.pet_id) : undefined,
                title: r.title,
                content: r.content,
                images: r.images || [],
                tags: r.tags || [],
                category: r.category,
                status: r.status,
                isAnonymous: r.is_anonymous,
                interactions: {
                    likes: r.likes || [],
                    views: r.views || 0,
                    shares: r.shares || 0
                },
                comments: [],
                isSticky: r.is_sticky,
                isFeatured: r.is_featured,
                moderationStatus: r.moderation_status,
                likesCount: r.likes_count,
                commentsCount: r.comments_count,
                user: r.user_id_for_user ? {
                    id: String(r.user_id_for_user),
                    username: r.user_username,
                    avatar: r.user_avatar_url || undefined,
                    profile: {
                        firstName: r.user_first_name || undefined,
                        lastName: r.user_last_name || undefined
                    },
                    stats: {
                        reputation: r.user_reputation ?? 0
                    }
                } : undefined,
                pet: r.pet_id_for_pet ? {
                    id: String(r.pet_id_for_pet),
                    name: r.pet_name,
                    type: r.pet_type,
                    avatar: r.pet_avatar_url || undefined,
                    breed: r.pet_breed || undefined,
                    age: r.pet_age || undefined,
                    weight: r.pet_weight || undefined
                } : undefined,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            };
            return res.json({ success: true, data: post });
        }
        // Mongo 回退逻辑
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的帖子ID'
            });
        }
        const post = await CommunityPost_1.default.findById(id)
            .populate('userId', 'username avatar profile.firstName profile.lastName stats.reputation')
            .populate('petId', 'name type avatar breed age weight')
            .lean();
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '帖子不存在'
            });
        }
        if (post.status !== 'published' || post.moderationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: '帖子不可访问'
            });
        }
        CommunityPost_1.default.findByIdAndUpdate(id, {
            $inc: { 'interactions.views': 1 }
        }).exec();
        res.json({
            success: true,
            data: post
        });
    }
    catch (error) {
        console.error('获取帖子详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取帖子详情失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.getPost = getPost;
// 创建新帖子
const createPost = async (req, res) => {
    try {
        const { title, content, petId, images = [], tags = [], category = 'general', isAnonymous = false } = req.body;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        // 验证必填字段
        if (!title || !content) {
            return res.status(400).json({ success: false, message: '标题和内容不能为空' });
        }
        if (title.length > 200) {
            return res.status(400).json({ success: false, message: '标题长度不能超过200个字符' });
        }
        if (content.length > 10000) {
            return res.status(400).json({ success: false, message: '内容长度不能超过10000个字符' });
        }
        const validCategories = ['health', 'help', 'experience', 'general'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ success: false, message: '无效的分类' });
        }
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 将令牌中的ID映射到 PG 用户ID（优先视为PG id，其次尝试 external_id）
            let ownerIdForPg = null;
            try {
                const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
                if (r1.rows[0]?.id) {
                    ownerIdForPg = r1.rows[0].id;
                }
                else {
                    const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                    if (r2.rows[0]?.id) {
                        ownerIdForPg = r2.rows[0].id;
                    }
                }
            }
            catch (e) {
                console.error('用户ID映射失败:', e);
            }
            if (!ownerIdForPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            // 验证宠物所有权（如果提供）
            let petIdForPg = null;
            if (petId) {
                const petRes = await pool.query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true LIMIT 1', [String(petId), ownerIdForPg]);
                if (!petRes.rows[0]) {
                    return res.status(403).json({ success: false, message: '无权限使用该宠物或宠物不存在' });
                }
                petIdForPg = petRes.rows[0].id;
            }
            // 内容审核（PG模式下使用内置规则；频率检查暂不使用Mongo依赖）
            const moderationResult = await moderationService.analyzeContent({
                content: content.trim(),
                type: 'post',
                // 传入虚拟ObjectId以兼容类型，并通过 metadata.pgUserId 支持 PG 频率检查
                userId: new mongoose_1.default.Types.ObjectId(),
                metadata: { title: title.trim(), pgUserId: ownerIdForPg }
            });
            let moderationStatus = 'approved';
            let status = 'published';
            if (!moderationResult.isAllowed) {
                if (moderationResult.action === 'reject') {
                    return res.status(400).json({ success: false, message: '内容违规，无法发布', details: moderationResult.reasons });
                }
                else if (moderationResult.action === 'require_approval') {
                    moderationStatus = 'pending';
                    status = 'draft';
                }
            }
            else if (moderationResult.action === 'flag') {
                moderationStatus = 'approved';
            }
            // 插入帖子
            const insertPostSql = `
        INSERT INTO community_posts (
          user_id, pet_id, title, content, status, category, is_anonymous,
          views, shares, is_sticky, is_featured, moderation_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          0, 0, false, false, $8
        ) RETURNING id, created_at, updated_at
      `;
            const insertRes = await pool.query(insertPostSql, [ownerIdForPg, petIdForPg, title.trim(), content.trim(), status, category, !!isAnonymous, moderationStatus]);
            const newPostId = insertRes.rows[0].id;
            // 插入图片
            if (Array.isArray(images) && images.length > 0) {
                const values = [];
                const placeholders = [];
                images.forEach((url, idx) => {
                    placeholders.push(`($${values.length + 1}, $${values.length + 2}, $${values.length + 3})`);
                    values.push(newPostId, url, idx);
                });
                await pool.query(`INSERT INTO post_images (post_id, url, position) VALUES ${placeholders.join(',')}`, values);
            }
            // 插入标签（确保存在并关联）
            if (Array.isArray(tags) && tags.length > 0) {
                for (const tag of tags.map((t) => t.trim()).filter(Boolean)) {
                    await pool.query(`
            INSERT INTO tags (name)
            SELECT $1
            WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = $1)
          `, [tag]);
                    const tagIdRes = await pool.query(`SELECT id FROM tags WHERE name = $1 LIMIT 1`, [tag]);
                    const tagId = tagIdRes.rows[0]?.id;
                    if (tagId) {
                        await pool.query(`
              INSERT INTO post_tags (post_id, tag_id)
              SELECT $1, $2
              WHERE NOT EXISTS (SELECT 1 FROM post_tags WHERE post_id = $1 AND tag_id = $2)
            `, [newPostId, tagId]);
                    }
                }
            }
            // 返回完整结构
            const responseSql = `
        WITH imgs AS (
          SELECT post_id, array_agg(url ORDER BY position) AS images
          FROM post_images
          WHERE post_id = $1
          GROUP BY post_id
        ),
        tag_agg AS (
          SELECT pt.post_id, array_agg(t.name) AS tags
          FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          WHERE pt.post_id = $1
          GROUP BY pt.post_id
        )
        SELECT p.id, p.user_id, p.pet_id, p.title, p.content,
               p.status::text AS status, p.category::text AS category, p.is_anonymous,
               p.views, p.shares, p.is_sticky, p.is_featured, p.moderation_status::text AS moderation_status,
               p.created_at, p.updated_at,
               COALESCE(imgs.images, ARRAY[]::text[]) AS images,
               COALESCE(tag_agg.tags, ARRAY[]::text[]) AS tags,
               u.id AS user_id_for_user, u.username AS user_username, u.avatar_url AS user_avatar_url,
               up.first_name AS user_first_name, up.last_name AS user_last_name,
               us.reputation AS user_reputation,
               pet.id AS pet_id_for_pet, pet.name AS pet_name, pet.type::text AS pet_type, pet.avatar_url AS pet_avatar_url, pet.breed AS pet_breed, pet.age AS pet_age, pet.weight AS pet_weight
        FROM community_posts p
        LEFT JOIN imgs ON imgs.post_id = p.id
        LEFT JOIN tag_agg ON tag_agg.post_id = p.id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_stats us ON us.user_id = u.id
        LEFT JOIN pets pet ON pet.id = p.pet_id
        WHERE p.id = $1
      `;
            const respRes = await pool.query(responseSql, [newPostId]);
            const r = respRes.rows[0];
            const created = {
                id: String(r.id),
                userId: String(r.user_id),
                petId: r.pet_id ? String(r.pet_id) : undefined,
                title: r.title,
                content: r.content,
                images: r.images || [],
                tags: r.tags || [],
                category: r.category,
                status: r.status,
                isAnonymous: r.is_anonymous,
                interactions: { likes: [], views: r.views || 0, shares: r.shares || 0 },
                comments: [],
                isSticky: r.is_sticky,
                isFeatured: r.is_featured,
                moderationStatus: r.moderation_status,
                user: r.user_id_for_user ? {
                    id: String(r.user_id_for_user),
                    username: r.user_username,
                    avatar: r.user_avatar_url || undefined,
                    profile: { firstName: r.user_first_name || undefined, lastName: r.user_last_name || undefined },
                    stats: { reputation: r.user_reputation ?? 0 }
                } : undefined,
                pet: r.pet_id_for_pet ? {
                    id: String(r.pet_id_for_pet), name: r.pet_name, type: r.pet_type,
                    avatar: r.pet_avatar_url || undefined, breed: r.pet_breed || undefined, age: r.pet_age || undefined, weight: r.pet_weight || undefined
                } : undefined,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            };
            return res.status(201).json({ success: true, data: created });
        }
        // Mongo 回退：保持原实现
        // 解析用户ID为Mongo ObjectId
        let mongoUserId;
        try {
            mongoUserId = await resolveMongoObjectId(userId, 'user');
        }
        catch (e) {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        // 解析宠物ID（如果提供）为Mongo ObjectId（支持PG UUID→external_id映射）
        let mongoPetId;
        if (petId) {
            try {
                mongoPetId = await resolveMongoObjectId(String(petId), 'pet');
            }
            catch (e) {
                return res.status(400).json({ success: false, message: '无效的宠物ID或未建立映射' });
            }
        }
        // 内容审核
        const moderationResult = await moderationService.analyzeContent({
            content: content.trim(),
            type: 'post',
            userId: mongoUserId,
            metadata: { title: title.trim() }
        });
        // 根据审核结果决定状态
        let moderationStatus = 'approved';
        let status = 'published';
        if (!moderationResult.isAllowed) {
            if (moderationResult.action === 'reject') {
                return res.status(400).json({
                    success: false,
                    message: '内容违规，无法发布',
                    details: moderationResult.reasons
                });
            }
            else if (moderationResult.action === 'require_approval') {
                moderationStatus = 'pending';
                status = 'draft';
            }
        }
        else if (moderationResult.action === 'flag') {
            // 内容可以发布但需要标记
            moderationStatus = 'approved';
        }
        const postData = {
            userId: mongoUserId,
            title: title.trim(),
            content: content.trim(),
            images: Array.isArray(images) ? images : [],
            tags: Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [],
            category,
            status,
            isAnonymous: Boolean(isAnonymous), // 是否匿名发布
            interactions: {
                likes: [],
                views: 0,
                shares: 0
            },
            comments: [],
            isSticky: false,
            isFeatured: false,
            moderationStatus
        };
        if (mongoPetId) {
            postData.petId = mongoPetId;
        }
        const post = new CommunityPost_1.default(postData);
        await post.save();
        // 填充用户和宠物信息
        await post.populate('userId', 'username avatar profile.firstName profile.lastName');
        if (petId) {
            await post.populate('petId', 'name type avatar breed');
        }
        res.status(201).json({
            success: true,
            data: post,
            message: '帖子发布成功'
        });
    }
    catch (error) {
        console.error('创建帖子失败:', error);
        res.status(500).json({
            success: false,
            message: '创建帖子失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.createPost = createPost;
// 更新帖子
const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, images, tags, category, isAnonymous } = req.body;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 校验帖子存在并验证权限
            const postRes = await pool.query('SELECT id, user_id FROM community_posts WHERE id = $1 LIMIT 1', [id]);
            const postRow = postRes.rows[0];
            if (!postRow) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }
            // 用户ID映射到 PG
            let userIdPg = null;
            try {
                const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
                if (r1.rows[0]?.id) {
                    userIdPg = r1.rows[0].id;
                }
                else {
                    const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                    if (r2.rows[0]?.id)
                        userIdPg = r2.rows[0].id;
                }
            }
            catch (e) {
                console.error('用户ID映射失败:', e);
            }
            if (!userIdPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            if (String(postRow.user_id) !== String(userIdPg)) {
                return res.status(403).json({ success: false, message: '无权限修改此帖子' });
            }
            // 字段校验
            if (title !== undefined && !String(title).trim()) {
                return res.status(400).json({ success: false, message: '标题不能为空' });
            }
            if (content !== undefined && !String(content).trim()) {
                return res.status(400).json({ success: false, message: '内容不能为空' });
            }
            if (category !== undefined) {
                const validCategories = ['health', 'help', 'experience', 'general'];
                if (!validCategories.includes(category)) {
                    return res.status(400).json({ success: false, message: '无效的分类' });
                }
            }
            // 事务更新：基础字段 + 图片 + 标签
            await pool.query('BEGIN');
            try {
                const sets = [];
                const values = [];
                let idx = 1;
                if (title !== undefined) {
                    sets.push(`title = $${idx}`);
                    values.push(String(title).trim());
                    idx++;
                }
                if (content !== undefined) {
                    sets.push(`content = $${idx}`);
                    values.push(String(content).trim());
                    idx++;
                }
                if (category !== undefined) {
                    sets.push(`category = $${idx}`);
                    values.push(category);
                    idx++;
                }
                if (isAnonymous !== undefined) {
                    sets.push(`is_anonymous = $${idx}`);
                    values.push(Boolean(isAnonymous));
                    idx++;
                }
                if (sets.length > 0) {
                    const sql = `UPDATE community_posts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`;
                    values.push(id);
                    await pool.query(sql, values);
                }
                if (images !== undefined) {
                    await pool.query('DELETE FROM post_images WHERE post_id = $1', [id]);
                    const arr = Array.isArray(images) ? images : [];
                    if (arr.length > 0) {
                        const vals = [];
                        const placeholders = [];
                        arr.forEach((url, i) => {
                            placeholders.push(`($${vals.length + 1}, $${vals.length + 2}, $${vals.length + 3})`);
                            vals.push(id, url, i);
                        });
                        await pool.query(`INSERT INTO post_images (post_id, url, position) VALUES ${placeholders.join(',')}`, vals);
                    }
                }
                if (tags !== undefined) {
                    await pool.query('DELETE FROM post_tags WHERE post_id = $1', [id]);
                    const tagArr = Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [];
                    for (const tag of tagArr) {
                        await pool.query(`INSERT INTO tags (name) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name = $1)`, [tag]);
                        const tagIdRes = await pool.query('SELECT id FROM tags WHERE name = $1 LIMIT 1', [tag]);
                        const tagId = tagIdRes.rows[0]?.id;
                        if (tagId) {
                            await pool.query(`INSERT INTO post_tags (post_id, tag_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM post_tags WHERE post_id = $1 AND tag_id = $2)`, [id, tagId]);
                        }
                    }
                }
                await pool.query('COMMIT');
            }
            catch (e) {
                await pool.query('ROLLBACK');
                throw e;
            }
            // 返回更新后的完整结构
            const sql = `
        WITH imgs AS (
          SELECT post_id, array_agg(url ORDER BY position) AS images FROM post_images WHERE post_id = $1 GROUP BY post_id
        ),
        tag_agg AS (
          SELECT pt.post_id, array_agg(t.name) AS tags FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = $1 GROUP BY pt.post_id
        ),
        likes AS (
          SELECT post_id, array_agg(user_id::text) AS likes, COUNT(*)::int AS likes_count FROM post_likes WHERE post_id = $1 GROUP BY post_id
        ),
        comments AS (
          SELECT post_id, COUNT(*)::int AS count FROM comments WHERE post_id = $1 AND is_deleted = false GROUP BY post_id
        )
        SELECT p.id, p.user_id, p.pet_id, p.title, p.content,
               p.status::text AS status, p.category::text AS category, p.is_anonymous,
               p.views, p.shares, p.is_sticky, p.is_featured, p.moderation_status::text AS moderation_status,
               p.created_at, p.updated_at,
               COALESCE(imgs.images, ARRAY[]::text[]) AS images,
               COALESCE(tag_agg.tags, ARRAY[]::text[]) AS tags,
               COALESCE(likes.likes, ARRAY[]::text[]) AS likes,
               COALESCE(likes.likes_count, 0) AS likes_count,
               COALESCE(comments.count, 0) AS comments_count,
               u.id AS user_id_for_user, u.username AS user_username, u.avatar_url AS user_avatar_url,
               up.first_name AS user_first_name, up.last_name AS user_last_name,
               us.reputation AS user_reputation,
               pet.id AS pet_id_for_pet, pet.name AS pet_name, pet.type::text AS pet_type, pet.avatar_url AS pet_avatar_url, pet.breed AS pet_breed, pet.age AS pet_age, pet.weight AS pet_weight
        FROM community_posts p
        LEFT JOIN imgs ON imgs.post_id = p.id
        LEFT JOIN tag_agg ON tag_agg.post_id = p.id
        LEFT JOIN likes ON likes.post_id = p.id
        LEFT JOIN comments ON comments.post_id = p.id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_stats us ON us.user_id = u.id
        LEFT JOIN pets pet ON pet.id = p.pet_id
        WHERE p.id = $1
      `;
            const { rows } = await pool.query(sql, [id]);
            const r = rows[0];
            const updated = {
                id: String(r.id), userId: String(r.user_id), petId: r.pet_id ? String(r.pet_id) : undefined,
                title: r.title, content: r.content, images: r.images || [], tags: r.tags || [],
                category: r.category, status: r.status, isAnonymous: r.is_anonymous,
                interactions: { likes: r.likes || [], views: r.views || 0, shares: r.shares || 0 },
                comments: [], isSticky: r.is_sticky, isFeatured: r.is_featured,
                moderationStatus: r.moderation_status, likesCount: r.likes_count, commentsCount: r.comments_count,
                user: r.user_id_for_user ? { id: String(r.user_id_for_user), username: r.user_username, avatar: r.user_avatar_url || undefined,
                    profile: { firstName: r.user_first_name || undefined, lastName: r.user_last_name || undefined },
                    stats: { reputation: r.user_reputation ?? 0 } } : undefined,
                pet: r.pet_id_for_pet ? { id: String(r.pet_id_for_pet), name: r.pet_name, type: r.pet_type, avatar: r.pet_avatar_url || undefined,
                    breed: r.pet_breed || undefined, age: r.pet_age || undefined, weight: r.pet_weight || undefined } : undefined,
                createdAt: r.created_at, updatedAt: r.updated_at
            };
            return res.json({ success: true, data: updated, message: '帖子更新成功' });
        }
        // Mongo 回退实现
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的帖子ID'
            });
        }
        const post = await CommunityPost_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '帖子不存在'
            });
        }
        let mongoUserId;
        try {
            mongoUserId = await resolveMongoObjectId(userId, 'user');
        }
        catch {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        if (post.userId.toString() !== mongoUserId.toString()) {
            return res.status(403).json({ success: false, message: '无权限修改此帖子' });
        }
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({ success: false, message: '标题不能为空' });
            }
            post.title = title.trim();
        }
        if (content !== undefined) {
            if (!content.trim()) {
                return res.status(400).json({ success: false, message: '内容不能为空' });
            }
            post.content = content.trim();
        }
        if (images !== undefined) {
            post.images = Array.isArray(images) ? images : [];
        }
        if (tags !== undefined) {
            post.tags = Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [];
        }
        if (category !== undefined) {
            const validCategories = ['health', 'help', 'experience', 'general'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ success: false, message: '无效的分类' });
            }
            post.category = category;
        }
        if (isAnonymous !== undefined) {
            post.isAnonymous = Boolean(isAnonymous);
        }
        await post.save();
        await post.populate('userId', 'username avatar profile.firstName profile.lastName');
        await post.populate('petId', 'name type avatar breed');
        res.json({ success: true, data: post, message: '帖子更新成功' });
    }
    catch (error) {
        console.error('更新帖子失败:', error);
        res.status(500).json({
            success: false,
            message: '更新帖子失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.updatePost = updatePost;
// 删除帖子
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        // Postgres 分支
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 校验帖子存在
            const postRes = await pool.query('SELECT id, user_id, status::text AS status FROM community_posts WHERE id = $1 LIMIT 1', [id]);
            const postRow = postRes.rows[0];
            if (!postRow) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }
            // 用户ID映射到 PG（支持 users.id 或 users.external_id）
            let userIdPg = null;
            try {
                const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
                if (r1.rows[0]?.id) {
                    userIdPg = r1.rows[0].id;
                }
                else {
                    const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                    if (r2.rows[0]?.id)
                        userIdPg = r2.rows[0].id;
                }
            }
            catch (e) {
                console.error('用户ID映射失败:', e);
            }
            if (!userIdPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            // 权限校验
            if (String(postRow.user_id) !== String(userIdPg)) {
                return res.status(403).json({ success: false, message: '无权限删除此帖子' });
            }
            // 软删除：设置状态为 archived
            await pool.query('UPDATE community_posts SET status = \u0027archived\u0027 WHERE id = $1', [id]);
            return res.json({ success: true, message: '帖子删除成功' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的帖子ID'
            });
        }
        const post = await CommunityPost_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '帖子不存在'
            });
        }
        // 验证权限（支持UUID→ObjectId 映射）
        let mongoUserId;
        try {
            mongoUserId = await resolveMongoObjectId(userId, 'user');
        }
        catch {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        if (post.userId.toString() !== mongoUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: '无权限删除此帖子'
            });
        }
        // 软删除：将状态改为archived
        post.status = 'archived';
        await post.save();
        res.json({
            success: true,
            message: '帖子删除成功'
        });
    }
    catch (error) {
        console.error('删除帖子失败:', error);
        res.status(500).json({
            success: false,
            message: '删除帖子失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.deletePost = deletePost;
// 点赞/取消点赞帖子
const toggleLikePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 校验帖子存在且可访问
            const postRes = await pool.query(`SELECT status::text AS status, moderation_status::text AS moderation_status FROM community_posts WHERE id = $1 LIMIT 1`, [id]);
            const postRow = postRes.rows[0];
            if (!postRow) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }
            if (postRow.status !== 'published' || postRow.moderation_status !== 'approved') {
                return res.status(403).json({ success: false, message: '帖子不可访问' });
            }
            // 用户ID映射
            let userIdPg = null;
            const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
            if (r1.rows[0]?.id) {
                userIdPg = r1.rows[0].id;
            }
            else {
                const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                if (r2.rows[0]?.id)
                    userIdPg = r2.rows[0].id;
            }
            if (!userIdPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            // 切换点赞
            const exist = await pool.query('SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, userIdPg]);
            let isLiked;
            if (exist.rows[0]) {
                await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, userIdPg]);
                isLiked = false;
            }
            else {
                await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [id, userIdPg]);
                isLiked = true;
            }
            const countRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM post_likes WHERE post_id = $1', [id]);
            const likesCount = countRes.rows[0]?.cnt || 0;
            return res.json({ success: true, data: { isLiked, likesCount }, message: isLiked ? '点赞成功' : '取消点赞成功' });
        }
        // Mongo 回退
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: '无效的帖子ID' });
        }
        const post = await CommunityPost_1.default.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: '帖子不存在' });
        }
        if (post.status !== 'published' || post.moderationStatus !== 'approved') {
            return res.status(403).json({ success: false, message: '帖子不可访问' });
        }
        let userObjectId;
        try {
            userObjectId = await resolveMongoObjectId(userId, 'user');
        }
        catch {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        const likes = post.interactions.likes;
        const userIndex = likes.findIndex((uid) => uid.toString() === userObjectId.toString());
        if (userIndex > -1) {
            likes.splice(userIndex, 1);
        }
        else {
            likes.push(userObjectId);
        }
        await post.save();
        const isLiked = post.interactions.likes.some(uid => uid.toString() === userObjectId.toString());
        res.json({ success: true, data: { isLiked, likesCount: post.interactions.likes.length }, message: isLiked ? '点赞成功' : '取消点赞成功' });
    }
    catch (error) {
        console.error('点赞操作失败:', error);
        res.status(500).json({
            success: false,
            message: '点赞操作失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.toggleLikePost = toggleLikePost;
// 获取帖子评论
const getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const offset = (pageNum - 1) * limitNum;
            // 校验帖子存在且可访问
            const postRes = await pool.query(`SELECT status::text AS status, moderation_status::text AS moderation_status
         FROM community_posts WHERE id = $1 LIMIT 1`, [id]);
            const postRow = postRes.rows[0];
            if (!postRow) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }
            if (postRow.status !== 'published' || postRow.moderation_status !== 'approved') {
                return res.status(403).json({ success: false, message: '帖子不可评论' });
            }
            // 统计总数（顶级评论）
            const countRes = await pool.query(`SELECT COUNT(*)::int AS total
         FROM comments
         WHERE post_id = $1 AND is_deleted = false AND moderation_status = 'approved' AND parent_id IS NULL`, [id]);
            const totalItems = countRes.rows[0]?.total || 0;
            // 顶级评论查询
            const topSql = `
        WITH likes AS (
          SELECT comment_id, array_agg(user_id::text) AS likes, COUNT(*)::int AS likes_count
          FROM comment_likes
          GROUP BY comment_id
        )
        SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.is_deleted,
               c.moderation_status::text AS moderation_status, c.created_at, c.updated_at,
               COALESCE(likes.likes, ARRAY[]::text[]) AS likes,
               COALESCE(likes.likes_count, 0) AS likes_count,
               u.id AS user_id_for_user, u.username AS user_username, u.avatar_url AS user_avatar_url,
               up.first_name AS user_first_name, up.last_name AS user_last_name
        FROM comments c
        LEFT JOIN likes ON likes.comment_id = c.id
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE c.post_id = $1 AND c.is_deleted = false AND c.moderation_status = 'approved' AND c.parent_id IS NULL
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3
      `;
            const topRes = await pool.query(topSql, [id, limitNum, offset]);
            const topRows = topRes.rows;
            const topIds = topRows.map((r) => r.id);
            // 回复查询
            let repliesByParent = {};
            if (topIds.length > 0) {
                const repSql = `
          WITH likes AS (
            SELECT comment_id, array_agg(user_id::text) AS likes, COUNT(*)::int AS likes_count
            FROM comment_likes
            GROUP BY comment_id
          )
          SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.is_deleted,
                 c.moderation_status::text AS moderation_status, c.created_at, c.updated_at,
                 COALESCE(likes.likes, ARRAY[]::text[]) AS likes,
                 COALESCE(likes.likes_count, 0) AS likes_count,
                 u.id AS user_id_for_user, u.username AS user_username, u.avatar_url AS user_avatar_url,
                 up.first_name AS user_first_name, up.last_name AS user_last_name
          FROM comments c
          LEFT JOIN likes ON likes.comment_id = c.id
          LEFT JOIN users u ON u.id = c.user_id
          LEFT JOIN user_profiles up ON up.user_id = u.id
          WHERE c.post_id = $1 AND c.is_deleted = false AND c.moderation_status = 'approved' AND c.parent_id = ANY($2::uuid[])
          ORDER BY c.created_at ASC
        `;
                const repRes = await pool.query(repSql, [id, topIds]);
                for (const r of repRes.rows) {
                    const pid = String(r.parent_id);
                    if (!repliesByParent[pid])
                        repliesByParent[pid] = [];
                    repliesByParent[pid].push({
                        id: String(r.id),
                        postId: String(r.post_id),
                        userId: String(r.user_id),
                        parentId: String(r.parent_id),
                        content: r.content,
                        likes: r.likes || [],
                        likesCount: r.likes_count,
                        isDeleted: r.is_deleted,
                        moderationStatus: r.moderation_status,
                        user: r.user_id_for_user ? {
                            id: String(r.user_id_for_user),
                            username: r.user_username,
                            avatar: r.user_avatar_url || undefined,
                            profile: { firstName: r.user_first_name || undefined, lastName: r.user_last_name || undefined }
                        } : undefined,
                        createdAt: r.created_at,
                        updatedAt: r.updated_at
                    });
                }
            }
            const comments = topRows.map((r) => ({
                id: String(r.id),
                postId: String(r.post_id),
                userId: String(r.user_id),
                content: r.content,
                likes: r.likes || [],
                likesCount: r.likes_count,
                isDeleted: r.is_deleted,
                moderationStatus: r.moderation_status,
                user: r.user_id_for_user ? {
                    id: String(r.user_id_for_user),
                    username: r.user_username,
                    avatar: r.user_avatar_url || undefined,
                    profile: { firstName: r.user_first_name || undefined, lastName: r.user_last_name || undefined }
                } : undefined,
                replies: repliesByParent[String(r.id)] || [],
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));
            return res.json({
                success: true,
                data: {
                    comments,
                    pagination: {
                        current: pageNum,
                        total: Math.ceil(totalItems / limitNum),
                        pageSize: limitNum,
                        totalItems
                    }
                }
            });
        }
        // Mongo 回退逻辑
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的帖子ID'
            });
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const postId = new mongoose_1.default.Types.ObjectId(id);
        const comments = await Comment_1.default.find({
            postId,
            isDeleted: false,
            moderationStatus: 'approved',
            parentId: { $exists: false }
        })
            .sort({ createdAt: 1 })
            .limit(limitNum)
            .skip(skip)
            .populate('userId', 'username avatar')
            .populate({
            path: 'replies',
            match: { isDeleted: false, moderationStatus: 'approved' },
            populate: { path: 'userId', select: 'username avatar' },
            options: { sort: { createdAt: 1 } }
        });
        const total = await Comment_1.default.countDocuments({
            postId,
            isDeleted: false,
            moderationStatus: 'approved',
            parentId: { $exists: false }
        });
        res.json({
            success: true,
            data: {
                comments,
                pagination: {
                    current: pageNum,
                    total: Math.ceil(total / limitNum),
                    pageSize: limitNum,
                    totalItems: total
                }
            }
        });
    }
    catch (error) {
        console.error('获取评论失败:', error);
        res.status(500).json({
            success: false,
            message: '获取评论失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.getComments = getComments;
// 创建评论
const createComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, parentId } = req.body;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 校验帖子存在与可评论
            const postRes = await pool.query(`SELECT status::text AS status, moderation_status::text AS moderation_status FROM community_posts WHERE id = $1 LIMIT 1`, [id]);
            const postRow = postRes.rows[0];
            if (!postRow) {
                return res.status(404).json({ success: false, message: '帖子不存在' });
            }
            if (postRow.status !== 'published' || postRow.moderation_status !== 'approved') {
                return res.status(403).json({ success: false, message: '帖子不可评论' });
            }
            // 基础校验
            if (!content || !content.trim()) {
                return res.status(400).json({ success: false, message: '评论内容不能为空' });
            }
            if (content.length > 2000) {
                return res.status(400).json({ success: false, message: '评论内容不能超过2000个字符' });
            }
            // 父评论校验（如果是回复）
            let parentIdPg = null;
            if (parentId) {
                const parentRes = await pool.query(`SELECT id, post_id FROM comments WHERE id = $1 LIMIT 1`, [String(parentId)]);
                const p = parentRes.rows[0];
                if (!p || String(p.post_id) !== String(id)) {
                    return res.status(400).json({ success: false, message: '父评论不存在或不属于此帖子' });
                }
                parentIdPg = p.id;
            }
            // 用户ID映射到 PG
            let userIdPg = null;
            try {
                const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
                if (r1.rows[0]?.id) {
                    userIdPg = r1.rows[0].id;
                }
                else {
                    const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                    if (r2.rows[0]?.id)
                        userIdPg = r2.rows[0].id;
                }
            }
            catch (e) {
                console.error('用户ID映射失败:', e);
            }
            if (!userIdPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            // 内容审核（PG模式用内置规则，略过频率检查）
            const moderationResult = await moderationService.analyzeContent({
                content: content.trim(),
                type: 'comment',
                userId: new mongoose_1.default.Types.ObjectId(),
                metadata: { pgUserId: userIdPg }
            });
            let moderationStatus = 'approved';
            if (!moderationResult.isAllowed) {
                if (moderationResult.action === 'reject') {
                    return res.status(400).json({ success: false, message: '评论违规，无法发布', details: moderationResult.reasons });
                }
                else if (moderationResult.action === 'require_approval') {
                    moderationStatus = 'pending';
                }
            }
            else if (moderationResult.action === 'flag') {
                moderationStatus = 'approved';
            }
            const insertSql = `
        INSERT INTO comments (post_id, user_id, parent_id, content, is_deleted, moderation_status)
        VALUES ($1, $2, $3, $4, false, $5)
        RETURNING id, post_id, user_id, parent_id, content, is_deleted, moderation_status::text AS moderation_status, created_at, updated_at
      `;
            const { rows } = await pool.query(insertSql, [id, userIdPg, parentIdPg, content.trim(), moderationStatus]);
            const r = rows[0];
            const userRes = await pool.query(`SELECT u.id AS user_id_for_user, u.username AS user_username, u.avatar_url AS user_avatar_url,
                up.first_name AS user_first_name, up.last_name AS user_last_name
         FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.id = $1`, [r.user_id]);
            const u = userRes.rows[0];
            const comment = {
                id: String(r.id),
                postId: String(r.post_id),
                userId: String(r.user_id),
                parentId: r.parent_id ? String(r.parent_id) : undefined,
                content: r.content,
                likes: [],
                likesCount: 0,
                isDeleted: r.is_deleted,
                moderationStatus: r.moderation_status,
                user: u ? {
                    id: String(u.user_id_for_user),
                    username: u.user_username,
                    avatar: u.user_avatar_url || undefined,
                    profile: { firstName: u.user_first_name || undefined, lastName: u.user_last_name || undefined }
                } : undefined,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            };
            return res.status(201).json({ success: true, data: comment, message: '评论发布成功' });
        }
        // Mongo 回退实现
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的帖子ID'
            });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: '评论内容不能为空'
            });
        }
        if (content.length > 2000) {
            return res.status(400).json({
                success: false,
                message: '评论内容不能超过2000个字符'
            });
        }
        const post = await CommunityPost_1.default.findById(id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '帖子不存在'
            });
        }
        if (post.status !== 'published' || post.moderationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: '帖子不可评论'
            });
        }
        if (parentId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(parentId)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的父评论ID'
                });
            }
            const parentComment = await Comment_1.default.findById(parentId);
            if (!parentComment || parentComment.postId.toString() !== id) {
                return res.status(400).json({
                    success: false,
                    message: '父评论不存在或不属于此帖子'
                });
            }
        }
        let mongoUserId;
        try {
            mongoUserId = await resolveMongoObjectId(userId, 'user');
        }
        catch {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        const moderationResult = await moderationService.analyzeContent({
            content: content.trim(),
            type: 'comment',
            userId: mongoUserId
        });
        let moderationStatus = 'approved';
        if (!moderationResult.isAllowed) {
            if (moderationResult.action === 'reject') {
                return res.status(400).json({
                    success: false,
                    message: '评论违规，无法发布',
                    details: moderationResult.reasons
                });
            }
            else if (moderationResult.action === 'require_approval') {
                moderationStatus = 'pending';
            }
        }
        else if (moderationResult.action === 'flag') {
            moderationStatus = 'approved';
        }
        const commentData = {
            postId: new mongoose_1.default.Types.ObjectId(id),
            userId: mongoUserId,
            content: content.trim(),
            likes: [],
            isDeleted: false,
            moderationStatus
        };
        if (parentId) {
            commentData.parentId = new mongoose_1.default.Types.ObjectId(parentId);
        }
        const comment = new Comment_1.default(commentData);
        await comment.save();
        await CommunityPost_1.default.findByIdAndUpdate(id, { $push: { comments: comment._id } });
        await comment.populate('userId', 'username avatar profile.firstName profile.lastName');
        res.status(201).json({ success: true, data: comment, message: '评论发布成功' });
    }
    catch (error) {
        console.error('创建评论失败:', error);
        res.status(500).json({
            success: false,
            message: '创建评论失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.createComment = createComment;
// 点赞/取消点赞评论
const toggleLikeComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 校验评论存在且可访问
            const cmtRes = await pool.query(`SELECT id, is_deleted, moderation_status::text AS moderation_status FROM comments WHERE id = $1 LIMIT 1`, [commentId]);
            const c = cmtRes.rows[0];
            if (!c) {
                return res.status(404).json({ success: false, message: '评论不存在' });
            }
            if (c.is_deleted || c.moderation_status !== 'approved') {
                return res.status(403).json({ success: false, message: '评论不可访问' });
            }
            // 用户ID映射
            let userIdPg = null;
            const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
            if (r1.rows[0]?.id) {
                userIdPg = r1.rows[0].id;
            }
            else {
                const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                if (r2.rows[0]?.id)
                    userIdPg = r2.rows[0].id;
            }
            if (!userIdPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            // 切换点赞
            const exist = await pool.query('SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userIdPg]);
            let isLiked;
            if (exist.rows[0]) {
                await pool.query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userIdPg]);
                isLiked = false;
            }
            else {
                await pool.query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [commentId, userIdPg]);
                isLiked = true;
            }
            const countRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM comment_likes WHERE comment_id = $1', [commentId]);
            const likesCount = countRes.rows[0]?.cnt || 0;
            return res.json({ success: true, data: { isLiked, likesCount }, message: isLiked ? '点赞成功' : '取消点赞成功' });
        }
        // Mongo 回退
        if (!mongoose_1.default.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ success: false, message: '无效的评论ID' });
        }
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({ success: false, message: '评论不存在' });
        }
        if (comment.isDeleted || comment.moderationStatus !== 'approved') {
            return res.status(403).json({ success: false, message: '评论不可访问' });
        }
        let userObjectId;
        try {
            userObjectId = await resolveMongoObjectId(userId, 'user');
        }
        catch {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        const likes = comment.likes;
        const userIndex = likes.findIndex((uid) => uid.toString() === userObjectId.toString());
        if (userIndex > -1) {
            likes.splice(userIndex, 1);
        }
        else {
            likes.push(userObjectId);
        }
        await comment.save();
        const isLiked = comment.likes.some(uid => uid.toString() === userObjectId.toString());
        res.json({ success: true, data: { isLiked, likesCount: comment.likes.length }, message: isLiked ? '点赞成功' : '取消点赞成功' });
    }
    catch (error) {
        console.error('评论点赞操作失败:', error);
        res.status(500).json({
            success: false,
            message: '评论点赞操作失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.toggleLikeComment = toggleLikeComment;
// 删除评论
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.userId;
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        // Postgres 分支
        if (dbPrimary === 'postgres') {
            const pool = await (0, postgres_1.getPostgresPool)();
            // 校验评论存在
            const cmtRes = await pool.query('SELECT id, user_id, is_deleted FROM comments WHERE id = $1 LIMIT 1', [commentId]);
            const c = cmtRes.rows[0];
            if (!c) {
                return res.status(404).json({ success: false, message: '评论不存在' });
            }
            // 用户ID映射到 PG（支持 users.id 或 users.external_id）
            let userIdPg = null;
            try {
                const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
                if (r1.rows[0]?.id) {
                    userIdPg = r1.rows[0].id;
                }
                else {
                    const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                    if (r2.rows[0]?.id)
                        userIdPg = r2.rows[0].id;
                }
            }
            catch (e) {
                console.error('用户ID映射失败:', e);
            }
            if (!userIdPg) {
                return res.status(401).json({ success: false, message: '用户未认证或映射失败' });
            }
            // 权限校验
            if (String(c.user_id) !== String(userIdPg)) {
                return res.status(403).json({ success: false, message: '无权限删除此评论' });
            }
            // 软删除
            await pool.query('UPDATE comments SET is_deleted = true WHERE id = $1', [commentId]);
            return res.json({ success: true, message: '评论删除成功' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({
                success: false,
                message: '无效的评论ID'
            });
        }
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: '评论不存在'
            });
        }
        // 验证权限（支持UUID→ObjectId 映射）
        let mongoUserId;
        try {
            mongoUserId = await resolveMongoObjectId(userId, 'user');
        }
        catch {
            return res.status(401).json({ success: false, message: '用户映射未建立，请重新登录后重试' });
        }
        if (comment.userId.toString() !== mongoUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: '无权限删除此评论'
            });
        }
        // 软删除
        comment.isDeleted = true;
        await comment.save();
        res.json({
            success: true,
            message: '评论删除成功'
        });
    }
    catch (error) {
        console.error('删除评论失败:', error);
        res.status(500).json({
            success: false,
            message: '删除评论失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};
exports.deleteComment = deleteComment;
//# sourceMappingURL=communityController.js.map