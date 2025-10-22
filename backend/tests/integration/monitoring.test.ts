import request from 'supertest';
import express from 'express';
import monitoringRoutes from '../../src/routes/monitoring';

// 构建最小可运行的应用，仅挂载监控路由
const app = express();
app.use('/api/monitoring', monitoringRoutes);

describe('Integration: Monitoring', () => {
  it('GET /api/monitoring/health should return health status', async () => {
    const res = await request(app)
      .get('/api/monitoring/health')
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.data.status);
  });
});