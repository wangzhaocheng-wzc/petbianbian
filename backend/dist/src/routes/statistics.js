"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statisticsController_1 = require("../controllers/statisticsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 所有统计路由都需要认证
router.use(auth_1.authenticateToken);
// 健康趋势分析
router.get('/trends/health/:petId', statisticsController_1.StatisticsController.getHealthTrends);
// 周期统计数据
router.get('/period/:petId', statisticsController_1.StatisticsController.getPeriodStatistics);
// 异常模式检测
router.get('/anomalies/:petId', statisticsController_1.StatisticsController.getAnomalyPatterns);
// 对比分析
router.get('/comparison/:petId', statisticsController_1.StatisticsController.getComparisonAnalysis);
// 多宠物统计汇总
router.get('/summary/multi-pet', statisticsController_1.StatisticsController.getMultiPetSummary);
// 用户整体统计
router.get('/overview/user', statisticsController_1.StatisticsController.getUserOverview);
exports.default = router;
//# sourceMappingURL=statistics.js.map