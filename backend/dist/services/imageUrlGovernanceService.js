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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageUrlGovernanceService = void 0;
exports.startGovernanceReportScheduler = startGovernanceReportScheduler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const PoopRecord_1 = require("../models/PoopRecord");
const CommunityPost_1 = __importDefault(require("../models/CommunityPost"));
const Pet_1 = __importDefault(require("../models/Pet"));
const User_1 = __importDefault(require("../models/User"));
const constants_1 = require("../config/constants");
const logger_1 = require("../utils/logger");
const monitoringService_1 = require("./monitoringService");
function getBackendOrigin() {
    return constants_1.APP_CONFIG.BASE_URL || `http://localhost:${constants_1.APP_CONFIG.PORT}`;
}
function normalizeUrl(raw, defaultDir) {
    const original = (raw || '').trim();
    if (!original)
        return { resolved: original, reason: 'none', changed: false };
    const backendOrigin = getBackendOrigin();
    let resolved = original;
    let reason = 'none';
    try {
        // 完整URL
        if (/^https?:\/\//i.test(original)) {
            const url = new URL(original);
            const backendUrl = new URL(backendOrigin);
            if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port !== backendUrl.port) {
                url.protocol = backendUrl.protocol;
                url.host = backendUrl.host;
                resolved = url.toString();
                reason = 'port_rewrite';
            }
            else {
                resolved = original; // 保持CDN或正确域名
            }
        }
        else if (/^\/\//.test(original)) {
            // 协议相对URL
            const backendProtocol = new URL(backendOrigin).protocol;
            resolved = `${backendProtocol}${original}`;
            reason = 'protocol_normalized';
        }
        else if (/^\/uploads\//.test(original)) {
            // 绝对相对路径（带/uploads前缀）
            resolved = `${backendOrigin}${original}`;
            reason = 'relative_to_absolute';
        }
        else if (/^uploads\//.test(original)) {
            // 相对路径，补全为后端origin
            resolved = `${backendOrigin}/${original}`;
            reason = 'relative_to_absolute';
        }
        else if (/^(analysis|avatars|community)\//.test(original)) {
            // 历史中仅存储子目录，补全/uploads
            resolved = `${backendOrigin}/uploads/${original}`;
            reason = 'uploads_prefix_added';
        }
        else if (/^\/images\//.test(original)) {
            // 历史相对路径 /images/xxx.jpg -> 假定为默认目录
            const fname = original.replace(/^\/images\//, '');
            resolved = `${backendOrigin}/uploads/${defaultDir}/${fname}`;
            reason = 'uploads_prefix_added';
        }
        else if (!original.includes('/')) {
            // 仅文件名，按默认目录
            resolved = `${backendOrigin}/uploads/${defaultDir}/${original}`;
            reason = 'uploads_prefix_added';
        }
        else if (/^\//.test(original)) {
            // 其他以/开头但非/uploads的情况，按静态资源或历史相对路径处理
            resolved = `${backendOrigin}${original}`;
            reason = 'relative_to_absolute';
        }
        else {
            // 无法识别的格式，尝试按相对路径处理
            resolved = `${backendOrigin}/${original}`;
            reason = 'relative_to_absolute';
        }
    }
    catch {
        resolved = original;
        reason = 'invalid';
    }
    return { resolved, reason, changed: resolved !== original };
}
// 预览作业的临时存储（内存），可在确认后执行
const previewStore = new Map();
function ensureReportDir() {
    const reportDir = path_1.default.join(__dirname, '../../logs/data-governance');
    if (!fs_1.default.existsSync(reportDir)) {
        fs_1.default.mkdirSync(reportDir, { recursive: true });
    }
    return reportDir;
}
class ImageUrlGovernanceService {
    static async previewAll(limitPerModel = 100) {
        // 在 Postgres 模式下跳过 Mongo 依赖的预览逻辑
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const startedAt = Date.now();
            const finishedAt = startedAt;
            const result = {
                startedAt,
                finishedAt,
                durationMs: 0,
                summary: { totalCandidates: 0, byModel: {}, byReason: {} },
                sampleChanges: []
            };
            const jobId = `gov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            previewStore.set(jobId, { createdAt: Date.now(), result });
            return { jobId, result };
        }
        const startedAt = Date.now();
        const summaryByModel = {};
        const summaryByReason = {};
        const sampleChanges = [];
        // PoopRecord: imageUrl, thumbnailUrl
        const poopCandidates = await PoopRecord_1.PoopRecord.find({}, { imageUrl: 1, thumbnailUrl: 1 }).limit(limitPerModel).lean();
        for (const doc of poopCandidates) {
            for (const field of ['imageUrl', 'thumbnailUrl']) {
                const raw = doc[field];
                if (!raw)
                    continue;
                const { resolved, reason, changed } = normalizeUrl(raw, 'analysis');
                if (changed) {
                    sampleChanges.push({ model: 'PoopRecord', docId: doc._id.toString(), field, original: raw, resolved, reason });
                    summaryByModel['PoopRecord'] = (summaryByModel['PoopRecord'] || 0) + 1;
                    summaryByReason[reason] = (summaryByReason[reason] || 0) + 1;
                }
            }
        }
        // CommunityPost: images[]
        const postCandidates = await CommunityPost_1.default.find({}, { images: 1 }).limit(limitPerModel).lean();
        for (const doc of postCandidates) {
            const images = doc.images || [];
            for (const raw of images) {
                const { resolved, reason, changed } = normalizeUrl(raw, 'community');
                if (changed) {
                    sampleChanges.push({ model: 'CommunityPost', docId: doc._id.toString(), field: 'images[]', original: raw, resolved, reason });
                    summaryByModel['CommunityPost'] = (summaryByModel['CommunityPost'] || 0) + 1;
                    summaryByReason[reason] = (summaryByReason[reason] || 0) + 1;
                }
            }
        }
        // Pet: avatar
        const petCandidates = await Pet_1.default.find({ avatar: { $ne: null } }, { avatar: 1 }).limit(limitPerModel).lean();
        for (const doc of petCandidates) {
            const raw = doc.avatar;
            const { resolved, reason, changed } = normalizeUrl(raw, 'avatars');
            if (changed) {
                sampleChanges.push({ model: 'Pet', docId: doc._id.toString(), field: 'avatar', original: raw, resolved, reason });
                summaryByModel['Pet'] = (summaryByModel['Pet'] || 0) + 1;
                summaryByReason[reason] = (summaryByReason[reason] || 0) + 1;
            }
        }
        // User: avatar
        const userCandidates = await User_1.default.find({ avatar: { $ne: null } }, { avatar: 1 }).limit(limitPerModel).lean();
        for (const doc of userCandidates) {
            const raw = doc.avatar;
            const { resolved, reason, changed } = normalizeUrl(raw, 'avatars');
            if (changed) {
                sampleChanges.push({ model: 'User', docId: doc._id.toString(), field: 'avatar', original: raw, resolved, reason });
                summaryByModel['User'] = (summaryByModel['User'] || 0) + 1;
                summaryByReason[reason] = (summaryByReason[reason] || 0) + 1;
            }
        }
        const finishedAt = Date.now();
        const result = {
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            summary: {
                totalCandidates: sampleChanges.length,
                byModel: summaryByModel,
                byReason: summaryByReason,
            },
            sampleChanges,
        };
        const jobId = `gov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        previewStore.set(jobId, { createdAt: Date.now(), result });
        // 清理过期预览（保留30分钟）
        for (const [id, data] of previewStore) {
            if (Date.now() - data.createdAt > 30 * 60 * 1000)
                previewStore.delete(id);
        }
        return { jobId, result };
    }
    static getPreview(jobId) {
        return previewStore.get(jobId)?.result || null;
    }
    static async execute(jobId) {
        // 在 Postgres 模式下跳过 Mongo 执行逻辑
        const dbPrimary = process.env.DB_PRIMARY || 'postgres';
        if (dbPrimary === 'postgres') {
            const startedAt = Date.now();
            const finishedAt = startedAt;
            return {
                startedAt,
                finishedAt,
                durationMs: 0,
                summary: { totalCandidates: 0, byModel: {}, byReason: {} },
                sampleChanges: [],
                updatedCount: 0,
                failedCount: 0,
                failures: [],
                reportFile: undefined,
                modelDurationsMs: {}
            };
        }
        const preview = previewStore.get(jobId)?.result;
        const startedAt = Date.now();
        const byModel = { PoopRecord: 0, CommunityPost: 0, Pet: 0, User: 0 };
        const byReason = {};
        const failures = [];
        let updatedCount = 0;
        const monitoringService = monitoringService_1.MonitoringService.getInstance();
        if (!preview) {
            // 若预览不存在，则执行全量扫描并修复（谨慎）
            const { jobId: newJobId, result } = await this.previewAll(5000);
            previewStore.set(newJobId, { createdAt: Date.now(), result });
            return this.execute(newJobId);
        }
        // 将预览的sample作为修复依据进行更新
        const bulkOpsByModel = {
            PoopRecord: [],
            CommunityPost: [],
            Pet: [],
            User: [],
        };
        for (const change of preview.sampleChanges) {
            byModel[change.model] = (byModel[change.model] || 0) + 1;
            byReason[change.reason] = (byReason[change.reason] || 0) + 1;
            // 记录重写事件（后台治理）
            try {
                monitoringService.recordImageUrlRewrite('backend', change.reason, change.model);
            }
            catch { }
            // 构建批量操作
            try {
                switch (change.model) {
                    case 'PoopRecord':
                        bulkOpsByModel.PoopRecord.push({
                            updateOne: {
                                filter: { _id: new mongoose_1.default.Types.ObjectId(change.docId) },
                                update: { $set: { [change.field]: change.resolved } }
                            }
                        });
                        break;
                    case 'CommunityPost':
                        // images[] 替换对应元素
                        bulkOpsByModel.CommunityPost.push({
                            updateOne: {
                                filter: { _id: new mongoose_1.default.Types.ObjectId(change.docId), images: change.original },
                                update: { $set: { 'images.$': change.resolved } }
                            }
                        });
                        break;
                    case 'Pet':
                        bulkOpsByModel.Pet.push({
                            updateOne: {
                                filter: { _id: new mongoose_1.default.Types.ObjectId(change.docId) },
                                update: { $set: { avatar: change.resolved } }
                            }
                        });
                        break;
                    case 'User':
                        bulkOpsByModel.User.push({
                            updateOne: {
                                filter: { _id: new mongoose_1.default.Types.ObjectId(change.docId) },
                                update: { $set: { avatar: change.resolved } }
                            }
                        });
                        break;
                }
            }
            catch (err) {
                failures.push({ model: change.model, docId: change.docId, field: change.field, error: err?.message || 'unknown' });
            }
        }
        // 执行批量写入
        const modelDurationsMs = {};
        const execBulk = async (modelName, model) => {
            const ops = bulkOpsByModel[modelName];
            if (!ops.length)
                return;
            const t0 = Date.now();
            const res = await model.bulkWrite(ops, { ordered: false });
            updatedCount += (res.modifiedCount || 0) + (res.upsertedCount || 0);
            modelDurationsMs[modelName] = (Date.now() - t0);
        };
        await execBulk('PoopRecord', PoopRecord_1.PoopRecord);
        await execBulk('CommunityPost', CommunityPost_1.default);
        await execBulk('Pet', Pet_1.default);
        await execBulk('User', User_1.default);
        const finishedAt = Date.now();
        const reportDir = ensureReportDir();
        const reportPath = path_1.default.join(reportDir, `image-url-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        const result = {
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            summary: {
                totalCandidates: preview.sampleChanges.length,
                byModel,
                byReason,
            },
            sampleChanges: preview.sampleChanges,
            updatedCount,
            failedCount: failures.length,
            failures,
            reportFile: reportPath,
            modelDurationsMs
        };
        // 写入报告
        try {
            fs_1.default.writeFileSync(reportPath, JSON.stringify(result, null, 2));
            logger_1.Logger.info(`数据治理报告已生成: ${reportPath}`);
        }
        catch (err) {
            logger_1.Logger.error('写入数据治理报告失败', err);
        }
        // 记录治理进度指标
        try {
            monitoringService.recordGovernanceProgress(byModel, {
                PoopRecord: 0,
                CommunityPost: 0,
                Pet: 0,
                User: 0,
            });
        }
        catch { }
        // 异常重写事件告警（invalid超阈值或占比过高）
        try {
            const invalidCount = byReason['invalid'] || 0;
            const total = preview.sampleChanges.length || 1;
            const invalidPct = invalidCount / total;
            const ALERT_COUNT = parseInt(process.env.IMAGE_URL_INVALID_ALERT_COUNT || '50');
            const ALERT_PCT = parseFloat(process.env.IMAGE_URL_INVALID_ALERT_PCT || '0.05');
            if (invalidCount >= ALERT_COUNT || invalidPct >= ALERT_PCT) {
                const admin = await User_1.default.findOne({ role: 'admin' }).lean();
                if (admin) {
                    const { NotificationService } = await Promise.resolve().then(() => __importStar(require('./notificationService')));
                    await NotificationService.createNotification({
                        userId: admin._id.toString(),
                        type: 'alert',
                        category: 'general',
                        title: '图片URL治理异常告警',
                        message: `本次治理发现异常URL ${invalidCount} 条，占比 ${(invalidPct * 100).toFixed(2)}% 。请检查数据源与解析逻辑。`,
                        data: {
                            anomalyType: 'image_url_governance_invalid',
                            severity: invalidPct >= 0.2 ? 'high' : invalidPct >= 0.1 ? 'medium' : 'low',
                            metadata: { byReason, byModel, reportFile: reportPath }
                        },
                        priority: invalidPct >= 0.2 ? 'urgent' : invalidPct >= 0.1 ? 'high' : 'normal',
                        channels: { inApp: true, email: true }
                    });
                    logger_1.Logger.warn('图片URL治理异常告警已发送');
                }
                else {
                    logger_1.Logger.warn('未找到管理员用户，无法发送治理异常告警');
                }
            }
        }
        catch (err) {
            logger_1.Logger.error('发送治理异常告警失败', err);
        }
        return result;
    }
}
exports.ImageUrlGovernanceService = ImageUrlGovernanceService;
// 定期报告任务（每日）
function startGovernanceReportScheduler() {
    const dbPrimary = process.env.DB_PRIMARY || 'postgres';
    if (dbPrimary === 'postgres') {
        logger_1.Logger.info('Postgres 模式下不启动图片URL治理的每日预览任务');
        return;
    }
    const oneDayMs = 24 * 60 * 60 * 1000;
    setInterval(async () => {
        try {
            const { result } = await ImageUrlGovernanceService.previewAll(500);
            const reportDir = ensureReportDir();
            const reportPath = path_1.default.join(reportDir, `daily-preview-${new Date().toISOString().slice(0, 10)}.json`);
            fs_1.default.writeFileSync(reportPath, JSON.stringify(result, null, 2));
            logger_1.Logger.info(`每日数据治理预览报告生成: ${reportPath}`);
        }
        catch (err) {
            logger_1.Logger.error('每日数据治理预览失败', err);
        }
    }, oneDayMs);
}
//# sourceMappingURL=imageUrlGovernanceService.js.map