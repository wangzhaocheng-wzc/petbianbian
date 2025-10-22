"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const monitoring_1 = __importDefault(require("../../src/routes/monitoring"));
// 构建最小可运行的应用，仅挂载监控路由
const app = (0, express_1.default)();
app.use('/api/monitoring', monitoring_1.default);
describe('Integration: Monitoring', () => {
    it('GET /api/monitoring/health should return health status', async () => {
        const res = await (0, supertest_1.default)(app)
            .get('/api/monitoring/health')
            .expect(200);
        expect(res.body).toBeDefined();
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.data.status);
    });
});
//# sourceMappingURL=monitoring.test.js.map