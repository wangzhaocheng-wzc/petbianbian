"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const comparisonController_1 = require("../controllers/comparisonController");
const router = express_1.default.Router();
// 所有路由都需要认证
router.use(auth_1.authenticateToken);
/**
 * @route GET /api/comparison/pets
 * @desc 获取用户所有宠物的基本信息（用于选择对比宠物）
 * @access Private
 */
router.get('/pets', comparisonController_1.getPetsForComparison);
/**
 * @route GET /api/comparison/multi-pet
 * @desc 获取多宠物对比分析
 * @query petIds - 宠物ID列表，逗号分隔或数组格式
 * @query days - 对比天数，默认30天
 * @access Private
 */
router.get('/multi-pet', comparisonController_1.getMultiPetComparison);
/**
 * @route GET /api/comparison/trends
 * @desc 获取宠物健康趋势对比
 * @query petIds - 宠物ID列表，逗号分隔或数组格式
 * @query days - 对比天数，默认30天
 * @access Private
 */
router.get('/trends', comparisonController_1.getPetHealthTrends);
exports.default = router;
//# sourceMappingURL=comparison.js.map