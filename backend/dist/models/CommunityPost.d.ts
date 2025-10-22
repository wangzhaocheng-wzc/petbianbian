import mongoose, { Document } from 'mongoose';
export interface ICommunityPost extends Document {
    userId: mongoose.Types.ObjectId;
    petId?: mongoose.Types.ObjectId;
    title: string;
    content: string;
    images: string[];
    tags: string[];
    category: 'health' | 'help' | 'experience' | 'general';
    status: 'published' | 'draft' | 'archived';
    isAnonymous: boolean;
    interactions: {
        likes: mongoose.Types.ObjectId[];
        views: number;
        shares: number;
    };
    comments: mongoose.Types.ObjectId[];
    isSticky: boolean;
    isFeatured: boolean;
    moderationStatus: 'approved' | 'pending' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICommunityPost, {}, {}, {}, mongoose.Document<unknown, {}, ICommunityPost> & ICommunityPost & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=CommunityPost.d.ts.map