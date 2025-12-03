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
exports.PoopRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// PoopRecord Schema
const PoopRecordSchema = new mongoose_1.Schema({
    petId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Pet',
        required: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String
    },
    analysis: {
        shape: {
            type: String,
            enum: ['type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7'],
            required: true
        },
        healthStatus: {
            type: String,
            enum: ['healthy', 'warning', 'concerning'],
            required: true,
            index: true
        },
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        details: {
            type: String,
            required: true
        },
        recommendations: [{
                type: String
            }],
        detectedFeatures: {
            color: String,
            texture: String,
            consistency: String,
            size: String
        }
    },
    userNotes: {
        type: String,
        maxlength: 500
    },
    symptoms: [{
            type: String,
            maxlength: 100
        }],
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    location: {
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        }
    },
    weather: {
        temperature: Number,
        humidity: {
            type: Number,
            min: 0,
            max: 100
        }
    },
    isShared: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// 索引优化
PoopRecordSchema.index({ petId: 1, timestamp: -1 });
PoopRecordSchema.index({ userId: 1, timestamp: -1 });
PoopRecordSchema.index({ 'analysis.healthStatus': 1, timestamp: -1 });
PoopRecordSchema.index({ isShared: 1, timestamp: -1 });
// 虚拟字段 - 获取宠物信息
PoopRecordSchema.virtual('pet', {
    ref: 'Pet',
    localField: 'petId',
    foreignField: '_id',
    justOne: true
});
// 虚拟字段 - 获取用户信息
PoopRecordSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});
// 实例方法 - 获取健康状态描述
PoopRecordSchema.methods.getHealthStatusDescription = function () {
    const descriptions = {
        healthy: '健康 - 便便状态正常',
        warning: '警告 - 需要关注，建议调整',
        concerning: '异常 - 建议咨询兽医'
    };
    return descriptions[this.analysis.healthStatus];
};
// 实例方法 - 获取形状描述
PoopRecordSchema.methods.getShapeDescription = function () {
    const descriptions = {
        type1: '第1型 - 硬球状（严重便秘）',
        type2: '第2型 - 块状（轻度便秘）',
        type3: '第3型 - 裂纹香肠状（正常偏硬）',
        type4: '第4型 - 光滑香肠状（理想状态）',
        type5: '第5型 - 软块状（正常偏软）',
        type6: '第6型 - 糊状（轻度腹泻）',
        type7: '第7型 - 水状（严重腹泻）'
    };
    return descriptions[this.analysis.shape];
};
// 静态方法 - 获取宠物的健康统计
PoopRecordSchema.statics.getHealthStatistics = async function (petId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const pipeline = [
        {
            $match: {
                petId: new mongoose_1.default.Types.ObjectId(petId),
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$analysis.healthStatus',
                count: { $sum: 1 }
            }
        }
    ];
    const results = await this.aggregate(pipeline);
    const statistics = {
        totalRecords: 0,
        healthyCount: 0,
        warningCount: 0,
        concerningCount: 0,
        healthyPercentage: 0,
        warningPercentage: 0,
        concerningPercentage: 0
    };
    results.forEach(result => {
        statistics.totalRecords += result.count;
        switch (result._id) {
            case 'healthy':
                statistics.healthyCount = result.count;
                break;
            case 'warning':
                statistics.warningCount = result.count;
                break;
            case 'concerning':
                statistics.concerningCount = result.count;
                break;
        }
    });
    if (statistics.totalRecords > 0) {
        statistics.healthyPercentage = Math.round((statistics.healthyCount / statistics.totalRecords) * 100);
        statistics.warningPercentage = Math.round((statistics.warningCount / statistics.totalRecords) * 100);
        statistics.concerningPercentage = Math.round((statistics.concerningCount / statistics.totalRecords) * 100);
    }
    return statistics;
};
// 静态方法 - 获取健康趋势数据
PoopRecordSchema.statics.getHealthTrends = async function (petId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const pipeline = [
        {
            $match: {
                petId: new mongoose_1.default.Types.ObjectId(petId),
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    healthStatus: '$analysis.healthStatus'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                healthy: {
                    $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'healthy'] }, '$count', 0] }
                },
                warning: {
                    $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'warning'] }, '$count', 0] }
                },
                concerning: {
                    $sum: { $cond: [{ $eq: ['$_id.healthStatus', 'concerning'] }, '$count', 0] }
                }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ];
    return await this.aggregate(pipeline);
};
// 中间件 - 保存前验证
PoopRecordSchema.pre('save', function (next) {
    // 确保timestamp不为空
    if (!this.timestamp) {
        this.timestamp = new Date();
    }
    // 验证置信度范围
    if (this.analysis.confidence < 0 || this.analysis.confidence > 100) {
        return next(new Error('置信度必须在0-100之间'));
    }
    next();
});
exports.PoopRecord = mongoose_1.default.model('PoopRecord', PoopRecordSchema);
//# sourceMappingURL=PoopRecord.js.map