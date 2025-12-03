"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const CommentSchema = new mongoose_1.Schema({
    postId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CommunityPost',
        required: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    parentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null,
        index: true
    },
    content: {
        type: String,
        required: [true, '评论内容不能为空'],
        trim: true,
        maxlength: [1000, '评论内容不能超过1000个字符'],
        minlength: [1, '评论内容不能为空']
    },
    likes: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    moderationStatus: {
        type: String,
        enum: ['approved', 'pending', 'rejected'],
        default: 'approved',
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// 索引优化
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });
CommentSchema.index({ 'likes': 1 });
// 虚拟字段
CommentSchema.virtual('likesCount').get(function () {
    return this.likes.length;
});
CommentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentId',
    options: {
        sort: { createdAt: 1 },
        populate: {
            path: 'userId',
            select: 'username avatar profile.firstName profile.lastName'
        }
    }
});
// 静态方法：获取帖子的评论
CommentSchema.statics.findByPost = function (postId, options = {}) {
    const query = this.find({
        postId,
        isDeleted: false,
        moderationStatus: 'approved',
        parentId: null // 只获取顶级评论
    });
    if (options.limit)
        query.limit(options.limit);
    if (options.skip)
        query.skip(options.skip);
    return query.sort({ createdAt: -1 })
        .populate('userId', 'username avatar profile.firstName profile.lastName')
        .populate({
        path: 'replies',
        populate: {
            path: 'userId',
            select: 'username avatar profile.firstName profile.lastName'
        }
    });
};
// 静态方法：获取用户的评论
CommentSchema.statics.findByUser = function (userId, options = {}) {
    const query = this.find({
        userId,
        isDeleted: false,
        moderationStatus: 'approved'
    });
    if (options.limit)
        query.limit(options.limit);
    if (options.skip)
        query.skip(options.skip);
    return query.sort({ createdAt: -1 })
        .populate('postId', 'title')
        .populate('userId', 'username avatar');
};
// 实例方法：切换点赞状态
CommentSchema.methods.toggleLike = function (userId) {
    const likes = this.likes;
    const userIndex = likes.findIndex((id) => id.toString() === userId.toString());
    if (userIndex > -1) {
        likes.splice(userIndex, 1);
    }
    else {
        likes.push(userId);
    }
    return this.save();
};
// 实例方法：软删除
CommentSchema.methods.softDelete = function () {
    this.isDeleted = true;
    return this.save();
};
// 中间件：删除评论时同时删除回复
CommentSchema.pre('save', async function (next) {
    if (this.isModified('isDeleted') && this.isDeleted) {
        // 软删除所有回复
        await mongoose_1.default.model('Comment').updateMany({ parentId: this._id }, { isDeleted: true });
    }
    next();
});
exports.default = mongoose_1.default.model('Comment', CommentSchema);
//# sourceMappingURL=Comment.js.map