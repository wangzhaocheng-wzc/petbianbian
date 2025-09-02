import { test, expect } from '@playwright/test';

test.describe('宠物管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录到系统
    await page.goto('/');
    await page.click('text=登录');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // 等待登录成功
    await expect(page).toHaveURL(/.*dashboard/);
    
    // 导航到宠物管理页面
    await page.click('[data-testid="pets-nav"]');
    await expect(page).toHaveURL(/.*pets/);
  });

  test('添加新宠物', async ({ page }) => {
    // 点击添加宠物按钮
    await page.click('[data-testid="add-pet-button"]');
    
    // 等待添加宠物模态框出现
    await expect(page.locator('[data-testid="add-pet-modal"]')).toBeVisible();
    
    // 填写宠物信息
    const petName = `测试宠物${Date.now()}`;
    await page.fill('[data-testid="pet-name-input"]', petName);
    await page.selectOption('[data-testid="pet-type-select"]', 'dog');
    await page.fill('[data-testid="pet-breed-input"]', '金毛');
    await page.selectOption('[data-testid="pet-gender-select"]', 'male');
    await page.fill('[data-testid="pet-age-input"]', '24');
    await page.fill('[data-testid="pet-weight-input"]', '25.5');
    await page.fill('[data-testid="pet-description-input"]', '一只可爱的金毛犬');
    
    // 提交表单
    await page.click('[data-testid="save-pet-button"]');
    
    // 验证宠物添加成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('宠物添加成功');
    await expect(page.locator(`[data-testid="pet-card-${petName}"]`)).toBeVisible();
  });

  test('编辑宠物信息', async ({ page }) => {
    // 假设已有宠物存在，点击编辑按钮
    await page.click('[data-testid="edit-pet-button"]:first-child');
    
    // 等待编辑模态框出现
    await expect(page.locator('[data-testid="edit-pet-modal"]')).toBeVisible();
    
    // 修改宠物信息
    const newName = `更新的宠物${Date.now()}`;
    await page.fill('[data-testid="pet-name-input"]', newName);
    await page.fill('[data-testid="pet-weight-input"]', '30.0');
    
    // 保存更改
    await page.click('[data-testid="save-pet-button"]');
    
    // 验证更新成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('宠物信息更新成功');
    await expect(page.locator(`[data-testid="pet-card-${newName}"]`)).toBeVisible();
  });

  test('删除宠物', async ({ page }) => {
    // 点击删除按钮
    await page.click('[data-testid="delete-pet-button"]:first-child');
    
    // 等待确认对话框
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-message"]')).toContainText('确定要删除这只宠物吗');
    
    // 确认删除
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 验证删除成功
    await expect(page.locator('[data-testid="success-message"]')).toContainText('宠物删除成功');
  });

  test('宠物列表显示', async ({ page }) => {
    // 验证宠物列表页面元素
    await expect(page.locator('[data-testid="pets-header"]')).toContainText('我的宠物');
    await expect(page.locator('[data-testid="add-pet-button"]')).toBeVisible();
    
    // 如果有宠物，验证宠物卡片显示
    const petCards = page.locator('[data-testid^="pet-card-"]');
    const petCount = await petCards.count();
    
    if (petCount > 0) {
      // 验证第一个宠物卡片的基本信息
      const firstPetCard = petCards.first();
      await expect(firstPetCard.locator('[data-testid="pet-name"]')).toBeVisible();
      await expect(firstPetCard.locator('[data-testid="pet-type"]')).toBeVisible();
      await expect(firstPetCard.locator('[data-testid="edit-pet-button"]')).toBeVisible();
      await expect(firstPetCard.locator('[data-testid="delete-pet-button"]')).toBeVisible();
    }
  });

  test('宠物表单验证', async ({ page }) => {
    await page.click('[data-testid="add-pet-button"]');
    
    // 尝试提交空表单
    await page.click('[data-testid="save-pet-button"]');
    
    // 验证必填字段错误
    await expect(page.locator('[data-testid="pet-name-error"]')).toContainText('宠物名称是必填项');
    await expect(page.locator('[data-testid="pet-type-error"]')).toContainText('宠物类型是必填项');
  });

  test('宠物名称重复验证', async ({ page }) => {
    // 获取现有宠物名称
    const existingPetName = await page.locator('[data-testid="pet-name"]:first-child').textContent();
    
    if (existingPetName) {
      await page.click('[data-testid="add-pet-button"]');
      
      // 输入重复的宠物名称
      await page.fill('[data-testid="pet-name-input"]', existingPetName);
      await page.selectOption('[data-testid="pet-type-select"]', 'cat');
      
      await page.click('[data-testid="save-pet-button"]');
      
      // 验证重复名称错误
      await expect(page.locator('[data-testid="error-message"]')).toContainText('您已经有一个同名的宠物了');
    }
  });

  test('宠物详情查看', async ({ page }) => {
    // 点击宠物卡片查看详情
    await page.click('[data-testid^="pet-card-"]:first-child');
    
    // 验证详情页面
    await expect(page).toHaveURL(/.*pets\/[^\/]+$/);
    await expect(page.locator('[data-testid="pet-detail-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="pet-detail-info"]')).toBeVisible();
    
    // 验证返回按钮
    await page.click('[data-testid="back-to-pets-button"]');
    await expect(page).toHaveURL(/.*pets$/);
  });

  test('宠物搜索功能', async ({ page }) => {
    // 如果有搜索功能
    const searchInput = page.locator('[data-testid="pet-search-input"]');
    
    if (await searchInput.isVisible()) {
      // 输入搜索关键词
      await searchInput.fill('金毛');
      
      // 验证搜索结果
      const searchResults = page.locator('[data-testid^="pet-card-"]');
      const resultCount = await searchResults.count();
      
      // 验证搜索结果包含关键词
      for (let i = 0; i < resultCount; i++) {
        const petCard = searchResults.nth(i);
        const petInfo = await petCard.textContent();
        expect(petInfo).toContain('金毛');
      }
    }
  });

  test('响应式设计验证', async ({ page }) => {
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 验证移动端布局
    await expect(page.locator('[data-testid="mobile-pet-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-pet-fab"]')).toBeVisible(); // 浮动操作按钮
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 验证平板布局
    await expect(page.locator('[data-testid="tablet-pet-grid"]')).toBeVisible();
    
    // 恢复桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});