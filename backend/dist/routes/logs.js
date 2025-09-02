"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logController_1 = require("../controllers/logController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 所有日志管理接口都需要认证
router.use(auth_1.authenticateToken);
// 查询日志
router.get('/query', logController_1.queryLogs);
// 获取日志统计
router.get('/stats', logController_1.getLogStats);
// 获取错误日志
router.get('/errors', logController_1.getErrorLogs);
// 获取安全日志
router.get('/security', logController_1.getSecurityLogs);
// 获取性能日志
router.get('/performance', logController_1.getPerformanceLogs);
// 导出日志
router.get('/export', logController_1.exportLogs);
// 清理旧日志
router.post('/cleanup', logController_1.cleanupLogs);
exports.default = router;
//# sourceMappingURL=logs.js.map