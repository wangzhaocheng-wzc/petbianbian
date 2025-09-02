import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { TestDataManager } from '../../utils/test-data-manager';
import { APIMocker } from '../../utils/api-mocker';
import path from 'path';
import fs from 'fs';

/**
 * 扩展图片上传测试套件
 * 测试多种图片格式、大小限制、拖拽上传和批量上传功能
 * 
 * 需求覆盖: 需求1.1, 需求2.2, 需求3.3
 */
test.describe('便便分析 - 扩展图片上传测试', () => {
  let analysisPage: AnalysisPage;
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let testDataManager: TestDataManager;
  let apiMocker: APIMocker;
  let testUser: any;
  let testPet: any;

  // 测试图片路径
  const testImages = {
    validJpeg: path.join(__dirname, '../../fixtures/images/test-pet-avatar-1.jpg'),
    validPng: path.join(__dirname, '../../fixtures/images/test-pet-avatar-2.jpg'),
    largeImage: path.join(__dirname, '../../fixtures/images/large-test-image.jpg'),
    invalidFormat: path.join(__dirname, '../../fixtures/images/invalid-format.txt'),
    // 动态创建的测试图片
    smallImage: '',
    mediumImage: '',
    oversizeImage: '',
    corruptedImage: '',
    webpImage: '',
    gifImage: '',
    bmpImage: ''
  };

  test.beforeAll(async () => {
    // 创建各种测试图片
    await createTestImages();
  });

  test.beforeEach(async ({ page }) => {
    analysisPage = new AnalysisPage(page);
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    testDataManager = new TestDataManager();
    apiMocker = new APIMocker(page);

    // 创建测试用户和宠物
    testUser = await testDataManager.createTestUser();
    await authPage.login(testUser.email, testUser.password);
    
    testPet = await testDataManager.createTestPet(testUser.id);
    
    // 导航到分析页面
    await analysisPage.goToAnalysisPage();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.afterAll(async () => {
    // 清理创建的测试图片
    await cleanupTestImages();
  });

  test.describe('图片格式支持测试', () => {
    test('应该支持JPEG格式图片上传', async () => {
      // 上传JPEG图片
      await analysisPage.uploadImage(testImages.validJpeg);
      
      // 验证上传成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      expect(uploadResult.hasPreview).toBe(true);
      expect(uploadResult.canRemove).toBe(true);
      
      // 验证分析按钮可用
      const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
      expect(analyzeEnabled).toBe(true);
    });

    test('应该支持PNG格式图片上传', async () => {
      // 上传PNG图片
      await analysisPage.uploadImage(testImages.validPng);
      
      // 验证上传成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      expect(uploadResult.hasPreview).toBe(true);
      
      // 验证图片预览显示正确
      const previewImage = analysisPage.page.locator('[data-testid="uploaded-image"] img');
      await expect(previewImage).toBeVisible();
      await expect(previewImage).toHaveAttribute('src', /.+/);
    });

    test('应该支持WebP格式图片上传', async () => {
      // 上传WebP图片
      await analysisPage.uploadImage(testImages.webpImage);
      
      // 验证上传成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      expect(uploadResult.hasPreview).toBe(true);
    });

    test('应该拒绝不支持的文件格式', async () => {
      // 尝试上传文本文件
      const fileInput = analysisPage.page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.invalidFormat);
      
      // 验证显示错误信息
      const errorMessage = await analysisPage.getAnalysisError();
      expect(errorMessage).toContain('不支持的文件格式');
      
      // 验证分析按钮不可用
      const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
      expect(analyzeEnabled).toBe(false);
    });

    test('应该拒绝GIF动图格式', async () => {
      // 尝试上传GIF文件
      const fileInput = analysisPage.page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.gifImage);
      
      // 验证显示格式不支持警告
      const warningMessage = await analysisPage.getAnalysisWarning();
      expect(warningMessage).toContain('不支持动图格式');
    });

    test('应该处理损坏的图片文件', async () => {
      // 上传损坏的图片文件
      const fileInput = analysisPage.page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.corruptedImage);
      
      // 验证显示文件损坏错误
      const errorMessage = await analysisPage.getAnalysisError();
      expect(errorMessage).toContain('文件损坏或无法读取');
    });
  });

  test.describe('文件大小限制测试', () => {
    test('应该接受小尺寸图片（< 1MB）', async () => {
      // 上传小图片
      await analysisPage.uploadImage(testImages.smallImage);
      
      // 验证上传成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      
      // 验证没有大小警告
      const warningMessage = await analysisPage.getAnalysisWarning();
      expect(warningMessage).not.toContain('文件过小');
    });

    test('应该接受中等尺寸图片（1-5MB）', async () => {
      // 上传中等大小图片
      await analysisPage.uploadImage(testImages.mediumImage);
      
      // 验证上传成功并显示处理进度
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      
      // 验证显示压缩提示
      const warningMessage = await analysisPage.getAnalysisWarning();
      expect(warningMessage).toContain('图片已自动压缩以提高分析速度');
    });

    test('应该处理大尺寸图片（5-10MB）', async () => {
      // 上传大图片
      await analysisPage.uploadImage(testImages.largeImage);
      
      // 验证显示压缩进度
      const progressVisible = await analysisPage.page.locator('[data-testid="compression-progress"]').isVisible();
      expect(progressVisible).toBe(true);
      
      // 等待压缩完成
      await analysisPage.page.waitForSelector('[data-testid="compression-progress"]', { state: 'hidden' });
      
      // 验证上传成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
    });

    test('应该拒绝超大文件（> 10MB）', async () => {
      // 尝试上传超大文件
      const fileInput = analysisPage.page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.oversizeImage);
      
      // 验证显示文件过大错误
      const errorMessage = await analysisPage.getAnalysisError();
      expect(errorMessage).toContain('文件大小超过限制');
      expect(errorMessage).toContain('10MB');
      
      // 验证没有上传图片
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(false);
    });

    test('应该显示文件大小信息', async () => {
      // 上传图片
      await analysisPage.uploadImage(testImages.validJpeg);
      
      // 验证显示文件信息
      const fileInfo = analysisPage.page.locator('[data-testid="file-info"]');
      await expect(fileInfo).toBeVisible();
      
      const fileSize = await fileInfo.locator('[data-testid="file-size"]').textContent();
      expect(fileSize).toMatch(/\d+(\.\d+)?\s*(KB|MB)/);
      
      const fileName = await fileInfo.locator('[data-testid="file-name"]').textContent();
      expect(fileName).toContain('.jpg');
    });
  });

  test.describe('拖拽上传功能测试', () => {
    test('应该支持拖拽单个文件上传', async () => {
      // 模拟拖拽上传
      await analysisPage.dragAndDropImage(testImages.validJpeg);
      
      // 验证上传成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      expect(uploadResult.hasPreview).toBe(true);
    });

    test('应该在拖拽时显示视觉反馈', async ({ page }) => {
      const dropZone = page.locator('[data-testid="drag-drop-zone"]');
      
      // 模拟拖拽进入
      await dropZone.dispatchEvent('dragenter');
      
      // 验证显示拖拽状态
      await expect(dropZone).toHaveClass(/drag-over|dragging/);
      
      // 模拟拖拽离开
      await dropZone.dispatchEvent('dragleave');
      
      // 验证恢复正常状态
      await expect(dropZone).not.toHaveClass(/drag-over|dragging/);
    });

    test('应该在拖拽无效文件时显示错误提示', async ({ page }) => {
      const dropZone = page.locator('[data-testid="drag-drop-zone"]');
      
      // 模拟拖拽无效文件
      await dropZone.dispatchEvent('drop', {
        dataTransfer: {
          files: [{
            name: 'invalid.txt',
            type: 'text/plain',
            size: 1024
          }]
        }
      });
      
      // 验证显示错误信息
      const errorMessage = await analysisPage.getAnalysisError();
      expect(errorMessage).toContain('不支持的文件格式');
    });

    test('应该支持拖拽替换已上传的图片', async () => {
      // 先上传一张图片
      await analysisPage.uploadImage(testImages.validJpeg);
      
      // 验证第一张图片上传成功
      let uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      
      // 拖拽新图片替换
      await analysisPage.dragAndDropImage(testImages.validPng);
      
      // 验证图片已替换
      uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
      
      // 验证显示替换提示
      const successMessage = analysisPage.page.locator('[data-testid="analysis-success"]');
      await expect(successMessage).toContainText('图片已替换');
    });
  });

  test.describe('批量上传功能测试', () => {
    test('应该支持选择多个文件进行批量上传', async ({ page }) => {
      // 选择多个文件
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([
        testImages.validJpeg,
        testImages.validPng,
        testImages.smallImage
      ]);
      
      // 验证显示批量上传界面
      const batchUploadContainer = page.locator('[data-testid="batch-upload-container"]');
      await expect(batchUploadContainer).toBeVisible();
      
      // 验证显示文件列表
      const fileList = page.locator('[data-testid="upload-file-list"]');
      const fileItems = fileList.locator('[data-testid="upload-file-item"]');
      await expect(fileItems).toHaveCount(3);
    });

    test('应该显示每个文件的上传进度', async ({ page }) => {
      // 模拟慢速上传
      await apiMocker.mockSlowResponse(2000);
      
      // 选择多个文件
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([
        testImages.validJpeg,
        testImages.validPng
      ]);
      
      // 开始批量上传
      await page.locator('[data-testid="start-batch-upload"]').click();
      
      // 验证显示每个文件的进度条
      const progressBars = page.locator('[data-testid="file-progress-bar"]');
      await expect(progressBars).toHaveCount(2);
      
      // 验证进度条有动画
      for (let i = 0; i < 2; i++) {
        const progressBar = progressBars.nth(i);
        await expect(progressBar).toHaveAttribute('aria-valuenow', /\d+/);
      }
    });

    test('应该允许移除批量上传中的单个文件', async ({ page }) => {
      // 选择多个文件
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([
        testImages.validJpeg,
        testImages.validPng,
        testImages.smallImage
      ]);
      
      // 移除第二个文件
      const removeButtons = page.locator('[data-testid="remove-file-button"]');
      await removeButtons.nth(1).click();
      
      // 验证文件列表更新
      const fileItems = page.locator('[data-testid="upload-file-item"]');
      await expect(fileItems).toHaveCount(2);
    });

    test('应该处理批量上传中的错误文件', async ({ page }) => {
      // 选择包含无效文件的批量文件
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([
        testImages.validJpeg,
        testImages.invalidFormat,
        testImages.validPng
      ]);
      
      // 开始批量上传
      await page.locator('[data-testid="start-batch-upload"]').click();
      
      // 验证显示错误文件状态
      const errorItems = page.locator('[data-testid="upload-file-item"][data-status="error"]');
      await expect(errorItems).toHaveCount(1);
      
      // 验证成功文件状态
      const successItems = page.locator('[data-testid="upload-file-item"][data-status="success"]');
      await expect(successItems).toHaveCount(2);
      
      // 验证显示批量上传摘要
      const summary = page.locator('[data-testid="batch-upload-summary"]');
      await expect(summary).toContainText('成功: 2');
      await expect(summary).toContainText('失败: 1');
    });

    test('应该支持批量上传后选择分析图片', async ({ page }) => {
      // 完成批量上传
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles([
        testImages.validJpeg,
        testImages.validPng
      ]);
      
      await page.locator('[data-testid="start-batch-upload"]').click();
      
      // 等待上传完成
      await page.waitForSelector('[data-testid="batch-upload-complete"]');
      
      // 验证显示图片选择器
      const imageSelector = page.locator('[data-testid="analysis-image-selector"]');
      await expect(imageSelector).toBeVisible();
      
      // 选择第一张图片进行分析
      const imageOptions = page.locator('[data-testid="selectable-image"]');
      await imageOptions.first().click();
      
      // 验证图片被选中
      await expect(imageOptions.first()).toHaveClass(/selected/);
      
      // 验证分析按钮可用
      const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
      expect(analyzeEnabled).toBe(true);
    });
  });

  test.describe('图片预处理和压缩测试', () => {
    test('应该自动压缩大尺寸图片', async ({ page }) => {
      // 上传大图片
      await analysisPage.uploadImage(testImages.largeImage);
      
      // 验证显示压缩进度
      const compressionProgress = page.locator('[data-testid="compression-progress"]');
      await expect(compressionProgress).toBeVisible();
      
      // 等待压缩完成
      await page.waitForSelector('[data-testid="compression-progress"]', { state: 'hidden' });
      
      // 验证显示压缩信息
      const compressionInfo = page.locator('[data-testid="compression-info"]');
      await expect(compressionInfo).toBeVisible();
      await expect(compressionInfo).toContainText('已压缩');
      
      // 验证文件大小减小
      const originalSize = await compressionInfo.locator('[data-testid="original-size"]').textContent();
      const compressedSize = await compressionInfo.locator('[data-testid="compressed-size"]').textContent();
      expect(originalSize).not.toBe(compressedSize);
    });

    test('应该保持图片质量在可接受范围内', async ({ page }) => {
      // 上传需要压缩的图片
      await analysisPage.uploadImage(testImages.mediumImage);
      
      // 等待压缩完成
      await page.waitForSelector('[data-testid="compression-progress"]', { state: 'hidden' });
      
      // 验证显示质量信息
      const qualityInfo = page.locator('[data-testid="quality-info"]');
      await expect(qualityInfo).toBeVisible();
      
      const qualityScore = await qualityInfo.locator('[data-testid="quality-score"]').textContent();
      const quality = parseInt(qualityScore?.replace('%', '') || '0');
      expect(quality).toBeGreaterThan(80); // 质量应该保持在80%以上
    });

    test('应该支持手动调整压缩设置', async ({ page }) => {
      // 上传图片
      await analysisPage.uploadImage(testImages.largeImage);
      
      // 打开压缩设置
      await page.locator('[data-testid="compression-settings"]').click();
      
      // 调整质量设置
      const qualitySlider = page.locator('[data-testid="quality-slider"]');
      await qualitySlider.fill('90');
      
      // 应用设置
      await page.locator('[data-testid="apply-compression"]').click();
      
      // 验证重新压缩
      const compressionProgress = page.locator('[data-testid="compression-progress"]');
      await expect(compressionProgress).toBeVisible();
      
      // 等待完成
      await page.waitForSelector('[data-testid="compression-progress"]', { state: 'hidden' });
      
      // 验证新的质量设置生效
      const qualityInfo = page.locator('[data-testid="quality-info"]');
      const newQuality = await qualityInfo.locator('[data-testid="quality-score"]').textContent();
      expect(newQuality).toContain('90%');
    });

    test('应该自动旋转图片方向', async ({ page }) => {
      // 上传带有EXIF方向信息的图片
      await analysisPage.uploadImage(testImages.rotatedImage);
      
      // 验证显示旋转处理信息
      const rotationInfo = page.locator('[data-testid="rotation-info"]');
      await expect(rotationInfo).toBeVisible();
      await expect(rotationInfo).toContainText('已自动旋转');
      
      // 验证图片预览方向正确
      const previewImage = page.locator('[data-testid="uploaded-image"] img');
      const transform = await previewImage.evaluate(img => getComputedStyle(img).transform);
      expect(transform).not.toBe('none'); // 应该有旋转变换
    });

    test('应该移除敏感的EXIF信息', async ({ page }) => {
      // 上传包含EXIF信息的图片
      await analysisPage.uploadImage(testImages.exifImage);
      
      // 验证显示隐私处理信息
      const privacyInfo = page.locator('[data-testid="privacy-info"]');
      await expect(privacyInfo).toBeVisible();
      await expect(privacyInfo).toContainText('已移除位置信息');
      
      // 验证处理后的图片不包含敏感信息
      const processedInfo = page.locator('[data-testid="processed-info"]');
      await expect(processedInfo).toContainText('隐私保护: 已启用');
    });
  });

  test.describe('上传状态和错误处理测试', () => {
    test('应该显示上传进度条', async ({ page }) => {
      // 模拟慢速上传
      await apiMocker.mockSlowResponse(3000);
      
      // 开始上传
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.validJpeg);
      
      // 验证显示进度条
      const progressBar = page.locator('[data-testid="upload-progress"]');
      await expect(progressBar).toBeVisible();
      
      // 验证进度条有动画
      await expect(progressBar).toHaveAttribute('aria-valuenow', /\d+/);
      
      // 等待上传完成
      await page.waitForSelector('[data-testid="upload-progress"]', { state: 'hidden' });
    });

    test('应该支持取消上传', async ({ page }) => {
      // 模拟慢速上传
      await apiMocker.mockSlowResponse(5000);
      
      // 开始上传
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.largeImage);
      
      // 等待进度条出现
      await page.waitForSelector('[data-testid="upload-progress"]');
      
      // 点击取消按钮
      await page.locator('[data-testid="cancel-upload"]').click();
      
      // 验证上传被取消
      await expect(page.locator('[data-testid="upload-progress"]')).not.toBeVisible();
      
      // 验证显示取消消息
      const cancelMessage = page.locator('[data-testid="upload-cancelled"]');
      await expect(cancelMessage).toBeVisible();
      await expect(cancelMessage).toContainText('上传已取消');
    });

    test('应该处理网络错误', async ({ page }) => {
      // 模拟网络错误
      await apiMocker.mockNetworkError();
      
      // 尝试上传
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.validJpeg);
      
      // 验证显示网络错误
      const errorMessage = await analysisPage.getAnalysisError();
      expect(errorMessage).toContain('网络连接失败');
      
      // 验证显示重试按钮
      const retryButton = page.locator('[data-testid="retry-upload"]');
      await expect(retryButton).toBeVisible();
    });

    test('应该支持重试失败的上传', async ({ page }) => {
      // 先模拟网络错误
      await apiMocker.mockNetworkError();
      
      // 尝试上传
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(testImages.validJpeg);
      
      // 等待错误出现
      await page.waitForSelector('[data-testid="retry-upload"]');
      
      // 恢复网络
      await apiMocker.clearMocks();
      
      // 点击重试
      await page.locator('[data-testid="retry-upload"]').click();
      
      // 验证重试成功
      const uploadResult = await analysisPage.verifyUploadedImage();
      expect(uploadResult.isVisible).toBe(true);
    });

    test('应该显示上传速度信息', async ({ page }) => {
      // 上传大文件以便观察速度
      await analysisPage.uploadImage(testImages.largeImage);
      
      // 验证显示速度信息
      const speedInfo = page.locator('[data-testid="upload-speed"]');
      await expect(speedInfo).toBeVisible();
      
      const speedText = await speedInfo.textContent();
      expect(speedText).toMatch(/\d+(\.\d+)?\s*(KB\/s|MB\/s)/);
    });
  });

  // 辅助函数：创建各种测试图片
  async function createTestImages() {
    const fixturesDir = path.join(__dirname, '../../fixtures/images');
    
    // 创建小图片 (100KB)
    testImages.smallImage = path.join(fixturesDir, 'small-test-image.jpg');
    await createImageFile(testImages.smallImage, 100 * 1024);
    
    // 创建中等图片 (2MB)
    testImages.mediumImage = path.join(fixturesDir, 'medium-test-image.jpg');
    await createImageFile(testImages.mediumImage, 2 * 1024 * 1024);
    
    // 创建超大图片 (15MB)
    testImages.oversizeImage = path.join(fixturesDir, 'oversize-test-image.jpg');
    await createImageFile(testImages.oversizeImage, 15 * 1024 * 1024);
    
    // 创建损坏的图片
    testImages.corruptedImage = path.join(fixturesDir, 'corrupted-image.jpg');
    await fs.promises.writeFile(testImages.corruptedImage, 'corrupted data');
    
    // 创建WebP图片
    testImages.webpImage = path.join(fixturesDir, 'test-image.webp');
    await createWebPImage(testImages.webpImage);
    
    // 创建GIF图片
    testImages.gifImage = path.join(fixturesDir, 'test-image.gif');
    await createGifImage(testImages.gifImage);
    
    // 创建BMP图片
    testImages.bmpImage = path.join(fixturesDir, 'test-image.bmp');
    await createBmpImage(testImages.bmpImage);
  }

  // 辅助函数：清理测试图片
  async function cleanupTestImages() {
    const imagesToCleanup = [
      testImages.smallImage,
      testImages.mediumImage,
      testImages.oversizeImage,
      testImages.corruptedImage,
      testImages.webpImage,
      testImages.gifImage,
      testImages.bmpImage
    ];
    
    for (const imagePath of imagesToCleanup) {
      try {
        if (imagePath && fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup test image: ${imagePath}`, error);
      }
    }
  }

  // 辅助函数：创建指定大小的图片文件
  async function createImageFile(filePath: string, size: number) {
    // 创建一个简单的JPEG文件头
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
    ]);
    
    // 填充数据到指定大小
    const padding = Buffer.alloc(size - jpegHeader.length - 2, 0xFF);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);
    
    const imageData = Buffer.concat([jpegHeader, padding, jpegEnd]);
    await fs.promises.writeFile(filePath, imageData);
  }

  // 辅助函数：创建WebP图片
  async function createWebPImage(filePath: string) {
    // 简单的WebP文件头
    const webpHeader = Buffer.from('RIFF', 'ascii');
    const fileSize = Buffer.alloc(4);
    fileSize.writeUInt32LE(1000, 0);
    const webpSignature = Buffer.from('WEBP', 'ascii');
    const vp8Header = Buffer.from('VP8 ', 'ascii');
    
    const webpData = Buffer.concat([webpHeader, fileSize, webpSignature, vp8Header]);
    await fs.promises.writeFile(filePath, webpData);
  }

  // 辅助函数：创建GIF图片
  async function createGifImage(filePath: string) {
    // 简单的GIF文件头
    const gifHeader = Buffer.from('GIF89a', 'ascii');
    const gifData = Buffer.concat([gifHeader, Buffer.alloc(100, 0x00)]);
    await fs.promises.writeFile(filePath, gifData);
  }

  // 辅助函数：创建BMP图片
  async function createBmpImage(filePath: string) {
    // 简单的BMP文件头
    const bmpHeader = Buffer.from([0x42, 0x4D]); // 'BM'
    const bmpData = Buffer.concat([bmpHeader, Buffer.alloc(100, 0x00)]);
    await fs.promises.writeFile(filePath, bmpData);
  }
});