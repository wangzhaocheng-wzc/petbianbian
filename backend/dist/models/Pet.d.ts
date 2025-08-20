import mongoose, { Document } from 'mongoose';
export interface IPet extends Document {
    name: string;
    type: 'dog' | 'cat' | 'other';
    breed?: string;
    gender?: 'male' | 'female';
    age?: number;
    weight?: number;
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
declare const _default: mongoose.Model<IPet, {}, {}, {}, mongoose.Document<unknown, {}, IPet> & IPet & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Pet.d.ts.map