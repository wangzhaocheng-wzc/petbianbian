"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const reportController_1 = require("../controllers/reportController");
const router = express_1.default.Router();
// 所有路由都需要认证
router.use(auth_1.authenticateToken);
/**
 * @route GET /api/reports/health/:petId
 * @desc 获取宠物健康报告数据
 * @param petId - 宠物ID
 * @query days - 报告天数，默认30天
 * @access Private
 */
router.get('/health/:petId', reportController_1.getHealthReportData);
/**
 * @route GET /api/reports/health/:petId/pdf
 * @desc 生成并下载PDF健康报告
 * @param petId - 宠物ID
 * @query days - 报告天数，默认30天
 * @access Private
 */
router.get('/health/:petId/pdf', reportController_1.downloadHealthReportPDF);
/**
 * @route POST /api/reports/health/:petId/generate
 * @desc 生成并保存PDF健康报告
 * @param petId - 宠物ID
 * @query days - 报告天数，默认30天
 * @access Private
 */
router.post('/health/:petId/generate', reportController_1.generateHealthReportPDF);
exports.default = router;
//# sourceMappingURL=reports.js.map