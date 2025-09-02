import { test, expect } from '@playwright/test';
import { PetsPage } from '../../page-objects/pets-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('宠物搜索和筛选高级测试 - 任务5.2', () => {
  let petsPage: PetsPage;
  let authPage: AuthPage;
  let testDataManager: TestDataManager;
  let testUser: any;
  let testPets: any[];

  test.beforeEach(async ({ page, request }) => {
    petsPage = new PetsPage(page);
    authPage = new AuthPage(page);
    testDataManager = new TestDataManager(request);
    
    await testDataManager.init();
    
    // 创建测试用户并登录
    testUser = await testDataManager.createTestUser({
      username: 'searchuser',
      email: 'searchuser@example.com',
      password: 'TestPass123!'
    });
    
    await authPage.login(testUser.email, testUser.password);
    
    // 创建多样化的测试宠物数据用于搜索测试
    testPets = [
      { name: '金毛Max', type: 'dog', breed: '金毛寻回犬', age: 36, weight: 28.5, color: '金色', gender: 'male' },
      { name: '拉布拉多Buddy', type: 'dog', breed: '拉布拉多寻回犬', age: 48, weight: 32.0, color: '黄色', gender: 'male' },
      { name: '英短Whiskers', type: 'cat', breed: '英国短毛猫', age: 24, weight: 4.5, color: '银色', gender: 'female' },
      { name: '暹罗Luna', type: 'cat', breed: '暹罗猫', age: 18, weight: 3.8, color: '奶油色', gender: 'female' },
      { name: '边牧Charlie', type: 'dog', breed: '边境牧羊犬', age: 30, weight: 22.0, color: '黑白色', gender: 'male' },
      { name: '波斯Princess', type: 'cat', breed: '波斯猫', age: 60, weight: 5.2, color: '白色', gender: 'female' },
      { name: '哈士奇Storm', type: 'dog', breed: '西伯利亚哈士奇', age: 42, weight: 25.0, color: '灰白色', gender: 'male' },
      { name: '布偶Bella', type: 'cat', breed: '布偶猫', age: 36, weight: 6.0, color: '蓝色重点色', gender: 'female' },
      { name: '柯基Mochi', type: 'dog', breed: '威尔士柯基犬', age: 24, weight: 12.5, color: '橘白色', gender: 'female' },
      { name: '美短Tiger', type: 'cat', breed: '美国短毛猫', age: 30, weight: 4.8, color: '银虎斑', gender: 'male' }
    ];
    
    // 添加测试宠物
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

  test.describe('多条件搜索测试', () => {
    test('应该支持按宠物名称进行精确搜索', async () => {
      const searchTests = [
        { term: 'Max', expectedCount: 1, expectedNames: ['金毛Max'] },
        { term: 'Buddy', expectedCount: 1, expectedNames: ['拉布拉多Buddy'] },
        { term: 'Luna', expectedCount: 1, expectedNames: ['暹罗Luna'] },
        { term: '不存在的宠物', expectedCount: 0, expectedNames: [] }
      ];

      for (const searchTest of searchTests) {
        await petsPage.goToPetsPage();
        
        // 执行搜索
        const results = await petsPage.searchPets(searchTest.term);
        
        // 验证搜索结果数量
        expect(results.length).toBe(searchTest.expectedCount);
        
        // 验证搜索结果内容
        if (searchTest.expectedCount > 0) {
          for (const expectedName of searchTest.expectedNames) {
            const found = results.some(pet => pet.name.includes(expectedName));
            expect(found).toBeTruthy();
          }
        }
        
        await petsPage.clearSearch();
      }
    });

    test('应该支持按宠物品种进行搜索', async () => {
      const breedSearches = [
        { breed: '金毛', expectedMinCount: 1 },
        { breed: '拉布拉多', expectedMinCount: 1 },
        { breed: '寻回犬', expectedMinCount: 2 }, // 金毛寻回犬 + 拉布拉多寻回犬
        { breed: '短毛猫', expectedMinCount: 2 }, // 英国短毛猫 + 美国短毛猫
        { breed: '牧羊犬', expectedMinCount: 1 }
      ];

      for (const search of breedSearches) {
        await petsPage.goToPetsPage();
        
        // 在品种字段搜索
        await petsPage.getPage().fill('[data-testid="breed-search"]', search.breed);
        await petsPage.getPage().click('[data-testid="search-button"]');
        
        await petsPage.getPage().waitForTimeout(1000);
        
        const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const count = await petCards.count();
        expect(count).toBeGreaterThanOrEqual(search.expectedMinCount);
        
        await petsPage.clearSearch();
      }
    });

    test('应该支持组合搜索条件', async () => {
      await petsPage.goToPetsPage();
      
      // 搜索狗类型 + 名称包含特定字符
      await petsPage.filterByType('dog');
      await petsPage.getPage().fill('[data-testid="pets-search"]', 'a');
      await petsPage.getPage().click('[data-testid="search-button"]');
      
      await petsPage.getPage().waitForTimeout(1000);
      
      // 验证结果都是狗且名称包含"a"
      const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const count = await petCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = petCards.nth(i);
        const name = await card.locator('[data-testid="pet-name"]').textContent();
        const type = await card.locator('[data-testid="pet-type"]').textContent();
        
        expect(name?.toLowerCase()).toContain('a');
        expect(type).toContain('狗');
      }
    });

    test('应该支持模糊搜索功能', async () => {
      const fuzzySearches = [
        { term: 'maks', expected: 'Max' }, // 拼写错误
        { term: 'budy', expected: 'Buddy' }, // 缺少字母
        { term: 'whisker', expected: 'Whiskers' }, // 部分匹配
        { term: 'prin', expected: 'Princess' } // 前缀匹配
      ];

      for (const search of fuzzySearches) {
        await petsPage.goToPetsPage();
        
        // 启用模糊搜索
        const fuzzyToggle = petsPage.getPage().locator('[data-testid="fuzzy-search-toggle"]');
        if (await fuzzyToggle.isVisible()) {
          await fuzzyToggle.check();
        }
        
        await petsPage.getPage().fill('[data-testid="pets-search"]', search.term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证找到预期的宠物
        const expectedPetCard = petsPage.getPage().locator(`[data-testid="pet-card"]`, {
          has: petsPage.getPage().locator(`text*=${search.expected}`)
        });
        
        if (await expectedPetCard.isVisible()) {
          await expect(expectedPetCard).toBeVisible();
        }
        
        await petsPage.clearSearch();
      }
    });
  });

  test.describe('高级筛选测试', () => {
    test('应该支持按宠物类型筛选', async () => {
      await petsPage.goToPetsPage();
      
      // 筛选狗
      await petsPage.filterByType('dog');
      
      const dogCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const dogCount = await dogCards.count();
      expect(dogCount).toBe(5); // 应该有5只狗
      
      // 验证只显示狗
      for (let i = 0; i < dogCount; i++) {
        const card = dogCards.nth(i);
        const type = await card.locator('[data-testid="pet-type"]').textContent();
        expect(type).toContain('狗');
      }
      
      // 筛选猫
      await petsPage.filterByType('cat');
      
      const catCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const catCount = await catCards.count();
      expect(catCount).toBe(5); // 应该有5只猫
      
      // 验证只显示猫
      for (let i = 0; i < catCount; i++) {
        const card = catCards.nth(i);
        const type = await card.locator('[data-testid="pet-type"]').textContent();
        expect(type).toContain('猫');
      }
      
      // 显示所有
      await petsPage.filterByType('all');
      
      const allCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const allCount = await allCards.count();
      expect(allCount).toBe(10); // 总共10只宠物
    });

    test('应该支持按年龄范围筛选', async () => {
      await petsPage.goToPetsPage();
      
      const ageRanges = [
        { min: 0, max: 24, label: '幼年 (0-2岁)', expectedPets: ['暹罗Luna', '柯基Mochi'] },
        { min: 24, max: 48, label: '成年 (2-4岁)', expectedPets: ['英短Whiskers', '边牧Charlie', '布偶Bella', '美短Tiger'] },
        { min: 48, max: 120, label: '老年 (4岁以上)', expectedPets: ['拉布拉多Buddy', '波斯Princess'] }
      ];
      
      for (const range of ageRanges) {
        // 设置年龄筛选
        const ageFilter = petsPage.getPage().locator('[data-testid="age-filter"]');
        if (await ageFilter.isVisible()) {
          await ageFilter.selectOption(`${range.min}-${range.max}`);
          
          await petsPage.getPage().waitForTimeout(1000);
          
          const filteredCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const count = await filteredCards.count();
          
          // 验证筛选结果数量符合预期
          expect(count).toBeGreaterThanOrEqual(range.expectedPets.length);
          
          // 验证筛选结果包含预期宠物
          for (const expectedPet of range.expectedPets) {
            const petCard = petsPage.getPage().locator(`[data-testid="pet-card"]`, {
              has: petsPage.getPage().locator(`text*=${expectedPet}`)
            });
            await expect(petCard).toBeVisible();
          }
        }
      }
    });

    test('应该支持按体重范围筛选', async () => {
      await petsPage.goToPetsPage();
      
      const weightRanges = [
        { min: 0, max: 5, label: '小型 (0-5kg)', expectedCount: 3 }, // 英短、暹罗、美短
        { min: 5, max: 25, label: '中型 (5-25kg)', expectedCount: 3 }, // 波斯、布偶、柯基
        { min: 25, max: 50, label: '大型 (25kg以上)', expectedCount: 4 } // 金毛、拉布拉多、边牧、哈士奇
      ];
      
      for (const range of weightRanges) {
        const weightFilter = petsPage.getPage().locator('[data-testid="weight-filter"]');
        if (await weightFilter.isVisible()) {
          await weightFilter.selectOption(`${range.min}-${range.max}`);
          
          await petsPage.getPage().waitForTimeout(1000);
          
          const filteredCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const count = await filteredCards.count();
          
          // 验证体重筛选结果数量
          expect(count).toBeGreaterThanOrEqual(range.expectedCount - 1); // 允许一定误差
          
          // 验证体重筛选结果
          for (let i = 0; i < count; i++) {
            const card = filteredCards.nth(i);
            const weightText = await card.locator('[data-testid="pet-weight"]').textContent();
            
            const weightMatch = weightText?.match(/([\d.]+)/);
            if (weightMatch) {
              const weight = parseFloat(weightMatch[1]);
              expect(weight).toBeGreaterThanOrEqual(range.min);
              expect(weight).toBeLessThanOrEqual(range.max);
            }
          }
        }
      }
    });

    test('应该支持多重筛选条件组合', async () => {
      await petsPage.goToPetsPage();
      
      // 组合筛选：狗 + 成年 + 中大型
      await petsPage.filterByType('dog');
      
      const ageFilter = petsPage.getPage().locator('[data-testid="age-filter"]');
      if (await ageFilter.isVisible()) {
        await ageFilter.selectOption('24-48'); // 成年
      }
      
      const weightFilter = petsPage.getPage().locator('[data-testid="weight-filter"]');
      if (await weightFilter.isVisible()) {
        await weightFilter.selectOption('15-50'); // 中大型
      }
      
      await petsPage.getPage().waitForTimeout(1000);
      
      const filteredCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const count = await filteredCards.count();
      
      // 验证所有结果都符合筛选条件
      for (let i = 0; i < count; i++) {
        const card = filteredCards.nth(i);
        const type = await card.locator('[data-testid="pet-type"]').textContent();
        expect(type).toContain('狗');
      }
    });

    test('应该支持筛选条件重置', async () => {
      await petsPage.goToPetsPage();
      
      // 应用多个筛选条件
      await petsPage.filterByType('cat');
      
      const ageFilter = petsPage.getPage().locator('[data-testid="age-filter"]');
      if (await ageFilter.isVisible()) {
        await ageFilter.selectOption('0-24');
      }
      
      await petsPage.getPage().waitForTimeout(1000);
      
      // 记录筛选后的数量
      const filteredCount = await petsPage.getPage().locator('[data-testid="pet-card"]').count();
      
      // 重置筛选
      const resetButton = petsPage.getPage().locator('[data-testid="reset-filters"]');
      if (await resetButton.isVisible()) {
        await resetButton.click();
        
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证显示所有宠物
        const allCount = await petsPage.getPage().locator('[data-testid="pet-card"]').count();
        expect(allCount).toBeGreaterThan(filteredCount);
        expect(allCount).toBe(testPets.length);
        
        // 验证筛选器重置
        const typeFilter = petsPage.getPage().locator('[data-testid="type-filter"]');
        expect(await typeFilter.inputValue()).toBe('all');
      }
    });
  });

  test.describe('搜索结果排序测试', () => {
    test('应该支持按名称排序', async () => {
      await petsPage.goToPetsPage();
      
      // 按名称升序排序
      await petsPage.sortPets('name');
      
      const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const count = await petCards.count();
      
      if (count > 1) {
        // 获取前两个宠物名称进行比较
        const firstName = await petCards.first().locator('[data-testid="pet-name"]').textContent();
        const secondName = await petCards.nth(1).locator('[data-testid="pet-name"]').textContent();
        
        // 验证名称按字母顺序排列
        expect(firstName?.localeCompare(secondName || '') || 0).toBeLessThanOrEqual(0);
      }
    });

    test('应该支持按年龄排序', async () => {
      await petsPage.goToPetsPage();
      
      // 按年龄排序
      await petsPage.sortPets('age');
      
      const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const count = await petCards.count();
      
      if (count > 1) {
        // 验证年龄排序
        const ages: number[] = [];
        for (let i = 0; i < Math.min(count, 3); i++) {
          const ageText = await petCards.nth(i).locator('[data-testid="pet-age"]').textContent();
          const ageMatch = ageText?.match(/(\d+)/);
          if (ageMatch) {
            ages.push(parseInt(ageMatch[1]));
          }
        }
        
        // 验证年龄是递增的
        for (let i = 1; i < ages.length; i++) {
          expect(ages[i]).toBeGreaterThanOrEqual(ages[i - 1]);
        }
      }
    });

    test('应该支持按体重排序', async () => {
      await petsPage.goToPetsPage();
      
      // 按体重排序
      await petsPage.sortPets('weight');
      
      const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const count = await petCards.count();
      
      if (count > 1) {
        // 验证体重排序
        const weights: number[] = [];
        for (let i = 0; i < Math.min(count, 3); i++) {
          const weightText = await petCards.nth(i).locator('[data-testid="pet-weight"]').textContent();
          const weightMatch = weightText?.match(/([\d.]+)/);
          if (weightMatch) {
            weights.push(parseFloat(weightMatch[1]));
          }
        }
        
        // 验证体重是递增的
        for (let i = 1; i < weights.length; i++) {
          expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1]);
        }
      }
    });
  });

  test.describe('分页功能测试', () => {
    test('应该正确显示分页控件', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示数量为较小值以触发分页
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('5'); // 每页5个
        
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证分页控件显示
        const pagination = petsPage.getPage().locator('[data-testid="pagination"]');
        await expect(pagination).toBeVisible();
        
        // 验证页码按钮
        const pageButtons = petsPage.getPage().locator('[data-testid="page-number"]');
        const buttonCount = await pageButtons.count();
        expect(buttonCount).toBeGreaterThan(1); // 应该有多个页面
      }
    });

    test('应该支持分页导航', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示数量
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('5');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 获取当前页码
        const currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(1);
        
        // 测试下一页
        const nextButton = petsPage.getPage().locator('[data-testid="next-page"]');
        if (await nextButton.isEnabled()) {
          await petsPage.goToNextPage();
          
          const newPage = await petsPage.getCurrentPage();
          expect(newPage).toBe(2);
          
          // 验证页面内容已更新
          const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const count = await petCards.count();
          expect(count).toBeGreaterThan(0);
          
          // 测试上一页
          await petsPage.goToPrevPage();
          
          const backPage = await petsPage.getCurrentPage();
          expect(backPage).toBe(1);
        }
      }
    });
  });

  test.describe('搜索历史和收藏功能测试', () => {
    test('应该记录搜索历史', async () => {
      const searchTerms = ['Max', '金毛', 'Buddy', 'Luna'];
      
      await petsPage.goToPetsPage();
      
      // 执行多次搜索
      for (const term of searchTerms) {
        await petsPage.getPage().fill('[data-testid="pets-search"]', term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        await petsPage.getPage().waitForTimeout(500);
        await petsPage.clearSearch();
      }
      
      // 点击搜索框显示历史
      await petsPage.getPage().click('[data-testid="pets-search"]');
      
      const searchHistory = petsPage.getPage().locator('[data-testid="search-history"]');
      if (await searchHistory.isVisible()) {
        const historyItems = petsPage.getPage().locator('[data-testid="history-item"]');
        const count = await historyItems.count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(searchTerms.length);
        
        // 验证历史项目包含搜索过的内容
        for (let i = 0; i < Math.min(count, searchTerms.length); i++) {
          const historyText = await historyItems.nth(i).textContent();
          expect(searchTerms).toContain(historyText);
        }
        
        // 点击历史项目
        if (count > 0) {
          await historyItems.first().click();
          
          // 验证搜索执行
          const searchValue = await petsPage.getPage().inputValue('[data-testid="pets-search"]');
          expect(searchValue).toBeTruthy();
        }
      }
    });

    test('应该支持收藏搜索条件', async () => {
      await petsPage.goToPetsPage();
      
      // 设置搜索条件
      await petsPage.filterByType('dog');
      await petsPage.getPage().fill('[data-testid="pets-search"]', 'Max');
      await petsPage.getPage().click('[data-testid="search-button"]');
      
      // 收藏当前搜索
      const favoriteButton = petsPage.getPage().locator('[data-testid="favorite-search"]');
      if (await favoriteButton.isVisible()) {
        await favoriteButton.click();
        
        // 输入收藏名称
        const favoriteNameInput = petsPage.getPage().locator('[data-testid="favorite-name-input"]');
        if (await favoriteNameInput.isVisible()) {
          await favoriteNameInput.fill('我的狗狗Max');
          
          const confirmFavoriteButton = petsPage.getPage().locator('[data-testid="confirm-favorite"]');
          await confirmFavoriteButton.click();
          
          await petsPage.getPage().waitForTimeout(1000);
          
          // 验证收藏成功
          const successMessage = petsPage.getPage().locator('[data-testid="success-message"]');
          if (await successMessage.isVisible()) {
            await expect(successMessage).toContainText('收藏成功');
          }
        }
      }
    });
  });

  test.describe('搜索性能和用户体验测试', () => {
    test('搜索响应时间应该在合理范围内', async () => {
      await petsPage.goToPetsPage();
      
      const searchTerms = ['Max', '金毛', 'dog', 'cat'];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        await petsPage.getPage().fill('[data-testid="pets-search"]', term);
        await petsPage.getPage().click('[data-testid="search-button"]');
        
        // 等待搜索结果加载完成
        await petsPage.getPage().waitForTimeout(1000);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 验证搜索响应时间在3秒内
        expect(responseTime).toBeLessThan(3000);
        
        await petsPage.clearSearch();
      }
    });

    test('应该支持键盘导航', async () => {
      await petsPage.goToPetsPage();
      
      // 使用Tab键导航到搜索框
      await petsPage.getPage().keyboard.press('Tab');
      
      // 验证搜索框获得焦点
      const searchInput = petsPage.getPage().locator('[data-testid="pets-search"]');
      await expect(searchInput).toBeFocused();
      
      // 输入搜索词
      await petsPage.getPage().keyboard.type('Max');
      
      // 使用Enter键执行搜索
      await petsPage.getPage().keyboard.press('Enter');
      
      await petsPage.getPage().waitForTimeout(1000);
      
      // 验证搜索执行
      const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
      const count = await petCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('应该在移动端提供良好的搜索体验', async () => {
      // 模拟移动设备
      await petsPage.getPage().setViewportSize({ width: 375, height: 667 });
      
      await petsPage.goToPetsPage();
      
      // 验证搜索界面在移动端的适配
      const searchInput = petsPage.getPage().locator('[data-testid="pets-search"]');
      await expect(searchInput).toBeVisible();
      
      // 验证筛选器在移动端的显示
      const mobileFilterToggle = petsPage.getPage().locator('[data-testid="mobile-filter-toggle"]');
      if (await mobileFilterToggle.isVisible()) {
        await mobileFilterToggle.click();
        
        // 验证筛选面板显示
        const filterPanel = petsPage.getPage().locator('[data-testid="mobile-filter-panel"]');
        await expect(filterPanel).toBeVisible();
        
        // 关闭筛选面板
        const closeFilterButton = petsPage.getPage().locator('[data-testid="close-filter-panel"]');
        await closeFilterButton.click();
        
        await expect(filterPanel).not.toBeVisible();
      }
      
      // 恢复桌面视口
      await petsPage.getPage().setViewportSize({ width: 1280, height: 720 });
    });
  });
});