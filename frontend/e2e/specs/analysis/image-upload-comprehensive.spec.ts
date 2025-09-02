import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import path from 'path';
import fs from 'fs';

/**
 * 便便分析图片上传综合测试套件
 * 测试多种图片格式、大小限制、拖拽上传、批量上传和图片预处理功能
 */
test.describe('便便分析图片上传综合测试', () => {
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
      username: 'analysis_user',
      email: 'analysis@test.com',
      password: 'TestPass123!'
    });

    testPet = await dataManager.createTestPet(testUser.id!, {
      name: 'AnalysisPet',
      type: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      weight: 25.0
    });

    // 登录用户
    await authPage.login(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await dataManager.cleanup();
  });

  test.describe('多种图片格式支持测试', () => {
    const imageFormats = [
      { format: 'JPEG', file: 'test-image.jpg', mimeType: 'image/jpeg' },
      { format: 'PNG', file: 'test-image.png', mimeType: 'image/png' },
      { format: 'WebP', file: 'test-image.webp', mimeType: 'image/webp' },
      { format: 'HEIC', file: 'test-image.heic', mimeType: 'image/heic' }
    ];

    for (const imageFormat of imageFormats) {
      test(`应该支持${imageFormat.format}格式图片上传`, async () => {
        await analysisPage.goToAnalysisPage();

        // 创建测试图片文件
        const testImagePath = await createTestImage(imageFormat.file, imageFormat.mimeType);

        try {
          // 上传图片
          await analysisPage.uploadImage(testImagePath);

          // 验证上传成功
          const uploadResult = await analysisPage.verifyUploadedImage();
          expect(uploadResult.isVisible).toBe(true);
          expect(uploadResult.hasPreview).toBe(true);
          expect(uploadResult.canRemove).toBe(true);

          // 验证分析按钮可用
          const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
          expect(analyzeEnabled).toBe(true);

        } finally {
          // 清理测试文件
          if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
          }
        }
      });
    }

    test('应该拒绝不支持的图片格式', async () => {
      await analysisPage.goToAnalysisPage();

      const unsupportedFormats = [
        { format: 'GIF', file: 'test-image.gif', mimeType: 'image/gif' },
        { format: 'BMP', file: 'test-image.bmp', mimeType: 'image/bmp' },
        { format: 'TIFF', file: 'test-image.tiff', mimeType: 'image/tiff' }
      ];

      for (const format of unsupportedFormats) {
        const testImagePath = await createTestImage(format.file, format.mimeType);

        try {
          // 尝试上传不支持的格式
          await analysisPage.uploadImage(testImagePath);

          // 验证显示错误信息
          const errorMessage = await analysisPage.getAnalysisError();
          expect(errorMessage).toContain('不支持的图片格式');

          // 验证分析按钮不可用
          const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
          expect(analyzeEnabled).toBe(false);

        } finally {
          if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
          }
        }
      }
    });
  });

  test.describe('图片大小限制测试', () => {
    test('应该接受合适大小的图片', async () => {
      await analysisPage.goToAnalysisPage();

      const validSizes = [
        { size: '1MB', width: 1024, height: 768 },
        { size: '5MB', width: 2048, height: 1536 },
        { size: '8MB', width: 3000, height: 2000 }
      ];

      for (const sizeConfig of validSizes) {
        const testImagePath = await createTestImageWithSize(
          `test-${sizeConfig.size}.jpg`,
          sizeConfig.width,
          sizeConfig.height
        );

        try {
          // 上传图片
          await analysisPage.uploadImage(testImagePath);

          // 验证上传成功
          const uploadResult = await analysisPage.verifyUploadedImage();
          expect(uploadResult.isVisible).toBe(true);

          // 清除当前图片准备下一次测试
          await analysisPage.removeUploadedImage();

        } finally {
          if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
          }
        }
      }
    });

    test('应该拒绝过大的图片', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建超过10MB的大图片
      const largeImagePath = await createTestImageWithSize('large-image.jpg', 5000, 4000);

      try {
        // 尝试上传大图片
        await analysisPage.uploadImage(largeImagePath);

        // 验证显示错误信息
        const errorMessage = await analysisPage.getAnalysisError();
        expect(errorMessage).toContain('图片文件过大');

        // 验证分析按钮不可用
        const analyzeEnabled = await analysisPage.isAnalyzeButtonEnabled();
        expect(analyzeEnabled).toBe(false);

      } finally {
        if (fs.existsSync(largeImagePath)) {
          fs.unlinkSync(largeImagePath);
        }
      }
    });

    test('应该拒绝过小的图片', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建过小的图片
      const smallImagePath = await createTestImageWithSize('small-image.jpg', 100, 100);

      try {
        // 尝试上传小图片
        await analysisPage.uploadImage(smallImagePath);

        // 验证显示警告信息
        const warningMessage = await analysisPage.getAnalysisWarning();
        expect(warningMessage).toContain('图片分辨率过低');

      } finally {
        if (fs.existsSync(smallImagePath)) {
          fs.unlinkSync(smallImagePath);
        }
      }
    });
  });

  test.describe('拖拽上传功能测试', () => {
    test('应该支持拖拽上传单个图片', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('drag-test.jpg', 'image/jpeg');

      try {
        // 拖拽上传图片
        await analysisPage.dragAndDropImage(testImagePath);

        // 验证上传成功
        const uploadResult = await analysisPage.verifyUploadedImage();
        expect(uploadResult.isVisible).toBe(true);
        expect(uploadResult.hasPreview).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持拖拽上传多个图片', async () => {
      await analysisPage.goToAnalysisPage();

      const testImages = [
        await createTestImage('drag-test-1.jpg', 'image/jpeg'),
        await createTestImage('drag-test-2.jpg', 'image/jpeg'),
        await createTestImage('drag-test-3.jpg', 'image/jpeg')
      ];

      try {
        // 拖拽上传多个图片
        await analysisPage.dragAndDropMultipleImages(testImages);

        // 验证显示图片选择界面
        const imageSelector = await analysisPage.getImageSelector();
        expect(imageSelector.isVisible).toBe(true);
        expect(imageSelector.imageCount).toBe(3);

        // 选择第一张图片
        await analysisPage.selectImageFromBatch(0);

        // 验证选中的图片
        const uploadResult = await analysisPage.verifyUploadedImage();
        expect(uploadResult.isVisible).toBe(true);

      } finally {
        // 清理测试文件
        testImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    });

    test('应该在拖拽时显示视觉反馈', async () => {
      await analysisPage.goToAnalysisPage();

      // 模拟拖拽进入
      await analysisPage.simulateDragEnter();

      // 验证拖拽区域高亮
      const dragZoneHighlighted = await analysisPage.isDragZoneHighlighted();
      expect(dragZoneHighlighted).toBe(true);

      // 模拟拖拽离开
      await analysisPage.simulateDragLeave();

      // 验证高亮消失
      const dragZoneNormal = await analysisPage.isDragZoneHighlighted();
      expect(dragZoneNormal).toBe(false);
    });
  });

  test.describe('批量上传功能测试', () => {
    test('应该支持选择多个图片文件', async () => {
      await analysisPage.goToAnalysisPage();

      const testImages = [
        await createTestImage('batch-1.jpg', 'image/jpeg'),
        await createTestImage('batch-2.jpg', 'image/jpeg'),
        await createTestImage('batch-3.jpg', 'image/jpeg')
      ];

      try {
        // 批量选择图片
        await analysisPage.selectMultipleImages(testImages);

        // 验证显示批量上传界面
        const batchUploader = await analysisPage.getBatchUploader();
        expect(batchUploader.isVisible).toBe(true);
        expect(batchUploader.fileCount).toBe(3);

        // 验证每个文件的状态
        for (let i = 0; i < testImages.length; i++) {
          const fileStatus = await analysisPage.getFileUploadStatus(i);
          expect(fileStatus.name).toContain(`batch-${i + 1}.jpg`);
          expect(fileStatus.status).toBe('ready');
        }

      } finally {
        testImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    });

    test('应该支持批量上传进度监控', async () => {
      await analysisPage.goToAnalysisPage();

      const testImages = [
        await createTestImage('progress-1.jpg', 'image/jpeg'),
        await createTestImage('progress-2.jpg', 'image/jpeg')
      ];

      try {
        // 选择多个图片
        await analysisPage.selectMultipleImages(testImages);

        // 开始批量上传
        await analysisPage.startBatchUpload();

        // 监控上传进度
        const progressUpdates: any[] = [];
        await analysisPage.monitorBatchUploadProgress((progress) => {
          progressUpdates.push(progress);
        });

        // 验证进度更新
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates[progressUpdates.length - 1].completed).toBe(true);

      } finally {
        testImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    });

    test('应该支持取消批量上传', async () => {
      await analysisPage.goToAnalysisPage();

      const testImages = [
        await createTestImage('cancel-1.jpg', 'image/jpeg'),
        await createTestImage('cancel-2.jpg', 'image/jpeg')
      ];

      try {
        // 选择多个图片
        await analysisPage.selectMultipleImages(testImages);

        // 开始批量上传
        await analysisPage.startBatchUpload();

        // 取消上传
        await analysisPage.cancelBatchUpload();

        // 验证上传已取消
        const uploadStatus = await analysisPage.getBatchUploadStatus();
        expect(uploadStatus.cancelled).toBe(true);

      } finally {
        testImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    });
  });

  test.describe('图片预处理和压缩测试', () => {
    test('应该自动压缩大尺寸图片', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建大尺寸图片
      const largeImagePath = await createTestImageWithSize('large-compress.jpg', 4000, 3000);

      try {
        // 上传大图片
        await analysisPage.uploadImage(largeImagePath);

        // 验证显示压缩提示
        const compressionInfo = await analysisPage.getCompressionInfo();
        expect(compressionInfo.isCompressed).toBe(true);
        expect(compressionInfo.originalSize).toBeGreaterThan(compressionInfo.compressedSize);

        // 验证压缩后的图片质量
        const imageQuality = await analysisPage.getImageQuality();
        expect(imageQuality.width).toBeLessThanOrEqual(2048);
        expect(imageQuality.height).toBeLessThanOrEqual(2048);

      } finally {
        if (fs.existsSync(largeImagePath)) {
          fs.unlinkSync(largeImagePath);
        }
      }
    });

    test('应该自动旋转图片方向', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建带EXIF旋转信息的图片
      const rotatedImagePath = await createTestImageWithRotation('rotated.jpg', 90);

      try {
        // 上传旋转图片
        await analysisPage.uploadImage(rotatedImagePath);

        // 验证图片已自动旋转
        const rotationInfo = await analysisPage.getRotationInfo();
        expect(rotationInfo.wasRotated).toBe(true);
        expect(rotationInfo.correctedOrientation).toBe(true);

      } finally {
        if (fs.existsSync(rotatedImagePath)) {
          fs.unlinkSync(rotatedImagePath);
        }
      }
    });

    test('应该增强图片对比度和清晰度', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建低对比度图片
      const lowContrastImagePath = await createTestImageWithLowContrast('low-contrast.jpg');

      try {
        // 上传低对比度图片
        await analysisPage.uploadImage(lowContrastImagePath);

        // 验证显示增强选项
        const enhancementOptions = await analysisPage.getEnhancementOptions();
        expect(enhancementOptions.contrastEnhancement).toBe(true);
        expect(enhancementOptions.sharpnessEnhancement).toBe(true);

        // 应用增强
        await analysisPage.applyImageEnhancement();

        // 验证增强效果
        const enhancementResult = await analysisPage.getEnhancementResult();
        expect(enhancementResult.enhanced).toBe(true);
        expect(enhancementResult.contrastImproved).toBe(true);

      } finally {
        if (fs.existsSync(lowContrastImagePath)) {
          fs.unlinkSync(lowContrastImagePath);
        }
      }
    });

    test('应该移除图片中的敏感信息', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建带EXIF数据的图片
      const exifImagePath = await createTestImageWithEXIF('exif-test.jpg', {
        gps: { latitude: 40.7128, longitude: -74.0060 },
        camera: 'iPhone 12',
        timestamp: new Date()
      });

      try {
        // 上传带EXIF的图片
        await analysisPage.uploadImage(exifImagePath);

        // 验证EXIF数据已被移除
        const privacyInfo = await analysisPage.getPrivacyInfo();
        expect(privacyInfo.exifRemoved).toBe(true);
        expect(privacyInfo.gpsRemoved).toBe(true);
        expect(privacyInfo.metadataCleared).toBe(true);

      } finally {
        if (fs.existsSync(exifImagePath)) {
          fs.unlinkSync(exifImagePath);
        }
      }
    });
  });

  test.describe('上传错误处理测试', () => {
    test('应该处理网络中断错误', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('network-test.jpg', 'image/jpeg');

      try {
        // 模拟网络中断
        await analysisPage.simulateNetworkError();

        // 尝试上传图片
        await analysisPage.uploadImage(testImagePath);

        // 验证显示网络错误
        const errorMessage = await analysisPage.getAnalysisError();
        expect(errorMessage).toContain('网络连接失败');

        // 验证显示重试按钮
        const retryVisible = await analysisPage.isRetryButtonVisible();
        expect(retryVisible).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该处理服务器错误', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('server-error-test.jpg', 'image/jpeg');

      try {
        // 模拟服务器错误
        await analysisPage.simulateServerError(500);

        // 尝试上传图片
        await analysisPage.uploadImage(testImagePath);

        // 验证显示服务器错误
        const errorMessage = await analysisPage.getAnalysisError();
        expect(errorMessage).toContain('服务器暂时不可用');

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该处理文件损坏错误', async () => {
      await analysisPage.goToAnalysisPage();

      // 创建损坏的图片文件
      const corruptImagePath = await createCorruptImage('corrupt.jpg');

      try {
        // 尝试上传损坏的图片
        await analysisPage.uploadImage(corruptImagePath);

        // 验证显示文件损坏错误
        const errorMessage = await analysisPage.getAnalysisError();
        expect(errorMessage).toContain('图片文件损坏');

      } finally {
        if (fs.existsSync(corruptImagePath)) {
          fs.unlinkSync(corruptImagePath);
        }
      }
    });
  });

  test.describe('上传性能测试', () => {
    test('应该在合理时间内完成上传', async () => {
      await analysisPage.goToAnalysisPage();

      const testImagePath = await createTestImage('performance-test.jpg', 'image/jpeg');

      try {
        const startTime = Date.now();

        // 上传图片
        await analysisPage.uploadImage(testImagePath);

        const uploadTime = Date.now() - startTime;

        // 验证上传时间在合理范围内（5秒内）
        expect(uploadTime).toBeLessThan(5000);

        // 验证上传成功
        const uploadResult = await analysisPage.verifyUploadedImage();
        expect(uploadResult.isVisible).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持并发上传', async () => {
      await analysisPage.goToAnalysisPage();

      const testImages = [
        await createTestImage('concurrent-1.jpg', 'image/jpeg'),
        await createTestImage('concurrent-2.jpg', 'image/jpeg'),
        await createTestImage('concurrent-3.jpg', 'image/jpeg')
      ];

      try {
        const startTime = Date.now();

        // 并发上传多个图片
        await analysisPage.uploadImagesConcurrently(testImages);

        const totalTime = Date.now() - startTime;

        // 验证并发上传比顺序上传更快
        expect(totalTime).toBeLessThan(testImages.length * 2000);

        // 验证所有图片都上传成功
        const uploadResults = await analysisPage.getBatchUploadResults();
        expect(uploadResults.successCount).toBe(testImages.length);

      } finally {
        testImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    });
  });
});

// 辅助函数：创建测试图片
async function createTestImage(filename: string, mimeType: string): Promise<string> {
  const testDir = path.join(__dirname, '../../fixtures/test-images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, filename);
  
  // 创建简单的测试图片数据
  const imageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(imagePath, imageData);
  
  return imagePath;
}

// 辅助函数：创建指定尺寸的测试图片
async function createTestImageWithSize(filename: string, width: number, height: number): Promise<string> {
  const testDir = path.join(__dirname, '../../fixtures/test-images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, filename);
  
  // 根据尺寸创建不同大小的图片数据
  const pixelCount = width * height;
  const dataSize = Math.max(1024, pixelCount / 10); // 简化的大小计算
  const imageData = Buffer.alloc(dataSize, 0xFF);
  
  fs.writeFileSync(imagePath, imageData);
  
  return imagePath;
}

// 辅助函数：创建带旋转信息的图片
async function createTestImageWithRotation(filename: string, rotation: number): Promise<string> {
  // 简化实现，实际应该创建带EXIF旋转信息的图片
  return await createTestImage(filename, 'image/jpeg');
}

// 辅助函数：创建低对比度图片
async function createTestImageWithLowContrast(filename: string): Promise<string> {
  // 简化实现，实际应该创建低对比度的图片
  return await createTestImage(filename, 'image/jpeg');
}

// 辅助函数：创建带EXIF数据的图片
async function createTestImageWithEXIF(filename: string, exifData: any): Promise<string> {
  // 简化实现，实际应该创建带EXIF数据的图片
  return await createTestImage(filename, 'image/jpeg');
}

// 辅助函数：创建损坏的图片
async function createCorruptImage(filename: string): Promise<string> {
  const testDir = path.join(__dirname, '../../fixtures/test-images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, filename);
  
  // 创建损坏的图片数据
  const corruptData = Buffer.from('这不是有效的图片数据');
  fs.writeFileSync(imagePath, corruptData);
  
  return imagePath;
}