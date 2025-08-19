import mongoose, { Document, Schema } from 'mongoose';

export interface IPet extends Document {
  name: string;
  type: 'dog' | 'cat' | 'other';
  breed?: string;
  age?: number;
  weight?: number;
  avatar?: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PetSchema = new Schema<IPet>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  type: {
    type: String,
    required: true,
    enum: ['dog', 'cat', 'other']
  },
  breed: {
    type: String,
    trim: true,
    maxlength: 50
  },
  age: {
    type: Number,
    min: 0,
    max: 30
  },
  weight: {
    type: Number,
    min: 0,
    max: 200
  },
  avatar: {
    type: String,
    default: null
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IPet>('Pet', PetSchema);