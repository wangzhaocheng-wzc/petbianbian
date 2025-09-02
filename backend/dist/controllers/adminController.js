"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateComment = exports.moderatePost = exports.getComments = exports.getPosts = exports.getSystemStats = exports.demoteUser = exports.promoteUser = exports.unverifyUser = exports.verifyUser = exports.deactivateUser = exports.activateUser = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const Comment_1 = __importDefault(require("../models/Comment"));
const Report_1 = __importDefault(require("../models/Report"));
// 获取用户列表
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // 构建查询条件
        const query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }
        if (status) {
            switch (status) {
                case 'active':
                    query.isActive = true;
                    break;
                case 'inactive':
                    query.isActive = false;
                    break;
                case 'verified':
                    query.isVerified = true;
                    break;
                case 'unverified':
                    query.isVerified = false;
                    break;
            }
        }
        // 获取用户列表
        const users = await User_1.default.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        // 获取总数
        const total = await User_1.default.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages
                }
            }
        });
    }
    catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户列表失败'
        });
    }
};
exports.getUsers = getUsers;
// 激活用户
const activateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, { isActive: true }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user,
            message: '用户已激活'
        });
    }
    catch (error) {
        console.error('激活用户失败:', error);
        res.status(500).json({
            success: false,
            message: '激活用户失败'
        });
    }
};
exports.activateUser = activateUser;
// 禁用用户
const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, { isActive: false }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user,
            message: '用户已禁用'
        });
    }
    catch (error) {
        console.error('禁用用户失败:', error);
        res.status(500).json({
            success: false,
            message: '禁用用户失败'
        });
    }
};
exports.deactivateUser = deactivateUser;
// 验证用户
const verifyUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, { isVerified: true }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user,
            message: '用户已验证'
        });
    }
    catch (error) {
        console.error('验证用户失败:', error);
        res.status(500).json({
            success: false,
            message: '验证用户失败'
        });
    }
};
exports.verifyUser = verifyUser;
// 取消验证用户
const unverifyUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, { isVerified: false }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user,
            message: '用户验证已取消'
        });
    }
    catch (error) {
        console.error('取消验证用户失败:', error);
        res.status(500).json({
            success: false,
            message: '取消验证用户失败'
        });
    }
};
exports.unverifyUser = unverifyUser;
// 提升用户为版主
const promoteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, { role: 'moderator' }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user,
            message: '用户已提升为版主'
        });
    }
    catch (error) {
        console.error('提升用户失败:', error);
        res.status(500).json({
            success: false,
            message: '提升用户失败'
        });
    }
};
exports.promoteUser = promoteUser;
// 降级用户为普通用户
const demoteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findByIdAndUpdate(userId, { role: 'user' }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: user,
            message: '用户已降级为普通用户'
        });
    }
    catch (error) {
        console.error('降级用户失败:', error);
        res.status(500).json({
            success: false,
            message: '降级用户失败'
        });
    }
};
exports.demoteUser = demoteUser;
// 获取系统统计信息
const getSystemStats = async (req, res) => {
    try {
        // 用户统计
        const totalUsers = await User_1.default.countDocuments();
        const activeUsers = await User_1.default.countDocuments({ isActive: true });
        const verifiedUsers = await User_1.default.countDocuments({ isVerified: true });
        const adminUsers = await User_1.default.countDocuments({ role: 'admin' });
        const moderatorUsers = await User_1.default.countDocuments({ role: 'moderator' });
        // 内容统计
        const totalPosts = await CommunityPost_1.default.countDocuments();
        const publishedPosts = await CommunityPost_1.default.countDocuments({ status: 'published' });
        const pendingPosts = await CommunityPost_1.default.countDocuments({ moderationStatus: 'pending' });
        const rejectedPosts = await CommunityPost_1.default.countDocuments({ moderationStatus: 'rejected' });
        const totalComments = await Comment_1.default.countDocuments();
        const pendingComments = await Comment_1.default.countDocuments({ moderationStatus: 'pending' });
        const rejectedComments = await Comment_1.default.countDocuments({ moderationStatus: 'rejected' });
        // 举报统计
        const totalReports = await Report_1.default.countDocuments();
        const pendingReports = await Report_1.default.countDocuments({ status: 'pending' });
        const resolvedReports = await Report_1.default.countDocuments({ status: 'resolved' });
        const dismissedReports = await Report_1.default.countDocuments({ status: 'dismissed' });
        // 近期活动统计（最近7天）
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUsers = await User_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
        const recentPosts = await CommunityPost_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
        const recentComments = await Comment_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
        const recentReports = await Report_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    verified: verifiedUsers,
                    admins: adminUsers,
                    moderators: moderatorUsers
                },
                content: {
                    posts: {
                        total: totalPosts,
                        published: publishedPosts,
                        pending: pendingPosts,
                        rejected: rejectedPosts
                    },
                    comments: {
                        total: totalComments,
                        pending: pendingComments,
                        rejected: rejectedComments
                    }
                },
                reports: {
                    total: totalReports,
                    pending: pendingReports,
                    resolved: resolvedReports,
                    dismissed: dismissedReports
                },
                recentActivity: {
                    users: recentUsers,
                    posts: recentPosts,
                    comments: recentComments,
                    reports: recentReports
                }
            }
        });
    }
    catch (error) {
        console.error('获取系统统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取系统统计失败'
        });
    }
};
exports.getSystemStats = getSystemStats;
// 获取帖子列表（管理员）
const getPosts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '', moderationStatus = '', category = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // 构建查询条件
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            query.status = status;
        }
        if (moderationStatus) {
            query.moderationStatus = moderationStatus;
        }
        if (category) {
            query.category = category;
        }
        // 获取帖子列表
        const posts = await CommunityPost_1.default.find(query)
            .populate('userId', 'username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        // 获取总数
        const total = await CommunityPost_1.default.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages
                }
            }
        });
    }
    catch (error) {
        console.error('获取帖子列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取帖子列表失败'
        });
    }
};
exports.getPosts = getPosts;
// 获取评论列表（管理员）
const getComments = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', moderationStatus = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // 构建查询条件
        const query = {};
        if (search) {
            query.content = { $regex: search, $options: 'i' };
        }
        if (moderationStatus) {
            query.moderationStatus = moderationStatus;
        }
        // 获取评论列表
        const comments = await Comment_1.default.find(query)
            .populate('userId', 'username avatar')
            .populate('postId', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        // 获取总数
        const total = await Comment_1.default.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: {
                comments,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages
                }
            }
        });
    }
    catch (error) {
        console.error('获取评论列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取评论列表失败'
        });
    }
};
exports.getComments = getComments;
// 审核帖子
const moderatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { action } = req.params; // approve, reject, delete
        let updateData = {};
        switch (action) {
            case 'approve':
                updateData = { moderationStatus: 'approved' };
                break;
            case 'reject':
                updateData = { moderationStatus: 'rejected' };
                break;
            case 'delete':
                await CommunityPost_1.default.findByIdAndDelete(postId);
                return res.json({
                    success: true,
                    message: '帖子已删除'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: '无效的操作'
                });
        }
        const post = await CommunityPost_1.default.findByIdAndUpdate(postId, updateData, { new: true });
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '帖子不存在'
            });
        }
        res.json({
            success: true,
            data: post,
            message: `帖子已${action === 'approve' ? '通过' : '拒绝'}`
        });
    }
    catch (error) {
        console.error('审核帖子失败:', error);
        res.status(500).json({
            success: false,
            message: '审核帖子失败'
        });
    }
};
exports.moderatePost = moderatePost;
// 审核评论
const moderateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { action } = req.params; // approve, reject, delete
        let updateData = {};
        switch (action) {
            case 'approve':
                updateData = { moderationStatus: 'approved' };
                break;
            case 'reject':
                updateData = { moderationStatus: 'rejected' };
                break;
            case 'delete':
                await Comment_1.default.findByIdAndDelete(commentId);
                return res.json({
                    success: true,
                    message: '评论已删除'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: '无效的操作'
                });
        }
        const comment = await Comment_1.default.findByIdAndUpdate(commentId, updateData, { new: true });
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: '评论不存在'
            });
        }
        res.json({
            success: true,
            data: comment,
            message: `评论已${action === 'approve' ? '通过' : '拒绝'}`
        });
    }
    catch (error) {
        console.error('审核评论失败:', error);
        res.status(500).json({
            success: false,
            message: '审核评论失败'
        });
    }
};
exports.moderateComment = moderateComment;
//# sourceMappingURL=adminController.js.map