"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const monitoringController_1 = require("../controllers/monitoringController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 健康检查 - 公开接口
router.get('/health', monitoringController_1.getHealthCheck);
// Prometheus指标 - 公开接口（通常由监控系统调用）
router.get('/metrics', monitoringController_1.getMetrics);
// 图片URL重写事件上报 - 公开接口（仅收集最小信息）
router.post('/image-url-rewrite', monitoringController_1.logImageUrlRewrite);
// 以下接口需要认证
router.use(auth_1.authenticateToken);
// 系统信息
router.get('/system', monitoringController_1.getSystemInfo);
// 实时监控数据
router.get('/realtime', monitoringController_1.getRealtimeStats);
// 错误统计
router.get('/errors', monitoringController_1.getErrorStats);
// 性能统计
router.get('/performance', monitoringController_1.getPerformanceStats);
exports.default = router;
//# sourceMappingURL=monitoring.js.map