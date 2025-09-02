import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../utils/base-page';

export class ModerationPage extends BasePage {
  // 内容过滤相关元素
  readonly contentFilterInput: Locator;
  readonly filterSubmitButton: Locator;
  readonly filterResultMessage: Locator;
  readonly sensitiveContentWarning: Locator;

  // 举报相关元素
  readonly reportButton: Locator;
  readonly reportModal: Locator;
  readonly reportReasonSelect: Locator;
  readonly reportDescriptionInput: Locator;
  readonly submitReportButton: Locator;
  readonly reportSuccessMessage: Locator;

  // 用户封禁相关元素
  readonly banUserButton: Locator;
  readonly banModal: Locator;
  readonly banTypeSelect: Locator;
  readonly banDurationSelect: Locator;
  readonly banReasonInput: Locator;
  readonly confirmBanButton: Locator;
  readonly banSuccessMessage: Locator;

  // 管理员审核相关元素
  readonly moderationQueue: Locator;
  readonly pendingReports: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly moderationActions: Locator;
  readonly batchSelectCheckbox: Locator;
  readonly batchActionsButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // 内容过滤元素
    this.contentFilterInput = page.locator('[data-testid="content-filter-input"]');
    this.filterSubmitButton = page.locator('[data-testid="filter-submit-button"]');
    this.filterResultMessage = page.locator('[data-testid="filter-result-message"]');
    this.sensitiveContentWarning = page.locator('[data-testid="sensitive-content-warning"]');

    // 举报元素
    this.reportButton = page.locator('[data-testid="report-button"]');
    this.reportModal = page.locator('[data-testid="report-modal"]');
    this.reportReasonSelect = page.locator('[data-testid="report-reason-select"]');
    this.reportDescriptionInput = page.locator('[data-testid="report-description-input"]');
    this.submitReportButton = page.locator('[data-testid="submit-report-button"]');
    this.reportSuccessMessage = page.locator('[data-testid="report-success-message"]');

    // 用户封禁元素
    this.banUserButton = page.locator('[data-testid="ban-user-button"]');
    this.banModal = page.locator('[data-testid="ban-modal"]');
    this.banTypeSelect = page.locator('[data-testid="ban-type-select"]');
    this.banDurationSelect = page.locator('[data-testid="ban-duration-select"]');
    this.banReasonInput = page.locator('[data-testid="ban-reason-input"]');
    this.confirmBanButton = page.locator('[data-testid="confirm-ban-button"]');
    this.banSuccessMessage = page.locator('[data-testid="ban-success-message"]');

    // 管理员审核元素
    this.moderationQueue = page.locator('[data-testid="moderation-queue"]');
    this.pendingReports = page.locator('[data-testid="pending-reports"]');
    this.approveButton = page.locator('[data-testid="approve-button"]');
    this.rejectButton = page.locator('[data-testid="reject-button"]');
    this.moderationActions = page.locator('[data-testid="moderation-actions"]');
    this.batchSelectCheckbox = page.locator('[data-testid="batch-select-checkbox"]');
    this.batchActionsButton = page.locator('[data-testid="batch-actions-button"]');
  }

  // 内容过滤方法
  async testContentFilter(content: string): Promise<void> {
    await this.contentFilterInput.fill(content);
    await this.filterSubmitButton.click();
    await this.waitForResponse();
  }

  async expectSensitiveContentWarning(): Promise<void> {
    await expect(this.sensitiveContentWarning).toBeVisible();
  }

  async expectContentApproved(): Promise<void> {
    await expect(this.filterResultMessage).toContainText('内容通过审核');
  }

  // 举报功能方法
  async reportContent(reason: string, description?: string): Promise<void> {
    await this.reportButton.click();
    await expect(this.reportModal).toBeVisible();
    
    await this.reportReasonSelect.selectOption(reason);
    
    if (description) {
      await this.reportDescriptionInput.fill(description);
    }
    
    await this.submitReportButton.click();
    await expect(this.reportSuccessMessage).toBeVisible();
  }

  // 用户封禁方法
  async banUser(banType: string, duration?: string, reason?: string): Promise<void> {
    await this.banUserButton.click();
    await expect(this.banModal).toBeVisible();
    
    await this.banTypeSelect.selectOption(banType);
    
    if (duration && banType === 'temporary') {
      await this.banDurationSelect.selectOption(duration);
    }
    
    if (reason) {
      await this.banReasonInput.fill(reason);
    }
    
    await this.confirmBanButton.click();
    await expect(this.banSuccessMessage).toBeVisible();
  }

  // 管理员审核方法
  async navigateToModerationQueue(): Promise<void> {
    await this.page.goto('/admin/moderation');
    await expect(this.moderationQueue).toBeVisible();
  }

  async approveReport(reportIndex: number = 0): Promise<void> {
    const reportItem = this.pendingReports.nth(reportIndex);
    await reportItem.locator(this.approveButton).click();
    await this.waitForResponse();
  }

  async rejectReport(reportIndex: number = 0): Promise<void> {
    const reportItem = this.pendingReports.nth(reportIndex);
    await reportItem.locator(this.rejectButton).click();
    await this.waitForResponse();
  }

  async selectMultipleReports(indices: number[]): Promise<void> {
    for (const index of indices) {
      const checkbox = this.pendingReports.nth(index).locator(this.batchSelectCheckbox);
      await checkbox.check();
    }
  }

  async performBatchAction(action: string): Promise<void> {
    await this.batchActionsButton.click();
    await this.page.locator(`[data-testid="batch-action-${action}"]`).click();
    await this.waitForResponse();
  }

  // 验证方法
  async expectReportInQueue(reportContent: string): Promise<void> {
    await expect(this.pendingReports).toContainText(reportContent);
  }

  async expectUserBanned(username: string): Promise<void> {
    const bannedUserIndicator = this.page.locator(`[data-testid="banned-user-${username}"]`);
    await expect(bannedUserIndicator).toBeVisible();
  }

  async expectModerationQueueEmpty(): Promise<void> {
    const emptyMessage = this.page.locator('[data-testid="empty-queue-message"]');
    await expect(emptyMessage).toBeVisible();
  }

  // 辅助方法
  private async waitForResponse(): Promise<void> {
    await this.page.waitForTimeout(1000); // 等待API响应
  }
}