"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ContentReportSchema = new mongoose_1.Schema({
    reporterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetType: {
        type: String,
        enum: ['post', 'comment'],
        required: true,
        index: true
    },
    targetId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'harassment', 'violence', 'hate_speech', 'misinformation', 'other'],
        required: true,
        index: true
    },
    description: {
        type: String,
        maxlength: [1000, '举报描述不能超过1000个字符'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
        default: 'pending',
        index: true
    },
    reviewerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNotes: {
        type: String,
        maxlength: [2000, '审核备注不能超过2000个字符'],
        trim: true
    },
    action: {
        type: String,
        enum: ['none', 'warning', 'content_removed', 'user_suspended', 'user_banned'],
        default: 'none'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// 复合索引
ContentReportSchema.index({ targetType: 1, targetId: 1 });
ContentReportSchema.index({ status: 1, createdAt: -1 });
ContentReportSchema.index({ reporterId: 1, createdAt: -1 });
// 虚拟字段
ContentReportSchema.virtual('reporter', {
    ref: 'User',
    localField: 'reporterId',
    foreignField: '_id',
    justOne: true
});
ContentReportSchema.virtual('reviewer', {
    ref: 'User',
    localField: 'reviewerId',
    foreignField: '_id',
    justOne: true
});
// 静态方法：获取待审核的举报
ContentReportSchema.statics.findPendingReports = function (options = {}) {
    const query = this.find({ status: 'pending' });
    if (options.targetType)
        query.where('targetType', options.targetType);
    if (options.reason)
        query.where('reason', options.reason);
    if (options.limit)
        query.limit(options.limit);
    if (options.skip)
        query.skip(options.skip);
    return query.sort({ createdAt: -1 })
        .populate('reporterId', 'username avatar')
        .populate('reviewerId', 'username avatar');
};
// 静态方法：获取用户的举报历史
ContentReportSchema.statics.findByReporter = function (reporterId, options = {}) {
    const query = this.find({ reporterId });
    if (options.status)
        query.where('status', options.status);
    if (options.limit)
        query.limit(options.limit);
    if (options.skip)
        query.skip(options.skip);
    return query.sort({ createdAt: -1 });
};
// 实例方法：分配审核员
ContentReportSchema.methods.assignReviewer = function (reviewerId) {
    this.reviewerId = reviewerId;
    this.status = 'reviewing';
    return this.save();
};
// 实例方法：完成审核
ContentReportSchema.methods.completeReview = function (action, reviewNotes) {
    this.action = action;
    this.reviewNotes = reviewNotes;
    this.status = action === 'none' ? 'dismissed' : 'resolved';
    return this.save();
};
exports.default = mongoose_1.default.model('ContentReport', ContentReportSchema);
//# sourceMappingURL=ContentReport.js.map