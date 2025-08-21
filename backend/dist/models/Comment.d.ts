import mongoose, { Document } from 'mongoose';
export interface IComment extends Document {
    postId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    parentId?: mongoose.Types.ObjectId;
    content: string;
    likes: mongoose.Types.ObjectId[];
    isDeleted: boolean;
    moderationStatus: 'approved' | 'pending' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment> & IComment & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Comment.d.ts.map