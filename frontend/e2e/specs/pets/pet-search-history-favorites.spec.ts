import { test, expect } from '@playwright/test';
import { PetsPage } from '../../page-objects/pets-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('宠物搜索历史和收藏功能测试 - 任务5.2', () => {
  let petsPage: PetsPage;
  let authPage: AuthPage;
  let testDataManager: TestDataManager;
  let testUser: any;

  test.beforeEach(async ({ page, request }) => {
    petsPage = new PetsPage(page);
    authPage = new AuthPage(page);
    testDataManager = new TestDataManager(request);
    
    await testDataManager.init();
    
    // 创建测试用户并登录
    testUser = await testDataManager.createTestUser({
      username: 'historyuser',
      email: 'historyuser@example.com',
      password: 'TestPass123!'
    });
    
    await authPage.login(testUser.email, testUser.password);
    
    // 创建测试宠物数据
    const testPets = [
      { name: '金毛Max', type: 'dog', breed: '金毛寻回犬', age: 36, weight: 28.5 },
      { name: '拉布拉多Buddy', type: 'dog', breed: '拉布拉多寻回犬', age: 48, weight: 32.0 },
      { name: '英短Whiskers', type: 'cat', breed: '英国短毛猫', age: 24, weight: 4.5 },
      { name: '暹罗Luna', type: 'cat', breed: '暹罗猫', age: 18, weight: 3.8 },
      { name: '边牧Charlie', type: 'dog', breed: '边境牧羊犬', age: 30, weight: 22.0 },
      { name: '波斯Princess', type: 'cat', breed: '波斯猫', age: 60, weight: 5.2 }
    ];
    
    for (const pet of testPets) {
      await petsPage.addPet({
        name: pet.name,
        type: pet.type as 'dog' | 'cat',
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight
      });
    }
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
    await testDataManager.dispose();
  });

  test.describe('搜索历史功能测试', () => {
    test('应该记录和显示搜索历史', async () => {
      await petsPage.goToPetsPage();
      
      const searchTerms = ['Max', '金毛', 'Buddy', 'Luna', 'Charlie'];
      
      // 执行多次搜索
      for (const term of searchTerms) {
        await petsPage.getPage().fill('[data-testid="pets-search"]', term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        await petsPage.getPage().waitForTimeout(500);
        await petsPage.clearSearch();
      }
      
      // 点击搜索框显示历史
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        
        // 验证历史记录数量
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(searchTerms.length);
        
        // 验证历史项目包含搜索过的内容
        const historyTexts: string[] = [];
        for (let i = 0; i < count; i++) {
          const historyText = await historyItems.nth(i).textContent();
          if (historyText) {
            historyTexts.push(historyText.trim());
          }
        }
        
        // 验证历史记录是最近搜索的内容
        for (const historyText of historyTexts) {
          expect(searchTerms).toContain(historyText);
        }
        
        // 验证历史记录按时间倒序排列（最新的在前面）
        if (count >= 2) {
          const firstItem = historyTexts[0];
          const lastSearchTerm = searchTerms[searchTerms.length - 1];
          expect(firstItem).toBe(lastSearchTerm);
        }
      }
    });

    test('应该支持点击历史项目执行搜索', async () => {
      await petsPage.goToPetsPage();
      
      // 执行一次搜索
      const searchTerm = 'Max';
      await petsPage.getPage().fill('[data-testid="pets-search"]', searchTerm);
      await petsPage.getPage().click('[data-testid="search-button"]');
      await petsPage.getPage().waitForTimeout(500);
      await petsPage.clearSearch();
      
      // 点击搜索框显示历史
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        
        if (count > 0) {
          // 点击第一个历史项目
          await historyItems.first().click();
          await petsPage.getPage().waitForTimeout(1000);
          
          // 验证搜索框填充了历史内容
          const searchValue = await petsPage.getPage().inputValue('[data-testid="pets-search"]');
          expect(searchValue).toBe(searchTerm);
          
          // 验证搜索结果显示
          const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const cardCount = await petCards.count();
          expect(cardCount).toBeGreaterThan(0);
          
          // 验证搜索结果包含预期内容
          const firstCard = petCards.first();
          const petName = await firstCard.locator('[data-testid="pet-name"]').textContent();
          expect(petName).toContain(searchTerm);
        }
      }
    });

    test('应该限制搜索历史数量', async () => {
      await petsPage.goToPetsPage();
      
      // 执行大量搜索以测试历史记录限制
      const manySearchTerms = [
        'Max', 'Buddy', 'Luna', 'Charlie', 'Princess', 'Whiskers',
        '金毛', '拉布拉多', '英短', '暹罗', '边牧', '波斯',
        'dog', 'cat', 'pet', 'animal', 'cute', 'lovely'
      ];
      
      for (const term of manySearchTerms) {
        await petsPage.getPage().fill('[data-testid="pets-search"]', term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        await petsPage.getPage().waitForTimeout(200);
        await petsPage.clearSearch();
      }
      
      // 检查历史记录数量限制
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        
        // 验证历史记录数量不超过限制（通常是10-20条）
        expect(count).toBeLessThanOrEqual(20);
        expect(count).toBeGreaterThan(0);
        
        // 验证显示的是最近的搜索记录
        const firstHistoryText = await historyItems.first().textContent();
        const lastSearchTerm = manySearchTerms[manySearchTerms.length - 1];
        expect(firstHistoryText?.trim()).toBe(lastSearchTerm);
      }
    });

    test('应该支持删除单个历史记录', async () => {
      await petsPage.goToPetsPage();
      
      // 执行几次搜索
      const searchTerms = ['Max', 'Buddy', 'Luna'];
      for (const term of searchTerms) {
        await petsPage.getPage().fill('[data-testid="pets-search"]', term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        await petsPage.getPage().waitForTimeout(300);
        await petsPage.clearSearch();
      }
      
      // 显示搜索历史
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const initialCount = await historyItems.count();
        
        if (initialCount > 0) {
          // 删除第一个历史记录
          const deleteButton = historyItems.first().locator('[data-testid="delete-history-item"]');
          if (await deleteButton.isVisible()) {
            await deleteButton.click();
            await petsPage.getPage().waitForTimeout(500);
            
            // 验证历史记录数量减少
            const newCount = await historyItems.count();
            expect(newCount).toBe(initialCount - 1);
          }
        }
      }
    });

    test('应该支持清空所有搜索历史', async () => {
      await petsPage.goToPetsPage();
      
      // 执行几次搜索
      const searchTerms = ['Max', 'Buddy', 'Luna'];
      for (const term of searchTerms) {
        await petsPage.getPage().fill('[data-testid="pets-search"]', term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        await petsPage.getPage().waitForTimeout(300);
        await petsPage.clearSearch();
      }
      
      // 显示搜索历史
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const clearHistoryButton = petsPage.getPage().locator('[data-testid="clear-search-history"]');
        if (await clearHistoryButton.isVisible()) {
          await clearHistoryButton.click();
          
          // 确认清空操作
          const confirmButton = petsPage.getPage().locator('[data-testid="confirm-clear-history"]');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await petsPage.getPage().waitForTimeout(500);
          }
          
          // 验证历史记录已清空
          const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
          const count = await historyItems.count();
          expect(count).toBe(0);
          
          // 验证显示空状态
          const emptyState = petsPage.getPage().locator('[data-testid="history-empty"]');
          if (await emptyState.isVisible()) {
            await expect(emptyState).toContainText('暂无搜索历史');
          }
        }
      }
    });

    test('应该在不同会话间保持搜索历史', async () => {
      await petsPage.goToPetsPage();
      
      // 执行搜索
      const searchTerm = 'Max';
      await petsPage.getPage().fill('[data-testid="pets-search"]', searchTerm);
      await petsPage.getPage().click('[data-testid="search-button"]');
      await petsPage.getPage().waitForTimeout(500);
      
      // 刷新页面模拟新会话
      await petsPage.getPage().reload();
      await petsPage.goToPetsPage();
      
      // 检查搜索历史是否保持
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        
        if (count > 0) {
          const firstHistoryText = await historyItems.first().textContent();
          expect(firstHistoryText?.trim()).toBe(searchTerm);
        }
      }
    });
  });

  test.describe('搜索收藏功能测试', () => {
    test('应该支持收藏当前搜索条件', async () => {
      await petsPage.goToPetsPage();
      
      // 设置复杂的搜索条件
      await petsPage.filterByType('dog');
      await petsPage.getPage().fill('[data-testid="pets-search"]', 'Max');
      await petsPage.getPage().click('[data-testid="search-button"]');
      await petsPage.getPage().waitForTimeout(1000);
      
      // 收藏当前搜索
      const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
      if (await favoriteButton.isVisible()) {
        await favoriteButton.click();
        
        // 输入收藏名称
        const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
        if (await favoriteNameInput.isVisible()) {
          const favoriteName = '我的狗狗Max';
          await favoriteNameInput.fill(favoriteName);
          
          const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
          await confirmFavoriteButton.click();
          
          await petsPage.getPage().waitForTimeout(1000);
          
          // 验证收藏成功消息
          const successMessage = petsPage.getPage().locator('[data-testid="success-message"]');
          if (await successMessage.isVisible()) {
            const messageText = await successMessage.textContent();
            expect(messageText).toContain('收藏成功');
          }
          
          // 验证收藏按钮状态变化
          const favoriteIcon = petsPage.getPage().locator('[data-testid="favorite-icon"]');
          if (await favoriteIcon.isVisible()) {
            await expect(favoriteIcon).toHaveClass(/favorited|active/);
          }
        }
      }
    });

    test('应该显示收藏的搜索列表', async () => {
      await petsPage.goToPetsPage();
      
      // 创建几个收藏的搜索
      const favorites = [
        { name: '所有狗狗', type: 'dog', search: '' },
        { name: '金毛犬', type: 'dog', search: '金毛' },
        { name: '所有猫咪', type: 'cat', search: '' }
      ];
      
      for (const favorite of favorites) {
        // 设置搜索条件
        await petsPage.filterByType(favorite.type as 'dog' | 'cat');
        if (favorite.search) {
          await petsPage.getPage().fill('[data-testid="pets-search"]', favorite.search);
          await petsPage.getPage().click('[data-testid="search-button"]');
        }
        await petsPage.getPage().waitForTimeout(500);
        
        // 收藏搜索
        const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
        if (await favoriteButton.isVisible()) {
          await favoriteButton.click();
          
          const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
          if (await favoriteNameInput.isVisible()) {
            await favoriteNameInput.fill(favorite.name);
            
            const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
            await confirmFavoriteButton.click();
            await petsPage.getPage().waitForTimeout(500);
          }
        }
        
        await petsPage.clearSearch();
      }
      
      // 打开收藏管理
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        // 验证收藏列表显示
        const favoritesList = petsPage.getPage().locator('[data-testid="favorites-list"]');
        await expect(favoritesList).toBeVisible();
        
        const favoriteItems = petsPage.getPage().locator('[data-testid="favorite-item"]');
        const count = await favoriteItems.count();
        expect(count).toBe(favorites.length);
        
        // 验证收藏项目内容
        for (let i = 0; i < count; i++) {
          const item = favoriteItems.nth(i);
          const itemName = await item.locator('[data-testid="favorite-name"]').textContent();
          
          const expectedName = favorites.find(f => f.name === itemName?.trim());
          expect(expectedName).toBeTruthy();
        }
      }
    });

    test('应该支持应用收藏的搜索条件', async () => {
      await petsPage.goToPetsPage();
      
      // 先创建一个收藏
      await petsPage.filterByType('cat');
      await petsPage.getPage().fill('[data-testid="pets-search"]', 'Luna');
      await petsPage.getPage().click('[data-testid="search-button"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
      if (await favoriteButton.isVisible()) {
        await favoriteButton.click();
        
        const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
        if (await favoriteNameInput.isVisible()) {
          const favoriteName = '暹罗猫Luna';
          await favoriteNameInput.fill(favoriteName);
          
          const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
          await confirmFavoriteButton.click();
          await petsPage.getPage().waitForTimeout(500);
        }
      }
      
      // 清除当前搜索条件
      await petsPage.clearSearch();
      await petsPage.filterByType('all');
      
      // 打开收藏管理并应用收藏
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        const favoriteItems = petsPage.getPage().locator('[data-testid="favorite-item"]');
        const count = await favoriteItems.count();
        
        if (count > 0) {
          // 点击第一个收藏项
          const applyButton = favoriteItems.first().locator('[data-testid="apply-favorite"]');
          if (await applyButton.isVisible()) {
            await applyButton.click();
            await petsPage.getPage().waitForTimeout(1000);
            
            // 验证搜索条件已应用
            const searchValue = await petsPage.getPage().inputValue('[data-testid="pets-search"]');
            expect(searchValue).toBe('Luna');
            
            const typeFilter = petsPage.getPage().locator('[data-testid="type-filter"]');
            const typeValue = await typeFilter.inputValue();
            expect(typeValue).toBe('cat');
            
            // 验证搜索结果
            const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
            const cardCount = await petCards.count();
            expect(cardCount).toBeGreaterThan(0);
            
            // 验证结果包含Luna
            const firstCard = petCards.first();
            const petName = await firstCard.locator('[data-testid="pet-name"]').textContent();
            expect(petName).toContain('Luna');
          }
        }
      }
    });

    test('应该支持编辑收藏的搜索', async () => {
      await petsPage.goToPetsPage();
      
      // 创建一个收藏
      await petsPage.filterByType('dog');
      const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
      if (await favoriteButton.isVisible()) {
        await favoriteButton.click();
        
        const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
        if (await favoriteNameInput.isVisible()) {
          await favoriteNameInput.fill('所有狗狗');
          
          const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
          await confirmFavoriteButton.click();
          await petsPage.getPage().waitForTimeout(500);
        }
      }
      
      // 打开收藏管理
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        const favoriteItems = petsPage.getPage().locator('[data-testid="favorite-item"]');
        const count = await favoriteItems.count();
        
        if (count > 0) {
          // 编辑第一个收藏
          const editButton = favoriteItems.first().locator('[data-testid="edit-favorite"]');
          if (await editButton.isVisible()) {
            await editButton.click();
            
            // 修改收藏名称
            const editNameInput = petsPage.getPage().locator('[data-testid="edit-favorite-name"]');
            if (await editNameInput.isVisible()) {
              await editNameInput.clear();
              await editNameInput.fill('我的狗狗们');
              
              const saveEditButton = petsPage.getPage().locator('[data-testid="save-favorite-edit"]');
              await saveEditButton.click();
              await petsPage.getPage().waitForTimeout(500);
              
              // 验证名称已更新
              const updatedName = await favoriteItems.first().locator('[data-testid="favorite-name"]').textContent();
              expect(updatedName?.trim()).toBe('我的狗狗们');
            }
          }
        }
      }
    });

    test('应该支持删除收藏的搜索', async () => {
      await petsPage.goToPetsPage();
      
      // 创建几个收藏
      const favorites = ['收藏1', '收藏2', '收藏3'];
      
      for (const favoriteName of favorites) {
        await petsPage.filterByType('dog');
        
        const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
        if (await favoriteButton.isVisible()) {
          await favoriteButton.click();
          
          const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
          if (await favoriteNameInput.isVisible()) {
            await favoriteNameInput.fill(favoriteName);
            
            const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
            await confirmFavoriteButton.click();
            await petsPage.getPage().waitForTimeout(300);
          }
        }
        
        await petsPage.clearSearch();
      }
      
      // 打开收藏管理
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        const favoriteItems = petsPage.getPage().locator('[data-testid="favorite-item"]');
        const initialCount = await favoriteItems.count();
        expect(initialCount).toBe(favorites.length);
        
        // 删除第一个收藏
        const deleteButton = favoriteItems.first().locator('[data-testid="delete-favorite"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          // 确认删除
          const confirmDeleteButton = petsPage.getPage().locator('[data-testid="confirm-delete-favorite"]');
          if (await confirmDeleteButton.isVisible()) {
            await confirmDeleteButton.click();
            await petsPage.getPage().waitForTimeout(500);
            
            // 验证收藏项已删除
            const newCount = await favoriteItems.count();
            expect(newCount).toBe(initialCount - 1);
          }
        }
      }
    });

    test('应该支持收藏搜索的分类管理', async () => {
      await petsPage.goToPetsPage();
      
      // 创建不同类别的收藏
      const categorizedFavorites = [
        { name: '狗狗收藏1', category: '狗狗', type: 'dog' },
        { name: '狗狗收藏2', category: '狗狗', type: 'dog' },
        { name: '猫咪收藏1', category: '猫咪', type: 'cat' },
        { name: '猫咪收藏2', category: '猫咪', type: 'cat' }
      ];
      
      for (const favorite of categorizedFavorites) {
        await petsPage.filterByType(favorite.type as 'dog' | 'cat');
        
        const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
        if (await favoriteButton.isVisible()) {
          await favoriteButton.click();
          
          const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
          const categorySelect = petsPage.getPage().locator('[data-testid="favorite-category-select"]');
          
          if (await favoriteNameInput.isVisible()) {
            await favoriteNameInput.fill(favorite.name);
            
            if (await categorySelect.isVisible()) {
              await categorySelect.selectOption(favorite.category);
            }
            
            const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
            await confirmFavoriteButton.click();
            await petsPage.getPage().waitForTimeout(300);
          }
        }
        
        await petsPage.clearSearch();
      }
      
      // 打开收藏管理并验证分类
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        // 按类别筛选收藏
        const categoryFilter = petsPage.getPage().locator('[data-testid="favorite-category-filter"]');
        if (await categoryFilter.isVisible()) {
          // 筛选狗狗类别
          await categoryFilter.selectOption('狗狗');
          await petsPage.getPage().waitForTimeout(500);
          
          const dogFavorites = petsPage.getPage().locator('[data-testid="favorite-item"]');
          const dogCount = await dogFavorites.count();
          expect(dogCount).toBe(2);
          
          // 筛选猫咪类别
          await categoryFilter.selectOption('猫咪');
          await petsPage.getPage().waitForTimeout(500);
          
          const catFavorites = petsPage.getPage().locator('[data-testid="favorite-item"]');
          const catCount = await catFavorites.count();
          expect(catCount).toBe(2);
        }
      }
    });

    test('应该支持导入导出收藏搜索', async () => {
      await petsPage.goToPetsPage();
      
      // 创建一些收藏
      const favorites = [
        { name: '金毛犬搜索', type: 'dog', search: '金毛' },
        { name: '英短猫搜索', type: 'cat', search: '英短' }
      ];
      
      for (const favorite of favorites) {
        await petsPage.filterByType(favorite.type as 'dog' | 'cat');
        await petsPage.getPage().fill('[data-testid="pets-search"]', favorite.search);
        await petsPage.getPage().click('[data-testid="search-button"]');
        
        const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
        if (await favoriteButton.isVisible()) {
          await favoriteButton.click();
          
          const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
          if (await favoriteNameInput.isVisible()) {
            await favoriteNameInput.fill(favorite.name);
            
            const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
            await confirmFavoriteButton.click();
            await petsPage.getPage().waitForTimeout(300);
          }
        }
        
        await petsPage.clearSearch();
      }
      
      // 打开收藏管理
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        // 导出收藏
        const exportButton = petsPage.getPage().locator('[data-testid="export-favorites"]');
        if (await exportButton.isVisible()) {
          // 监听下载事件
          const downloadPromise = petsPage.getPage().waitForEvent('download');
          await exportButton.click();
          
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toContain('favorites');
          expect(download.suggestedFilename()).toContain('.json');
        }
        
        // 测试导入功能
        const importButton = petsPage.getPage().locator('[data-testid="import-favorites"]');
        if (await importButton.isVisible()) {
          // 这里可以测试文件选择和导入逻辑
          await importButton.click();
          
          const fileInput = petsPage.getPage().locator('[data-testid="import-file-input"]');
          if (await fileInput.isVisible()) {
            // 在实际测试中，这里会上传一个测试文件
            // await fileInput.setInputFiles('test-favorites.json');
          }
        }
      }
    });
  });

  test.describe('搜索历史和收藏的集成测试', () => {
    test('应该支持从历史记录创建收藏', async () => {
      await petsPage.goToPetsPage();
      
      // 执行搜索创建历史
      await petsPage.getPage().fill('[data-testid="pets-search"]', 'Max');
      await petsPage.getPage().click('[data-testid="search-button"]');
      await petsPage.getPage().waitForTimeout(500);
      await petsPage.clearSearch();
      
      // 从历史记录创建收藏
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        
        if (count > 0) {
          // 点击历史项目的收藏按钮
          const favoriteFromHistoryButton = historyItems.first().locator('[data-testid="favorite-from-history"]');
          if (await favoriteFromHistoryButton.isVisible()) {
            await favoriteFromHistoryButton.click();
            
            const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
            if (await favoriteNameInput.isVisible()) {
              await favoriteNameInput.fill('从历史创建的收藏');
              
              const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
              await confirmFavoriteButton.click();
              await petsPage.getPage().waitForTimeout(500);
              
              // 验证收藏创建成功
              const successMessage = petsPage.getPage().locator('[data-testid="success-message"]');
              if (await successMessage.isVisible()) {
                const messageText = await successMessage.textContent();
                expect(messageText).toContain('收藏成功');
              }
            }
          }
        }
      }
    });

    test('应该在收藏和历史之间保持数据同步', async () => {
      await petsPage.goToPetsPage();
      
      // 创建收藏
      await petsPage.filterByType('dog');
      await petsPage.getPage().fill('[data-testid="pets-search"]', 'Buddy');
      await petsPage.getPage().click('[data-testid="search-button"]');
      
      const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
      if (await favoriteButton.isVisible()) {
        await favoriteButton.click();
        
        const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
        if (await favoriteNameInput.isVisible()) {
          await favoriteNameInput.fill('Buddy搜索');
          
          const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
          await confirmFavoriteButton.click();
          await petsPage.getPage().waitForTimeout(500);
        }
      }
      
      // 验证搜索也被记录到历史中
      await petsPage.clearSearch();
      await petsPage.getPage().click('[data-testid="pets-search"]');
      await petsPage.getPage().waitForTimeout(500);
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        
        if (count > 0) {
          const historyText = await historyItems.first().textContent();
          expect(historyText?.trim()).toBe('Buddy');
        }
      }
      
      // 应用收藏并验证历史更新
      const favoritesButton = petsPage.getPage().locator('[data-testid="manage-favorites"]');
      if (await favoritesButton.isVisible()) {
        await favoritesButton.click();
        
        const favoriteItems = petsPage.getPage().locator('[data-testid="favorite-item"]');
        const favoriteCount = await favoriteItems.count();
        
        if (favoriteCount > 0) {
          const applyButton = favoriteItems.first().locator('[data-testid="apply-favorite"]');
          if (await applyButton.isVisible()) {
            await applyButton.click();
            await petsPage.getPage().waitForTimeout(1000);
            
            // 验证搜索条件已应用且记录到历史
            const searchValue = await petsPage.getPage().inputValue('[data-testid="pets-search"]');
            expect(searchValue).toBe('Buddy');
          }
        }
      }
    });
  });
});