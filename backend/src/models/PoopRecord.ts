import mongoose, { Document, Schema } from 'mongoose';

export interface IPoopRecord extends Document {
  petId: mongoose.Types.ObjectId;
  imageUrl: string;
  shape: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6' | 'type7';
  healthStatus: 'healthy' | 'warning' | 'concerning';
  notes?: string;
  timestamp: Date;
  aiAnalysis?: {
    confidence: number;
    details: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PoopRecordSchema = new Schema<IPoopRecord>({
  petId: {
    type: Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  shape: {
    type: String,
    required: true,
    enum: ['type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7']
  },
  healthStatus: {
    type: String,
    required: true,
    enum: ['healthy', 'warning', 'concerning']
  },
  notes: {
    type: String,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  aiAnalysis: {
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    details: {
      type: String,
      maxlength: 1000
    }
  }
}, {
  timestamps: true
});

export default mongoose.model<IPoopRecord>('PoopRecord', PoopRecordSchema);