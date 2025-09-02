import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('社区功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录到系统
    await page.goto('/');
    await page.click('text=登录');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // 等待登录成功并导航到社区页面
    await expect(page).toHaveURL(/.*dashboard/);
    await page.click('[data-testid="community-nav"]');
    await expect(page).toHaveURL(/.*community/);
  });

  test('浏览社区帖子', async ({ page }) => {
    // 验证社区页面元素
    await expect(page.locator('[data-testid="community-header"]')).toContainText('宠物社区');
    await expect(page.locator('[data-testid="post-list"]')).toBeVisible();
    
    // 验证分类筛选
    await expect(page.locator('[data-testid="category-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-help"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-experience"]')).toBeVisible();
    
    // 验证帖子卡片
    const postCards = page.locator('[data-testid^="post-card-"]');
    const postCount = await postCards.count();
    
    if (postCount > 0) {
      const firstPost = postCards.first();
      await expect(firstPost.locator('[data-testid="post-title"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-author"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-date"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-likes"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-comments"]')).toBeVisible();
    }
  });

  test('发布新帖子', async ({ page }) => {
    // 点击发布帖子按钮
    await page.click('[data-testid="create-post-button"]');
    
    // 验证发布帖子模态框
    await expect(page.locator('[data-testid="create-post-modal"]')).toBeVisible();
    
    // 填写帖子信息
    const postTitle = `测试帖子${Date.now()}`;
    await page.fill('[data-testid="post-title-input"]', postTitle);
    await page.selectOption('[data-testid="post-category-select"]', 'health');
    
    // 填写帖子内容
    await page.fill('[data-testid="post-content-editor"]', '这是一个测试帖子的内容，分享一些宠物健康的经验。');
    
    // 添加标签
    await page.fill('[data-testid="post-tags-input"]', '健康,经验分享');
    
    // 上传图片（可选）
    const imageInput = page.locator('[data-testid="post-image-input"]');
    await imageInput.setInputFiles(path.join(__dirname, 'fixtures', 'pet-photo.jpg'));
    
    // 发布帖子
    await page.click('[data-testid="publish-post-button"]');
    
    // 验证发布成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('帖子发布成功');
    
    // 验证帖子出现在列表中
    await expect(page.locator(`[data-testid*="${postTitle}"]`)).toBeVisible();
  });

  test('帖子详情查看和互动', async ({ page }) => {
    // 点击第一个帖子
    await page.click('[data-testid^="post-card-"]:first-child');
    
    // 验证帖子详情页面
    await expect(page).toHaveURL(/.*community\/post\/[^\/]+$/);
    await expect(page.locator('[data-testid="post-detail-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-detail-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-detail-author"]')).toBeVisible();
    
    // 点赞功能
    const likeButton = page.locator('[data-testid="like-button"]');
    const initialLikes = await page.locator('[data-testid="like-count"]').textContent();
    
    await likeButton.click();
    
    // 验证点赞状态变化
    await expect(likeButton).toHaveClass(/liked/);
    const newLikes = await page.locator('[data-testid="like-count"]').textContent();
    expect(parseInt(newLikes || '0')).toBeGreaterThan(parseInt(initialLikes || '0'));
    
    // 评论功能
    await page.fill('[data-testid="comment-input"]', '这是一个测试评论');
    await page.click('[data-testid="submit-comment-button"]');
    
    // 验证评论添加成功
    await expect(page.locator('[data-testid="comment-list"]')).toContainText('这是一个测试评论');
  });

  test('帖子搜索功能', async ({ page }) => {
    // 使用搜索功能
    await page.fill('[data-testid="search-input"]', '健康');
    await page.click('[data-testid="search-button"]');
    
    // 验证搜索结果
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    const searchResults = page.locator('[data-testid^="post-card-"]');
    const resultCount = await searchResults.count();
    
    // 验证搜索结果包含关键词
    for (let i = 0; i < Math.min(resultCount, 3); i++) {
      const postCard = searchResults.nth(i);
      const postContent = await postCard.textContent();
      expect(postContent?.toLowerCase()).toContain('健康');
    }
  });

  test('分类筛选功能', async ({ page }) => {
    // 点击健康分类
    await page.click('[data-testid="category-health"]');
    
    // 验证URL变化
    await expect(page).toHaveURL(/.*category=health/);
    
    // 验证筛选结果
    const filteredPosts = page.locator('[data-testid^="post-card-"]');
    const postCount = await filteredPosts.count();
    
    if (postCount > 0) {
      // 验证帖子都属于健康分类
      for (let i = 0; i < Math.min(postCount, 3); i++) {
        const postCard = filteredPosts.nth(i);
        await expect(postCard.locator('[data-testid="post-category"]')).toContainText('健康分享');
      }
    }
  });

  test('帖子编辑功能', async ({ page }) => {
    // 找到自己发布的帖子
    const myPost = page.locator('[data-testid="my-post"]:first-child');
    
    if (await myPost.isVisible()) {
      // 点击编辑按钮
      await myPost.locator('[data-testid="edit-post-button"]').click();
      
      // 验证编辑模态框
      await expect(page.locator('[data-testid="edit-post-modal"]')).toBeVisible();
      
      // 修改帖子内容
      const newTitle = `编辑后的帖子${Date.now()}`;
      await page.fill('[data-testid="post-title-input"]', newTitle);
      await page.fill('[data-testid="post-content-editor"]', '这是编辑后的内容');
      
      // 保存修改
      await page.click('[data-testid="save-post-button"]');
      
      // 验证修改成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('帖子更新成功');
      await expect(page.locator(`[data-testid*="${newTitle}"]`)).toBeVisible();
    }
  });

  test('帖子删除功能', async ({ page }) => {
    // 找到自己发布的帖子
    const myPost = page.locator('[data-testid="my-post"]:first-child');
    
    if (await myPost.isVisible()) {
      const postTitle = await myPost.locator('[data-testid="post-title"]').textContent();
      
      // 点击删除按钮
      await myPost.locator('[data-testid="delete-post-button"]').click();
      
      // 确认删除
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-delete-button"]');
      
      // 验证删除成功
      await expect(page.locator('[data-testid="success-message"]')).toContainText('帖子删除成功');
      
      // 验证帖子不再显示
      if (postTitle) {
        await expect(page.locator(`[data-testid*="${postTitle}"]`)).not.toBeVisible();
      }
    }
  });

  test('评论回复功能', async ({ page }) => {
    // 进入帖子详情
    await page.click('[data-testid^="post-card-"]:first-child');
    
    // 找到一个评论并回复
    const firstComment = page.locator('[data-testid="comment-item"]:first-child');
    
    if (await firstComment.isVisible()) {
      await firstComment.locator('[data-testid="reply-button"]').click();
      
      // 填写回复内容
      await page.fill('[data-testid="reply-input"]', '这是一个测试回复');
      await page.click('[data-testid="submit-reply-button"]');
      
      // 验证回复添加成功
      await expect(page.locator('[data-testid="reply-list"]')).toContainText('这是一个测试回复');
    }
  });

  test('举报功能', async ({ page }) => {
    // 进入帖子详情
    await page.click('[data-testid^="post-card-"]:first-child');
    
    // 点击举报按钮
    await page.click('[data-testid="report-button"]');
    
    // 验证举报模态框
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    
    // 选择举报原因
    await page.selectOption('[data-testid="report-reason-select"]', 'spam');
    await page.fill('[data-testid="report-description"]', '这是测试举报');
    
    // 提交举报
    await page.click('[data-testid="submit-report-button"]');
    
    // 验证举报成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('举报已提交');
  });

  test('分页功能', async ({ page }) => {
    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // 验证分页或无限滚动
    const loadMoreButton = page.locator('[data-testid="load-more-button"]');
    const pagination = page.locator('[data-testid="pagination"]');
    
    if (await loadMoreButton.isVisible()) {
      // 无限滚动模式
      await loadMoreButton.click();
      await expect(page.locator('[data-testid="loading-more"]')).toBeVisible();
    } else if (await pagination.isVisible()) {
      // 分页模式
      await page.click('[data-testid="next-page-button"]');
      await expect(page).toHaveURL(/.*page=2/);
    }
  });

  test('移动端社区体验', async ({ page }) => {
    // 切换到移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 验证移动端布局
    await expect(page.locator('[data-testid="mobile-community-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-post-list"]')).toBeVisible();
    
    // 验证移动端发布按钮
    await expect(page.locator('[data-testid="mobile-create-post-fab"]')).toBeVisible();
    
    // 测试移动端帖子详情
    await page.click('[data-testid^="post-card-"]:first-child');
    await expect(page.locator('[data-testid="mobile-post-detail"]')).toBeVisible();
    
    // 验证移动端评论界面
    await page.click('[data-testid="mobile-comment-button"]');
    await expect(page.locator('[data-testid="mobile-comment-modal"]')).toBeVisible();
  });

  test('实时通知功能', async ({ page }) => {
    // 如果支持实时通知
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    
    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      
      // 验证通知列表
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
      
      // 验证通知项
      const notifications = page.locator('[data-testid^="notification-item-"]');
      const notificationCount = await notifications.count();
      
      if (notificationCount > 0) {
        const firstNotification = notifications.first();
        await expect(firstNotification.locator('[data-testid="notification-content"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-time"]')).toBeVisible();
        
        // 点击通知
        await firstNotification.click();
        
        // 验证跳转到相关页面
        await expect(page).toHaveURL(/.*community\/post\/[^\/]+$/);
      }
    }
  });
});