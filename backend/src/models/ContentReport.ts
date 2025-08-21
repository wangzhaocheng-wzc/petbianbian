import mongoose, { Document, Schema } from 'mongoose';

export interface IContentReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetType: 'post' | 'comment';
  targetId: mongoose.Types.ObjectId;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'violence' | 'hate_speech' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reviewerId?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  action?: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
  createdAt: Date;
  updatedAt: Date;
}

const ContentReportSchema = new Schema<IContentReport>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['post', 'comment'],
    required: true,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['spam', 'inappropriate', 'harassment', 'violence', 'hate_speech', 'misinformation', 'other'],
    required: true,
    index: true
  },
  description: {
    type: String,
    maxlength: [1000, '举报描述不能超过1000个字符'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: {
    type: String,
    maxlength: [2000, '审核备注不能超过2000个字符'],
    trim: true
  },
  action: {
    type: String,
    enum: ['none', 'warning', 'content_removed', 'user_suspended', 'user_banned'],
    default: 'none'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 复合索引
ContentReportSchema.index({ targetType: 1, targetId: 1 });
ContentReportSchema.index({ status: 1, createdAt: -1 });
ContentReportSchema.index({ reporterId: 1, createdAt: -1 });

// 虚拟字段
ContentReportSchema.virtual('reporter', {
  ref: 'User',
  localField: 'reporterId',
  foreignField: '_id',
  justOne: true
});

ContentReportSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewerId',
  foreignField: '_id',
  justOne: true
});

// 静态方法：获取待审核的举报
ContentReportSchema.statics.findPendingReports = function(options: any = {}) {
  const query = this.find({ status: 'pending' });
  
  if (options.targetType) query.where('targetType', options.targetType);
  if (options.reason) query.where('reason', options.reason);
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query.sort({ createdAt: -1 })
    .populate('reporterId', 'username avatar')
    .populate('reviewerId', 'username avatar');
};

// 静态方法：获取用户的举报历史
ContentReportSchema.statics.findByReporter = function(reporterId: mongoose.Types.ObjectId, options: any = {}) {
  const query = this.find({ reporterId });
  
  if (options.status) query.where('status', options.status);
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query.sort({ createdAt: -1 });
};

// 实例方法：分配审核员
ContentReportSchema.methods.assignReviewer = function(reviewerId: mongoose.Types.ObjectId) {
  this.reviewerId = reviewerId;
  this.status = 'reviewing';
  return this.save();
};

// 实例方法：完成审核
ContentReportSchema.methods.completeReview = function(action: string, reviewNotes?: string) {
  this.action = action;
  this.reviewNotes = reviewNotes;
  this.status = action === 'none' ? 'dismissed' : 'resolved';
  return this.save();
};

export default mongoose.model<IContentReport>('ContentReport', ContentReportSchema);