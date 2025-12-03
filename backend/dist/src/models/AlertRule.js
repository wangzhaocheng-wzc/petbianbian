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
exports.AlertRule = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// 提醒规则Schema
const AlertRuleSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    petId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Pet',
        index: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    triggers: {
        anomalyTypes: [{
                type: String,
                enum: ['frequency', 'health_decline', 'pattern_change', 'consistency_change'],
                required: true
            }],
        severityLevels: [{
                type: String,
                enum: ['low', 'medium', 'high'],
                required: true
            }],
        minimumConfidence: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 70
        }
    },
    notifications: {
        inApp: {
            type: Boolean,
            default: true
        },
        email: {
            type: Boolean,
            default: false
        },
        push: {
            type: Boolean,
            default: false
        }
    },
    frequency: {
        maxPerDay: {
            type: Number,
            default: 3,
            min: 1,
            max: 10
        },
        maxPerWeek: {
            type: Number,
            default: 10,
            min: 1,
            max: 50
        },
        cooldownHours: {
            type: Number,
            default: 6,
            min: 1,
            max: 72
        }
    },
    customConditions: {
        frequencyThreshold: {
            minPerWeek: {
                type: Number,
                min: 1,
                max: 50
            },
            maxPerWeek: {
                type: Number,
                min: 1,
                max: 100
            }
        },
        healthDeclineThreshold: {
            concerningRatio: {
                type: Number,
                min: 0.1,
                max: 1.0
            },
            consecutiveConcerning: {
                type: Number,
                min: 2,
                max: 10
            }
        },
        patternChangeThreshold: {
            shapeVariationLimit: {
                type: Number,
                min: 2,
                max: 7
            },
            consistencyChangeRatio: {
                type: Number,
                min: 0.1,
                max: 1.0
            }
        }
    },
    stats: {
        totalTriggered: {
            type: Number,
            default: 0
        },
        lastTriggered: {
            type: Date
        },
        totalNotificationsSent: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// 索引优化
AlertRuleSchema.index({ userId: 1, isActive: 1 });
AlertRuleSchema.index({ petId: 1, isActive: 1 });
AlertRuleSchema.index({ 'stats.lastTriggered': -1 });
// 虚拟字段 - 获取用户信息
AlertRuleSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});
// 虚拟字段 - 获取宠物信息
AlertRuleSchema.virtual('pet', {
    ref: 'Pet',
    localField: 'petId',
    foreignField: '_id',
    justOne: true
});
// 实例方法 - 检查是否可以触发
AlertRuleSchema.methods.canTrigger = function () {
    if (!this.isActive)
        return false;
    const now = new Date();
    // 检查冷却时间
    if (this.stats.lastTriggered) {
        const cooldownMs = this.frequency.cooldownHours * 60 * 60 * 1000;
        if (now.getTime() - this.stats.lastTriggered.getTime() < cooldownMs) {
            return false;
        }
    }
    // 检查每日限制
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTriggered = this.stats.lastTriggered && this.stats.lastTriggered >= today ? 1 : 0;
    if (todayTriggered >= this.frequency.maxPerDay) {
        return false;
    }
    // 检查每周限制
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // 这里简化处理，实际应该查询数据库统计一周内的触发次数
    return true;
};
// 实例方法 - 检查异常是否匹配规则
AlertRuleSchema.methods.matchesAnomaly = function (anomaly) {
    // 检查异常类型
    if (!this.triggers.anomalyTypes.includes(anomaly.anomalyType)) {
        return false;
    }
    // 检查严重程度
    if (!this.triggers.severityLevels.includes(anomaly.severity)) {
        return false;
    }
    // 检查置信度
    if (anomaly.confidence < this.triggers.minimumConfidence) {
        return false;
    }
    return true;
};
// 实例方法 - 记录触发
AlertRuleSchema.methods.recordTrigger = async function () {
    this.stats.totalTriggered += 1;
    this.stats.lastTriggered = new Date();
    await this.save();
};
// 静态方法 - 获取用户的活跃规则
AlertRuleSchema.statics.getActiveRulesForUser = async function (userId, petId) {
    const filter = {
        userId: new mongoose_1.default.Types.ObjectId(userId),
        isActive: true
    };
    if (petId) {
        filter.$or = [
            { petId: new mongoose_1.default.Types.ObjectId(petId) },
            { petId: { $exists: false } }
        ];
    }
    return await this.find(filter)
        .populate('pet', 'name type breed')
        .sort({ createdAt: -1 });
};
// 静态方法 - 创建默认规则
AlertRuleSchema.statics.createDefaultRules = async function (userId) {
    const defaultRules = [
        {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            name: '健康状态恶化警告',
            description: '当宠物健康状态持续恶化时发送警告',
            triggers: {
                anomalyTypes: ['health_decline'],
                severityLevels: ['medium', 'high'],
                minimumConfidence: 70
            },
            notifications: {
                inApp: true,
                email: true
            },
            frequency: {
                maxPerDay: 2,
                maxPerWeek: 5,
                cooldownHours: 12
            }
        },
        {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            name: '排便频率异常',
            description: '当排便频率过高或过低时发送提醒',
            triggers: {
                anomalyTypes: ['frequency'],
                severityLevels: ['medium', 'high'],
                minimumConfidence: 60
            },
            notifications: {
                inApp: true,
                email: false
            },
            frequency: {
                maxPerDay: 1,
                maxPerWeek: 3,
                cooldownHours: 24
            }
        },
        {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            name: '排便模式变化',
            description: '当排便模式发生显著变化时发送通知',
            triggers: {
                anomalyTypes: ['pattern_change', 'consistency_change'],
                severityLevels: ['high'],
                minimumConfidence: 80
            },
            notifications: {
                inApp: true,
                email: true
            },
            frequency: {
                maxPerDay: 1,
                maxPerWeek: 2,
                cooldownHours: 48
            }
        }
    ];
    try {
        await this.insertMany(defaultRules);
        return defaultRules.length;
    }
    catch (error) {
        // 忽略重复创建错误
        return 0;
    }
};
// 中间件 - 保存前验证
AlertRuleSchema.pre('save', function (next) {
    // 验证频率设置
    if (this.frequency.maxPerDay > this.frequency.maxPerWeek) {
        return next(new Error('每日最大次数不能超过每周最大次数'));
    }
    // 验证自定义条件
    if (this.customConditions?.frequencyThreshold) {
        const { minPerWeek, maxPerWeek } = this.customConditions.frequencyThreshold;
        if (minPerWeek && maxPerWeek && minPerWeek >= maxPerWeek) {
            return next(new Error('最小频率不能大于等于最大频率'));
        }
    }
    next();
});
exports.AlertRule = mongoose_1.default.model('AlertRule', AlertRuleSchema);
//# sourceMappingURL=AlertRule.js.map