import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IPet } from './Pet';

// 通知接口
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  petId?: mongoose.Types.ObjectId;
  type: 'alert' | 'system' | 'community' | 'reminder';
  category: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
  title: string;
  message: string;
  data?: {
    alertRuleId?: mongoose.Types.ObjectId;
    anomalyType?: string;
    severity?: 'low' | 'medium' | 'high';
    petName?: string;
    actionUrl?: string;
    metadata?: any;
  };
  
  // 状态管理
  status: 'unread' | 'read' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // 发送渠道
  channels: {
    inApp: {
      sent: boolean;
      sentAt?: Date;
      readAt?: Date;
    };
    email: {
      sent: boolean;
      sentAt?: Date;
      emailAddress?: string;
      deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
    };
    push: {
      sent: boolean;
      sentAt?: Date;
      deviceTokens?: string[];
      deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
    };
  };
  
  // 调度信息
  scheduledFor?: Date; // 计划发送时间
  expiresAt?: Date; // 过期时间
  
  // 统计信息
  stats: {
    viewCount: number;
    clickCount: number;
    lastViewedAt?: Date;
    lastClickedAt?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
  // 虚拟关联（populate 后可用）
  user?: IUser;
  pet?: IPet;
  // 实例方法（Schema.methods 中定义）
  markAsRead(): Promise<void>;
  markAsArchived(): Promise<void>;
  recordClick(): Promise<void>;
  markInAppSent(): Promise<void>;
  markEmailSent(emailAddress: string): Promise<void>;
  markPushSent(deviceTokens: string[]): Promise<void>;
}

// 通知Schema
const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  petId: {
    type: Schema.Types.ObjectId,
    ref: 'Pet',
    index: true
  },
  type: {
    type: String,
    enum: ['alert', 'system', 'community', 'reminder'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['health', 'frequency', 'pattern', 'emergency', 'general'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    alertRuleId: {
      type: Schema.Types.ObjectId,
      ref: 'AlertRule'
    },
    anomalyType: {
      type: String,
      enum: ['frequency', 'health_decline', 'pattern_change', 'consistency_change']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    petName: String,
    actionUrl: String,
    metadata: Schema.Types.Mixed
  },
  
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  channels: {
    inApp: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      readAt: Date
    },
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      emailAddress: String,
      deliveryStatus: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
      }
    },
    push: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      deviceTokens: [String],
      deliveryStatus: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
      }
    }
  },
  
  scheduledFor: {
    type: Date,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    lastViewedAt: Date,
    lastClickedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引优化
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1, status: 1 });
NotificationSchema.index({ expiresAt: 1 });

// 虚拟字段 - 获取用户信息
NotificationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段 - 获取宠物信息
NotificationSchema.virtual('pet', {
  ref: 'Pet',
  localField: 'petId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段 - 获取提醒规则信息
NotificationSchema.virtual('alertRule', {
  ref: 'AlertRule',
  localField: 'data.alertRuleId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段 - 检查是否已过期
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// 虚拟字段 - 检查是否需要发送
NotificationSchema.virtual('shouldSend').get(function() {
  const now = new Date();
  return (!this.scheduledFor || this.scheduledFor <= now) && 
         (!this.expiresAt || this.expiresAt > now);
});

// 实例方法 - 标记为已读
NotificationSchema.methods.markAsRead = async function(): Promise<void> {
  this.status = 'read';
  this.channels.inApp.readAt = new Date();
  this.stats.viewCount += 1;
  this.stats.lastViewedAt = new Date();
  await this.save();
};

// 实例方法 - 标记为已归档
NotificationSchema.methods.markAsArchived = async function(): Promise<void> {
  this.status = 'archived';
  await this.save();
};

// 实例方法 - 记录点击
NotificationSchema.methods.recordClick = async function(): Promise<void> {
  this.stats.clickCount += 1;
  this.stats.lastClickedAt = new Date();
  await this.save();
};

// 实例方法 - 标记应用内通知已发送
NotificationSchema.methods.markInAppSent = async function(): Promise<void> {
  this.channels.inApp.sent = true;
  this.channels.inApp.sentAt = new Date();
  await this.save();
};

// 实例方法 - 标记邮件已发送
NotificationSchema.methods.markEmailSent = async function(emailAddress: string): Promise<void> {
  this.channels.email.sent = true;
  this.channels.email.sentAt = new Date();
  this.channels.email.emailAddress = emailAddress;
  this.channels.email.deliveryStatus = 'sent';
  await this.save();
};

// 实例方法 - 标记推送已发送
NotificationSchema.methods.markPushSent = async function(deviceTokens: string[]): Promise<void> {
  this.channels.push.sent = true;
  this.channels.push.sentAt = new Date();
  this.channels.push.deviceTokens = deviceTokens;
  this.channels.push.deliveryStatus = 'sent';
  await this.save();
};

// 静态方法 - 获取用户未读通知数量
NotificationSchema.statics.getUnreadCount = async function(userId: string): Promise<number> {
  return await this.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'unread'
  });
};

// 静态方法 - 获取用户通知列表
NotificationSchema.statics.getUserNotifications = async function(
  userId: string,
  options: {
    status?: 'unread' | 'read' | 'archived';
    type?: 'alert' | 'system' | 'community' | 'reminder';
    category?: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    page?: number;
    limit?: number;
  } = {}
) {
  const {
    status,
    type,
    category,
    priority,
    page = 1,
    limit = 20
  } = options;
  
  const filter: any = {
    userId: new mongoose.Types.ObjectId(userId)
  };
  
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  
  // 排除已过期的通知
  filter.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } }
  ];
  
  const skip = (page - 1) * limit;
  
  const [notifications, total] = await Promise.all([
    this.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('pet', 'name type breed avatar')
      .populate('alertRule', 'name'),
    this.countDocuments(filter)
  ]);
  
  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total
  };
};

// 静态方法 - 清理过期通知
NotificationSchema.statics.cleanupExpiredNotifications = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount || 0;
};

// 静态方法 - 获取待发送的通知
NotificationSchema.statics.getPendingNotifications = async function(limit: number = 100) {
  const now = new Date();
  
  return await this.find({
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: now } }
    ],
    $and: [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } }
        ]
      },
      {
        $or: [
          { 'channels.inApp.sent': false },
          { 'channels.email.sent': false },
          { 'channels.push.sent': false }
        ]
      }
    ]
  })
  .limit(limit)
  .populate('user', 'username email preferences')
  .populate('pet', 'name type breed')
  .sort({ priority: -1, createdAt: 1 });
};

// 中间件 - 保存前设置默认值
NotificationSchema.pre('save', function(next) {
  // 设置过期时间（默认30天）
  if (!this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    this.expiresAt = expiryDate;
  }
  
  // 根据类型设置优先级
  if (!this.priority || this.priority === 'normal') {
    switch (this.category) {
      case 'emergency':
        this.priority = 'urgent';
        break;
      case 'health':
        this.priority = 'high';
        break;
      case 'frequency':
      case 'pattern':
        this.priority = 'normal';
        break;
      default:
        this.priority = 'low';
        break;
    }
  }
  
  next();
});

// 中间件 - 删除前清理相关数据
NotificationSchema.pre('deleteMany', function(next) {
  // 这里可以添加清理逻辑，比如记录删除日志
  next();
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);