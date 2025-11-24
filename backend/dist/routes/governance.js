"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const governanceController_1 = require("../controllers/governanceController");
const governanceAnalyticsController_1 = require("../controllers/governanceAnalyticsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 所有治理接口需要管理员权限
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['admin']));
// 预览治理更改（生成预览任务并返回jobId与统计）
router.post('/image-url/preview', governanceController_1.previewImageUrlCleanup);
// 获取预览结果（通过jobId）
router.get('/image-url/preview/:jobId', governanceController_1.getImageUrlPreview);
// 执行治理（根据预览jobId落库并生成报告）
router.post('/image-url/execute', governanceController_1.executeImageUrlCleanup);
// 治理每日分析聚合（按时间范围）
router.get('/reports/daily', governanceAnalyticsController_1.getDailyAnalytics);
exports.default = router;
//# sourceMappingURL=governance.js.map