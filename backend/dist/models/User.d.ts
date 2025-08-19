import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    avatar?: string;
    profile: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        location?: string;
        bio?: string;
    };
    preferences: {
        notifications: boolean;
        emailUpdates: boolean;
        language: string;
    };
    stats: {
        totalAnalysis: number;
        totalPosts: number;
        reputation: number;
    };
    isActive: boolean;
    isVerified: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map