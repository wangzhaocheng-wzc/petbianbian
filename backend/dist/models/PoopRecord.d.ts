import mongoose, { Document } from 'mongoose';
export interface IPoopRecord extends Document {
    petId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    imageUrl: string;
    thumbnailUrl?: string;
    analysis: {
        shape: 'type1' | 'type2' | 'type3' | 'type4' | 'type5' | 'type6' | 'type7';
        healthStatus: 'healthy' | 'warning' | 'concerning';
        confidence: number;
        details: string;
        recommendations: string[];
        detectedFeatures: {
            color: string;
            texture: string;
            consistency: string;
            size: string;
        };
    };
    userNotes?: string;
    symptoms?: string[];
    timestamp: Date;
    location?: {
        latitude: number;
        longitude: number;
    };
    weather?: {
        temperature: number;
        humidity: number;
    };
    isShared: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PoopRecord: mongoose.Model<IPoopRecord, {}, {}, {}, mongoose.Document<unknown, {}, IPoopRecord> & IPoopRecord & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=PoopRecord.d.ts.map