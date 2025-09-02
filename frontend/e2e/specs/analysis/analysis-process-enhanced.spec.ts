import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import path from 'path';
import fs from 'fs';

/**
 * 便便分析流程增强测试套件
 * 测试分析进度监控、取消分析、结果准确性和一致性、历史对比和趋势分析
 */
test.describe('便便分析流程增强测试', () => {
  let analysisPage: AnalysisPage;
  let authPage: AuthPage;
  let dataManager: TestDataManager;
  let testUser: any;
  let testPet: any;

  test.beforeEach(async ({ page, request }) => {
    analysisPage = new AnalysisPage(page);
    authPage = new AuthPage(page);
    dataManager = new TestDataManager(request);
    await dataManager.init();

    // 创建测试用户和宠物
    testUser = await dataManager.createTestUser({
      username: 'analysis_process_user',
      email: 'process@test.com',
      password: 'TestPass123!'
    });

    testPet = await dataManager.createTestPet(testUser.id!, {
      name: 'ProcessTestPet',
      type: 'dog',
      breed: 'Labrador',
      age: 4,
      weight: 28.0
    });

    // 登录用户
    await authPage.login(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await dataManager.cleanup();
  });

  test.describe('分析进度监控测试', () => {
    test('应该显示详细的分析进度', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建测试图片
      const testImagePath = await createTestImage('progress-test.jpg');

      try {
        // 上传图片并选择宠物
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 监控分析进度
        const progressUpdates: any[] = [];
        
        // 使用自定义进度监控
        await analysisPage.monitorAnalysisStatus((status, progress) => {
          progressUpdates.push({ status, progress, timestamp: Date.now() });
        });

        // 验证进度更新
        expect(progressUpdates.length).toBeGreaterThan(0);
        
        // 验证进度递增
        for (let i = 1; i < progressUpdates.length; i++) {
          expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(progressUpdates[i - 1].progress);
        }

        // 验证最终状态
        const finalUpdate = progressUpdates[progressUpdates.length - 1];
        expect(finalUpdate.progress).toBe(100);
        expect(finalUpdate.status).toContain('完成');

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该显示分析阶段信息', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('stages-test.jpg');

      try {
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 验证分析阶段
        const expectedStages = [
          '图片预处理',
          '特征提取',
          'AI分析',
          '结果生成',
          '完成'
        ];

        for (const stage of expectedStages) {
          // 等待当前阶段出现
          await analysisPage.waitForAnalysisStage(stage);
          
          // 验证阶段状态
          const stageInfo = await analysisPage.getCurrentAnalysisStage();
          expect(stageInfo.currentStage).toBe(stage);
          expect(stageInfo.isActive).toBe(true);
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该显示预估剩余时间', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('time-estimate-test.jpg');

      try {
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 等待时间估算出现
        await analysisPage.waitForTimeEstimate();

        // 获取时间估算
        const timeEstimate = await analysisPage.getTimeEstimate();
        expect(timeEstimate.hasEstimate).toBe(true);
        expect(timeEstimate.remainingSeconds).toBeGreaterThan(0);
        expect(timeEstimate.remainingSeconds).toBeLessThan(300); // 不超过5分钟

        // 验证时间估算递减
        await analysisPage.page.waitForTimeout(2000);
        const updatedEstimate = await analysisPage.getTimeEstimate();
        expect(updatedEstimate.remainingSeconds).toBeLessThan(timeEstimate.remainingSeconds);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持实时进度更新', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('realtime-test.jpg');

      try {
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 验证实时更新
        let lastProgress = 0;
        let updateCount = 0;

        const progressMonitor = setInterval(async () => {
          const currentProgress = await analysisPage.getAnalysisProgress();
          
          if (currentProgress.percentage > lastProgress) {
            updateCount++;
            lastProgress = currentProgress.percentage;
          }

          if (currentProgress.percentage >= 100) {
            clearInterval(progressMonitor);
          }
        }, 500);

        // 等待分析完成
        await analysisPage.waitForAnalysisComplete();

        // 验证有足够的进度更新
        expect(updateCount).toBeGreaterThan(3);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });
  });

  test.describe('取消分析功能测试', () => {
    test('应该能够在分析过程中取消', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('cancel-test.jpg');

      try {
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 等待分析开始
        await analysisPage.waitForAnalysisProgress();

        // 取消分析
        await analysisPage.cancelAnalysis();

        // 验证分析已取消
        const analysisStatus = await analysisPage.getAnalysisStatus();
        expect(analysisStatus.isCancelled).toBe(true);
        expect(analysisStatus.isRunning).toBe(false);

        // 验证可以重新开始分析
        const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
        expect(analyzeEnabled).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该在取消后清理资源', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('cleanup-test.jpg');

      try {
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 等待分析开始
        await analysisPage.waitForAnalysisProgress();

        // 取消分析
        await analysisPage.cancelAnalysis();

        // 验证资源清理
        const resourceStatus = await analysisPage.getResourceStatus();
        expect(resourceStatus.memoryCleared).toBe(true);
        expect(resourceStatus.networkRequestsCancelled).toBe(true);
        expect(resourceStatus.tempFilesRemoved).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持取消确认对话框', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('confirm-cancel-test.jpg');

      try {
        await analysisPage.uploadImage(testImagePath);
        await analysisPage.selectPet('ProcessTestPet');

        // 开始分析
        await analysisPage.startAnalysis();

        // 等待分析开始
        await analysisPage.waitForAnalysisProgress();

        // 点击取消按钮
        await analysisPage.clickCancelButton();

        // 验证显示确认对话框
        const confirmDialog = await analysisPage.getCancelConfirmDialog();
        expect(confirmDialog.isVisible).toBe(true);
        expect(confirmDialog.message).toContain('确定要取消分析吗');

        // 确认取消
        await analysisPage.confirmCancel();

        // 验证分析已取消
        const analysisStatus = await analysisPage.getAnalysisStatus();
        expect(analysisStatus.isCancelled).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });
  });

  test.describe('分析结果准确性和一致性测试', () => {
    test('应该对相同图片产生一致的结果', async () => {
      const testImagePath = await createTestImage('consistency-test.jpg');

      try {
        const results: any[] = [];

        // 进行3次相同的分析
        for (let i = 0; i < 3; i++) {
          await analysisPage.goToAnalysisPage();
          
          const result = await analysisPage.performCompleteAnalysis(
            testImagePath,
            'ProcessTestPet',
            `一致性测试 ${i + 1}`
          );

          expect(result.success).toBe(true);
          results.push(result.result);

          // 清理结果准备下次测试
          await analysisPage.startNewAnalysis();
        }

        // 验证结果一致性
        const firstResult = results[0];
        for (let i = 1; i < results.length; i++) {
          const currentResult = results[i];
          
          // 健康状态应该一致
          expect(currentResult.status).toBe(firstResult.status);
          
          // 置信度差异应该在合理范围内（±5%）
          const confidenceDiff = Math.abs(
            parseFloat(currentResult.confidence) - parseFloat(firstResult.confidence)
          );
          expect(confidenceDiff).toBeLessThan(5);
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该对不同健康状态的图片产生不同结果', async () => {
      const testImages = [
        { path: await createHealthyPoopImage('healthy-poop.jpg'), expectedStatus: 'healthy' },
        { path: await createUnhealthyPoopImage('unhealthy-poop.jpg'), expectedStatus: 'concerning' },
        { path: await createWarningPoopImage('warning-poop.jpg'), expectedStatus: 'warning' }
      ];

      try {
        const results: any[] = [];

        for (const testImage of testImages) {
          await analysisPage.goToAnalysisPage();
          
          const result = await analysisPage.performCompleteAnalysis(
            testImage.path,
            'ProcessTestPet'
          );

          expect(result.success).toBe(true);
          results.push({
            ...result.result,
            expectedStatus: testImage.expectedStatus
          });

          await analysisPage.startNewAnalysis();
        }

        // 验证不同图片产生不同结果
        for (const result of results) {
          expect(result.status.toLowerCase()).toContain(result.expectedStatus);
        }

        // 验证结果的多样性
        const uniqueStatuses = new Set(results.map(r => r.status));
        expect(uniqueStatuses.size).toBeGreaterThan(1);

      } finally {
        testImages.forEach(image => {
          if (fs.existsSync(image.path)) {
            fs.unlinkSync(image.path);
          }
        });
      }
    });

    test('应该提供合理的置信度评分', async () => {
      const testImagePath = await createTestImage('confidence-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ProcessTestPet'
        );

        expect(result.success).toBe(true);
        
        // 验证置信度在合理范围内
        const confidence = parseFloat(result.result!.confidence);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(100);

        // 验证置信度与结果状态的关系
        if (result.result!.status === 'healthy') {
          expect(confidence).toBeGreaterThan(70); // 健康状态应该有较高置信度
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该处理模糊或低质量图片', async () => {
      const lowQualityImagePath = await createLowQualityImage('low-quality.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        const result = await analysisPage.performCompleteAnalysis(
          lowQualityImagePath,
          'ProcessTestPet'
        );

        if (result.success) {
          // 如果分析成功，置信度应该较低
          const confidence = parseFloat(result.result!.confidence);
          expect(confidence).toBeLessThan(80);
        } else {
          // 如果分析失败，应该有合理的错误信息
          expect(result.error).toContain('图片质量');
        }

      } finally {
        if (fs.existsSync(lowQualityImagePath)) {
          fs.unlinkSync(lowQualityImagePath);
        }
      }
    });
  });

  test.describe('分析历史对比测试', () => {
    test('应该显示历史分析记录', async () => {
      // 创建多个历史记录
      const historyRecords = [
        { date: '2024-01-01', status: 'healthy', score: '85' },
        { date: '2024-01-15', status: 'warning', score: '65' },
        { date: '2024-02-01', status: 'healthy', score: '90' }
      ];

      for (const record of historyRecords) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: record.status as any,
            confidence: parseFloat(record.score) / 100,
            recommendations: ['测试建议']
          },
          notes: `历史记录 ${record.date}`,
          createdAt: new Date(record.date)
        });
      }

      const testImagePath = await createTestImage('history-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        // 进行新的分析
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ProcessTestPet'
        );

        expect(result.success).toBe(true);

        // 查看历史对比
        const historyComparison = await analysisPage.viewHistoryComparison();
        expect(historyComparison.hasHistory).toBe(true);
        expect(historyComparison.previousCount).toBe(historyRecords.length);

        // 验证历史记录显示
        const historyList = await analysisPage.getHistoryList();
        expect(historyList.length).toBe(historyRecords.length);

        // 验证记录按时间排序
        for (let i = 0; i < historyList.length - 1; i++) {
          const currentDate = new Date(historyList[i].date);
          const nextDate = new Date(historyList[i + 1].date);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持历史记录详细对比', async () => {
      // 创建历史记录
      const previousRecord = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'warning',
          confidence: 0.75,
          recommendations: ['注意饮食', '增加运动'],
          details: {
            shape: '偏软',
            color: '黄色',
            consistency: '软便'
          }
        },
        notes: '上次分析',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
      });

      const testImagePath = await createTestImage('comparison-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        // 进行新的分析
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ProcessTestPet'
        );

        expect(result.success).toBe(true);

        // 选择历史记录进行对比
        await analysisPage.selectHistoryRecordForComparison(previousRecord.id!);

        // 获取对比结果
        const comparison = await analysisPage.getDetailedComparison();
        
        expect(comparison.hasComparison).toBe(true);
        expect(comparison.previousResult).toBeDefined();
        expect(comparison.currentResult).toBeDefined();
        expect(comparison.changes).toBeDefined();

        // 验证变化检测
        if (comparison.changes.statusChanged) {
          expect(comparison.changes.improvement).toBeDefined();
          expect(comparison.changes.summary).toBeTruthy();
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });
  });

  test.describe('趋势分析测试', () => {
    test('应该显示健康趋势图表', async () => {
      // 创建一系列历史记录模拟趋势
      const trendData = [
        { date: new Date('2024-01-01'), score: 85 },
        { date: new Date('2024-01-08'), score: 80 },
        { date: new Date('2024-01-15'), score: 75 },
        { date: new Date('2024-01-22'), score: 70 },
        { date: new Date('2024-01-29'), score: 78 }
      ];

      for (const data of trendData) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: data.score > 80 ? 'healthy' : data.score > 70 ? 'warning' : 'concerning',
            confidence: data.score / 100,
            recommendations: ['趋势测试']
          },
          createdAt: data.date
        });
      }

      const testImagePath = await createTestImage('trend-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        // 进行新的分析
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ProcessTestPet'
        );

        expect(result.success).toBe(true);

        // 查看趋势分析
        const trendAnalysis = await analysisPage.viewTrendAnalysis();
        expect(trendAnalysis.hasTrend).toBe(true);
        expect(trendAnalysis.dataPoints).toBe(trendData.length + 1); // 包括当前分析

        // 验证趋势方向
        const trendDirection = await analysisPage.getTrendDirection();
        expect(['improving', 'declining', 'stable']).toContain(trendDirection);

        // 验证趋势图表
        const chartData = await analysisPage.getTrendChartData();
        expect(chartData.length).toBe(trendData.length + 1);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该提供趋势预测', async () => {
      // 创建稳定的上升趋势
      const trendData = [
        { date: new Date('2024-01-01'), score: 60 },
        { date: new Date('2024-01-08'), score: 65 },
        { date: new Date('2024-01-15'), score: 70 },
        { date: new Date('2024-01-22'), score: 75 },
        { date: new Date('2024-01-29'), score: 80 }
      ];

      for (const data of trendData) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: 'improving',
            confidence: data.score / 100,
            recommendations: ['继续改善']
          },
          createdAt: data.date
        });
      }

      const testImagePath = await createTestImage('prediction-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ProcessTestPet'
        );

        expect(result.success).toBe(true);

        // 获取趋势预测
        const prediction = await analysisPage.getTrendPrediction();
        expect(prediction.hasPrediction).toBe(true);
        expect(prediction.nextWeekPrediction).toBeDefined();
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);

        // 验证预测合理性
        if (prediction.trend === 'improving') {
          expect(prediction.nextWeekPrediction).toBeGreaterThan(80);
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该识别异常模式', async () => {
      // 创建包含异常的数据
      const anomalyData = [
        { date: new Date('2024-01-01'), score: 85 },
        { date: new Date('2024-01-08'), score: 87 },
        { date: new Date('2024-01-15'), score: 45 }, // 异常低值
        { date: new Date('2024-01-22'), score: 86 },
        { date: new Date('2024-01-29'), score: 88 }
      ];

      for (const data of anomalyData) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: data.score > 80 ? 'healthy' : 'concerning',
            confidence: data.score / 100,
            recommendations: ['异常检测测试']
          },
          createdAt: data.date
        });
      }

      const testImagePath = await createTestImage('anomaly-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ProcessTestPet'
        );

        expect(result.success).toBe(true);

        // 检查异常检测
        const anomalyDetection = await analysisPage.getAnomalyDetection();
        expect(anomalyDetection.hasAnomalies).toBe(true);
        expect(anomalyDetection.anomalyCount).toBeGreaterThan(0);

        // 验证异常详情
        const anomalies = await analysisPage.getAnomalyDetails();
        expect(anomalies.length).toBeGreaterThan(0);
        
        const significantAnomaly = anomalies.find(a => a.severity === 'high');
        expect(significantAnomaly).toBeDefined();

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });
  });
});

// 辅助函数
async function createTestImage(filename: string): Promise<string> {
  const testDir = path.join(__dirname, '../../fixtures/test-images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, filename);
  const imageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(imagePath, imageData);
  
  return imagePath;
}

async function createHealthyPoopImage(filename: string): Promise<string> {
  // 模拟健康便便图片
  return await createTestImage(filename);
}

async function createUnhealthyPoopImage(filename: string): Promise<string> {
  // 模拟不健康便便图片
  return await createTestImage(filename);
}

async function createWarningPoopImage(filename: string): Promise<string> {
  // 模拟警告状态便便图片
  return await createTestImage(filename);
}

async function createLowQualityImage(filename: string): Promise<string> {
  // 模拟低质量图片
  return await createTestImage(filename);
}