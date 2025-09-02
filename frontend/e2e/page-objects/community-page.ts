import { Page, expect } from '@playwright/test';
import { BasePage } from '../utils/base-page';

/**
 * 社区页面对象类
 * 处理帖子管理、社区互动和内容审核功能
 */
export class CommunityPage extends BasePage {
  // 页面选择器
  private readonly selectors = {
    // 帖子管理
    postsList: '[data-testid="posts-list"]',
    postCard: '[data-testid="post-card"]',
    postTitle: '[data-testid="post-title"]',
    postContent: '[data-testid="post-content"]',
    postAuthor: '[data-testid="post-author"]',
    postDate: '[data-testid="post-date"]',
    postTags: '[data-testid="post-tags"]',
    postCategory: '[data-testid="post-category"]',
    
    // 创建帖子
    createPostButton: '[data-testid="create-post-button"]',
    postForm: '[data-testid="post-form"]',
    postTitleInput: '[data-testid="post-title-input"]',
    postContentEditor: '[data-testid="post-content-editor"]',
    postCategorySelect: '[data-testid="post-category-select"]',
    postTagsInput: '[data-testid="post-tags-input"]',
    postImageUpload: '[data-testid="post-image-upload"]',
    publishPostButton: '[data-testid="publish-post-button"]',
    saveDraftButton: '[data-testid="save-draft-button"]',
    
    // 富文本编辑器
    richTextEditor: '[data-testid="rich-text-editor"]',
    boldButton: '[data-testid="bold-button"]',
    italicButton: '[data-testid="italic-button"]',
    underlineButton: '[data-testid="underline-button"]',
    linkButton: '[data-testid="link-button"]',
    imageButton: '[data-testid="image-button"]',
    listButton: '[data-testid="list-button"]',
    codeButton: '[data-testid="code-button"]',
    
    // 帖子操作
    editPostButton: '[data-testid="edit-post-button"]',
    deletePostButton: '[data-testid="delete-post-button"]',
    sharePostButton: '[data-testid="share-post-button"]',
    reportPostButton: '[data-testid="report-post-button"]',
    
    // 互动功能
    likeButton: '[data-testid="like-button"]',
    likeCount: '[data-testid="like-count"]',
    commentButton: '[data-testid="comment-button"]',
    commentCount: '[data-testid="comment-count"]',
    shareButton: '[data-testid="share-button"]',
    shareCount: '[data-testid="share-count"]',
    
    // 评论系统
    commentsSection: '[data-testid="comments-section"]',
    commentItem: '[data-testid="comment-item"]',
    commentAuthor: '[data-testid="comment-author"]',
    commentContent: '[data-testid="comment-content"]',
    commentDate: '[data-testid="comment-date"]',
    commentInput: '[data-testid="comment-input"]',
    submitCommentButton: '[data-testid="submit-comment-button"]',
    replyButton: '[data-testid="reply-button"]',
    
    // 搜索和筛选
    searchInput: '[data-testid="community-search"]',
    searchButton: '[data-testid="search-button"]',
    categoryFilter: '[data-testid="category-filter"]',
    tagFilter: '[data-testid="tag-filter"]',
    sortSelect: '[data-testid="sort-select"]',
    
    // 用户关注
    followButton: '[data-testid="follow-button"]',
    unfollowButton: '[data-testid="unfollow-button"]',
    followersCount: '[data-testid="followers-count"]',
    followingCount: '[data-testid="following-count"]',
    
    // 私信功能
    messageButton: '[data-testid="message-button"]',
    messageModal: '[data-testid="message-modal"]',
    messageInput: '[data-testid="message-input"]',
    sendMessageButton: '[data-testid="send-message-button"]',
    messagesInbox: '[data-testid="messages-inbox"]',
    
    // 举报和审核
    reportModal: '[data-testid="report-modal"]',
    reportReasonSelect: '[data-testid="report-reason-select"]',
    reportDescriptionInput: '[data-testid="report-description-input"]',
    submitReportButton: '[data-testid="submit-report-button"]',
    
    // 管理员功能
    moderationPanel: '[data-testid="moderation-panel"]',
    pendingReports: '[data-testid="pending-reports"]',
    approveButton: '[data-testid="approve-button"]',
    rejectButton: '[data-testid="reject-button"]',
    banUserButton: '[data-testid="ban-user-button"]',
    
    // 状态指示器
    loadingSpinner: '[data-testid="community-loading"]',
    errorMessage: '[data-testid="community-error"]',
    successMessage: '[data-testid="community-success"]',
    emptyState: '[data-testid="empty-community"]'
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 导航到社区页面
   */
  async goToCommunityPage(): Promise<void> {
    await this.goto('/community');
    await this.waitForElement(this.selectors.postsList);
  }

  /**
   * 创建新帖子
   */
  async createPost(postData: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    images?: string[];
    isDraft?: boolean;
  }): Promise<void> {
    await this.goToCommunityPage();
    
    // 点击创建帖子按钮
    await this.safeClick(this.selectors.createPostButton);
    await this.waitForElement(this.selectors.postForm);
    
    // 填写帖子标题
    await this.safeFill(this.selectors.postTitleInput, postData.title);
    
    // 填写帖子内容
    await this.fillRichTextContent(postData.content);
    
    // 选择分类
    if (postData.category) {
      await this.page.locator(this.selectors.postCategorySelect).selectOption(postData.category);
    }
    
    // 添加标签
    if (postData.tags && postData.tags.length > 0) {
      await this.addPostTags(postData.tags);
    }
    
    // 上传图片
    if (postData.images && postData.images.length > 0) {
      await this.uploadPostImages(postData.images);
    }
    
    // 发布或保存草稿
    if (postData.isDraft) {
      await this.safeClick(this.selectors.saveDraftButton);
    } else {
      await this.safeClick(this.selectors.publishPostButton);
    }
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 填写富文本内容
   */
  async fillRichTextContent(content: string): Promise<void> {
    const editor = this.page.locator(this.selectors.richTextEditor);
    await editor.click();
    await editor.fill(content);
  }

  /**
   * 使用富文本编辑器格式化文本
   */
  async formatRichText(actions: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    addLink?: { text: string; url: string };
    addList?: boolean;
    addCode?: boolean;
    addTable?: { rows: number; cols: number };
    addQuote?: boolean;
    addDivider?: boolean;
  }): Promise<void> {
    if (actions.bold) {
      await this.safeClick(this.selectors.boldButton);
    }
    
    if (actions.italic) {
      await this.safeClick(this.selectors.italicButton);
    }
    
    if (actions.underline) {
      await this.safeClick(this.selectors.underlineButton);
    }
    
    if (actions.addLink) {
      await this.safeClick(this.selectors.linkButton);
      await this.waitForElement('[data-testid="link-dialog"]');
      await this.safeFill('[data-testid="link-text-input"]', actions.addLink.text);
      await this.safeFill('[data-testid="link-url-input"]', actions.addLink.url);
      await this.safeClick('[data-testid="insert-link-button"]');
    }
    
    if (actions.addList) {
      await this.safeClick(this.selectors.listButton);
    }
    
    if (actions.addCode) {
      await this.safeClick(this.selectors.codeButton);
    }
    
    if (actions.addTable) {
      await this.safeClick('[data-testid="table-button"]');
      await this.waitForElement('[data-testid="table-dialog"]');
      await this.safeFill('[data-testid="table-rows-input"]', actions.addTable.rows.toString());
      await this.safeFill('[data-testid="table-cols-input"]', actions.addTable.cols.toString());
      await this.safeClick('[data-testid="insert-table-button"]');
    }
    
    if (actions.addQuote) {
      await this.safeClick('[data-testid="quote-button"]');
    }
    
    if (actions.addDivider) {
      await this.safeClick('[data-testid="divider-button"]');
    }
  }

