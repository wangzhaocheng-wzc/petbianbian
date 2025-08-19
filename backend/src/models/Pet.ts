import mongoose, { Document, Schema } from 'mongoose';

export interface IPet extends Document {
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed?: string;
  gender?: 'male' | 'female';
  age?: number; // 年龄（月）
  weight?: number; // 体重（kg）
  avatar?: string;
  description?: string;
  medicalHistory?: {
    allergies: string[];
    medications: string[];
    conditions: string[];
  };
  ownerId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PetSchema = new Schema<IPet>({
  name: {
    type: String,
    required: [true, '宠物名称是必填项'],
    trim: true,
    maxlength: [20, '宠物名称不能超过20个字符']
  },
  type: {
    type: String,
    required: [true, '宠物类型是必填项'],
    enum: {
      values: ['dog', 'cat', 'other'],
      message: '宠物类型必须是dog、cat或other'
    }
  },
  breed: {
    type: String,
    trim: true,
    maxlength: [50, '品种名称不能超过50个字符']
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female'],
      message: '性别必须是male或female'
    }
  },
  age: {
    type: Number,
    min: [0, '年龄不能为负数'],
    max: [360, '年龄不能超过360个月'] // 30年
  },
  weight: {
    type: Number,
    min: [0, '体重不能为负数'],
    max: [200, '体重不能超过200kg']
  },
  avatar: {
    type: String,
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '描述不能超过500个字符']
  },
  medicalHistory: {
    allergies: [{
      type: String,
      trim: true
    }],
    medications: [{
      type: String,
      trim: true
    }],
    conditions: [{
      type: String,
      trim: true
    }]
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '宠物必须有主人']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 添加索引
PetSchema.index({ ownerId: 1, isActive: 1 });
PetSchema.index({ name: 1, ownerId: 1 });

// 添加虚拟字段，用于转换为前端格式
PetSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// 确保虚拟字段被序列化
PetSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IPet>('Pet', PetSchema);