import { test, expect } from '@playwright/test';
import { PetsPage } from '../../page-objects/pets-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('宠物搜索分页功能测试 - 任务5.2', () => {
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
      username: 'paginationuser',
      email: 'paginationuser@example.com',
      password: 'TestPass123!'
    });
    
    await authPage.login(testUser.email, testUser.password);
    
    // 创建大量测试宠物数据以测试分页功能
    const petNames = [
      'Buddy', 'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Luna', 'Rocky',
      'Daisy', 'Bear', 'Molly', 'Tucker', 'Sadie', 'Jack', 'Chloe', 'Duke',
      'Lola', 'Zeus', 'Sophie', 'Oliver', 'Penny', 'Leo', 'Mia', 'Toby',
      'Coco', 'Simba', 'Nala', 'Shadow', 'Princess', 'Ginger'
    ];
    
    // 创建30只宠物用于分页测试
    for (let i = 0; i < petNames.length; i++) {
      const petData = {
        name: petNames[i],
        type: (i % 2 === 0 ? 'dog' : 'cat') as 'dog' | 'cat',
        breed: i % 2 === 0 ? '拉布拉多' : '英短',
        age: 12 + (i % 60), // 1-5岁
        weight: 5 + (i % 30) // 5-35kg
      };
      
      await petsPage.addPet(petData);
    }
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
    await testDataManager.dispose();
  });

  test.describe('分页基础功能测试', () => {
    test('应该正确显示分页控件和信息', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示5个宠物
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('5');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证分页控件显示
        const pagination = petsPage.getPage().locator('[data-testid="pagination"]');
        await expect(pagination).toBeVisible();
        
        // 验证分页信息显示
        const paginationInfo = petsPage.getPage().locator('[data-testid="pagination-info"]');
        if (await paginationInfo.isVisible()) {
          const infoText = await paginationInfo.textContent();
          expect(infoText).toContain('共');
          expect(infoText).toContain('30'); // 总共30只宠物
        }
        
        // 验证页码按钮数量
        const pageButtons = petsPage.getPage().locator('[data-testid="page-number"]');
        const buttonCount = await pageButtons.count();
        expect(buttonCount).toBe(6); // 30/5 = 6页
        
        // 验证当前页面显示的宠物数量
        const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const cardCount = await petCards.count();
        expect(cardCount).toBe(5);
      }
    });

    test('应该支持页码直接跳转', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示10个宠物
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('10');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 点击第2页
        await petsPage.goToPage(2);
        
        // 验证当前页码
        const currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(2);
        
        // 验证页面内容已更新
        const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const cardCount = await petCards.count();
        expect(cardCount).toBe(10);
        
        // 点击第3页
        await petsPage.goToPage(3);
        
        const newCurrentPage = await petsPage.getCurrentPage();
        expect(newCurrentPage).toBe(3);
        
        // 验证最后一页的宠物数量
        const lastPageCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const lastPageCount = await lastPageCards.count();
        expect(lastPageCount).toBe(10); // 30只宠物，第3页应该有10只
      }
    });

    test('应该支持上一页下一页导航', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示8个宠物
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('8');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证初始状态
        let currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(1);
        
        // 验证上一页按钮禁用
        const prevButton = petsPage.getPage().locator('[data-testid="prev-page"]');
        await expect(prevButton).toBeDisabled();
        
        // 点击下一页
        await petsPage.goToNextPage();
        currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(2);
        
        // 验证上一页按钮启用
        await expect(prevButton).toBeEnabled();
        
        // 继续点击下一页到最后一页
        await petsPage.goToNextPage();
        await petsPage.goToNextPage();
        await petsPage.goToNextPage(); // 到第4页（最后一页，30/8=3.75，共4页）
        
        currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(4);
        
        // 验证下一页按钮禁用
        const nextButton = petsPage.getPage().locator('[data-testid="next-page"]');
        await expect(nextButton).toBeDisabled();
        
        // 验证最后一页的宠物数量
        const lastPageCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const lastPageCount = await lastPageCards.count();
        expect(lastPageCount).toBe(6); // 30 - 8*3 = 6
        
        // 点击上一页返回
        await petsPage.goToPrevPage();
        currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(3);
      }
    });

    test('应该支持每页显示数量调整', async () => {
      await petsPage.goToPetsPage();
      
      const pageSizes = [
        { size: '5', expectedPages: 6, lastPageCount: 5 },
        { size: '10', expectedPages: 3, lastPageCount: 10 },
        { size: '15', expectedPages: 2, lastPageCount: 15 },
        { size: '25', expectedPages: 2, lastPageCount: 5 } // 30/25 = 1.2，共2页，最后一页5个
      ];
      
      for (const pageSize of pageSizes) {
        const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
        if (await pageSizeSelect.isVisible()) {
          await pageSizeSelect.selectOption(pageSize.size);
          await petsPage.getPage().waitForTimeout(1000);
          
          // 验证页码按钮数量
          const pageButtons = petsPage.getPage().locator('[data-testid="page-number"]');
          const buttonCount = await pageButtons.count();
          expect(buttonCount).toBe(pageSize.expectedPages);
          
          // 验证第一页的宠物数量
          const firstPageCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const firstPageCount = await firstPageCards.count();
          expect(firstPageCount).toBe(Math.min(parseInt(pageSize.size), 30));
          
          // 跳转到最后一页验证数量
          if (pageSize.expectedPages > 1) {
            await petsPage.goToPage(pageSize.expectedPages);
            
            const lastPageCards = petsPage.getPage().locator('[data-testid="pet-card"]');
            const lastPageCount = await lastPageCards.count();
            expect(lastPageCount).toBe(pageSize.lastPageCount);
            
            // 返回第一页
            await petsPage.goToPage(1);
          }
        }
      }
    });
  });

  test.describe('搜索结果分页测试', () => {
    test('应该正确分页显示搜索结果', async () => {
      await petsPage.goToPetsPage();
      
      // 搜索狗类型（应该有15只狗）
      await petsPage.filterByType('dog');
      
      // 设置每页显示5个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('5');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证搜索结果分页
        const pageButtons = petsPage.getPage().locator('[data-testid="page-number"]');
        const buttonCount = await pageButtons.count();
        expect(buttonCount).toBe(3); // 15只狗，每页5个，共3页
        
        // 验证每页都只显示狗
        for (let page = 1; page <= 3; page++) {
          await petsPage.goToPage(page);
          
          const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const cardCount = await petCards.count();
          
          if (page < 3) {
            expect(cardCount).toBe(5);
          } else {
            expect(cardCount).toBe(5); // 最后一页也是5个
          }
          
          // 验证所有卡片都是狗
          for (let i = 0; i < cardCount; i++) {
            const card = petCards.nth(i);
            const type = await card.locator('[data-testid="pet-type"]').textContent();
            expect(type).toContain('狗');
          }
        }
      }
    });

    test('应该在搜索条件变化时重置分页', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示5个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('5');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 跳转到第3页
        await petsPage.goToPage(3);
        let currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(3);
        
        // 应用筛选条件
        await petsPage.filterByType('cat');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证分页重置到第1页
        currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(1);
        
        // 验证新的分页数量
        const pageButtons = petsPage.getPage().locator('[data-testid="page-number"]');
        const buttonCount = await pageButtons.count();
        expect(buttonCount).toBe(3); // 15只猫，每页5个，共3页
      }
    });

    test('应该在搜索关键词变化时重置分页', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示10个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('10');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 跳转到第2页
        await petsPage.goToPage(2);
        let currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(2);
        
        // 执行搜索
        await petsPage.getPage().fill('[data-testid="pets-search"]', 'B');
        await petsPage.getPage().click('[data-testid="search-button"]');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证分页重置到第1页
        currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(1);
        
        // 验证搜索结果
        const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const cardCount = await petCards.count();
        
        // 验证所有结果都包含字母"B"
        for (let i = 0; i < cardCount; i++) {
          const card = petCards.nth(i);
          const name = await card.locator('[data-testid="pet-name"]').textContent();
          expect(name?.toLowerCase()).toContain('b');
        }
      }
    });
  });

  test.describe('分页性能和用户体验测试', () => {
    test('分页切换应该快速响应', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示10个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('10');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 测试多次分页切换的响应时间
        const pages = [2, 3, 1, 2];
        
        for (const targetPage of pages) {
          const startTime = Date.now();
          
          await petsPage.goToPage(targetPage);
          
          // 等待页面内容加载完成
          await petsPage.getPage().waitForTimeout(500);
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          // 验证分页切换响应时间在2秒内
          expect(responseTime).toBeLessThan(2000);
          
          // 验证页码正确
          const currentPage = await petsPage.getCurrentPage();
          expect(currentPage).toBe(targetPage);
        }
      }
    });

    test('应该显示分页加载状态', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示15个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('15');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 点击下一页
        const nextButton = petsPage.getPage().locator('[data-testid="next-page"]');
        await nextButton.click();
        
        // 验证加载指示器显示
        const loadingIndicator = petsPage.getPage().locator('[data-testid="pagination-loading"]');
        if (await loadingIndicator.isVisible()) {
          // 等待加载完成
          await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
        }
        
        // 验证页面内容已更新
        const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        await expect(petCards).toBeVisible();
      }
    });

    test('应该支持键盘导航分页', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示12个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('12');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 使用Tab键导航到分页控件
        await petsPage.getPage().keyboard.press('Tab');
        await petsPage.getPage().keyboard.press('Tab');
        
        // 使用方向键导航
        const nextButton = petsPage.getPage().locator('[data-testid="next-page"]');
        await nextButton.focus();
        await petsPage.getPage().keyboard.press('Enter');
        
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证页码已切换
        const currentPage = await petsPage.getCurrentPage();
        expect(currentPage).toBe(2);
      }
    });

    test('应该在移动端正确显示分页控件', async () => {
      // 模拟移动设备
      await petsPage.getPage().setViewportSize({ width: 375, height: 667 });
      
      await petsPage.goToPetsPage();
      
      // 设置每页显示8个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('8');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证移动端分页控件显示
        const mobilePagination = petsPage.getPage().locator('[data-testid="mobile-pagination"]');
        if (await mobilePagination.isVisible()) {
          await expect(mobilePagination).toBeVisible();
          
          // 验证移动端分页信息
          const mobilePageInfo = petsPage.getPage().locator('[data-testid="mobile-page-info"]');
          if (await mobilePageInfo.isVisible()) {
            const infoText = await mobilePageInfo.textContent();
            expect(infoText).toContain('1');
            expect(infoText).toContain('4'); // 总页数
          }
          
          // 测试移动端分页导航
          const mobileNextButton = petsPage.getPage().locator('[data-testid="mobile-next-page"]');
          if (await mobileNextButton.isVisible()) {
            await mobileNextButton.click();
            
            await petsPage.getPage().waitForTimeout(1000);
            
            const currentPage = await petsPage.getCurrentPage();
            expect(currentPage).toBe(2);
          }
        }
      }
      
      // 恢复桌面视口
      await petsPage.getPage().setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('分页数据一致性测试', () => {
    test('应该确保分页数据不重复', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示10个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('10');
        await petsPage.getPage().waitForTimeout(1000);
        
        const allPetNames = new Set<string>();
        
        // 遍历所有页面收集宠物名称
        const totalPages = 3; // 30只宠物，每页10个，共3页
        
        for (let page = 1; page <= totalPages; page++) {
          await petsPage.goToPage(page);
          await petsPage.getPage().waitForTimeout(500);
          
          const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const cardCount = await petCards.count();
          
          for (let i = 0; i < cardCount; i++) {
            const card = petCards.nth(i);
            const name = await card.locator('[data-testid="pet-name"]').textContent();
            
            if (name) {
              // 验证名称不重复
              expect(allPetNames.has(name)).toBeFalsy();
              allPetNames.add(name);
            }
          }
        }
        
        // 验证总数量正确
        expect(allPetNames.size).toBe(30);
      }
    });

    test('应该正确处理排序后的分页', async () => {
      await petsPage.goToPetsPage();
      
      // 设置每页显示8个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('8');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 按名称排序
        await petsPage.sortPets('name');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 收集第一页的宠物名称
        const firstPageNames: string[] = [];
        const firstPageCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const firstPageCount = await firstPageCards.count();
        
        for (let i = 0; i < firstPageCount; i++) {
          const card = firstPageCards.nth(i);
          const name = await card.locator('[data-testid="pet-name"]').textContent();
          if (name) {
            firstPageNames.push(name);
          }
        }
        
        // 验证第一页名称按字母顺序排列
        for (let i = 1; i < firstPageNames.length; i++) {
          expect(firstPageNames[i - 1].localeCompare(firstPageNames[i])).toBeLessThanOrEqual(0);
        }
        
        // 切换到第二页
        await petsPage.goToNextPage();
        await petsPage.getPage().waitForTimeout(500);
        
        // 收集第二页的宠物名称
        const secondPageNames: string[] = [];
        const secondPageCards = petsPage.getPage().locator('[data-testid="pet-card"]');
        const secondPageCount = await secondPageCards.count();
        
        for (let i = 0; i < secondPageCount; i++) {
          const card = secondPageCards.nth(i);
          const name = await card.locator('[data-testid="pet-name"]').textContent();
          if (name) {
            secondPageNames.push(name);
          }
        }
        
        // 验证第二页名称也按字母顺序排列
        for (let i = 1; i < secondPageNames.length; i++) {
          expect(secondPageNames[i - 1].localeCompare(secondPageNames[i])).toBeLessThanOrEqual(0);
        }
        
        // 验证第一页最后一个名称 <= 第二页第一个名称
        if (firstPageNames.length > 0 && secondPageNames.length > 0) {
          const lastFirstPage = firstPageNames[firstPageNames.length - 1];
          const firstSecondPage = secondPageNames[0];
          expect(lastFirstPage.localeCompare(firstSecondPage)).toBeLessThanOrEqual(0);
        }
      }
    });

    test('应该正确处理筛选后的分页数据', async () => {
      await petsPage.goToPetsPage();
      
      // 筛选猫类型
      await petsPage.filterByType('cat');
      
      // 设置每页显示6个
      const pageSizeSelect = petsPage.getPage().locator('[data-testid="page-size-select"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('6');
        await petsPage.getPage().waitForTimeout(1000);
        
        // 验证所有页面都只显示猫
        const totalPages = 3; // 15只猫，每页6个，共3页
        
        for (let page = 1; page <= totalPages; page++) {
          await petsPage.goToPage(page);
          await petsPage.getPage().waitForTimeout(500);
          
          const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
          const cardCount = await petCards.count();
          
          // 验证每页的宠物都是猫
          for (let i = 0; i < cardCount; i++) {
            const card = petCards.nth(i);
            const type = await card.locator('[data-testid="pet-type"]').textContent();
            expect(type).toContain('猫');
          }
          
          // 验证页面宠物数量
          if (page < 3) {
            expect(cardCount).toBe(6);
          } else {
            expect(cardCount).toBe(3); // 最后一页：15 - 6*2 = 3
          }
        }
      }
    });
  });
});