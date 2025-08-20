"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysisController_1 = require("../controllers/analysisController");
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 所有路由都需要认证
router.use(auth_1.authenticateToken);
// 上传图片进行分析
router.post('/upload', (0, upload_1.uploadSingle)('image'), upload_1.handleUploadError, analysisController_1.AnalysisController.uploadForAnalysis);
// 获取分析记录
router.get('/records/:petId', analysisController_1.AnalysisController.getAnalysisRecords);
// 获取单个分析记录
router.get('/record/:id', analysisController_1.AnalysisController.getAnalysisRecord);
// 获取分析统计
router.get('/statistics/:petId', analysisController_1.AnalysisController.getAnalysisStatistics);
// 删除分析记录
router.delete('/record/:id', analysisController_1.AnalysisController.deleteAnalysisRecord);
exports.default = router;
//# sourceMappingURL=analysis.js.map