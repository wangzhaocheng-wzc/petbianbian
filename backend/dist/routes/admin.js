"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// 所有管理员路由都需要管理员权限
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['admin']));
// 用户管理
router.get('/users', adminController_1.getUsers);
router.post('/users/:userId/activate', adminController_1.activateUser);
router.post('/users/:userId/deactivate', adminController_1.deactivateUser);
router.post('/users/:userId/verify', adminController_1.verifyUser);
router.post('/users/:userId/unverify', adminController_1.unverifyUser);
router.post('/users/:userId/promote', adminController_1.promoteUser);
router.post('/users/:userId/demote', adminController_1.demoteUser);
// 系统统计
router.get('/stats', adminController_1.getSystemStats);
exports.default = router;
//# sourceMappingURL=admin.js.map