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
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });
CommentSchema.index({ 'likes': 1 });

// 虚拟字段
CommentSchema.virtual('likesCount').get(function() {
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
CommentSchema.statics.findByPost = function(postId: mongoose.Types.ObjectId, options: any = {}) {
  const query = this.find({ 
    postId,
    isDeleted: false,
    moderationStatus: 'approved',
    parentId: null // 只获取顶级评论
  });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
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

// 中间件：删除评论时同时删除回复
CommentSchema.pre('save', async function(next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    // 软删除所有回复
    await mongoose.model('Comment').updateMany(
      { parentId: this._id },
      { isDeleted: true }
    );
  }
  next();
});

export default mongoose.model<IComment>('Comment', CommentSchema);