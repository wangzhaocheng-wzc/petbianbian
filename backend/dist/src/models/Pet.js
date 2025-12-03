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
const PetSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, '宠物名称是必填项'],
        trim: true,
        maxlength: [20, '宠物名称不能超过20个字符']
    },
    type: {
        type: String,
        required: [true, '宠物类型是必填项'],
        enum: {
            values: ['dog', 'cat', 'other'],
            message: '宠物类型必须是dog、cat或other'
        }
    },
    breed: {
        type: String,
        trim: true,
        maxlength: [50, '品种名称不能超过50个字符']
    },
    gender: {
        type: String,
        enum: {
            values: ['male', 'female'],
            message: '性别必须是male或female'
        }
    },
    age: {
        type: Number,
        min: [0, '年龄不能为负数'],
        max: [360, '年龄不能超过360个月'] // 30年
    },
    weight: {
        type: Number,
        min: [0, '体重不能为负数'],
        max: [200, '体重不能超过200kg']
    },
    avatar: {
        type: String,
        default: null
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, '描述不能超过500个字符']
    },
    medicalHistory: {
        allergies: [{
                type: String,
                trim: true
            }],
        medications: [{
                type: String,
                trim: true
            }],
        conditions: [{
                type: String,
                trim: true
            }]
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '宠物必须有主人']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// 添加索引
PetSchema.index({ ownerId: 1, isActive: 1 });
PetSchema.index({ name: 1, ownerId: 1 });
// 添加虚拟字段，用于转换为前端格式
PetSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
// 确保虚拟字段被序列化
PetSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
exports.default = mongoose_1.default.model('Pet', PetSchema);
//# sourceMappingURL=Pet.js.map