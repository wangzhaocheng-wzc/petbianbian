// Simple test to verify monitoring system works
const express = require('express');
const app = express();

// Import the monitoring service
const { MonitoringService, monitoringMiddleware } = require('./dist/services/monitoringService');
const { Logger } = require('./dist/utils/logger');

app.use(express.json());
app.use(monitoringMiddleware);

// Test health check endpoint
app.get('/api/monitoring/health', async (req, res) => {
  try {
    const monitoringService = MonitoringService.getInstance();
    const healthCheck = await monitoringService.getHealthCheck();
    
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    });
  }
});

// Test metrics endpoint
app.get('/api/monitoring/metrics', async (req, res) => {
  try {
    const monitoringService = MonitoringService.getInstance();
    const metrics = await monitoringService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      message: '获取指标失败',
      error: error.message
    });
  }
});

// Test system info endpoint
app.get('/api/monitoring/system', (req, res) => {
  try {
    const monitoringService = MonitoringService.getInstance();
    const systemInfo = monitoringService.getSystemInfo();
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      success: false,
      message: '获取系统信息失败',
      error: error.message
    });
  }
});

// Test route to generate some metrics
app.get('/test', (req, res) => {
  Logger.info('Test endpoint accessed');
  res.json({ message: 'Test successful', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Monitoring test server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/monitoring/health`);
  console.log(`Metrics: http://localhost:${PORT}/api/monitoring/metrics`);
  console.log(`System info: http://localhost:${PORT}/api/monitoring/system`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
});