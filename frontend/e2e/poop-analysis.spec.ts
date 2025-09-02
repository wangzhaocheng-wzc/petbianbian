import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('便便分析功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录到系统
    await page.goto('/');
    await page.click('text=登录');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // 等待登录成功并导航到分析页面
    await expect(page).toHaveURL(/.*dashboard/);
    await page.click('[data-testid="analysis-nav"]');
    await expect(page).toHaveURL(/.*analysis/);
  });

  test('图片上传和分析流程', async ({ page }) => {
    // 验证分析页面元素
    await expect(page.locator('[data-testid="analysis-header"]')).toContainText('便便健康分析');
    await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
    
    // 选择宠物
    await page.selectOption('[data-testid="pet-select"]', { index: 0 });
    
    // 模拟文件上传
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-poop.jpg'));
    
    // 验证图片预览
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    
    // 添加备注
    await page.fill('[data-testid="analysis-notes"]', '今天的便便看起来有点不同');
    
    // 开始分析
    await page.click('[data-testid="start-analysis-button"]');
    
    // 验证分析进度
    await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-text"]')).toContainText('正在分析');
    
    // 等待分析完成
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });
    
    // 验证分析结果
    await expect(page.locator('[data-testid="poop-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="health-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
  });

  test('拖拽上传功能', async ({ page }) => {
    // 验证拖拽区域
    const dropZone = page.locator('[data-testid="drop-zone"]');
    await expect(dropZone).toBeVisible();
    await expect(dropZone).toContainText('拖拽图片到此处或点击上传');
    
    // 模拟拖拽事件
    await dropZone.hover();
    
    // 验证拖拽状态
    await expect(dropZone).toHaveClass(/drag-over/);
  });

  test('图片格式验证', async ({ page }) => {
    // 尝试上传不支持的文件格式
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-document.pdf'));
    
    // 验证错误消息
    await expect(page.locator('[data-testid="error-message"]')).toContainText('只支持JPG、PNG、WebP格式的图片');
  });

  test('文件大小验证', async ({ page }) => {
    // 尝试上传过大的文件（需要准备一个大文件）
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'large-image.jpg'));
    
    // 验证错误消息
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文件大小不能超过10MB');
  });

  test('分析结果详情查看', async ({ page }) => {
    // 先完成一次分析（简化流程）
    await page.selectOption('[data-testid="pet-select"]', { index: 0 });
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-poop.jpg'));
    await page.click('[data-testid="start-analysis-button"]');
    
    // 等待分析完成
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });
    
    // 点击查看详情
    await page.click('[data-testid="view-details-button"]');
    
    // 验证详情模态框
    await expect(page.locator('[data-testid="analysis-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="detailed-features"]')).toBeVisible();
    await expect(page.locator('[data-testid="shape-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="health-explanation"]')).toBeVisible();
  });

  test('保存分析记录', async ({ page }) => {
    // 完成分析流程
    await page.selectOption('[data-testid="pet-select"]', { index: 0 });
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-poop.jpg'));
    await page.fill('[data-testid="analysis-notes"]', '测试记录保存');
    await page.click('[data-testid="start-analysis-button"]');
    
    // 等待分析完成
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });
    
    // 保存记录
    await page.click('[data-testid="save-record-button"]');
    
    // 验证保存成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('分析记录保存成功');
    
    // 验证可以查看保存的记录
    await page.click('[data-testid="view-saved-records"]');
    await expect(page).toHaveURL(/.*records/);
    await expect(page.locator('[data-testid="record-item"]:first-child')).toContainText('测试记录保存');
  });

  test('重新分析功能', async ({ page }) => {
    // 完成一次分析
    await page.selectOption('[data-testid="pet-select"]', { index: 0 });
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-poop.jpg'));
    await page.click('[data-testid="start-analysis-button"]');
    
    // 等待分析完成
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });
    
    // 点击重新分析
    await page.click('[data-testid="reanalyze-button"]');
    
    // 验证返回到上传状态
    await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-results"]')).not.toBeVisible();
  });

  test('分析历史记录', async ({ page }) => {
    // 导航到记录页面
    await page.click('[data-testid="records-nav"]');
    await expect(page).toHaveURL(/.*records/);
    
    // 验证记录列表
    await expect(page.locator('[data-testid="records-header"]')).toContainText('分析记录');
    
    // 如果有记录，验证记录项
    const recordItems = page.locator('[data-testid^="record-item-"]');
    const recordCount = await recordItems.count();
    
    if (recordCount > 0) {
      const firstRecord = recordItems.first();
      await expect(firstRecord.locator('[data-testid="record-date"]')).toBeVisible();
      await expect(firstRecord.locator('[data-testid="record-pet"]')).toBeVisible();
      await expect(firstRecord.locator('[data-testid="record-status"]')).toBeVisible();
      
      // 点击查看详情
      await firstRecord.click();
      await expect(page.locator('[data-testid="record-detail-modal"]')).toBeVisible();
    }
  });

  test('分析错误处理', async ({ page }) => {
    // 模拟网络错误或服务器错误
    await page.route('**/api/analysis/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: '服务器内部错误' })
      });
    });
    
    // 尝试进行分析
    await page.selectOption('[data-testid="pet-select"]', { index: 0 });
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-poop.jpg'));
    await page.click('[data-testid="start-analysis-button"]');
    
    // 验证错误处理
    await expect(page.locator('[data-testid="error-message"]')).toContainText('分析失败，请稍后重试');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('移动端分析体验', async ({ page }) => {
    // 切换到移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 验证移动端布局
    await expect(page.locator('[data-testid="mobile-upload-area"]')).toBeVisible();
    
    // 验证相机功能（如果支持）
    const cameraButton = page.locator('[data-testid="camera-button"]');
    if (await cameraButton.isVisible()) {
      await cameraButton.click();
      await expect(page.locator('[data-testid="camera-modal"]')).toBeVisible();
    }
    
    // 验证移动端分析结果显示
    await page.selectOption('[data-testid="pet-select"]', { index: 0 });
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-poop.jpg'));
    await page.click('[data-testid="start-analysis-button"]');
    
    await expect(page.locator('[data-testid="mobile-analysis-results"]')).toBeVisible({ timeout: 30000 });
  });

  test('批量分析功能', async ({ page }) => {
    // 如果支持批量分析
    const batchUploadButton = page.locator('[data-testid="batch-upload-button"]');
    
    if (await batchUploadButton.isVisible()) {
      await batchUploadButton.click();
      
      // 上传多个文件
      const fileInput = page.locator('[data-testid="batch-file-input"]');
      await fileInput.setInputFiles([
        path.join(__dirname, 'fixtures', 'test-poop-1.jpg'),
        path.join(__dirname, 'fixtures', 'test-poop-2.jpg')
      ]);
      
      // 验证批量上传界面
      await expect(page.locator('[data-testid="batch-upload-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();
      
      // 开始批量分析
      await page.click('[data-testid="start-batch-analysis"]');
      
      // 验证批量分析结果
      await expect(page.locator('[data-testid="batch-results"]')).toBeVisible({ timeout: 60000 });
    }
  });
});