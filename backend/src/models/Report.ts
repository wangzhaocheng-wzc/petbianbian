import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetType: 'post' | 'comment' | 'user';
  targetId: mongoose.Types.ObjectId;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewerId?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['post', 'comment', 'user'],
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
    enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'],
    required: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: {
    type: String,
    maxlength: 1000,
    trim: true
  }
}, {
  timestamps: true
});

// 索引优化
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

// 防止重复举报
ReportSchema.index({ 
  reporterId: 1, 
  targetType: 1, 
  targetId: 1 
}, { unique: true });

export default mongoose.model<IReport>('Report', ReportSchema);