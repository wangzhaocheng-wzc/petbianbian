"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recordsController_1 = require("../controllers/recordsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 所有路由都需要认证
router.use(auth_1.authenticateToken);
// 获取记录列表（支持复杂查询和筛选）
router.get('/', recordsController_1.RecordsController.getRecords);
// 获取单个记录详情
router.get('/:id', recordsController_1.RecordsController.getRecordById);
// 更新记录
router.put('/:id', recordsController_1.RecordsController.updateRecord);
// 删除记录
router.delete('/:id', recordsController_1.RecordsController.deleteRecord);
// 获取记录统计数据
router.get('/statistics/overview', recordsController_1.RecordsController.getStatisticsOverview);
// 获取宠物记录统计
router.get('/statistics/pet/:petId', recordsController_1.RecordsController.getPetStatistics);
// 获取健康趋势数据
router.get('/trends/health/:petId', recordsController_1.RecordsController.getHealthTrends);
// 获取记录聚合数据
router.get('/aggregation/summary', recordsController_1.RecordsController.getAggregationSummary);
// 批量操作
router.post('/batch/delete', recordsController_1.RecordsController.batchDeleteRecords);
router.post('/batch/update', recordsController_1.RecordsController.batchUpdateRecords);
exports.default = router;
//# sourceMappingURL=records.js.map