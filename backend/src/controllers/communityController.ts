import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CommunityPost, { ICommunityPost } from '../models/CommunityPost';
import Comment, { IComment } from '../models/Comment';
import { AuthRequest } from '../middleware/auth';

// 获取帖子列表
export const getPosts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tags,
      search,
      sort = 'latest'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let query: any = {
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
      query.$text = { $search: search as string };
      posts = await CommunityPost.find(query)
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(limitNum)
        .skip(skip)
        .populate('userId', 'username avatar profile.firstName profile.lastName')
        .populate('petId', 'name type avatar breed')
        .lean();
      total = await CommunityPost.countDocuments(query);
    } else {
      // 排序逻辑
      let sortOption: any = { createdAt: -1 };
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

      posts = await CommunityPost.find(query)
        .sort(sortOption)
        .limit(limitNum)
        .skip(skip)
        .populate('userId', 'username avatar profile.firstName profile.lastName')
        .populate('petId', 'name type avatar breed')
        .lean();

      total = await CommunityPost.countDocuments(query);
    }

    // 获取分类统计
    const categoryStats = await CommunityPost.aggregate([
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
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帖子列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 获取单个帖子详情
export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的帖子ID'
      });
    }

    const post = await CommunityPost.findById(id)
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
    CommunityPost.findByIdAndUpdate(id, {
      $inc: { 'interactions.views': 1 }
    }).exec();

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帖子详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 创建新帖子
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, petId, images = [], tags = [], category = 'general' } = req.body;
    const userId = req.user!.userId;

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
    if (petId && !mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({
        success: false,
        message: '无效的宠物ID'
      });
    }

    const postData: Partial<ICommunityPost> = {
      userId: new mongoose.Types.ObjectId(userId),
      title: title.trim(),
      content: content.trim(),
      images: Array.isArray(images) ? images : [],
      tags: Array.isArray(tags) ? tags.map((tag: string) => tag.trim()).filter(Boolean) : [],
      category,
      status: 'published',
      interactions: {
        likes: [],
        views: 0,
        shares: 0
      },
      comments: [],
      isSticky: false,
      isFeatured: false,
      moderationStatus: 'approved' // 简化版本，直接通过审核
    };

    if (petId) {
      postData.petId = new mongoose.Types.ObjectId(petId);
    }

    const post = new CommunityPost(postData);
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
  } catch (error) {
    console.error('创建帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '创建帖子失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 更新帖子
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, images, tags, category } = req.body;
    const userId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的帖子ID'
      });
    }

    const post = await CommunityPost.findById(id);
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
      post.tags = Array.isArray(tags) ? tags.map((tag: string) => tag.trim()).filter(Boolean) : [];
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
  } catch (error) {
    console.error('更新帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '更新帖子失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 删除帖子
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的帖子ID'
      });
    }

    const post = await CommunityPost.findById(id);
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
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '删除帖子失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 点赞/取消点赞帖子
export const toggleLikePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的帖子ID'
      });
    }

    const post = await CommunityPost.findById(id);
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

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const likes = post.interactions.likes;
    const userIndex = likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === userId);
    
    if (userIndex > -1) {
      likes.splice(userIndex, 1);
    } else {
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
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞操作失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};
// 获取帖子评论
export const getComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的帖子ID'
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const postId = new mongoose.Types.ObjectId(id);
    const comments = await Comment.find({ 
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

    const total = await Comment.countDocuments({
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
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 创建评论
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
    const post = await CommunityPost.findById(id);
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
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({
          success: false,
          message: '无效的父评论ID'
        });
      }

      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.postId.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: '父评论不存在或不属于此帖子'
        });
      }
    }

    const commentData: Partial<IComment> = {
      postId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      content: content.trim(),
      likes: [],
      isDeleted: false,
      moderationStatus: 'approved' // 简化版本，直接通过审核
    };

    if (parentId) {
      commentData.parentId = new mongoose.Types.ObjectId(parentId);
    }

    const comment = new Comment(commentData);
    await comment.save();

    // 更新帖子的评论数组
    await CommunityPost.findByIdAndUpdate(id, {
      $push: { comments: comment._id }
    });

    // 填充用户信息
    await comment.populate('userId', 'username avatar profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      data: comment,
      message: '评论发布成功'
    });
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(500).json({
      success: false,
      message: '创建评论失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 点赞/取消点赞评论
export const toggleLikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: '无效的评论ID'
      });
    }

    const comment = await Comment.findById(commentId);
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

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const likes = comment.likes;
    const userIndex = likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === userId);
    
    if (userIndex > -1) {
      likes.splice(userIndex, 1);
    } else {
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
  } catch (error) {
    console.error('评论点赞操作失败:', error);
    res.status(500).json({
      success: false,
      message: '评论点赞操作失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

// 删除评论
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: '无效的评论ID'
      });
    }

    const comment = await Comment.findById(commentId);
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
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};