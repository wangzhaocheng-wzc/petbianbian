import mongoose, { Document, Schema } from 'mongoose';

export interface IModerationRule extends Document {
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'length' | 'frequency' | 'custom';
  config: {
    keywords?: string[];
    patterns?: string[];
    minLength?: number;
    maxLength?: number;
    maxFrequency?: number;
    timeWindow?: number; // 时间窗口（分钟）
    customScript?: string;
  };
  action: 'flag' | 'auto_reject' | 'require_approval' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  appliesTo: ('post' | 'comment')[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ModerationRuleSchema = new Schema<IModerationRule>({
  name: {
    type: String,
    required: [true, '规则名称是必需的'],
    trim: true,
    maxlength: [100, '规则名称不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '规则描述是必需的'],
    trim: true,
    maxlength: [500, '规则描述不能超过500个字符']
  },
  type: {
    type: String,
    enum: ['keyword', 'pattern', 'length', 'frequency', 'custom'],
    required: true,
    index: true
  },
  config: {
    keywords: [{
      type: String,
      trim: true
    }],
    patterns: [{
      type: String,
      trim: true
    }],
    minLength: {
      type: Number,
      min: 0
    },
    maxLength: {
      type: Number,
      min: 0
    },
    maxFrequency: {
      type: Number,
      min: 1
    },
    timeWindow: {
      type: Number,
      min: 1,
      default: 60 // 默认60分钟
    },
    customScript: {
      type: String,
      trim: true
    }
  },
  action: {
    type: String,
    enum: ['flag', 'auto_reject', 'require_approval', 'warning'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  appliesTo: [{
    type: String,
    enum: ['post', 'comment'],
    required: true
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
ModerationRuleSchema.index({ isActive: 1, type: 1 });
ModerationRuleSchema.index({ severity: 1, isActive: 1 });
ModerationRuleSchema.index({ appliesTo: 1, isActive: 1 });

// 静态方法：获取活跃的审核规则
ModerationRuleSchema.statics.findActiveRules = function(contentType?: 'post' | 'comment') {
  const query = this.find({ isActive: true });
  
  if (contentType) {
    query.where('appliesTo').in([contentType]);
  }
  
  return query.sort({ severity: -1, createdAt: -1 });
};

// 静态方法：按类型获取规则
ModerationRuleSchema.statics.findByType = function(type: string, contentType?: 'post' | 'comment') {
  const query = this.find({ type, isActive: true });
  
  if (contentType) {
    query.where('appliesTo').in([contentType]);
  }
  
  return query.sort({ severity: -1 });
};

export default mongoose.model<IModerationRule>('ModerationRule', ModerationRuleSchema);