  /**
   * 添加帖子标签
   */
  async addPostTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.safeFill(this.selectors.postTagsInput, tag);
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * 上传帖子图片
   */
  async uploadPostImages(imagePaths: string[]): Promise<void> {
    const fileInput = this.page.locator(this.selectors.postImageUpload);
    await fileInput.setInputFiles(imagePaths);
    
    // 等待图片上传完成
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 编辑帖子
   */
  async editPost(postId: string, updatedData: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
  }): Promise<void> {
    // 找到并点击编辑按钮
    const postCard = await this.findPostCard(postId);
    await postCard.locator(this.selectors.editPostButton).click();
    await this.waitForElement(this.selectors.postForm);
    
    // 更新标题
    if (updatedData.title) {
      await this.page.locator(this.selectors.postTitleInput).fill('');
      await this.safeFill(this.selectors.postTitleInput, updatedData.title);
    }
    
    // 更新内容
    if (updatedData.content) {
      await this.page.locator(this.selectors.richTextEditor).fill('');
      await this.fillRichTextContent(updatedData.content);
    }
    
    // 更新分类
    if (updatedData.category) {
      await this.page.locator(this.selectors.postCategorySelect).selectOption(updatedData.category);
    }
    
    // 更新标签
    if (updatedData.tags) {
      // 清除现有标签
      await this.clearPostTags();
      // 添加新标签
      await this.addPostTags(updatedData.tags);
    }
    
    // 保存更改
    await this.safeClick(this.selectors.publishPostButton);
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 删除帖子
   */
  async deletePost(postId: string): Promise<void> {
    const postCard = await this.findPostCard(postId);
    await postCard.locator(this.selectors.deletePostButton).click();
    
    // 确认删除
    await this.waitForElement('[data-testid="delete-confirm-dialog"]');
    await this.safeClick('[data-testid="confirm-delete-button"]');
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 获取帖子列表
   */
  async getPostsList(): Promise<Array<{
    id: string;
    title: string;
    content: string;
    author: string;
    date: string;
    tags: string[];
    category: string;
    likeCount: number;
    commentCount: number;
  }>> {
    await this.goToCommunityPage();
    
    const postCards = this.page.locator(this.selectors.postCard);
    const count = await postCards.count();
    const posts = [];
    
    for (let i = 0; i < count; i++) {
      const card = postCards.nth(i);
      const post = {
        id: await card.getAttribute('data-post-id') || '',
        title: await card.locator(this.selectors.postTitle).textContent() || '',
        content: await card.locator(this.selectors.postContent).textContent() || '',
        author: await card.locator(this.selectors.postAuthor).textContent() || '',
        date: await card.locator(this.selectors.postDate).textContent() || '',
        tags: await this.getPostTags(card),
        category: await card.locator(this.selectors.postCategory).textContent() || '',
        likeCount: parseInt(await card.locator(this.selectors.likeCount).textContent() || '0'),
        commentCount: parseInt(await card.locator(this.selectors.commentCount).textContent() || '0')
      };
      posts.push(post);
    }
    
    return posts;
  }

  /**
   * 搜索帖子
   */
  async searchPosts(keyword: string): Promise<void> {
    await this.safeFill(this.selectors.searchInput, keyword);
    await this.safeClick(this.selectors.searchButton);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 按分类筛选帖子
   */
  async filterByCategory(category: string): Promise<void> {
    await this.page.locator(this.selectors.categoryFilter).selectOption(category);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 按标签筛选帖子
   */
  async filterByTag(tag: string): Promise<void> {
    await this.page.locator(this.selectors.tagFilter).selectOption(tag);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 排序帖子
   */
  async sortPosts(sortBy: 'latest' | 'popular' | 'trending'): Promise<void> {
    await this.page.locator(this.selectors.sortSelect).selectOption(sortBy);
    await this.waitForLoadingComplete(this.selectors.loadingSpinner);
  }

  /**
   * 点赞帖子
   */
  async likePost(postId: string): Promise<void> {
    const postCard = await this.findPostCard(postId);
    await postCard.locator(this.selectors.likeButton).click();
    
    // 等待点赞状态更新
    await this.page.waitForTimeout(500);
  }

  /**
   * 评论帖子
   */
  async commentOnPost(postId: string, comment: string): Promise<void> {
    const postCard = await this.findPostCard(postId);
    
    // 点击评论按钮展开评论区
    await postCard.locator(this.selectors.commentButton).click();
    await this.waitForElement(this.selectors.commentsSection);
    
    // 输入评论
    await this.safeFill(this.selectors.commentInput, comment);
    await this.safeClick(this.selectors.submitCommentButton);
    
    // 等待评论提交成功
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 回复评论
   */
  async replyToComment(commentId: string, reply: string): Promise<void> {
    const commentItem = this.page.locator(`[data-testid="comment-item"][data-comment-id="${commentId}"]`);
    await commentItem.locator(this.selectors.replyButton).click();
    
    await this.waitForElement('[data-testid="reply-input"]');
    await this.safeFill('[data-testid="reply-input"]', reply);
    await this.safeClick('[data-testid="submit-reply-button"]');
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 获取帖子评论
   */
  async getPostComments(postId: string): Promise<Array<{
    id: string;
    author: string;
    content: string;
    date: string;
    replies: number;
  }>> {
    const postCard = await this.findPostCard(postId);
    await postCard.locator(this.selectors.commentButton).click();
    await this.waitForElement(this.selectors.commentsSection);
    
    const commentItems = this.page.locator(this.selectors.commentItem);
    const count = await commentItems.count();
    const comments = [];
    
    for (let i = 0; i < count; i++) {
      const item = commentItems.nth(i);
      const comment = {
        id: await item.getAttribute('data-comment-id') || '',
        author: await item.locator(this.selectors.commentAuthor).textContent() || '',
        content: await item.locator(this.selectors.commentContent).textContent() || '',
        date: await item.locator(this.selectors.commentDate).textContent() || '',
        replies: await item.locator('[data-testid="reply-item"]').count()
      };
      comments.push(comment);
    }
    
    return comments;
  }

  /**
   * 关注用户
   */
  async followUser(userId: string): Promise<void> {
    const userProfile = this.page.locator(`[data-testid="user-profile"][data-user-id="${userId}"]`);
    await userProfile.locator(this.selectors.followButton).click();
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 取消关注用户
   */
  async unfollowUser(userId: string): Promise<void> {
    const userProfile = this.page.locator(`[data-testid="user-profile"][data-user-id="${userId}"]`);
    await userProfile.locator(this.selectors.unfollowButton).click();
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 发送私信
   */
  async sendMessage(userId: string, message: string): Promise<void> {
    const userProfile = this.page.locator(`[data-testid="user-profile"][data-user-id="${userId}"]`);
    await userProfile.locator(this.selectors.messageButton).click();
    
    await this.waitForElement(this.selectors.messageModal);
    await this.safeFill(this.selectors.messageInput, message);
    await this.safeClick(this.selectors.sendMessageButton);
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 举报帖子
   */
  async reportPost(postId: string, reason: string, description: string): Promise<void> {
    const postCard = await this.findPostCard(postId);
    await postCard.locator(this.selectors.reportPostButton).click();
    
    await this.waitForElement(this.selectors.reportModal);
    await this.page.locator(this.selectors.reportReasonSelect).selectOption(reason);
    await this.safeFill(this.selectors.reportDescriptionInput, description);
    await this.safeClick(this.selectors.submitReportButton);
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 管理员审核帖子
   */
  async moderatePost(postId: string, action: 'approve' | 'reject'): Promise<void> {
    await this.goToModerationPanel();
    
    const reportItem = this.page.locator(`[data-testid="report-item"][data-post-id="${postId}"]`);
    
    if (action === 'approve') {
      await reportItem.locator(this.selectors.approveButton).click();
    } else {
      await reportItem.locator(this.selectors.rejectButton).click();
    }
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 封禁用户
   */
  async banUser(userId: string, reason: string, duration: string): Promise<void> {
    await this.goToModerationPanel();
    
    const userItem = this.page.locator(`[data-testid="user-item"][data-user-id="${userId}"]`);
    await userItem.locator(this.selectors.banUserButton).click();
    
    await this.waitForElement('[data-testid="ban-user-dialog"]');
    await this.safeFill('[data-testid="ban-reason-input"]', reason);
    await this.page.locator('[data-testid="ban-duration-select"]').selectOption(duration);
    await this.safeClick('[data-testid="confirm-ban-button"]');
    
    await this.waitForSuccessMessage(this.selectors.successMessage);
  }

  /**
   * 导航到审核面板
   */
  async goToModerationPanel(): Promise<void> {
    await this.goto('/community/moderation');
    await this.waitForElement(this.selectors.moderationPanel);
  }

  /**
   * 获取待审核报告
   */
  async getPendingReports(): Promise<Array<{
    id: string;
    postId: string;
    reporterId: string;
    reason: string;
    description: string;
    date: string;
  }>> {
    await this.goToModerationPanel();
    
    const reportItems = this.page.locator('[data-testid="report-item"]');
    const count = await reportItems.count();
    const reports = [];
    
    for (let i = 0; i < count; i++) {
      const item = reportItems.nth(i);
      const report = {
        id: await item.getAttribute('data-report-id') || '',
        postId: await item.getAttribute('data-post-id') || '',
        reporterId: await item.getAttribute('data-reporter-id') || '',
        reason: await item.locator('[data-testid="report-reason"]').textContent() || '',
        description: await item.locator('[data-testid="report-description"]').textContent() || '',
        date: await item.locator('[data-testid="report-date"]').textContent() || ''
      };
      reports.push(report);
    }
    
    return reports;
  }

  /**
   * 检测敏感内容
   */
  async checkSensitiveContent(content: string): Promise<{
    isSensitive: boolean;
    reasons: string[];
    confidence: number;
  }> {
    // 模拟敏感内容检测API调用
    const response = await this.page.request.post('/api/moderation/check-content', {
      data: { content }
    });
    
    return await response.json();
  }

  /**
   * 私有方法：查找帖子卡片
   */
  private async findPostCard(postId: string) {
    return this.page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`);
  }

  /**
   * 私有方法：获取帖子标签
   */
  private async getPostTags(postCard: any): Promise<string[]> {
    const tagElements = postCard.locator('[data-testid="post-tag"]');
    const count = await tagElements.count();
    const tags = [];
    
    for (let i = 0; i < count; i++) {
      const tag = await tagElements.nth(i).textContent();
      if (tag) tags.push(tag);
    }
    
    return tags;
  }

  /**
   * 导航到草稿页面
   */
  async goToDrafts(): Promise<void> {
    await this.goto('/community/drafts');
    await this.waitForElement('[data-testid="drafts-list"]');
  }

  /**
   * 获取草稿列表
   */
  async getDraftsList(): Promise<Array<{
    id: string;
    title: string;
    status: string;
    lastModified: string;
  }>> {
    const draftItems = this.page.locator('[data-testid="draft-item"]');
    const count = await draftItems.count();
    const drafts = [];
    
    for (let i = 0; i < count; i++) {
      const item = draftItems.nth(i);
      const draft = {
        id: await item.getAttribute('data-draft-id') || '',
        title: await item.locator('[data-testid="draft-title"]').textContent() || '',
        status: await item.getAttribute('data-status') || '',
        lastModified: await item.locator('[data-testid="draft-modified"]').textContent() || ''
      };
      drafts.push(draft);
    }
    
    return drafts;
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string> {
    try {
      return await this.waitForErrorMessage(this.selectors.errorMessage, 5000);
    } catch {
      return '';
    }
  }

  /**
   * 获取搜索统计信息
   */
  async getSearchStats(): Promise<{
    totalResults: number;
    searchTerm: string;
    searchTime: number;
  }> {
    const statsElement = this.page.locator('[data-testid="search-stats"]');
    
    return {
      totalResults: parseInt(await statsElement.getAttribute('data-total-results') || '0'),
      searchTerm: await statsElement.getAttribute('data-search-term') || '',
      searchTime: parseInt(await statsElement.getAttribute('data-search-time') || '0')
    };
  }

  /**
   * 私有方法：查找帖子卡片
   */
  private async findPostCard(postId: string) {
    return this.page.locator(`[data-testid="post-card"][data-post-id="${postId}"]`);
  }

  /**
   * 私有方法：获取帖子标签
   */
  private async getPostTags(postCard: any): Promise<string[]> {
    const tagElements = postCard.locator('[data-testid="post-tag"]');
    const count = await tagElements.count();
    const tags = [];
    
    for (let i = 0; i < count; i++) {
      const tag = await tagElements.nth(i).textContent();
      if (tag) tags.push(tag);
    }
    
    return tags;
  }

  /**
   * 私有方法：清除帖子标签
   */
  private async clearPostTags(): Promise<void> {
    const existingTags = this.page.locator('[data-testid="selected-tag"]');
    const count = await existingTags.count();
    
    for (let i = count - 1; i >= 0; i--) {
      await existingTags.nth(i).locator('[data-testid="remove-tag-button"]').click();
    }
  }

  // ==================== 社区互动扩展方法 ====================

  /**
   * 获取点赞按钮状态
   */
  async getLikeButtonState(postId: string) {
    const button = this.page.locator(`[data-testid="like-button-${postId}"]`);
    const isLiked = await button.getAttribute('data-liked') === 'true';
    return { isLiked };
  }

  /**
   * 获取点赞用户列表
   */
  async getLikedUsersList(postId: string) {
    await this.page.click(`[data-testid="like-count-${postId}"]`);
    await this.page.waitForSelector('[data-testid="liked-users-modal"]');
    
    const users = await this.page.locator('[data-testid="liked-user-item"]').all();
    const likedUsers = [];
    
    for (const user of users) {
      likedUsers.push({
        id: await user.getAttribute('data-user-id'),
        username: await user.textContent(),
        avatar: await user.locator('img').getAttribute('src')
      });
    }
    
    await this.page.click('[data-testid="close-modal"]');
    return likedUsers;
  }

  /**
   * 回复评论
   */
  async replyToComment(commentId: string, content: string) {
    await this.page.click(`[data-testid="reply-button-${commentId}"]`);
    await this.page.fill(`[data-testid="reply-input-${commentId}"]`, content);
    await this.page.click(`[data-testid="reply-submit-${commentId}"]`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取评论回复
   */
  async getCommentReplies(commentId: string) {
    await this.page.click(`[data-testid="show-replies-${commentId}"]`);
    const replies = await this.page.locator(`[data-testid="reply-item-${commentId}"]`).all();
    const replyList = [];
    
    for (const reply of replies) {
      replyList.push({
        id: await reply.getAttribute('data-reply-id'),
        content: await reply.locator('[data-testid="reply-content"]').textContent(),
        author: await reply.locator('[data-testid="reply-author"]').textContent(),
        createdAt: await reply.locator('[data-testid="reply-date"]').textContent()
      });
    }
    
    return replyList;
  }

  /**
   * 加载更多评论
   */
  async loadMoreComments(postId: string) {
    await this.page.click(`[data-testid="load-more-comments-${postId}"]`);
    await this.page.waitForTimeout(1000);
  }

  /**
   * 删除评论
   */
  async deleteComment(commentId: string) {
    await this.page.click(`[data-testid="comment-menu-${commentId}"]`);
    await this.page.click(`[data-testid="delete-comment-${commentId}"]`);
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 分享帖子
   */
  async sharePost(postId: string, platform: string) {
    await this.page.click(`[data-testid="share-button-${postId}"]`);
    await this.page.click(`[data-testid="share-${platform}"]`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取分享结果
   */
  async getShareResult() {
    await this.page.waitForSelector('[data-testid="share-result"]');
    return {
      success: await this.page.locator('[data-testid="share-success"]').isVisible(),
      platform: await this.page.getAttribute('[data-testid="share-result"]', 'data-platform')
    };
  }

  /**
   * 生成分享链接
   */
  async generateShareLink(postId: string) {
    await this.page.click(`[data-testid="share-button-${postId}"]`);
    await this.page.click('[data-testid="generate-link"]');
    await this.page.waitForSelector('[data-testid="share-link"]');
    
    return {
      url: await this.page.inputValue('[data-testid="share-link"]'),
      expiryTime: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
    };
  }

  /**
   * 复制分享链接
   */
  async copyShareLink(postId: string) {
    await this.page.click(`[data-testid="share-button-${postId}"]`);
    await this.page.click('[data-testid="copy-link"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 跳转到用户资料页
   */
  async goToUserProfile(userId: string) {
    await this.page.goto(`/users/${userId}`);
    await this.page.waitForSelector('[data-testid="user-profile"]');
  }

  /**
   * 获取关注状态
   */
  async getFollowState(userId: string) {
    const followButton = this.page.locator(`[data-testid="follow-button-${userId}"]`);
    const unfollowButton = this.page.locator(`[data-testid="unfollow-button-${userId}"]`);
    
    return {
      isFollowing: await unfollowButton.isVisible(),
      isMutualFollow: await this.page.locator(`[data-testid="mutual-follow-${userId}"]`).isVisible()
    };
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: string) {
    return {
      followersCount: parseInt(await this.page.textContent(`[data-testid="followers-count-${userId}"]`) || '0'),
      followingCount: parseInt(await this.page.textContent(`[data-testid="following-count-${userId}"]`) || '0'),
      postsCount: parseInt(await this.page.textContent(`[data-testid="posts-count-${userId}"]`) || '0')
    };
  }

  /**
   * 获取关注者列表
   */
  async getFollowersList(userId: string) {
    await this.page.click(`[data-testid="followers-count-${userId}"]`);
    await this.page.waitForSelector('[data-testid="followers-modal"]');
    
    const followers = await this.page.locator('[data-testid="follower-item"]').all();
    const followerList = [];
    
    for (const follower of followers) {
      followerList.push({
        id: await follower.getAttribute('data-user-id'),
        username: await follower.locator('[data-testid="username"]').textContent(),
        avatar: await follower.locator('img').getAttribute('src')
      });
    }
    
    await this.page.click('[data-testid="close-modal"]');
    return followerList;
  }

  /**
   * 获取关注列表
   */
  async getFollowingList(userId: string) {
    await this.page.click(`[data-testid="following-count-${userId}"]`);
    await this.page.waitForSelector('[data-testid="following-modal"]');
    
    const following = await this.page.locator('[data-testid="following-item"]').all();
    const followingList = [];
    
    for (const user of following) {
      followingList.push({
        id: await user.getAttribute('data-user-id'),
        username: await user.locator('[data-testid="username"]').textContent(),
        avatar: await user.locator('img').getAttribute('src')
      });
    }
    
    await this.page.click('[data-testid="close-modal"]');
    return followingList;
  }

  /**
   * 获取关注动态
   */
  async getFollowingFeed() {
    await this.page.goto('/community/following');
    await this.page.waitForSelector('[data-testid="following-feed"]');
    
    const posts = await this.page.locator('[data-testid="feed-post"]').all();
    const feedList = [];
    
    for (const post of posts) {
      feedList.push({
        id: await post.getAttribute('data-post-id'),
        title: await post.locator('[data-testid="post-title"]').textContent(),
        author: await post.locator('[data-testid="post-author"]').textContent(),
        createdAt: await post.locator('[data-testid="post-date"]').textContent()
      });
    }
    
    return feedList;
  }

  /**
   * 获取收件箱
   */
  async getMessagesInbox() {
    await this.page.goto('/messages/inbox');
    await this.page.waitForSelector('[data-testid="messages-inbox"]');
    
    const messages = await this.page.locator('[data-testid="message-item"]').all();
    const messageList = [];
    
    for (const message of messages) {
      messageList.push({
        id: await message.getAttribute('data-message-id'),
        content: await message.locator('[data-testid="message-content"]').textContent(),
        senderId: await message.getAttribute('data-sender-id'),
        senderName: await message.locator('[data-testid="sender-name"]').textContent(),
        createdAt: await message.locator('[data-testid="message-date"]').textContent(),
        isRead: await message.getAttribute('data-read') === 'true'
      });
    }
    
    return messageList;
  }

  /**
   * 回复私信
   */
  async replyToMessage(messageId: string, content: string) {
    await this.page.click(`[data-testid="reply-message-${messageId}"]`);
    await this.page.fill('[data-testid="reply-content"]', content);
    await this.page.click('[data-testid="send-reply"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取会话
   */
  async getConversation(userId: string) {
    await this.page.goto(`/messages/conversation/${userId}`);
    await this.page.waitForSelector('[data-testid="conversation"]');
    
    const messages = await this.page.locator('[data-testid="conversation-message"]').all();
    const messageList = [];
    
    for (const message of messages) {
      messageList.push({
        id: await message.getAttribute('data-message-id'),
        content: await message.locator('[data-testid="message-text"]').textContent(),
        senderId: await message.getAttribute('data-sender-id'),
        createdAt: await message.locator('[data-testid="message-time"]').textContent()
      });
    }
    
    return {
      messages: messageList,
      participants: [await this.page.getAttribute('[data-testid="conversation"]', 'data-user1'), 
                    await this.page.getAttribute('[data-testid="conversation"]', 'data-user2')]
    };
  }

  /**
   * 获取已发送消息
   */
  async getSentMessages() {
    await this.page.goto('/messages/sent');
    await this.page.waitForSelector('[data-testid="sent-messages"]');
    
    const messages = await this.page.locator('[data-testid="sent-message-item"]').all();
    const messageList = [];
    
    for (const message of messages) {
      messageList.push({
        id: await message.getAttribute('data-message-id'),
        content: await message.locator('[data-testid="message-content"]').textContent(),
        recipientId: await message.getAttribute('data-recipient-id'),
        createdAt: await message.locator('[data-testid="message-date"]').textContent()
      });
    }
    
    return messageList;
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string) {
    await this.page.click(`[data-testid="message-menu-${messageId}"]`);
    await this.page.click(`[data-testid="delete-message-${messageId}"]`);
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取未读消息数量
   */
  async getUnreadMessageCount() {
    const countElement = this.page.locator('[data-testid="unread-count"]');
    if (await countElement.isVisible()) {
      return parseInt(await countElement.textContent() || '0');
    }
    return 0;
  }

  /**
   * 标记消息为已读
   */
  async markMessageAsRead(messageId: string) {
    await this.page.click(`[data-testid="message-item-${messageId}"]`);
    await this.page.waitForTimeout(500);
  }

  // ==================== 社区活动功能 ====================

  /**
   * 创建社区活动
   */
  async createActivity(activityData: {
    title: string;
    description: string;
    startTime: Date;
    endTime?: Date;
    location?: string;
    maxParticipants?: number;
    tags?: string[];
  }) {
    await this.page.goto('/community/activities/create');
    await this.page.fill('[data-testid="activity-title"]', activityData.title);
    await this.page.fill('[data-testid="activity-description"]', activityData.description);
    
    // 设置开始时间
    await this.page.fill('[data-testid="activity-start-time"]', activityData.startTime.toISOString().slice(0, 16));
    
    if (activityData.endTime) {
      await this.page.fill('[data-testid="activity-end-time"]', activityData.endTime.toISOString().slice(0, 16));
    }
    
    if (activityData.location) {
      await this.page.fill('[data-testid="activity-location"]', activityData.location);
    }
    
    if (activityData.maxParticipants) {
      await this.page.fill('[data-testid="activity-max-participants"]', activityData.maxParticipants.toString());
    }
    
    if (activityData.tags) {
      for (const tag of activityData.tags) {
        await this.page.fill('[data-testid="activity-tags"]', tag);
        await this.page.keyboard.press('Enter');
      }
    }
    
    await this.page.click('[data-testid="create-activity-button"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取活动列表
   */
  async getActivitiesList() {
    await this.page.goto('/community/activities');
    await this.page.waitForSelector('[data-testid="activities-list"]');
    
    const activities = await this.page.locator('[data-testid="activity-item"]').all();
    const activityList = [];
    
    for (const activity of activities) {
      activityList.push({
        id: await activity.getAttribute('data-activity-id'),
        title: await activity.locator('[data-testid="activity-title"]').textContent(),
        description: await activity.locator('[data-testid="activity-description"]').textContent(),
        startTime: await activity.locator('[data-testid="activity-start-time"]').textContent(),
        location: await activity.locator('[data-testid="activity-location"]').textContent(),
        maxParticipants: parseInt(await activity.locator('[data-testid="activity-max-participants"]').textContent() || '0'),
        participantCount: parseInt(await activity.locator('[data-testid="activity-participant-count"]').textContent() || '0')
      });
    }
    
    return activityList;
  }

  /**
   * 参加活动
   */
  async joinActivity(activityId: string) {
    await this.page.click(`[data-testid="join-activity-${activityId}"]`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 取消参加活动
   */
  async leaveActivity(activityId: string) {
    await this.page.click(`[data-testid="leave-activity-${activityId}"]`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取已参加的活动
   */
  async getJoinedActivities() {
    await this.page.goto('/community/activities/joined');
    await this.page.waitForSelector('[data-testid="joined-activities"]');
    
    const activities = await this.page.locator('[data-testid="joined-activity-item"]').all();
    const activityList = [];
    
    for (const activity of activities) {
      activityList.push({
        id: await activity.getAttribute('data-activity-id'),
        title: await activity.locator('[data-testid="activity-title"]').textContent(),
        startTime: await activity.locator('[data-testid="activity-start-time"]').textContent()
      });
    }
    
    return activityList;
  }

  /**
   * 获取活动详情
   */
  async getActivityDetails(activityId: string) {
    await this.page.goto(`/community/activities/${activityId}`);
    await this.page.waitForSelector('[data-testid="activity-details"]');
    
    const participants = await this.page.locator('[data-testid="participant-item"]').all();
    const participantIds = [];
    
    for (const participant of participants) {
      participantIds.push(await participant.getAttribute('data-user-id'));
    }
    
    return {
      id: activityId,
      title: await this.page.textContent('[data-testid="activity-title"]'),
      description: await this.page.textContent('[data-testid="activity-description"]'),
      participantCount: participants.length,
      participants: participantIds
    };
  }

  /**
   * 搜索活动
   */
  async searchActivities(keyword: string) {
    await this.page.goto('/community/activities');
    await this.page.fill('[data-testid="activity-search"]', keyword);
    await this.page.click('[data-testid="search-activities-button"]');
    await this.page.waitForTimeout(1000);
    
    return await this.getActivitiesList();
  }

  /**
   * 按标签筛选活动
   */
  async filterActivitiesByTag(tag: string) {
    await this.page.goto('/community/activities');
    await this.page.click(`[data-testid="tag-filter-${tag}"]`);
    await this.page.waitForTimeout(1000);
    
    return await this.getActivitiesList();
  }

  /**
   * 按时间筛选活动
   */
  async filterActivitiesByTime(timeRange: string) {
    await this.page.goto('/community/activities');
    await this.page.selectOption('[data-testid="time-filter"]', timeRange);
    await this.page.waitForTimeout(1000);
    
    return await this.getActivitiesList();
  }

  // ==================== 话题讨论功能 ====================

  /**
   * 创建话题
   */
  async createTopic(topicData: {
    title: string;
    description: string;
    category: string;
    tags?: string[];
  }) {
    await this.page.goto('/community/topics/create');
    await this.page.fill('[data-testid="topic-title"]', topicData.title);
    await this.page.fill('[data-testid="topic-description"]', topicData.description);
    await this.page.selectOption('[data-testid="topic-category"]', topicData.category);
    
    if (topicData.tags) {
      for (const tag of topicData.tags) {
        await this.page.fill('[data-testid="topic-tags"]', tag);
        await this.page.keyboard.press('Enter');
      }
    }
    
    await this.page.click('[data-testid="create-topic-button"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取话题列表
   */
  async getTopicsList() {
    await this.page.goto('/community/topics');
    await this.page.waitForSelector('[data-testid="topics-list"]');
    
    const topics = await this.page.locator('[data-testid="topic-item"]').all();
    const topicList = [];
    
    for (const topic of topics) {
      topicList.push({
        id: await topic.getAttribute('data-topic-id'),
        title: await topic.locator('[data-testid="topic-title"]').textContent(),
        description: await topic.locator('[data-testid="topic-description"]').textContent(),
        category: await topic.locator('[data-testid="topic-category"]').textContent(),
        discussionCount: parseInt(await topic.locator('[data-testid="topic-discussion-count"]').textContent() || '0'),
        followerCount: parseInt(await topic.locator('[data-testid="topic-follower-count"]').textContent() || '0')
      });
    }
    
    return topicList;
  }

  /**
   * 发表话题讨论
   */
  async postToTopic(topicId: string, content: string) {
    await this.page.goto(`/community/topics/${topicId}`);
    await this.page.fill('[data-testid="discussion-input"]', content);
    await this.page.click('[data-testid="post-discussion-button"]');
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取话题讨论
   */
  async getTopicDiscussions(topicId: string) {
    await this.page.goto(`/community/topics/${topicId}`);
    await this.page.waitForSelector('[data-testid="discussions-list"]');
    
    const discussions = await this.page.locator('[data-testid="discussion-item"]').all();
    const discussionList = [];
    
    for (const discussion of discussions) {
      discussionList.push({
        id: await discussion.getAttribute('data-discussion-id'),
        content: await discussion.locator('[data-testid="discussion-content"]').textContent(),
        author: await discussion.locator('[data-testid="discussion-author"]').textContent(),
        createdAt: await discussion.locator('[data-testid="discussion-date"]').textContent(),
        replyCount: parseInt(await discussion.locator('[data-testid="discussion-reply-count"]').textContent() || '0')
      });
    }
    
    return discussionList;
  }

  /**
   * 回复话题讨论
   */
  async replyToDiscussion(discussionId: string, content: string) {
    await this.page.click(`[data-testid="reply-discussion-${discussionId}"]`);
    await this.page.fill(`[data-testid="discussion-reply-input-${discussionId}"]`, content);
    await this.page.click(`[data-testid="submit-discussion-reply-${discussionId}"]`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取讨论回复
   */
  async getDiscussionReplies(discussionId: string) {
    await this.page.click(`[data-testid="show-discussion-replies-${discussionId}"]`);
    const replies = await this.page.locator(`[data-testid="discussion-reply-${discussionId}"]`).all();
    const replyList = [];
    
    for (const reply of replies) {
      replyList.push({
        id: await reply.getAttribute('data-reply-id'),
        content: await reply.locator('[data-testid="reply-content"]').textContent(),
        author: await reply.locator('[data-testid="reply-author"]').textContent(),
        createdAt: await reply.locator('[data-testid="reply-date"]').textContent()
      });
    }
    
    return replyList;
  }

  /**
   * 关注话题
   */
  async followTopic(topicId: string) {
    await this.page.click(`[data-testid="follow-topic-${topicId}"]`);
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取已关注的话题
   */
  async getFollowedTopics() {
    await this.page.goto('/community/topics/followed');
    await this.page.waitForSelector('[data-testid="followed-topics"]');
    
    const topics = await this.page.locator('[data-testid="followed-topic-item"]').all();
    const topicList = [];
    
    for (const topic of topics) {
      topicList.push({
        id: await topic.getAttribute('data-topic-id'),
        title: await topic.locator('[data-testid="topic-title"]').textContent(),
        category: await topic.locator('[data-testid="topic-category"]').textContent()
      });
    }
    
    return topicList;
  }

  /**
   * 获取话题详情
   */
  async getTopicDetails(topicId: string) {
    await this.page.goto(`/community/topics/${topicId}`);
    await this.page.waitForSelector('[data-testid="topic-details"]');
    
    return {
      id: topicId,
      title: await this.page.textContent('[data-testid="topic-title"]'),
      description: await this.page.textContent('[data-testid="topic-description"]'),
      category: await this.page.textContent('[data-testid="topic-category"]'),
      followerCount: parseInt(await this.page.textContent('[data-testid="topic-follower-count"]') || '0'),
      discussionCount: parseInt(await this.page.textContent('[data-testid="topic-discussion-count"]') || '0')
    };
  }

  /**
   * 搜索话题
   */
  async searchTopics(keyword: string) {
    await this.page.goto('/community/topics');
    await this.page.fill('[data-testid="topic-search"]', keyword);
    await this.page.click('[data-testid="search-topics-button"]');
    await this.page.waitForTimeout(1000);
    
    return await this.getTopicsList();
  }

  /**
   * 按分类筛选话题
   */
  async filterTopicsByCategory(category: string) {
    await this.page.goto('/community/topics');
    await this.page.selectOption('[data-testid="topic-category-filter"]', category);
    await this.page.waitForTimeout(1000);
    
    return await this.getTopicsList();
  }

  /**
   * 获取热门话题
   */
  async getHotTopics() {
    await this.page.goto('/community/topics/hot');
    await this.page.waitForSelector('[data-testid="hot-topics"]');
    
    const topics = await this.page.locator('[data-testid="hot-topic-item"]').all();
    const topicList = [];
    
    for (const topic of topics) {
      topicList.push({
        id: await topic.getAttribute('data-topic-id'),
        title: await topic.locator('[data-testid="topic-title"]').textContent(),
        discussionCount: parseInt(await topic.locator('[data-testid="topic-discussion-count"]').textContent() || '0'),
        followerCount: parseInt(await topic.locator('[data-testid="topic-follower-count"]').textContent() || '0'),
        hotScore: parseInt(await topic.getAttribute('data-hot-score') || '0')
      });
    }
    
    return topicList;
  }

  /**
   * 获取成功消息
   */
  async getSuccessMessage(): Promise<string> {
    try {
      await this.page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
      return await this.page.textContent('[data-testid="success-message"]') || '';
    } catch {
      return '';
    }
  }
}