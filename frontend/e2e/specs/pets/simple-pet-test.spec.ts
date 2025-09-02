import { test, expect } from '@playwright/test';

test.describe('简单宠物测试', () => {
  test('应该能访问宠物页面', async ({ page }) => {
    await page.goto('/pets');
    await expect(page).toHaveURL(/.*pets/);
  });
});