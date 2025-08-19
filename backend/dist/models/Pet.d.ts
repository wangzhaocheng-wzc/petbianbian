import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IPet, {}, {}, {}, mongoose.Document<unknown, {}, IPet> & IPet & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Pet.d.ts.map