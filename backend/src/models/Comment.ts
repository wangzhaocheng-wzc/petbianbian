import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  isDeleted: boolean;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'CommunityPost',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    required: false,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  likes: [{
    type: Schema.Types.ObjectId,
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
CommentSchema.index({ postId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });

// 虚拟字段
CommentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId'
});

// 中间件：更新时间
CommentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// 静态方法：获取帖子的评论
CommentSchema.statics.findByPost = function(postId: mongoose.Types.ObjectId, options: any = {}) {
  const query = this.find({ 
    postId, 
    isDeleted: false,
    moderationStatus: 'approved',
    parentId: { $exists: false } // 只获取顶级评论
  });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query.sort({ createdAt: 1 })
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
};

// 静态方法：获取用户的评论
CommentSchema.statics.findByUser = function(userId: mongoose.Types.ObjectId, options: any = {}) {
  const query = this.find({ 
    userId, 
    isDeleted: false,
    moderationStatus: 'approved'
  });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query.sort({ createdAt: -1 })
    .populate('postId', 'title')
    .populate('userId', 'username avatar');
};

// 实例方法：切换点赞状态
CommentSchema.methods.toggleLike = function(userId: mongoose.Types.ObjectId) {
  const likes = this.likes;
  const userIndex = likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === userId.toString());
  
  if (userIndex > -1) {
    likes.splice(userIndex, 1);
  } else {
    likes.push(userId);
  }
  
  return this.save();
};

// 实例方法：软删除
CommentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

export default mongoose.model<IComment>('Comment', CommentSchema);