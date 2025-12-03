"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeImageUrlCleanup = exports.getImageUrlPreview = exports.previewImageUrlCleanup = void 0;
const imageUrlGovernanceService_1 = require("../services/imageUrlGovernanceService");
const monitoringService_1 = require("../services/monitoringService");
const logger_1 = require("../utils/logger");
const monitoringService = monitoringService_1.MonitoringService.getInstance();
const previewImageUrlCleanup = async (req, res) => {
    const start = Date.now();
    try {
        const { limitPerModel } = req.body || {};
        const { jobId, result } = await imageUrlGovernanceService_1.ImageUrlGovernanceService.previewAll(typeof limitPerModel === 'number' ? limitPerModel : 200);
        monitoringService.recordImageUrlRewrite('backend', 'preview_batch', 'all', Date.now() - start);
        res.json({ success: true, jobId, result });
    }
    catch (error) {
        monitoringService.recordError('/api/governance/image-url/preview', error);
        logger_1.Logger.error('治理预览失败', error);
        res.status(500).json({ success: false, message: '治理预览失败' });
    }
};
exports.previewImageUrlCleanup = previewImageUrlCleanup;
const getImageUrlPreview = async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = imageUrlGovernanceService_1.ImageUrlGovernanceService.getPreview(jobId);
        if (!result) {
            res.status(404).json({ success: false, message: '未找到预览任务或已过期' });
            return;
        }
        res.json({ success: true, result });
    }
    catch (error) {
        monitoringService.recordError('/api/governance/image-url/preview/:jobId', error);
        logger_1.Logger.error('获取治理预览失败', error);
        res.status(500).json({ success: false, message: '获取预览失败' });
    }
};
exports.getImageUrlPreview = getImageUrlPreview;
const executeImageUrlCleanup = async (req, res) => {
    const start = Date.now();
    try {
        const { jobId } = req.body || {};
        if (!jobId || typeof jobId !== 'string') {
            res.status(400).json({ success: false, message: '缺少有效的jobId' });
            return;
        }
        const result = await imageUrlGovernanceService_1.ImageUrlGovernanceService.execute(jobId);
        monitoringService.recordImageUrlRewrite('backend', 'execute_batch', 'all', Date.now() - start);
        res.json({ success: true, result });
    }
    catch (error) {
        monitoringService.recordError('/api/governance/image-url/execute', error);
        logger_1.Logger.error('治理执行失败', error);
        res.status(500).json({ success: false, message: '治理执行失败' });
    }
};
exports.executeImageUrlCleanup = executeImageUrlCleanup;
//# sourceMappingURL=governanceController.js.map