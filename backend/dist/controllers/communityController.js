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
const moderationService = new moderationService_1.default();
// 获取帖子列表
const getPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, tags, search, sort = 'latest' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let query = {
            status: 'published',
            moderationStatus: 'approved'
        };
        // 分类筛选
        if (category && category !== 'all') {
            query.category = category;
        }
        // 标签筛选
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            query.tags = { $in: tagArray };
        }
        let posts;
        let total;
        // 搜索功能
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
            // 排序逻辑
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
        // 获取分类统计
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
            if (category) {
                category.count = stat.count;
            }
        });
        res.json({
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
        // 增加浏览量（异步执行，不影响响应）
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
        const { title, content, petId, images = [], tags = [], category = 'general' } = req.body;
        const userId = req.user.userId;
        // 验证必填字段
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: '标题和内容不能为空'
            });
        }
        // 验证标题长度
        if (title.length > 200) {
            return res.status(400).json({
                success: false,
                message: '标题长度不能超过200个字符'
            });
        }
        // 验证内容长度
        if (content.length > 10000) {
            return res.status(400).json({
                success: false,
                message: '内容长度不能超过10000个字符'
            });
        }
        // 验证分类
        const validCategories = ['health', 'help', 'experience', 'general'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: '无效的分类'
            });
        }
        // 验证宠物ID（如果提供）
        if (petId && !mongoose_1.default.Types.ObjectId.isValid(petId)) {
            return res.status(400).json({
                success: false,
                message: '无效的宠物ID'
            });
        }
        // 内容审核
        const moderationResult = await moderationService.analyzeContent({
            content: content.trim(),
            type: 'post',
            userId: new mongoose_1.default.Types.ObjectId(userId),
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
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title: title.trim(),
            content: content.trim(),
            images: Array.isArray(images) ? images : [],
            tags: Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [],
            category,
            status,
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
        if (petId) {
            postData.petId = new mongoose_1.default.Types.ObjectId(petId);
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
        const { title, content, images, tags, category } = req.body;
        const userId = req.user.userId;
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
        // 验证权限
        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权限修改此帖子'
            });
        }
        // 更新字段
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: '标题不能为空'
                });
            }
            post.title = title.trim();
        }
        if (content !== undefined) {
            if (!content.trim()) {
                return res.status(400).json({
                    success: false,
                    message: '内容不能为空'
                });
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
                return res.status(400).json({
                    success: false,
                    message: '无效的分类'
                });
            }
            post.category = category;
        }
        await post.save();
        await post.populate('userId', 'username avatar profile.firstName profile.lastName');
        await post.populate('petId', 'name type avatar breed');
        res.json({
            success: true,
            data: post,
            message: '帖子更新成功'
        });
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
        // 验证权限
        if (post.userId.toString() !== userId) {
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
        if (post.status !== 'published' || post.moderationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: '帖子不可访问'
            });
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const likes = post.interactions.likes;
        const userIndex = likes.findIndex((id) => id.toString() === userId);
        if (userIndex > -1) {
            likes.splice(userIndex, 1);
        }
        else {
            likes.push(userObjectId);
        }
        await post.save();
        const isLiked = post.interactions.likes.some(id => id.toString() === userId);
        res.json({
            success: true,
            data: {
                isLiked,
                likesCount: post.interactions.likes.length
            },
            message: isLiked ? '点赞成功' : '取消点赞成功'
        });
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
            parentId: { $exists: false } // 只获取顶级评论
        })
            .sort({ createdAt: 1 })
            .limit(limitNum)
            .skip(skip)
            .populate('userId', 'username avatar')
            .populate({
            path: 'replies',
            match: { isDeleted: false, moderationStatus: 'approved' },
            populate: {
                path: 'userId',
                select: 'username avatar'
            },
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
        // 验证帖子是否存在
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
        // 验证父评论（如果是回复）
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
        // 内容审核
        const moderationResult = await moderationService.analyzeContent({
            content: content.trim(),
            type: 'comment',
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        // 根据审核结果决定状态
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
            // 评论可以发布但需要标记
            moderationStatus = 'approved';
        }
        const commentData = {
            postId: new mongoose_1.default.Types.ObjectId(id),
            userId: new mongoose_1.default.Types.ObjectId(userId),
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
        // 更新帖子的评论数组
        await CommunityPost_1.default.findByIdAndUpdate(id, {
            $push: { comments: comment._id }
        });
        // 填充用户信息
        await comment.populate('userId', 'username avatar profile.firstName profile.lastName');
        res.status(201).json({
            success: true,
            data: comment,
            message: '评论发布成功'
        });
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
        if (comment.isDeleted || comment.moderationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: '评论不可访问'
            });
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const likes = comment.likes;
        const userIndex = likes.findIndex((id) => id.toString() === userId);
        if (userIndex > -1) {
            likes.splice(userIndex, 1);
        }
        else {
            likes.push(userObjectId);
        }
        await comment.save();
        const isLiked = comment.likes.some(id => id.toString() === userId);
        res.json({
            success: true,
            data: {
                isLiked,
                likesCount: comment.likes.length
            },
            message: isLiked ? '点赞成功' : '取消点赞成功'
        });
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
        // 验证权限
        if (comment.userId.toString() !== userId) {
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