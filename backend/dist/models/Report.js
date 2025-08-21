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
const ReportSchema = new mongoose_1.Schema({
    reporterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetType: {
        type: String,
        enum: ['post', 'comment', 'user'],
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
        enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'],
        required: true,
        index: true
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending',
        index: true
    },
    reviewerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNotes: {
        type: String,
        maxlength: 1000,
        trim: true
    }
}, {
    timestamps: true
});
// 索引优化
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
// 防止重复举报
ReportSchema.index({
    reporterId: 1,
    targetType: 1,
    targetId: 1
}, { unique: true });
exports.default = mongoose_1.default.model('Report', ReportSchema);
//# sourceMappingURL=Report.js.map