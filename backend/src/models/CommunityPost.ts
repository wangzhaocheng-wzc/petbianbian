import mongoose, { Document, Schema } from 'mongoose';

export interface ICommunityPost extends Document {
  userId: mongoose.Types.ObjectId;
  petId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  category: 'health' | 'help' | 'experience' | 'general';
  status: 'published' | 'draft' | 'archived';
  interactions: {
    likes: mongoose.Types.ObjectId[];
    views: number;
    shares: number;
  };
  comments: mongoose.Types.ObjectId[];
  isSticky: boolean;
  isFeatured: boolean;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CommunityPostSchema = new Schema<ICommunityPost>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  petId: {
    type: Schema.Types.ObjectId,
    ref: 'Pet',
    required: false
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: '图片URL格式不正确'
    }
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  category: {
    type: String,
    enum: ['health', 'help', 'experience', 'general'],
    default: 'general',
    index: true
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'archived'],
    default: 'published',
    index: true
  },
  interactions: {
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isSticky: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
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
CommunityPostSchema.index({ createdAt: -1 });
CommunityPostSchema.index({ category: 1, createdAt: -1 });
CommunityPostSchema.index({ userId: 1, createdAt: -1 });
CommunityPostSchema.index({ tags: 1 });
CommunityPostSchema.index({ 'interactions.likes': 1 });

// 虚拟字段
CommunityPostSchema.virtual('likesCount').get(function() {
  return this.interactions.likes.length;
});

CommunityPostSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// 文本搜索索引
CommunityPostSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    content: 5,
    tags: 3
  }
});

// 中间件：更新时间
CommunityPostSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// 静态方法：按分类获取帖子
CommunityPostSchema.statics.findByCategory = function(category: string, options: any = {}) {
  const query = this.find({ 
    category, 
    status: 'published',
    moderationStatus: 'approved'
  });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query.sort({ isSticky: -1, createdAt: -1 })
    .populate('userId', 'username avatar')
    .populate('petId', 'name type avatar');
};

// 静态方法：搜索帖子
CommunityPostSchema.statics.searchPosts = function(searchTerm: string, options: any = {}) {
  const query = this.find({
    $text: { $search: searchTerm },
    status: 'published',
    moderationStatus: 'approved'
  });
  
  if (options.category) query.where('category', options.category);
  if (options.tags && options.tags.length > 0) {
    query.where('tags').in(options.tags);
  }
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query.sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .populate('userId', 'username avatar')
    .populate('petId', 'name type avatar');
};

// 实例方法：增加浏览量
CommunityPostSchema.methods.incrementViews = function() {
  this.interactions.views += 1;
  return this.save();
};

// 实例方法：切换点赞状态
CommunityPostSchema.methods.toggleLike = function(userId: mongoose.Types.ObjectId) {
  const likes = this.interactions.likes;
  const userIndex = likes.findIndex((id: mongoose.Types.ObjectId) => id.toString() === userId.toString());
  
  if (userIndex > -1) {
    likes.splice(userIndex, 1);
  } else {
    likes.push(userId);
  }
  
  return this.save();
};

export default mongoose.model<ICommunityPost>('CommunityPost', CommunityPostSchema);