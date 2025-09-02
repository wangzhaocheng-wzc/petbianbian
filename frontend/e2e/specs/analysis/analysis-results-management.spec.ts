import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import path from 'path';
import fs from 'fs';

/**
 * 便便分析结果管理测试套件
 * 测试分析记录保存和编辑、分析报告生成和分享、分析数据统计和可视化
 */
test.describe('便便分析结果管理测试', () => {
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
      username: 'results_user',
      email: 'results@test.com',
      password: 'TestPass123!'
    });

    testPet = await dataManager.createTestPet(testUser.id!, {
      name: 'ResultsTestPet',
      type: 'dog',
      breed: 'German Shepherd',
      age: 5,
      weight: 32.0
    });

    // 登录用户
    await authPage.login(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await dataManager.cleanup();
  });

  test.describe('分析记录保存和编辑测试', () => {
    test('应该能够保存完整的分析记录', async () => {
      const testImagePath = await createTestImage('save-record-test.jpg');

      try {
        await analysisPage.goToAnalysisPage();
        
        // 进行完整分析
        const result = await analysisPage.performCompleteAnalysis(
          testImagePath,
          'ResultsTestPet',
          '这是一次完整的分析记录测试'
        );

        expect(result.success).toBe(true);

        // 验证记录已保存
        const savedRecord = await analysisPage.getLastSavedRecord();
        expect(savedRecord.id).toBeTruthy();
        expect(savedRecord.petName).toBe('ResultsTestPet');
        expect(savedRecord.notes).toContain('完整的分析记录测试');
        expect(savedRecord.result).toBeDefined();

        // 验证记录包含所有必要信息
        expect(savedRecord.result.healthStatus).toBeTruthy();
        expect(savedRecord.result.confidence).toBeGreaterThan(0);
        expect(savedRecord.result.recommendations).toBeDefined();
        expect(savedRecord.imageUrl).toBeTruthy();
        expect(savedRecord.createdAt).toBeTruthy();

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持编辑已保存的分析记录', async () => {
      // 先创建一个分析记录
      const existingRecord = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'healthy',
          confidence: 0.85,
          recommendations: ['保持现状']
        },
        notes: '原始备注'
      });

      await analysisPage.goToAnalysisPage();

      // 导航到记录管理页面
      await analysisPage.goToRecordsManagement();

      // 选择要编辑的记录
      await analysisPage.selectRecordForEdit(existingRecord.id!);

      // 编辑记录信息
      const updatedNotes = '更新后的备注信息';
      const updatedTags = ['健康', '正常', '定期检查'];

      await analysisPage.editRecordNotes(updatedNotes);
      await analysisPage.addRecordTags(updatedTags);
      await analysisPage.updateRecordCategory('routine_check');

      // 保存编辑
      await analysisPage.saveRecordEdits();

      // 验证编辑成功
      const updatedRecord = await analysisPage.getRecordDetails(existingRecord.id!);
      expect(updatedRecord.notes).toBe(updatedNotes);
      expect(updatedRecord.tags).toEqual(expect.arrayContaining(updatedTags));
      expect(updatedRecord.category).toBe('routine_check');
    });

    test('应该支持批量编辑分析记录', async () => {
      // 创建多个测试记录
      const recordIds = [];
      for (let i = 0; i < 3; i++) {
        const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: 'healthy',
            confidence: 0.8 + i * 0.05,
            recommendations: [`建议${i + 1}`]
          },
          notes: `批量测试记录 ${i + 1}`
        });
        recordIds.push(record.id!);
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToRecordsManagement();

      // 选择多个记录
      await analysisPage.selectMultipleRecords(recordIds);

      // 批量编辑
      const batchTags = ['批量编辑', '测试'];
      const batchCategory = 'batch_processed';

      await analysisPage.openBatchEditDialog();
      await analysisPage.setBatchTags(batchTags);
      await analysisPage.setBatchCategory(batchCategory);
      await analysisPage.applyBatchEdits();

      // 验证批量编辑结果
      for (const recordId of recordIds) {
        const record = await analysisPage.getRecordDetails(recordId);
        expect(record.tags).toEqual(expect.arrayContaining(batchTags));
        expect(record.category).toBe(batchCategory);
      }
    });

    test('应该支持删除分析记录', async () => {
      // 创建测试记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'warning',
          confidence: 0.75,
          recommendations: ['需要关注']
        },
        notes: '待删除的记录'
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToRecordsManagement();

      // 删除记录
      await analysisPage.deleteRecord(record.id!);

      // 确认删除
      const deleteConfirm = await analysisPage.getDeleteConfirmDialog();
      expect(deleteConfirm.isVisible).toBe(true);
      expect(deleteConfirm.message).toContain('确定要删除这条记录吗');

      await analysisPage.confirmDelete();

      // 验证记录已删除
      const recordExists = await analysisPage.recordExists(record.id!);
      expect(recordExists).toBe(false);
    });

    test('应该支持恢复已删除的记录', async () => {
      // 创建并删除记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'healthy',
          confidence: 0.9,
          recommendations: ['继续保持']
        },
        notes: '可恢复的记录'
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToRecordsManagement();

      // 删除记录
      await analysisPage.deleteRecord(record.id!);
      await analysisPage.confirmDelete();

      // 进入回收站
      await analysisPage.goToRecycleBin();

      // 验证记录在回收站中
      const deletedRecords = await analysisPage.getDeletedRecords();
      const deletedRecord = deletedRecords.find(r => r.id === record.id);
      expect(deletedRecord).toBeDefined();

      // 恢复记录
      await analysisPage.restoreRecord(record.id!);

      // 验证记录已恢复
      await analysisPage.goToRecordsManagement();
      const recordExists = await analysisPage.recordExists(record.id!);
      expect(recordExists).toBe(true);
    });
  });

  test.describe('分析报告生成和分享测试', () => {
    test('应该能够生成单次分析报告', async () => {
      // 创建测试记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'healthy',
          confidence: 0.92,
          recommendations: ['继续保持良好习惯', '定期检查'],
          details: {
            shape: '正常成型',
            color: '棕色',
            consistency: '适中'
          }
        },
        notes: '单次分析报告测试'
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToRecordsManagement();

      // 选择记录生成报告
      await analysisPage.selectRecordForReport(record.id!);
      await analysisPage.generateSingleReport();

      // 验证报告生成
      const report = await analysisPage.getGeneratedReport();
      expect(report.isGenerated).toBe(true);
      expect(report.type).toBe('single');
      expect(report.petName).toBe('ResultsTestPet');
      expect(report.analysisDate).toBeTruthy();
      expect(report.healthStatus).toBe('healthy');
      expect(report.recommendations).toContain('继续保持良好习惯');

      // 验证报告格式
      expect(report.sections).toContain('基本信息');
      expect(report.sections).toContain('分析结果');
      expect(report.sections).toContain('健康建议');
      expect(report.sections).toContain('详细分析');
    });

    test('应该能够生成周期性健康报告', async () => {
      // 创建一周的测试数据
      const weeklyRecords = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: i < 2 ? 'warning' : 'healthy',
            confidence: 0.8 + Math.random() * 0.15,
            recommendations: [`第${i + 1}天建议`]
          },
          notes: `第${i + 1}天记录`,
          createdAt: date
        });
        weeklyRecords.push(record);
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToReportsSection();

      // 生成周报告
      await analysisPage.generateWeeklyReport(testPet.id!);

      // 验证周报告
      const weeklyReport = await analysisPage.getGeneratedReport();
      expect(weeklyReport.isGenerated).toBe(true);
      expect(weeklyReport.type).toBe('weekly');
      expect(weeklyReport.recordCount).toBe(7);
      expect(weeklyReport.dateRange).toBeTruthy();

      // 验证统计信息
      const statistics = weeklyReport.statistics;
      expect(statistics.healthyDays).toBe(5);
      expect(statistics.warningDays).toBe(2);
      expect(statistics.averageConfidence).toBeGreaterThan(0.8);

      // 验证趋势分析
      expect(weeklyReport.trendAnalysis).toBeDefined();
      expect(weeklyReport.trendAnalysis.overallTrend).toBeTruthy();
    });

    test('应该能够生成月度健康报告', async () => {
      // 创建一个月的测试数据
      const monthlyRecords = [];
      for (let i = 0; i < 30; i += 3) { // 每3天一次记录
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: Math.random() > 0.8 ? 'warning' : 'healthy',
            confidence: 0.75 + Math.random() * 0.2,
            recommendations: [`第${i + 1}天建议`]
          },
          createdAt: date
        });
        monthlyRecords.push(record);
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToReportsSection();

      // 生成月报告
      await analysisPage.generateMonthlyReport(testPet.id!);

      // 验证月报告
      const monthlyReport = await analysisPage.getGeneratedReport();
      expect(monthlyReport.isGenerated).toBe(true);
      expect(monthlyReport.type).toBe('monthly');
      expect(monthlyReport.recordCount).toBe(10);

      // 验证月度统计
      const monthlyStats = monthlyReport.statistics;
      expect(monthlyStats.totalAnalyses).toBe(10);
      expect(monthlyStats.healthDistribution).toBeDefined();
      expect(monthlyStats.weeklyAverages).toBeDefined();

      // 验证健康趋势
      expect(monthlyReport.healthTrends).toBeDefined();
      expect(monthlyReport.recommendations).toBeDefined();
    });

    test('应该支持自定义报告模板', async () => {
      // 创建测试记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'healthy',
          confidence: 0.88,
          recommendations: ['自定义报告测试']
        }
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToReportsSection();

      // 选择自定义模板
      await analysisPage.selectCustomTemplate();

      // 配置报告模板
      const templateConfig = {
        includeSections: ['基本信息', '分析结果', '趋势图表'],
        excludeSections: ['技术细节'],
        logoUrl: '/test-logo.png',
        headerText: '自定义健康报告',
        footerText: '仅供参考，如有疑问请咨询兽医'
      };

      await analysisPage.configureReportTemplate(templateConfig);

      // 生成自定义报告
      await analysisPage.generateCustomReport(record.id!);

      // 验证自定义报告
      const customReport = await analysisPage.getGeneratedReport();
      expect(customReport.isGenerated).toBe(true);
      expect(customReport.template).toBe('custom');
      expect(customReport.headerText).toBe(templateConfig.headerText);
      expect(customReport.footerText).toBe(templateConfig.footerText);
      expect(customReport.sections).toEqual(expect.arrayContaining(templateConfig.includeSections));
      expect(customReport.sections).not.toEqual(expect.arrayContaining(templateConfig.excludeSections));
    });

    test('应该支持多种格式导出报告', async () => {
      // 创建测试记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'healthy',
          confidence: 0.9,
          recommendations: ['导出测试']
        }
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToReportsSection();

      // 生成报告
      await analysisPage.generateSingleReport(record.id!);

      const exportFormats = ['PDF', 'Word', 'Excel', 'HTML'];

      for (const format of exportFormats) {
        // 导出不同格式
        const exportResult = await analysisPage.exportReport(format);
        
        expect(exportResult.success).toBe(true);
        expect(exportResult.format).toBe(format);
        expect(exportResult.fileSize).toBeGreaterThan(0);
        expect(exportResult.downloadUrl).toBeTruthy();

        // 验证文件可以下载
        const downloadSuccess = await analysisPage.verifyDownload(exportResult.downloadUrl);
        expect(downloadSuccess).toBe(true);
      }
    });

    test('应该支持分享报告给兽医', async () => {
      // 创建测试记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'concerning',
          confidence: 0.85,
          recommendations: ['建议咨询兽医']
        }
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToReportsSection();

      // 生成报告
      await analysisPage.generateSingleReport(record.id!);

      // 分享给兽医
      const vetInfo = {
        name: '张兽医',
        email: 'vet@clinic.com',
        clinic: '宠物医院',
        message: '请帮忙查看这份分析报告'
      };

      await analysisPage.shareReportToVet(vetInfo);

      // 验证分享成功
      const shareResult = await analysisPage.getShareResult();
      expect(shareResult.success).toBe(true);
      expect(shareResult.recipient).toBe(vetInfo.email);
      expect(shareResult.shareId).toBeTruthy();

      // 验证分享记录
      const shareHistory = await analysisPage.getShareHistory();
      const latestShare = shareHistory[0];
      expect(latestShare.recipientType).toBe('veterinarian');
      expect(latestShare.recipientEmail).toBe(vetInfo.email);
    });

    test('应该支持生成分享链接', async () => {
      // 创建测试记录
      const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
        result: {
          healthStatus: 'healthy',
          confidence: 0.87,
          recommendations: ['分享链接测试']
        }
      });

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToReportsSection();

      // 生成报告
      await analysisPage.generateSingleReport(record.id!);

      // 生成分享链接
      const shareOptions = {
        expiryDays: 7,
        passwordProtected: true,
        allowDownload: true,
        watermark: true
      };

      const shareLink = await analysisPage.generateShareLink(shareOptions);

      // 验证分享链接
      expect(shareLink.url).toBeTruthy();
      expect(shareLink.expiryDate).toBeTruthy();
      expect(shareLink.password).toBeTruthy();
      expect(shareLink.accessCount).toBe(0);

      // 验证链接访问
      const linkAccess = await analysisPage.verifyShareLinkAccess(shareLink.url, shareLink.password);
      expect(linkAccess.success).toBe(true);
      expect(linkAccess.reportVisible).toBe(true);
    });
  });

  test.describe('分析数据统计和可视化测试', () => {
    test('应该显示基本统计信息', async () => {
      // 创建多样化的测试数据
      const testData = [
        { status: 'healthy', confidence: 0.9 },
        { status: 'healthy', confidence: 0.85 },
        { status: 'warning', confidence: 0.75 },
        { status: 'concerning', confidence: 0.8 },
        { status: 'healthy', confidence: 0.92 }
      ];

      for (const data of testData) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: data.status as any,
            confidence: data.confidence,
            recommendations: ['统计测试']
          }
        });
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToStatisticsSection();

      // 获取基本统计
      const basicStats = await analysisPage.getBasicStatistics();
      
      expect(basicStats.totalAnalyses).toBe(5);
      expect(basicStats.healthyCount).toBe(3);
      expect(basicStats.warningCount).toBe(1);
      expect(basicStats.concerningCount).toBe(1);
      expect(basicStats.averageConfidence).toBeCloseTo(0.844, 2);
      expect(basicStats.healthyPercentage).toBeCloseTo(60, 1);
    });

    test('应该显示时间趋势图表', async () => {
      // 创建时间序列数据
      const timeSeriesData = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const record = await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: i < 10 ? 'healthy' : i < 20 ? 'warning' : 'concerning',
            confidence: 0.7 + Math.random() * 0.25,
            recommendations: ['趋势测试']
          },
          createdAt: date
        });
        timeSeriesData.push(record);
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToStatisticsSection();

      // 查看趋势图表
      await analysisPage.viewTrendChart();

      // 验证图表数据
      const chartData = await analysisPage.getTrendChartData();
      expect(chartData.length).toBe(30);

      // 验证图表配置
      const chartConfig = await analysisPage.getChartConfiguration();
      expect(chartConfig.xAxis).toBe('date');
      expect(chartConfig.yAxis).toBe('healthScore');
      expect(chartConfig.chartType).toBe('line');

      // 验证交互功能
      const interactionFeatures = await analysisPage.getChartInteractionFeatures();
      expect(interactionFeatures.zoom).toBe(true);
      expect(interactionFeatures.tooltip).toBe(true);
      expect(interactionFeatures.legend).toBe(true);
    });

    test('应该显示健康分布饼图', async () => {
      // 创建分布数据
      const distributionData = [
        ...Array(15).fill('healthy'),
        ...Array(8).fill('warning'),
        ...Array(3).fill('concerning')
      ];

      for (const status of distributionData) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: status as any,
            confidence: 0.8,
            recommendations: ['分布测试']
          }
        });
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToStatisticsSection();

      // 查看分布图表
      await analysisPage.viewDistributionChart();

      // 验证饼图数据
      const pieChartData = await analysisPage.getPieChartData();
      expect(pieChartData.healthy.count).toBe(15);
      expect(pieChartData.warning.count).toBe(8);
      expect(pieChartData.concerning.count).toBe(3);
      expect(pieChartData.healthy.percentage).toBeCloseTo(57.7, 1);

      // 验证图表样式
      const chartStyle = await analysisPage.getChartStyle();
      expect(chartStyle.colors.healthy).toBe('#4CAF50');
      expect(chartStyle.colors.warning).toBe('#FF9800');
      expect(chartStyle.colors.concerning).toBe('#F44336');
    });

    test('应该支持自定义统计时间范围', async () => {
      // 创建跨越不同时间的数据
      const timeRanges = [
        { days: 7, count: 5 },
        { days: 30, count: 8 },
        { days: 90, count: 12 }
      ];

      for (const range of timeRanges) {
        for (let i = 0; i < range.count; i++) {
          const date = new Date();
          date.setDate(date.getDate() - Math.random() * range.days);
          
          await dataManager.createTestAnalysisRecord(testPet.id!, {
            result: {
              healthStatus: 'healthy',
              confidence: 0.85,
              recommendations: ['时间范围测试']
            },
            createdAt: date
          });
        }
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToStatisticsSection();

      // 测试不同时间范围
      const testRanges = ['7days', '30days', '90days', 'custom'];

      for (const range of testRanges) {
        await analysisPage.selectTimeRange(range);
        
        if (range === 'custom') {
          await analysisPage.setCustomDateRange('2024-01-01', '2024-03-31');
        }

        const rangeStats = await analysisPage.getTimeRangeStatistics();
        expect(rangeStats.selectedRange).toBe(range);
        expect(rangeStats.recordCount).toBeGreaterThan(0);
        expect(rangeStats.dateRange.start).toBeTruthy();
        expect(rangeStats.dateRange.end).toBeTruthy();
      }
    });

    test('应该支持数据导出功能', async () => {
      // 创建测试数据
      for (let i = 0; i < 10; i++) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: i % 3 === 0 ? 'healthy' : i % 3 === 1 ? 'warning' : 'concerning',
            confidence: 0.7 + Math.random() * 0.25,
            recommendations: [`导出测试 ${i + 1}`]
          }
        });
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToStatisticsSection();

      // 测试不同导出格式
      const exportFormats = ['CSV', 'Excel', 'JSON'];

      for (const format of exportFormats) {
        const exportResult = await analysisPage.exportStatisticsData(format);
        
        expect(exportResult.success).toBe(true);
        expect(exportResult.format).toBe(format);
        expect(exportResult.recordCount).toBe(10);
        expect(exportResult.fileSize).toBeGreaterThan(0);

        // 验证导出内容
        const exportContent = await analysisPage.getExportContent(exportResult.downloadUrl);
        expect(exportContent).toContain('healthStatus');
        expect(exportContent).toContain('confidence');
        expect(exportContent).toContain('recommendations');
      }
    });

    test('应该支持数据筛选和搜索', async () => {
      // 创建多样化数据
      const testRecords = [
        { status: 'healthy', notes: '正常检查', tags: ['routine'] },
        { status: 'warning', notes: '轻微异常', tags: ['attention'] },
        { status: 'concerning', notes: '需要关注', tags: ['urgent'] },
        { status: 'healthy', notes: '恢复良好', tags: ['recovery'] }
      ];

      for (const recordData of testRecords) {
        await dataManager.createTestAnalysisRecord(testPet.id!, {
          result: {
            healthStatus: recordData.status as any,
            confidence: 0.8,
            recommendations: ['筛选测试']
          },
          notes: recordData.notes
        });
      }

      await analysisPage.goToAnalysisPage();
      await analysisPage.goToStatisticsSection();

      // 测试状态筛选
      await analysisPage.filterByHealthStatus('healthy');
      let filteredStats = await analysisPage.getFilteredStatistics();
      expect(filteredStats.recordCount).toBe(2);

      // 测试关键词搜索
      await analysisPage.clearFilters();
      await analysisPage.searchRecords('异常');
      filteredStats = await analysisPage.getFilteredStatistics();
      expect(filteredStats.recordCount).toBe(1);

      // 测试日期范围筛选
      await analysisPage.clearFilters();
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      await analysisPage.filterByDateRange(yesterday, today);
      filteredStats = await analysisPage.getFilteredStatistics();
      expect(filteredStats.recordCount).toBeGreaterThan(0);

      // 测试组合筛选
      await analysisPage.filterByHealthStatus('healthy');
      await analysisPage.searchRecords('正常');
      filteredStats = await analysisPage.getFilteredStatistics();
      expect(filteredStats.recordCount).toBe(1);
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