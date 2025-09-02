import { Page, expect } from '@playwright/test';
import { BasePage } from '../utils/base-page';

/**
 * 便便分析页面对象类
 * 处理图片上传、分析流程和结果管理
 */
export class AnalysisPage extends BasePage {
  // 页面选择器
  private readonly selectors = {
    // 图片上传区域
    uploadArea: '[data-testid="upload-area"]',
    fileInput: '[data-testid="file-input"]',
    dragDropZone: '[data-testid="drag-drop-zone"]',
    uploadButton: '[data-testid="upload-button"]',
    uploadProgress: '[data-testid="upload-progress"]',
    uploadedImage: '[data-testid="uploaded-image"]',
    removeImageButton: '[data-testid="remove-image"]',
    
    // 宠物选择
    petSelector: '[data-testid="pet-selector"]',
    petOption: '[data-testid="pet-option"]',
    selectedPet: '[data-testid="selected-pet"]',
    addPetLink: '[data-testid="add-pet-link"]',
    
    // 分析控制
    analyzeButton: '[data-testid="analyze-button"]',
    cancelAnalysisButton: '[data-testid="cancel-analysis"]',
    retryAnalysisButton: '[data-testid="retry-analysis"]',
    
    // 分析状态
    analysisStatus: '[data-testid="analysis-status"]',
    analysisProgress: '[data-testid="analysis-progress"]',
    analysisProgressBar: '[data-testid="progress-bar"]',
    analysisProgressText: '[data-testid="progress-text"]',
    
    // 分析结果
    resultsContainer: '[data-testid="analysis-results"]',
    healthStatus: '[data-testid="health-status"]',
    healthScore: '[data-testid="health-score"]',
    healthDescription: '[data-testid="health-description"]',
    healthRecommendations: '[data-testid="health-recommendations"]',
    confidenceScore: '[data-testid="confidence-score"]',
    
    // 结果详情
    detailsPanel: '[data-testid="details-panel"]',
    shapeAnalysis: '[data-testid="shape-analysis"]',
    colorAnalysis: '[data-testid="color-analysis"]',
    consistencyAnalysis: '[data-testid="consistency-analysis"]',
    sizeAnalysis: '[data-testid="size-analysis"]',
    
    // 历史对比
    historyComparison: '[data-testid="history-comparison"]',
    previousResults: '[data-testid="previous-results"]',
    trendChart: '[data-testid="trend-chart"]',
    
    // 保存和分享
    saveButton: '[data-testid="save-result"]',
    shareButton: '[data-testid="share-result"]',
    addNotesButton: '[data-testid="add-notes"]',
    notesInput: '[data-testid="notes-input"]',
    saveNotesButton: '[data-testid="save-notes"]',
    
    // 分享选项
    shareModal: '[data-testid="share-modal"]',
    shareToVet: '[data-testid="share-to-vet"]',
    shareToCommunity: '[data-testid="share-to-community"]',
    shareViaEmail: '[data-testid="share-via-email"]',
    copyLinkButton: '[data-testid="copy-link"]',
    
    // 状态指示器
    loadingSpinner: '[data-testid="analysis-loading"]',
    errorMessage: '[data-testid="analysis-error"]',
    successMessage: '[data-testid="analysis-success"]',
    warningMessage: '[data-testid="analysis-warning"]',
    
    // 帮助和指导
    helpButton: '[data-testid="help-button"]',
    helpModal: '[data-testid="help-modal"]',
    photoTips: '[data-testid="photo-tips"]',
    closeHelpButton: '[data-testid="close-help"]',
    
    // 重新分析
    newAnalysisButton: '[data-testid="new-analysis"]',
    clearResultsButton: '[data-testid="clear-results"]'
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 导航到分析页面
   */
  async goToAnalysisPage(): Promise<void> {
    await this.goto('/analysis');
    await this.waitForElement(this.selectors.uploadArea);
  }

  /**
   * 上传图片进行分析
   */
  async uploadImage(imagePath: string): Promise<void> {
    await this.goToAnalysisPage();
    
    // 上传图片文件
    const fileInput = this.page.locator(this.selectors.fileInput);
    await fileInput.setInputFiles(imagePath);
    
    // 等待图片上传完成
    await this.waitForElement(this.selectors.uploadedImage);
    await this.waitForLoadingComplete(this.selectors.uploadProgress);
  }

  /**
   * 通过拖拽上传图片
   */
  async dragAndDropImage(imagePath: string): Promise<void> {
    await this.goToAnalysisPage();
    
    // 模拟拖拽上传
    const dropZone = this.page.locator(this.selectors.dragDropZone);
    
    // 创建文件对象并模拟拖拽
    const buffer = require('fs').readFileSync(imagePath);
    const file = new File([buffer], 'test-image.jpg', { type: 'image/jpeg' });
    
    await dropZone.dispatchEvent('drop', {
      dataTransfer: {
        files: [file]
      }
    });
    
    // 等待上传完成
    await this.waitForElement(this.selectors.uploadedImage);
  }

  /**
   * 选择宠物
   */
  async selectPet(petName: string): Promise<void> {
    // 点击宠物选择器
    await this.safeClick(this.selectors.petSelector);
    
    // 选择指定宠物
    const petOptions = this.page.locator(this.selectors.petOption);
    const count = await petOptions.count();
    
    for (let i = 0; i < count; i++) {
      const option = petOptions.nth(i);
      const text = await option.textContent();
      if (text?.includes(petName)) {
        await option.click();
        break;
      }
    }
    
    // 验证选择成功
    await expect(this.page.locator(this.selectors.selectedPet)).toContainText(petName);
  }

  /**
   * 开始分析
   */
  async startAnalysis(): Promise<void> {
    await this.safeClick(this.selectors.analyzeButton);
    
    // 等待分析开始
    await this.waitForElement(this.selectors.analysisStatus);
    await this.waitForElement(this.selectors.analysisProgress);
  }

  /**
   * 等待分析完成
   */
  async waitForAnalysisComplete(timeout: number = 60000): Promise<{
    status: string;
    score: string;
    description: string;
    confidence: string;
  }> {
    // 等待分析结果出现
    await this.waitForElement(this.selectors.resultsContainer, timeout);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
    
    // 获取分析结果
    const status = await this.getElementText(this.selectors.healthStatus);
    const score = await this.getElementText(this.selectors.healthScore);
    const description = await this.getElementText(this.selectors.healthDescription);
    const confidence = await this.getElementText(this.selectors.confidenceScore);
    
    return { status, score, description, confidence };
  }

  /**
   * 取消分析
   */
  async cancelAnalysis(): Promise<void> {
    await this.safeClick(this.selectors.cancelAnalysisButton);
    
    // 验证分析已取消
    await expect(this.page.locator(this.selectors.analysisProgress)).not.toBeVisible();
  }

  /**
   * 重试分析
   */
  async retryAnalysis(): Promise<void> {
    await this.safeClick(this.selectors.retryAnalysisButton);
    await this.waitForElement(this.selectors.analysisProgress);
  }

  /**
   * 获取分析进度
   */
  async getAnalysisProgress(): Promise<{
    percentage: number;
    status: string;
  }> {
    const progressText = await this.getElementText(this.selectors.analysisProgressText);
    const progressBar = this.page.locator(this.selectors.analysisProgressBar);
    const percentage = await progressBar.getAttribute('aria-valuenow');
    
    return {
      percentage: parseInt(percentage || '0'),
      status: progressText
    };
  }

  /**
   * 查看详细分析结果
   */
  async getDetailedResults(): Promise<{
    shape: string;
    color: string;
    consistency: string;
    size: string;
  }> {
    await this.waitForElement(this.selectors.detailsPanel);
    
    const shape = await this.getElementText(this.selectors.shapeAnalysis);
    const color = await this.getElementText(this.selectors.colorAnalysis);
    const consistency = await this.getElementText(this.selectors.consistencyAnalysis);
    const size = await this.getElementText(this.selectors.sizeAnalysis);
    
    return { shape, color, consistency, size };
  }

  /**
   * 保存分析结果
   */
  async saveResult(): Promise<void> {
    await this.safeClick(this.selectors.saveButton);
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 添加备注
   */
  async addNotes(notes: string): Promise<void> {
    await this.safeClick(this.selectors.addNotesButton);
    await this.waitForElement(this.selectors.notesInput);
    
    await this.safeFill(this.selectors.notesInput, notes);
    await this.safeClick(this.selectors.saveNotesButton);
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 分享结果
   */
  async shareResult(shareType: 'vet' | 'community' | 'email' | 'link'): Promise<void> {
    await this.safeClick(this.selectors.shareButton);
    await this.waitForElement(this.selectors.shareModal);
    
    switch (shareType) {
      case 'vet':
        await this.safeClick(this.selectors.shareToVet);
        break;
      case 'community':
        await this.safeClick(this.selectors.shareToCommunity);
        break;
      case 'email':
        await this.safeClick(this.selectors.shareViaEmail);
        break;
      case 'link':
        await this.safeClick(this.selectors.copyLinkButton);
        break;
    }
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 查看历史对比
   */
  async viewHistoryComparison(): Promise<{
    hasHistory: boolean;
    previousCount: number;
    trendVisible: boolean;
  }> {
    const historyVisible = await this.isElementVisible(this.selectors.historyComparison);
    
    if (!historyVisible) {
      return { hasHistory: false, previousCount: 0, trendVisible: false };
    }
    
    const previousResults = this.page.locator(this.selectors.previousResults);
    const previousCount = await previousResults.count();
    const trendVisible = await this.isElementVisible(this.selectors.trendChart);
    
    return { hasHistory: true, previousCount, trendVisible };
  }

  /**
   * 移除上传的图片
   */
  async removeUploadedImage(): Promise<void> {
    await this.safeClick(this.selectors.removeImageButton);
    await expect(this.page.locator(this.selectors.uploadedImage)).not.toBeVisible();
  }

  /**
   * 开始新的分析
   */
  async startNewAnalysis(): Promise<void> {
    await this.safeClick(this.selectors.newAnalysisButton);
    await this.waitForElement(this.selectors.uploadArea);
    
    // 验证页面已重置
    await expect(this.page.locator(this.selectors.resultsContainer)).not.toBeVisible();
  }

  /**
   * 清除分析结果
   */
  async clearResults(): Promise<void> {
    await this.safeClick(this.selectors.clearResultsButton);
    await expect(this.page.locator(this.selectors.resultsContainer)).not.toBeVisible();
  }

  /**
   * 查看帮助信息
   */
  async viewHelp(): Promise<string> {
    await this.safeClick(this.selectors.helpButton);
    await this.waitForElement(this.selectors.helpModal);
    
    const helpContent = await this.getElementText(this.selectors.photoTips);
    
    // 关闭帮助
    await this.safeClick(this.selectors.closeHelpButton);
    await expect(this.page.locator(this.selectors.helpModal)).not.toBeVisible();
    
    return helpContent;
  }

  /**
   * 验证上传的图片
   */
  async verifyUploadedImage(): Promise<{
    isVisible: boolean;
    hasPreview: boolean;
    canRemove: boolean;
  }> {
    const isVisible = await this.isElementVisible(this.selectors.uploadedImage);
    const hasPreview = isVisible && await this.page.locator(this.selectors.uploadedImage).locator('img').isVisible();
    const canRemove = await this.isElementVisible(this.selectors.removeImageButton);
    
    return { isVisible, hasPreview, canRemove };
  }

  /**
   * 检查分析按钮状态
   */
  async isAnalyzeButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.analyzeButton);
    return await button.isEnabled();
  }

  /**
   * 获取分析错误信息
   */
  async getAnalysisError(): Promise<string> {
    try {
      return await this.waitForErrorMessage(this.selectors.errorMessage, 5000);
    } catch {
      return '';
    }
  }

  /**
   * 获取分析警告信息
   */
  async getAnalysisWarning(): Promise<string> {
    try {
      return await this.getElementText(this.selectors.warningMessage);
    } catch {
      return '';
    }
  }

  /**
   * 验证分析结果的完整性
   */
  async validateAnalysisResults(): Promise<{
    hasStatus: boolean;
    hasScore: boolean;
    hasDescription: boolean;
    hasRecommendations: boolean;
    hasConfidence: boolean;
  }> {
    return {
      hasStatus: await this.isElementVisible(this.selectors.healthStatus),
      hasScore: await this.isElementVisible(this.selectors.healthScore),
      hasDescription: await this.isElementVisible(this.selectors.healthDescription),
      hasRecommendations: await this.isElementVisible(this.selectors.healthRecommendations),
      hasConfidence: await this.isElementVisible(this.selectors.confidenceScore)
    };
  }

  /**
   * 监控分析状态变化
   */
  async monitorAnalysisStatus(callback: (status: string, progress: number) => void): Promise<void> {
    const statusElement = this.page.locator(this.selectors.analysisStatus);
    const progressElement = this.page.locator(this.selectors.analysisProgressBar);
    
    // 监听状态变化
    await this.page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="analysis-status"]')?.textContent || '';
      const progress = document.querySelector('[data-testid="progress-bar"]')?.getAttribute('aria-valuenow') || '0';
      
      // 调用回调函数
      if (window.statusCallback) {
        window.statusCallback(status, parseInt(progress));
      }
      
      // 检查是否完成
      return status.includes('完成') || status.includes('complete') || status.includes('错误') || status.includes('error');
    });
  }

  /**
   * 拖拽上传多个图片
   */
  async dragAndDropMultipleImages(imagePaths: string[]): Promise<void> {
    const dropZone = this.page.locator(this.selectors.dragDropZone);
    
    // 创建多个文件对象
    const files = imagePaths.map(imagePath => {
      const buffer = require('fs').readFileSync(imagePath);
      const filename = require('path').basename(imagePath);
      return new File([buffer], filename, { type: 'image/jpeg' });
    });
    
    await dropZone.dispatchEvent('drop', {
      dataTransfer: { files }
    });
    
    await this.waitForElement('[data-testid="image-selector"]');
  }

  /**
   * 获取图片选择器状态
   */
  async getImageSelector(): Promise<{
    isVisible: boolean;
    imageCount: number;
  }> {
    const selector = this.page.locator('[data-testid="image-selector"]');
    const isVisible = await selector.isVisible();
    
    if (!isVisible) {
      return { isVisible: false, imageCount: 0 };
    }
    
    const images = selector.locator('[data-testid="selectable-image"]');
    const imageCount = await images.count();
    
    return { isVisible, imageCount };
  }

  /**
   * 从批量上传中选择图片
   */
  async selectImageFromBatch(index: number): Promise<void> {
    const images = this.page.locator('[data-testid="selectable-image"]');
    await images.nth(index).click();
    await this.waitForElement(this.selectors.uploadedImage);
  }

  /**
   * 模拟拖拽进入
   */
  async simulateDragEnter(): Promise<void> {
    const dropZone = this.page.locator(this.selectors.dragDropZone);
    await dropZone.dispatchEvent('dragenter');
  }

  /**
   * 模拟拖拽离开
   */
  async simulateDragLeave(): Promise<void> {
    const dropZone = this.page.locator(this.selectors.dragDropZone);
    await dropZone.dispatchEvent('dragleave');
  }

  /**
   * 检查拖拽区域是否高亮
   */
  async isDragZoneHighlighted(): Promise<boolean> {
    const dropZone = this.page.locator(this.selectors.dragDropZone);
    const classList = await dropZone.getAttribute('class');
    return classList?.includes('drag-over') || classList?.includes('highlighted') || false;
  }

  /**
   * 选择多个图片文件
   */
  async selectMultipleImages(imagePaths: string[]): Promise<void> {
    const fileInput = this.page.locator(this.selectors.fileInput);
    await fileInput.setInputFiles(imagePaths);
    await this.waitForElement('[data-testid="batch-uploader"]');
  }

  /**
   * 获取批量上传器状态
   */
  async getBatchUploader(): Promise<{
    isVisible: boolean;
    fileCount: number;
  }> {
    const uploader = this.page.locator('[data-testid="batch-uploader"]');
    const isVisible = await uploader.isVisible();
    
    if (!isVisible) {
      return { isVisible: false, fileCount: 0 };
    }
    
    const files = uploader.locator('[data-testid="upload-file-item"]');
    const fileCount = await files.count();
    
    return { isVisible, fileCount };
  }

  /**
   * 获取文件上传状态
   */
  async getFileUploadStatus(index: number): Promise<{
    name: string;
    status: string;
    progress: number;
  }> {
    const fileItem = this.page.locator('[data-testid="upload-file-item"]').nth(index);
    
    const name = await fileItem.locator('[data-testid="file-name"]').textContent() || '';
    const status = await fileItem.locator('[data-testid="file-status"]').textContent() || '';
    const progressElement = fileItem.locator('[data-testid="file-progress"]');
    const progress = parseInt(await progressElement.getAttribute('aria-valuenow') || '0');
    
    return { name, status, progress };
  }

  /**
   * 开始批量上传
   */
  async startBatchUpload(): Promise<void> {
    await this.safeClick('[data-testid="start-batch-upload"]');
  }

  /**
   * 监控批量上传进度
   */
  async monitorBatchUploadProgress(callback: (progress: any) => void): Promise<void> {
    await this.page.waitForFunction(() => {
      const uploader = document.querySelector('[data-testid="batch-uploader"]');
      if (!uploader) return false;
      
      const files = uploader.querySelectorAll('[data-testid="upload-file-item"]');
      const completed = Array.from(files).every(file => {
        const status = file.querySelector('[data-testid="file-status"]')?.textContent;
        return status === 'completed' || status === 'error';
      });
      
      if (window.progressCallback) {
        window.progressCallback({ completed, fileCount: files.length });
      }
      
      return completed;
    });
  }

  /**
   * 取消批量上传
   */
  async cancelBatchUpload(): Promise<void> {
    await this.safeClick('[data-testid="cancel-batch-upload"]');
  }

  /**
   * 获取批量上传状态
   */
  async getBatchUploadStatus(): Promise<{
    cancelled: boolean;
    completed: boolean;
    errorCount: number;
  }> {
    const uploader = this.page.locator('[data-testid="batch-uploader"]');
    const status = await uploader.getAttribute('data-status');
    
    return {
      cancelled: status === 'cancelled',
      completed: status === 'completed',
      errorCount: parseInt(await uploader.getAttribute('data-error-count') || '0')
    };
  }

  /**
   * 获取图片压缩信息
   */
  async getCompressionInfo(): Promise<{
    isCompressed: boolean;
    originalSize: number;
    compressedSize: number;
  }> {
    const compressionInfo = this.page.locator('[data-testid="compression-info"]');
    
    if (!(await compressionInfo.isVisible())) {
      return { isCompressed: false, originalSize: 0, compressedSize: 0 };
    }
    
    const originalSize = parseInt(await compressionInfo.getAttribute('data-original-size') || '0');
    const compressedSize = parseInt(await compressionInfo.getAttribute('data-compressed-size') || '0');
    
    return {
      isCompressed: true,
      originalSize,
      compressedSize
    };
  }

  /**
   * 获取图片质量信息
   */
  async getImageQuality(): Promise<{
    width: number;
    height: number;
    quality: number;
  }> {
    const qualityInfo = this.page.locator('[data-testid="image-quality"]');
    
    const width = parseInt(await qualityInfo.getAttribute('data-width') || '0');
    const height = parseInt(await qualityInfo.getAttribute('data-height') || '0');
    const quality = parseInt(await qualityInfo.getAttribute('data-quality') || '100');
    
    return { width, height, quality };
  }

  /**
   * 获取图片旋转信息
   */
  async getRotationInfo(): Promise<{
    wasRotated: boolean;
    correctedOrientation: boolean;
  }> {
    const rotationInfo = this.page.locator('[data-testid="rotation-info"]');
    
    if (!(await rotationInfo.isVisible())) {
      return { wasRotated: false, correctedOrientation: false };
    }
    
    const wasRotated = await rotationInfo.getAttribute('data-rotated') === 'true';
    const correctedOrientation = await rotationInfo.getAttribute('data-corrected') === 'true';
    
    return { wasRotated, correctedOrientation };
  }

  /**
   * 获取图片增强选项
   */
  async getEnhancementOptions(): Promise<{
    contrastEnhancement: boolean;
    sharpnessEnhancement: boolean;
  }> {
    const enhancementPanel = this.page.locator('[data-testid="enhancement-options"]');
    
    if (!(await enhancementPanel.isVisible())) {
      return { contrastEnhancement: false, sharpnessEnhancement: false };
    }
    
    const contrastOption = enhancementPanel.locator('[data-testid="contrast-enhancement"]');
    const sharpnessOption = enhancementPanel.locator('[data-testid="sharpness-enhancement"]');
    
    return {
      contrastEnhancement: await contrastOption.isVisible(),
      sharpnessEnhancement: await sharpnessOption.isVisible()
    };
  }

  /**
   * 应用图片增强
   */
  async applyImageEnhancement(): Promise<void> {
    await this.safeClick('[data-testid="apply-enhancement"]');
    await this.waitForLoadingComplete('[data-testid="enhancement-loading"]');
  }

  /**
   * 获取增强结果
   */
  async getEnhancementResult(): Promise<{
    enhanced: boolean;
    contrastImproved: boolean;
  }> {
    const result = this.page.locator('[data-testid="enhancement-result"]');
    
    if (!(await result.isVisible())) {
      return { enhanced: false, contrastImproved: false };
    }
    
    const enhanced = await result.getAttribute('data-enhanced') === 'true';
    const contrastImproved = await result.getAttribute('data-contrast-improved') === 'true';
    
    return { enhanced, contrastImproved };
  }

  /**
   * 获取隐私信息
   */
  async getPrivacyInfo(): Promise<{
    exifRemoved: boolean;
    gpsRemoved: boolean;
    metadataCleared: boolean;
  }> {
    const privacyInfo = this.page.locator('[data-testid="privacy-info"]');
    
    if (!(await privacyInfo.isVisible())) {
      return { exifRemoved: false, gpsRemoved: false, metadataCleared: false };
    }
    
    const exifRemoved = await privacyInfo.getAttribute('data-exif-removed') === 'true';
    const gpsRemoved = await privacyInfo.getAttribute('data-gps-removed') === 'true';
    const metadataCleared = await privacyInfo.getAttribute('data-metadata-cleared') === 'true';
    
    return { exifRemoved, gpsRemoved, metadataCleared };
  }

  /**
   * 模拟网络错误
   */
  async simulateNetworkError(): Promise<void> {
    await this.page.route('**/api/analysis/upload', route => {
      route.abort('failed');
    });
  }

  /**
   * 模拟服务器错误
   */
  async simulateServerError(statusCode: number): Promise<void> {
    await this.page.route('**/api/analysis/upload', route => {
      route.fulfill({
        status: statusCode,
        body: JSON.stringify({ error: 'Server error' })
      });
    });
  }

  /**
   * 检查重试按钮是否可见
   */
  async isRetryButtonVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="retry-upload"]');
  }

  /**
   * 并发上传多个图片
   */
  async uploadImagesConcurrently(imagePaths: string[]): Promise<void> {
    // 选择所有图片
    await this.selectMultipleImages(imagePaths);
    
    // 启用并发上传模式
    await this.safeClick('[data-testid="enable-concurrent-upload"]');
    
    // 开始上传
    await this.startBatchUpload();
    
    // 等待所有上传完成
    await this.page.waitForFunction(() => {
      const uploader = document.querySelector('[data-testid="batch-uploader"]');
      return uploader?.getAttribute('data-status') === 'completed';
    });
  }

  /**
   * 获取批量上传结果
   */
  async getBatchUploadResults(): Promise<{
    successCount: number;
    errorCount: number;
    totalCount: number;
  }> {
    const uploader = this.page.locator('[data-testid="batch-uploader"]');
    
    const successCount = parseInt(await uploader.getAttribute('data-success-count') || '0');
    const errorCount = parseInt(await uploader.getAttribute('data-error-count') || '0');
    const totalCount = parseInt(await uploader.getAttribute('data-total-count') || '0');
    
    return { successCount, errorCount, totalCount };
  }

  /**
   * 等待分析阶段
   */
  async waitForAnalysisStage(stageName: string): Promise<void> {
    await this.page.waitForFunction((stage) => {
      const stageElement = document.querySelector('[data-testid="analysis-stage"]');
      return stageElement?.textContent?.includes(stage);
    }, stageName);
  }

  /**
   * 获取当前分析阶段
   */
  async getCurrentAnalysisStage(): Promise<{
    currentStage: string;
    isActive: boolean;
  }> {
    const stageElement = this.page.locator('[data-testid="analysis-stage"]');
    const currentStage = await stageElement.textContent() || '';
    const isActive = await stageElement.getAttribute('data-active') === 'true';
    
    return { currentStage, isActive };
  }

  /**
   * 等待时间估算
   */
  async waitForTimeEstimate(): Promise<void> {
    await this.waitForElement('[data-testid="time-estimate"]');
  }

  /**
   * 获取时间估算
   */
  async getTimeEstimate(): Promise<{
    hasEstimate: boolean;
    remainingSeconds: number;
  }> {
    const estimateElement = this.page.locator('[data-testid="time-estimate"]');
    
    if (!(await estimateElement.isVisible())) {
      return { hasEstimate: false, remainingSeconds: 0 };
    }
    
    const remainingSeconds = parseInt(await estimateElement.getAttribute('data-remaining') || '0');
    
    return { hasEstimate: true, remainingSeconds };
  }

  /**
   * 等待分析进度
   */
  async waitForAnalysisProgress(): Promise<void> {
    await this.waitForElement(this.selectors.analysisProgress);
  }

  /**
   * 获取分析状态
   */
  async getAnalysisStatus(): Promise<{
    isCancelled: boolean;
    isRunning: boolean;
    isCompleted: boolean;
  }> {
    const statusElement = this.page.locator('[data-testid="analysis-status-info"]');
    
    const isCancelled = await statusElement.getAttribute('data-cancelled') === 'true';
    const isRunning = await statusElement.getAttribute('data-running') === 'true';
    const isCompleted = await statusElement.getAttribute('data-completed') === 'true';
    
    return { isCancelled, isRunning, isCompleted };
  }

  /**
   * 获取资源状态
   */
  async getResourceStatus(): Promise<{
    memoryCleared: boolean;
    networkRequestsCancelled: boolean;
    tempFilesRemoved: boolean;
  }> {
    const resourceElement = this.page.locator('[data-testid="resource-status"]');
    
    if (!(await resourceElement.isVisible())) {
      return { memoryCleared: false, networkRequestsCancelled: false, tempFilesRemoved: false };
    }
    
    const memoryCleared = await resourceElement.getAttribute('data-memory-cleared') === 'true';
    const networkRequestsCancelled = await resourceElement.getAttribute('data-network-cancelled') === 'true';
    const tempFilesRemoved = await resourceElement.getAttribute('data-temp-removed') === 'true';
    
    return { memoryCleared, networkRequestsCancelled, tempFilesRemoved };
  }

  /**
   * 点击取消按钮
   */
  async clickCancelButton(): Promise<void> {
    await this.safeClick(this.selectors.cancelAnalysisButton);
  }

  /**
   * 获取取消确认对话框
   */
  async getCancelConfirmDialog(): Promise<{
    isVisible: boolean;
    message: string;
  }> {
    const dialog = this.page.locator('[data-testid="cancel-confirm-dialog"]');
    const isVisible = await dialog.isVisible();
    
    if (!isVisible) {
      return { isVisible: false, message: '' };
    }
    
    const message = await dialog.locator('[data-testid="confirm-message"]').textContent() || '';
    
    return { isVisible, message };
  }

  /**
   * 确认取消
   */
  async confirmCancel(): Promise<void> {
    await this.safeClick('[data-testid="confirm-cancel-button"]');
  }

  /**
   * 获取历史记录列表
   */
  async getHistoryList(): Promise<Array<{
    id: string;
    date: string;
    status: string;
    score: string;
  }>> {
    const historyItems = this.page.locator('[data-testid="history-item"]');
    const count = await historyItems.count();
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const item = historyItems.nth(i);
      const id = await item.getAttribute('data-record-id') || '';
      const date = await item.locator('[data-testid="record-date"]').textContent() || '';
      const status = await item.locator('[data-testid="record-status"]').textContent() || '';
      const score = await item.locator('[data-testid="record-score"]').textContent() || '';
      
      history.push({ id, date, status, score });
    }
    
    return history;
  }

  /**
   * 选择历史记录进行对比
   */
  async selectHistoryRecordForComparison(recordId: string): Promise<void> {
    const historyItem = this.page.locator(`[data-testid="history-item"][data-record-id="${recordId}"]`);
    await historyItem.locator('[data-testid="compare-button"]').click();
    await this.waitForElement('[data-testid="comparison-panel"]');
  }

  /**
   * 获取详细对比结果
   */
  async getDetailedComparison(): Promise<{
    hasComparison: boolean;
    previousResult: any;
    currentResult: any;
    changes: any;
  }> {
    const comparisonPanel = this.page.locator('[data-testid="comparison-panel"]');
    
    if (!(await comparisonPanel.isVisible())) {
      return { hasComparison: false, previousResult: null, currentResult: null, changes: null };
    }
    
    const previousResult = {
      status: await comparisonPanel.locator('[data-testid="previous-status"]').textContent(),
      score: await comparisonPanel.locator('[data-testid="previous-score"]').textContent()
    };
    
    const currentResult = {
      status: await comparisonPanel.locator('[data-testid="current-status"]').textContent(),
      score: await comparisonPanel.locator('[data-testid="current-score"]').textContent()
    };
    
    const changes = {
      statusChanged: await comparisonPanel.locator('[data-testid="status-changed"]').isVisible(),
      improvement: await comparisonPanel.locator('[data-testid="improvement-indicator"]').textContent(),
      summary: await comparisonPanel.locator('[data-testid="change-summary"]').textContent()
    };
    
    return { hasComparison: true, previousResult, currentResult, changes };
  }

  /**
   * 查看趋势分析
   */
  async viewTrendAnalysis(): Promise<{
    hasTrend: boolean;
    dataPoints: number;
  }> {
    await this.safeClick('[data-testid="trend-analysis-tab"]');
    await this.waitForElement('[data-testid="trend-chart"]');
    
    const trendChart = this.page.locator('[data-testid="trend-chart"]');
    const hasTrend = await trendChart.isVisible();
    
    if (!hasTrend) {
      return { hasTrend: false, dataPoints: 0 };
    }
    
    const dataPoints = parseInt(await trendChart.getAttribute('data-points') || '0');
    
    return { hasTrend, dataPoints };
  }

  /**
   * 获取趋势方向
   */
  async getTrendDirection(): Promise<string> {
    const trendIndicator = this.page.locator('[data-testid="trend-direction"]');
    return await trendIndicator.textContent() || 'unknown';
  }

  /**
   * 获取趋势图表数据
   */
  async getTrendChartData(): Promise<Array<{
    date: string;
    score: number;
  }>> {
    const chartData = await this.page.evaluate(() => {
      const chart = document.querySelector('[data-testid="trend-chart"]');
      return chart ? JSON.parse(chart.getAttribute('data-chart-data') || '[]') : [];
    });
    
    return chartData;
  }

  /**
   * 获取趋势预测
   */
  async getTrendPrediction(): Promise<{
    hasPrediction: boolean;
    nextWeekPrediction: number;
    confidence: number;
    trend: string;
  }> {
    const predictionPanel = this.page.locator('[data-testid="trend-prediction"]');
    
    if (!(await predictionPanel.isVisible())) {
      return { hasPrediction: false, nextWeekPrediction: 0, confidence: 0, trend: 'unknown' };
    }
    
    const nextWeekPrediction = parseFloat(await predictionPanel.getAttribute('data-prediction') || '0');
    const confidence = parseFloat(await predictionPanel.getAttribute('data-confidence') || '0');
    const trend = await predictionPanel.getAttribute('data-trend') || 'unknown';
    
    return { hasPrediction: true, nextWeekPrediction, confidence, trend };
  }

  /**
   * 获取异常检测结果
   */
  async getAnomalyDetection(): Promise<{
    hasAnomalies: boolean;
    anomalyCount: number;
  }> {
    const anomalyPanel = this.page.locator('[data-testid="anomaly-detection"]');
    
    if (!(await anomalyPanel.isVisible())) {
      return { hasAnomalies: false, anomalyCount: 0 };
    }
    
    const anomalyCount = parseInt(await anomalyPanel.getAttribute('data-anomaly-count') || '0');
    
    return { hasAnomalies: anomalyCount > 0, anomalyCount };
  }

  /**
   * 获取异常详情
   */
  async getAnomalyDetails(): Promise<Array<{
    date: string;
    severity: string;
    description: string;
  }>> {
    const anomalyItems = this.page.locator('[data-testid="anomaly-item"]');
    const count = await anomalyItems.count();
    const anomalies = [];
    
    for (let i = 0; i < count; i++) {
      const item = anomalyItems.nth(i);
      const date = await item.locator('[data-testid="anomaly-date"]').textContent() || '';
      const severity = await item.getAttribute('data-severity') || '';
      const description = await item.locator('[data-testid="anomaly-description"]').textContent() || '';
      
      anomalies.push({ date, severity, description });
    }
    
    return anomalies;
  }

  /**
   * 获取最后保存的记录
   */
  async getLastSavedRecord(): Promise<{
    id: string;
    petName: string;
    notes: string;
    result: any;
    imageUrl: string;
    createdAt: string;
  }> {
    const recordElement = this.page.locator('[data-testid="last-saved-record"]');
    
    return {
      id: await recordElement.getAttribute('data-record-id') || '',
      petName: await recordElement.locator('[data-testid="record-pet-name"]').textContent() || '',
      notes: await recordElement.locator('[data-testid="record-notes"]').textContent() || '',
      result: JSON.parse(await recordElement.getAttribute('data-result') || '{}'),
      imageUrl: await recordElement.getAttribute('data-image-url') || '',
      createdAt: await recordElement.getAttribute('data-created-at') || ''
    };
  }

  /**
   * 导航到记录管理页面
   */
  async goToRecordsManagement(): Promise<void> {
    await this.goto('/records');
    await this.waitForElement('[data-testid="records-management"]');
  }

  /**
   * 选择记录进行编辑
   */
  async selectRecordForEdit(recordId: string): Promise<void> {
    const recordRow = this.page.locator(`[data-testid="record-row"][data-record-id="${recordId}"]`);
    await recordRow.locator('[data-testid="edit-record-button"]').click();
    await this.waitForElement('[data-testid="record-edit-form"]');
  }

  /**
   * 编辑记录备注
   */
  async editRecordNotes(notes: string): Promise<void> {
    await this.safeFill('[data-testid="record-notes-input"]', notes);
  }

  /**
   * 添加记录标签
   */
  async addRecordTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.safeFill('[data-testid="tag-input"]', tag);
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * 更新记录分类
   */
  async updateRecordCategory(category: string): Promise<void> {
    await this.page.locator('[data-testid="record-category-select"]').selectOption(category);
  }

  /**
   * 保存记录编辑
   */
  async saveRecordEdits(): Promise<void> {
    await this.safeClick('[data-testid="save-record-edits"]');
    await this.waitForSuccessMessage('[data-testid="edit-success-message"]');
  }

  /**
   * 获取记录详情
   */
  async getRecordDetails(recordId: string): Promise<{
    notes: string;
    tags: string[];
    category: string;
  }> {
    const recordElement = this.page.locator(`[data-testid="record-details"][data-record-id="${recordId}"]`);
    
    const notes = await recordElement.locator('[data-testid="record-notes"]').textContent() || '';
    const tagElements = recordElement.locator('[data-testid="record-tag"]');
    const tagCount = await tagElements.count();
    const tags = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = await tagElements.nth(i).textContent();
      if (tag) tags.push(tag);
    }
    
    const category = await recordElement.getAttribute('data-category') || '';
    
    return { notes, tags, category };
  }

  /**
   * 选择多个记录
   */
  async selectMultipleRecords(recordIds: string[]): Promise<void> {
    for (const recordId of recordIds) {
      const checkbox = this.page.locator(`[data-testid="record-checkbox"][data-record-id="${recordId}"]`);
      await checkbox.check();
    }
  }

  /**
   * 打开批量编辑对话框
   */
  async openBatchEditDialog(): Promise<void> {
    await this.safeClick('[data-testid="batch-edit-button"]');
    await this.waitForElement('[data-testid="batch-edit-dialog"]');
  }

  /**
   * 设置批量标签
   */
  async setBatchTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.safeFill('[data-testid="batch-tag-input"]', tag);
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * 设置批量分类
   */
  async setBatchCategory(category: string): Promise<void> {
    await this.page.locator('[data-testid="batch-category-select"]').selectOption(category);
  }

  /**
   * 应用批量编辑
   */
  async applyBatchEdits(): Promise<void> {
    await this.safeClick('[data-testid="apply-batch-edits"]');
    await this.waitForSuccessMessage('[data-testid="batch-edit-success"]');
  }

  /**
   * 删除记录
   */
  async deleteRecord(recordId: string): Promise<void> {
    const recordRow = this.page.locator(`[data-testid="record-row"][data-record-id="${recordId}"]`);
    await recordRow.locator('[data-testid="delete-record-button"]').click();
  }

  /**
   * 获取删除确认对话框
   */
  async getDeleteConfirmDialog(): Promise<{
    isVisible: boolean;
    message: string;
  }> {
    const dialog = this.page.locator('[data-testid="delete-confirm-dialog"]');
    const isVisible = await dialog.isVisible();
    const message = isVisible ? await dialog.locator('[data-testid="confirm-message"]').textContent() || '' : '';
    
    return { isVisible, message };
  }

  /**
   * 确认删除
   */
  async confirmDelete(): Promise<void> {
    await this.safeClick('[data-testid="confirm-delete-button"]');
    await this.waitForSuccessMessage('[data-testid="delete-success-message"]');
  }

  /**
   * 检查记录是否存在
   */
  async recordExists(recordId: string): Promise<boolean> {
    const recordRow = this.page.locator(`[data-testid="record-row"][data-record-id="${recordId}"]`);
    return await recordRow.isVisible();
  }

  /**
   * 导航到回收站
   */
  async goToRecycleBin(): Promise<void> {
    await this.safeClick('[data-testid="recycle-bin-tab"]');
    await this.waitForElement('[data-testid="recycle-bin-content"]');
  }

  /**
   * 获取已删除的记录
   */
  async getDeletedRecords(): Promise<Array<{
    id: string;
    deletedAt: string;
  }>> {
    const deletedItems = this.page.locator('[data-testid="deleted-record-item"]');
    const count = await deletedItems.count();
    const records = [];
    
    for (let i = 0; i < count; i++) {
      const item = deletedItems.nth(i);
      const id = await item.getAttribute('data-record-id') || '';
      const deletedAt = await item.getAttribute('data-deleted-at') || '';
      records.push({ id, deletedAt });
    }
    
    return records;
  }

  /**
   * 恢复记录
   */
  async restoreRecord(recordId: string): Promise<void> {
    const deletedItem = this.page.locator(`[data-testid="deleted-record-item"][data-record-id="${recordId}"]`);
    await deletedItem.locator('[data-testid="restore-record-button"]').click();
    await this.waitForSuccessMessage('[data-testid="restore-success-message"]');
  }

  /**
   * 导航到报告部分
   */
  async goToReportsSection(): Promise<void> {
    await this.goto('/reports');
    await this.waitForElement('[data-testid="reports-section"]');
  }

  /**
   * 选择记录生成报告
   */
  async selectRecordForReport(recordId: string): Promise<void> {
    const recordRow = this.page.locator(`[data-testid="record-row"][data-record-id="${recordId}"]`);
    await recordRow.locator('[data-testid="generate-report-button"]').click();
  }

  /**
   * 生成单次报告
   */
  async generateSingleReport(recordId?: string): Promise<void> {
    if (recordId) {
      await this.selectRecordForReport(recordId);
    }
    await this.safeClick('[data-testid="generate-single-report"]');
    await this.waitForElement('[data-testid="generated-report"]');
  }

  /**
   * 获取生成的报告
   */
  async getGeneratedReport(): Promise<any> {
    const reportElement = this.page.locator('[data-testid="generated-report"]');
    
    return {
      isGenerated: await reportElement.isVisible(),
      type: await reportElement.getAttribute('data-report-type'),
      petName: await reportElement.locator('[data-testid="report-pet-name"]').textContent(),
      analysisDate: await reportElement.locator('[data-testid="report-date"]').textContent(),
      healthStatus: await reportElement.locator('[data-testid="report-health-status"]').textContent(),
      recommendations: await reportElement.locator('[data-testid="report-recommendations"]').textContent(),
      sections: await this.getReportSections(),
      recordCount: parseInt(await reportElement.getAttribute('data-record-count') || '0'),
      dateRange: await reportElement.getAttribute('data-date-range'),
      statistics: await this.getReportStatistics(),
      trendAnalysis: await this.getReportTrendAnalysis(),
      template: await reportElement.getAttribute('data-template'),
      headerText: await reportElement.locator('[data-testid="report-header"]').textContent(),
      footerText: await reportElement.locator('[data-testid="report-footer"]').textContent()
    };
  }

  /**
   * 获取报告章节
   */
  async getReportSections(): Promise<string[]> {
    const sectionElements = this.page.locator('[data-testid="report-section"]');
    const count = await sectionElements.count();
    const sections = [];
    
    for (let i = 0; i < count; i++) {
      const title = await sectionElements.nth(i).locator('[data-testid="section-title"]').textContent();
      if (title) sections.push(title);
    }
    
    return sections;
  }

  /**
   * 获取报告统计信息
   */
  async getReportStatistics(): Promise<any> {
    const statsElement = this.page.locator('[data-testid="report-statistics"]');
    
    if (!(await statsElement.isVisible())) {
      return null;
    }
    
    return {
      healthyDays: parseInt(await statsElement.getAttribute('data-healthy-days') || '0'),
      warningDays: parseInt(await statsElement.getAttribute('data-warning-days') || '0'),
      averageConfidence: parseFloat(await statsElement.getAttribute('data-avg-confidence') || '0'),
      totalAnalyses: parseInt(await statsElement.getAttribute('data-total-analyses') || '0'),
      healthDistribution: JSON.parse(await statsElement.getAttribute('data-health-distribution') || '{}'),
      weeklyAverages: JSON.parse(await statsElement.getAttribute('data-weekly-averages') || '[]')
    };
  }

  /**
   * 获取报告趋势分析
   */
  async getReportTrendAnalysis(): Promise<any> {
    const trendElement = this.page.locator('[data-testid="report-trend-analysis"]');
    
    if (!(await trendElement.isVisible())) {
      return null;
    }
    
    return {
      overallTrend: await trendElement.getAttribute('data-overall-trend'),
      healthTrends: JSON.parse(await trendElement.getAttribute('data-health-trends') || '{}'),
      recommendations: await trendElement.locator('[data-testid="trend-recommendations"]').textContent()
    };
  }

  /**
   * 生成周报告
   */
  async generateWeeklyReport(petId: string): Promise<void> {
    await this.safeClick('[data-testid="generate-weekly-report"]');
    await this.waitForElement('[data-testid="generated-report"]');
  }

  /**
   * 生成月报告
   */
  async generateMonthlyReport(petId: string): Promise<void> {
    await this.safeClick('[data-testid="generate-monthly-report"]');
    await this.waitForElement('[data-testid="generated-report"]');
  }

  /**
   * 选择自定义模板
   */
  async selectCustomTemplate(): Promise<void> {
    await this.safeClick('[data-testid="custom-template-option"]');
    await this.waitForElement('[data-testid="template-config-panel"]');
  }

  /**
   * 配置报告模板
   */
  async configureReportTemplate(config: any): Promise<void> {
    // 设置包含的章节
    for (const section of config.includeSections) {
      await this.page.locator(`[data-testid="section-checkbox"][data-section="${section}"]`).check();
    }
    
    // 设置排除的章节
    for (const section of config.excludeSections) {
      await this.page.locator(`[data-testid="section-checkbox"][data-section="${section}"]`).uncheck();
    }
    
    // 设置头部文本
    if (config.headerText) {
      await this.safeFill('[data-testid="header-text-input"]', config.headerText);
    }
    
    // 设置底部文本
    if (config.footerText) {
      await this.safeFill('[data-testid="footer-text-input"]', config.footerText);
    }
  }

  /**
   * 生成自定义报告
   */
  async generateCustomReport(recordId: string): Promise<void> {
    await this.safeClick('[data-testid="generate-custom-report"]');
    await this.waitForElement('[data-testid="generated-report"]');
  }

  /**
   * 导出报告
   */
  async exportReport(format: string): Promise<{
    success: boolean;
    format: string;
    fileSize: number;
    downloadUrl: string;
  }> {
    await this.safeClick('[data-testid="export-report-button"]');
    await this.waitForElement('[data-testid="export-options"]');
    
    await this.page.locator(`[data-testid="export-format-option"][data-format="${format}"]`).click();
    await this.safeClick('[data-testid="confirm-export"]');
    
    await this.waitForElement('[data-testid="export-result"]');
    
    const resultElement = this.page.locator('[data-testid="export-result"]');
    
    return {
      success: await resultElement.getAttribute('data-success') === 'true',
      format: await resultElement.getAttribute('data-format') || '',
      fileSize: parseInt(await resultElement.getAttribute('data-file-size') || '0'),
      downloadUrl: await resultElement.getAttribute('data-download-url') || ''
    };
  }

  /**
   * 验证下载
   */
  async verifyDownload(downloadUrl: string): Promise<boolean> {
    try {
      const response = await this.page.request.get(downloadUrl);
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * 分享报告给兽医
   */
  async shareReportToVet(vetInfo: any): Promise<void> {
    await this.safeClick('[data-testid="share-to-vet-button"]');
    await this.waitForElement('[data-testid="vet-share-form"]');
    
    await this.safeFill('[data-testid="vet-name-input"]', vetInfo.name);
    await this.safeFill('[data-testid="vet-email-input"]', vetInfo.email);
    await this.safeFill('[data-testid="vet-clinic-input"]', vetInfo.clinic);
    await this.safeFill('[data-testid="share-message-input"]', vetInfo.message);
    
    await this.safeClick('[data-testid="send-to-vet"]');
    await this.waitForSuccessMessage('[data-testid="share-success-message"]');
  }

  /**
   * 获取分享结果
   */
  async getShareResult(): Promise<{
    success: boolean;
    recipient: string;
    shareId: string;
  }> {
    const resultElement = this.page.locator('[data-testid="share-result"]');
    
    return {
      success: await resultElement.getAttribute('data-success') === 'true',
      recipient: await resultElement.getAttribute('data-recipient') || '',
      shareId: await resultElement.getAttribute('data-share-id') || ''
    };
  }

  /**
   * 获取分享历史
   */
  async getShareHistory(): Promise<Array<{
    recipientType: string;
    recipientEmail: string;
    sharedAt: string;
  }>> {
    const historyItems = this.page.locator('[data-testid="share-history-item"]');
    const count = await historyItems.count();
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const item = historyItems.nth(i);
      history.push({
        recipientType: await item.getAttribute('data-recipient-type') || '',
        recipientEmail: await item.getAttribute('data-recipient-email') || '',
        sharedAt: await item.getAttribute('data-shared-at') || ''
      });
    }
    
    return history;
  }

  /**
   * 生成分享链接
   */
  async generateShareLink(options: any): Promise<{
    url: string;
    expiryDate: string;
    password: string;
    accessCount: number;
  }> {
    await this.safeClick('[data-testid="generate-share-link"]');
    await this.waitForElement('[data-testid="share-link-options"]');
    
    // 设置选项
    await this.page.locator('[data-testid="expiry-days-input"]').fill(options.expiryDays.toString());
    
    if (options.passwordProtected) {
      await this.page.locator('[data-testid="password-protected-checkbox"]').check();
    }
    
    if (options.allowDownload) {
      await this.page.locator('[data-testid="allow-download-checkbox"]').check();
    }
    
    if (options.watermark) {
      await this.page.locator('[data-testid="watermark-checkbox"]').check();
    }
    
    await this.safeClick('[data-testid="create-share-link"]');
    await this.waitForElement('[data-testid="share-link-result"]');
    
    const resultElement = this.page.locator('[data-testid="share-link-result"]');
    
    return {
      url: await resultElement.getAttribute('data-url') || '',
      expiryDate: await resultElement.getAttribute('data-expiry-date') || '',
      password: await resultElement.getAttribute('data-password') || '',
      accessCount: parseInt(await resultElement.getAttribute('data-access-count') || '0')
    };
  }

  /**
   * 验证分享链接访问
   */
  async verifyShareLinkAccess(url: string, password: string): Promise<{
    success: boolean;
    reportVisible: boolean;
  }> {
    await this.page.goto(url);
    
    // 如果需要密码
    const passwordInput = this.page.locator('[data-testid="share-password-input"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(password);
      await this.safeClick('[data-testid="access-report-button"]');
    }
    
    const reportVisible = await this.isElementVisible('[data-testid="shared-report-content"]');
    
    return {
      success: true,
      reportVisible
    };
  }

  /**
   * 导航到统计部分
   */
  async goToStatisticsSection(): Promise<void> {
    await this.goto('/statistics');
    await this.waitForElement('[data-testid="statistics-section"]');
  }

  /**
   * 获取基本统计信息
   */
  async getBasicStatistics(): Promise<{
    totalAnalyses: number;
    healthyCount: number;
    warningCount: number;
    concerningCount: number;
    averageConfidence: number;
    healthyPercentage: number;
  }> {
    const statsElement = this.page.locator('[data-testid="basic-statistics"]');
    
    return {
      totalAnalyses: parseInt(await statsElement.getAttribute('data-total-analyses') || '0'),
      healthyCount: parseInt(await statsElement.getAttribute('data-healthy-count') || '0'),
      warningCount: parseInt(await statsElement.getAttribute('data-warning-count') || '0'),
      concerningCount: parseInt(await statsElement.getAttribute('data-concerning-count') || '0'),
      averageConfidence: parseFloat(await statsElement.getAttribute('data-avg-confidence') || '0'),
      healthyPercentage: parseFloat(await statsElement.getAttribute('data-healthy-percentage') || '0')
    };
  }

  /**
   * 查看趋势图表
   */
  async viewTrendChart(): Promise<void> {
    await this.safeClick('[data-testid="trend-chart-tab"]');
    await this.waitForElement('[data-testid="trend-chart"]');
  }

  /**
   * 获取图表配置
   */
  async getChartConfiguration(): Promise<{
    xAxis: string;
    yAxis: string;
    chartType: string;
  }> {
    const chartElement = this.page.locator('[data-testid="trend-chart"]');
    
    return {
      xAxis: await chartElement.getAttribute('data-x-axis') || '',
      yAxis: await chartElement.getAttribute('data-y-axis') || '',
      chartType: await chartElement.getAttribute('data-chart-type') || ''
    };
  }

  /**
   * 获取图表交互功能
   */
  async getChartInteractionFeatures(): Promise<{
    zoom: boolean;
    tooltip: boolean;
    legend: boolean;
  }> {
    const chartElement = this.page.locator('[data-testid="trend-chart"]');
    
    return {
      zoom: await chartElement.getAttribute('data-zoom-enabled') === 'true',
      tooltip: await chartElement.getAttribute('data-tooltip-enabled') === 'true',
      legend: await chartElement.getAttribute('data-legend-enabled') === 'true'
    };
  }

  /**
   * 查看分布图表
   */
  async viewDistributionChart(): Promise<void> {
    await this.safeClick('[data-testid="distribution-chart-tab"]');
    await this.waitForElement('[data-testid="distribution-chart"]');
  }

  /**
   * 获取饼图数据
   */
  async getPieChartData(): Promise<any> {
    const chartElement = this.page.locator('[data-testid="distribution-chart"]');
    return JSON.parse(await chartElement.getAttribute('data-chart-data') || '{}');
  }

  /**
   * 获取图表样式
   */
  async getChartStyle(): Promise<any> {
    const chartElement = this.page.locator('[data-testid="distribution-chart"]');
    return JSON.parse(await chartElement.getAttribute('data-chart-style') || '{}');
  }

  /**
   * 选择时间范围
   */
  async selectTimeRange(range: string): Promise<void> {
    await this.page.locator('[data-testid="time-range-selector"]').selectOption(range);
    await this.waitForLoadingComplete('[data-testid="statistics-loading"]');
  }

  /**
   * 设置自定义日期范围
   */
  async setCustomDateRange(startDate: string, endDate: string): Promise<void> {
    await this.safeFill('[data-testid="start-date-input"]', startDate);
    await this.safeFill('[data-testid="end-date-input"]', endDate);
    await this.safeClick('[data-testid="apply-date-range"]');
    await this.waitForLoadingComplete('[data-testid="statistics-loading"]');
  }

  /**
   * 获取时间范围统计
   */
  async getTimeRangeStatistics(): Promise<{
    selectedRange: string;
    recordCount: number;
    dateRange: { start: string; end: string };
  }> {
    const statsElement = this.page.locator('[data-testid="time-range-statistics"]');
    
    return {
      selectedRange: await statsElement.getAttribute('data-selected-range') || '',
      recordCount: parseInt(await statsElement.getAttribute('data-record-count') || '0'),
      dateRange: {
        start: await statsElement.getAttribute('data-start-date') || '',
        end: await statsElement.getAttribute('data-end-date') || ''
      }
    };
  }

  /**
   * 导出统计数据
   */
  async exportStatisticsData(format: string): Promise<{
    success: boolean;
    format: string;
    recordCount: number;
    fileSize: number;
    downloadUrl: string;
  }> {
    await this.safeClick('[data-testid="export-statistics-button"]');
    await this.waitForElement('[data-testid="export-format-options"]');
    
    await this.page.locator(`[data-testid="format-option"][data-format="${format}"]`).click();
    await this.safeClick('[data-testid="confirm-export-statistics"]');
    
    await this.waitForElement('[data-testid="export-statistics-result"]');
    
    const resultElement = this.page.locator('[data-testid="export-statistics-result"]');
    
    return {
      success: await resultElement.getAttribute('data-success') === 'true',
      format: await resultElement.getAttribute('data-format') || '',
      recordCount: parseInt(await resultElement.getAttribute('data-record-count') || '0'),
      fileSize: parseInt(await resultElement.getAttribute('data-file-size') || '0'),
      downloadUrl: await resultElement.getAttribute('data-download-url') || ''
    };
  }

  /**
   * 获取导出内容
   */
  async getExportContent(downloadUrl: string): Promise<string> {
    const response = await this.page.request.get(downloadUrl);
    return await response.text();
  }

  /**
   * 按健康状态筛选
   */
  async filterByHealthStatus(status: string): Promise<void> {
    await this.page.locator('[data-testid="health-status-filter"]').selectOption(status);
    await this.waitForLoadingComplete('[data-testid="filter-loading"]');
  }

  /**
   * 获取筛选后的统计
   */
  async getFilteredStatistics(): Promise<{
    recordCount: number;
  }> {
    const statsElement = this.page.locator('[data-testid="filtered-statistics"]');
    
    return {
      recordCount: parseInt(await statsElement.getAttribute('data-record-count') || '0')
    };
  }

  /**
   * 搜索记录
   */
  async searchRecords(keyword: string): Promise<void> {
    await this.safeFill('[data-testid="records-search-input"]', keyword);
    await this.safeClick('[data-testid="search-records-button"]');
    await this.waitForLoadingComplete('[data-testid="search-loading"]');
  }

  /**
   * 清除筛选
   */
  async clearFilters(): Promise<void> {
    await this.safeClick('[data-testid="clear-filters-button"]');
    await this.waitForLoadingComplete('[data-testid="filter-loading"]');
  }

  /**
   * 按日期范围筛选
   */
  async filterByDateRange(startDate: Date, endDate: Date): Promise<void> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    await this.safeFill('[data-testid="filter-start-date"]', startDateStr);
    await this.safeFill('[data-testid="filter-end-date"]', endDateStr);
    await this.safeClick('[data-testid="apply-date-filter"]');
    await this.waitForLoadingComplete('[data-testid="filter-loading"]');
  }

  /**
   * 完整的分析流程
   */
  async performCompleteAnalysis(imagePath: string, petName: string, notes?: string): Promise<{
    success: boolean;
    result?: {
      status: string;
      score: string;
      description: string;
      confidence: string;
    };
    error?: string;
  }> {
    try {
      // 1. 上传图片
      await this.uploadImage(imagePath);
      
      // 2. 选择宠物
      await this.selectPet(petName);
      
      // 3. 开始分析
      await this.startAnalysis();
      
      // 4. 等待分析完成
      const result = await this.waitForAnalysisComplete();
      
      // 5. 添加备注（如果提供）
      if (notes) {
        await this.addNotes(notes);
      }
      
      // 6. 保存结果
      await this.saveResult();
      
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '分析过程中发生未知错误';
      return { success: false, error: errorMessage };
    }
  }
}