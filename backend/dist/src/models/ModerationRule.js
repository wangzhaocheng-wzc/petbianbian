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
const ModerationRuleSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, '规则名称是必需的'],
        trim: true,
        maxlength: [100, '规则名称不能超过100个字符']
    },
    description: {
        type: String,
        required: [true, '规则描述是必需的'],
        trim: true,
        maxlength: [500, '规则描述不能超过500个字符']
    },
    type: {
        type: String,
        enum: ['keyword', 'pattern', 'length', 'frequency', 'custom'],
        required: true,
        index: true
    },
    config: {
        keywords: [{
                type: String,
                trim: true
            }],
        patterns: [{
                type: String,
                trim: true
            }],
        minLength: {
            type: Number,
            min: 0
        },
        maxLength: {
            type: Number,
            min: 0
        },
        maxFrequency: {
            type: Number,
            min: 1
        },
        timeWindow: {
            type: Number,
            min: 1,
            default: 60 // 默认60分钟
        },
        customScript: {
            type: String,
            trim: true
        }
    },
    action: {
        type: String,
        enum: ['flag', 'auto_reject', 'require_approval', 'warning'],
        required: true,
        index: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    appliesTo: [{
            type: String,
            enum: ['post', 'comment'],
            required: true
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// 索引
ModerationRuleSchema.index({ isActive: 1, type: 1 });
ModerationRuleSchema.index({ severity: 1, isActive: 1 });
ModerationRuleSchema.index({ appliesTo: 1, isActive: 1 });
// 静态方法：获取活跃的审核规则
ModerationRuleSchema.statics.findActiveRules = function (contentType) {
    const query = this.find({ isActive: true });
    if (contentType) {
        query.where('appliesTo').in([contentType]);
    }
    return query.sort({ severity: -1, createdAt: -1 });
};
// 静态方法：按类型获取规则
ModerationRuleSchema.statics.findByType = function (type, contentType) {
    const query = this.find({ type, isActive: true });
    if (contentType) {
        query.where('appliesTo').in([contentType]);
    }
    return query.sort({ severity: -1 });
};
exports.default = mongoose_1.default.model('ModerationRule', ModerationRuleSchema);
//# sourceMappingURL=ModerationRule.js.map