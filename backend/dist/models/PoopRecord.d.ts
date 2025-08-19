import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IPoopRecord, {}, {}, {}, mongoose.Document<unknown, {}, IPoopRecord> & IPoopRecord & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=PoopRecord.d.ts.map