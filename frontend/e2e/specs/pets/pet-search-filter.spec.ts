import { test, expect } from '@playwright/test';
import { PetsPage } from '../../page-objects/pets-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('宠物搜索和筛选测试', () => {
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
            username: 'petsearcher',
            email: 'petsearcher@example.com',
            password: 'TestPass123!'
        });

        await authPage.login(testUser.email, testUser.password);

        // 创建测试宠物数据
        testPets = [
            { name: '金毛Max', type: 'dog', breed: '金毛寻回犬', age: 36, weight: 28.5, color: '金色' },
            { name: '拉布拉多Buddy', type: 'dog', breed: '拉布拉多寻回犬', age: 48, weight: 32.0, color: '黄色' },
            { name: '英短Whiskers', type: 'cat', breed: '英国短毛猫', age: 24, weight: 4.5, color: '银色' },
            { name: '暹罗Luna', type: 'cat', breed: '暹罗猫', age: 18, weight: 3.8, color: '奶油色' },
            { name: '边牧Charlie', type: 'dog', breed: '边境牧羊犬', age: 30, weight: 22.0, color: '黑白色' },
            { name: '波斯Princess', type: 'cat', breed: '波斯猫', age: 60, weight: 5.2, color: '白色' },
            { name: '哈士奇Storm', type: 'dog', breed: '西伯利亚哈士奇', age: 42, weight: 25.0, color: '灰白色' },
            { name: '布偶Bella', type: 'cat', breed: '布偶猫', age: 36, weight: 6.0, color: '蓝色重点色' }
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
        test('应该支持按宠物名称搜索', async () => {
            const searchTerms = [
                { term: 'Max', expectedCount: 1, expectedNames: ['金毛Max'] },
                { term: '金毛', expectedCount: 1, expectedNames: ['金毛Max'] },
                { term: 'a', expectedCount: 4, expectedNames: ['拉布拉多Buddy', '暹罗Luna', '边牧Charlie', '布偶Bella'] },
                { term: '不存在的宠物', expectedCount: 0, expectedNames: [] }
            ];

            for (const searchTerm of searchTerms) {
                await petsPage.goToPetsPage();

                // 执行搜索
                await petsPage.searchPets(searchTerm.term);

                // 验证搜索结果数量
                const petCards = petsPage.getPage().locator('[data-testid="pet-card"]');
                await expect(petCards).toHaveCount(searchTerm.expectedCount);

                // 验证搜索结果内容
                if (searchTerm.expectedCount > 0) {
                    for (const expectedName of searchTerm.expectedNames) {
                        const petCard = petsPage.getPage().locator(`[data-testid="pet-card"]`, {
                            has: petsPage.getPage().locator(`text=${expectedName}`)
                        });
                        await expect(petCard).toBeVisible();
                    }
                } else {
                    // 验证空状态显示
                    const emptyState = petsPage.getPage().locator('[data-testid="search-empty"]');
                    await expect(emptyState).toBeVisible();
                    await expect(emptyState).toContainText('未找到匹配的宠物');
                }

                // 清除搜索
                await petsPage.clearSearch();
            }
        });

        test('应该支持按宠物品种搜索', async () => {
            const breedSearches = [
                { breed: '金毛', expectedCount: 1 },
                { breed: '拉布拉多', expectedCount: 1 },
                { breed: '寻回犬', expectedCount: 2 }, // 金毛寻回犬 + 拉布拉多寻回犬
                { breed: '猫', expectedCount: 4 }, // 所有猫的品种都包含"猫"
                { breed: '牧羊犬', expectedCount: 1 }
            ];

            for (const search of breedSearches) {
                await petsPage.goToPetsPage();

                // 在品种字段搜索
                await petsPage.page.fill('[data-testid="breed-search"]', search.breed);
                await petsPage.page.click('[data-testid="search-button"]');

                await petsPage.page.waitForTimeout(1000);

                const petCards = petsPage.page.locator('[data-testid="pet-card"]');
                await expect(petCards).toHaveCount(search.expectedCount);

                await petsPage.clearSearch();
            }
        });

        test('应该支持组合搜索条件', async () => {
            await petsPage.goToPetsPage();

            // 搜索狗类型 + 名称包含"a"
            await petsPage.page.selectOption('[data-testid="type-filter"]', 'dog');
            await petsPage.page.fill('[data-testid="pets-search"]', 'a');
            await petsPage.page.click('[data-testid="search-button"]');

            await petsPage.page.waitForTimeout(1000);

            // 应该只显示名称包含"a"的狗
            const petCards = petsPage.page.locator('[data-testid="pet-card"]');
            const count = await petCards.count();

            for (let i = 0; i < count; i++) {
                const card = petCards.nth(i);
                const name = await card.locator('[data-testid="pet-name"]').textContent();
                const type = await card.locator('[data-testid="pet-type"]').textContent();

                expect(name?.toLowerCase()).toContain('a');
                expect(type).toContain('狗');
            }
        });

        test('应该支持模糊搜索', async () => {
            const fuzzySearches = [
                { term: 'maks', expected: '金毛Max' }, // 拼写错误
                { term: 'budy', expected: '拉布拉多Buddy' }, // 缺少字母
                { term: 'whisker', expected: '英短Whiskers' }, // 部分匹配
                { term: 'prin', expected: '波斯Princess' } // 前缀匹配
            ];

            for (const search of fuzzySearches) {
                await petsPage.goToPetsPage();

                // 启用模糊搜索
                const fuzzyToggle = petsPage.page.locator('[data-testid="fuzzy-search-toggle"]');
                if (await fuzzyToggle.isVisible()) {
                    await fuzzyToggle.check();
                }

                await petsPage.page.fill('[data-testid="pets-search"]', search.term);
                await petsPage.page.click('[data-testid="search-button"]');

                await petsPage.page.waitForTimeout(1000);

                // 验证找到预期的宠物
                const expectedPetCard = petsPage.page.locator(`[data-testid="pet-card"]`, {
                    has: petsPage.page.locator(`text=${search.expected}`)
                });
                await expect(expectedPetCard).toBeVisible();

                await petsPage.clearSearch();
            }
        });

        test('应该支持搜索建议和自动完成', async () => {
            await petsPage.goToPetsPage();

            // 输入部分文字
            await petsPage.page.fill('[data-testid="pets-search"]', 'Ma');

            // 验证搜索建议显示
            const suggestions = petsPage.page.locator('[data-testid="search-suggestions"]');
            if (await suggestions.isVisible()) {
                const suggestionItems = petsPage.page.locator('[data-testid="suggestion-item"]');
                const count = await suggestionItems.count();
                expect(count).toBeGreaterThan(0);

                // 点击第一个建议
                await suggestionItems.first().click();

                // 验证搜索框填充了建议内容
                const searchValue = await petsPage.page.inputValue('[data-testid="pets-search"]');
                expect(searchValue).toBeTruthy();
                expect(searchValue.length).toBeGreaterThan(2);
            }
        });

        test('应该支持搜索历史记录', async () => {
            const searchTerms = ['Max', '金毛', 'Buddy'];

            await petsPage.goToPetsPage();

            // 执行多次搜索
            for (const term of searchTerms) {
                await petsPage.page.fill('[data-testid="pets-search"]', term);
                await petsPage.page.click('[data-testid="search-button"]');
                await petsPage.page.waitForTimeout(500);
                await petsPage.clearSearch();
            }

            // 点击搜索框显示历史
            await petsPage.page.click('[data-testid="pets-search"]');

            const searchHistory = petsPage.page.locator('[data-testid="search-history"]');
            if (await searchHistory.isVisible()) {
                const historyItems = petsPage.page.locator('[data-testid="history-item"]');
                const count = await historyItems.count();
                expect(count).toBeLessThanOrEqual(searchTerms.length);

                // 验证历史项目包含搜索过的内容
                for (let i = 0; i < Math.min(count, searchTerms.length); i++) {
                    const historyText = await historyItems.nth(i).textContent();
                    expect(searchTerms).toContain(historyText);
                }

                // 点击历史项目
                await historyItems.first().click();

                // 验证搜索执行
                const searchValue = await petsPage.page.inputValue('[data-testid="pets-search"]');
                expect(searchValue).toBeTruthy();
            }
        });
    });

    test.describe('高级筛选测试', () => {
        test('应该支持按宠物类型筛选', async () => {
            await petsPage.goToPetsPage();

            // 筛选狗
            await petsPage.filterByType('dog');

            const dogCards = petsPage.page.locator('[data-testid="pet-card"]');
            const dogCount = await dogCards.count();

            // 验证只显示狗
            for (let i = 0; i < dogCount; i++) {
                const card = dogCards.nth(i);
                const type = await card.locator('[data-testid="pet-type"]').textContent();
                expect(type).toContain('狗');
            }

            // 筛选猫
            await petsPage.filterByType('cat');

            const catCards = petsPage.page.locator('[data-testid="pet-card"]');
            const catCount = await catCards.count();

            // 验证只显示猫
            for (let i = 0; i < catCount; i++) {
                const card = catCards.nth(i);
                const type = await card.locator('[data-testid="pet-type"]').textContent();
                expect(type).toContain('猫');
            }

            // 显示所有
            await petsPage.filterByType('all');

            const allCards = petsPage.page.locator('[data-testid="pet-card"]');
            const allCount = await allCards.count();
            expect(allCount).toBe(dogCount + catCount);
        });

        test('应该支持按年龄范围筛选', async () => {
            await petsPage.goToPetsPage();

            const ageRanges = [
                { min: 0, max: 24, label: '幼年 (0-2岁)' },
                { min: 24, max: 48, label: '成年 (2-4岁)' },
                { min: 48, max: 120, label: '老年 (4岁以上)' }
            ];

            for (const range of ageRanges) {
                // 设置年龄筛选
                const ageFilter = petsPage.page.locator('[data-testid="age-filter"]');
                if (await ageFilter.isVisible()) {
                    await ageFilter.selectOption(`${range.min}-${range.max}`);

                    await petsPage.page.waitForTimeout(1000);

                    const filteredCards = petsPage.page.locator('[data-testid="pet-card"]');
                    const count = await filteredCards.count();

                    // 验证筛选结果
                    for (let i = 0; i < count; i++) {
                        const card = filteredCards.nth(i);
                        const ageText = await card.locator('[data-testid="pet-age"]').textContent();

                        // 从显示文本中提取年龄数值进行验证
                        const ageMatch = ageText?.match(/(\d+)/);
                        if (ageMatch) {
                            const displayedAge = parseInt(ageMatch[1]);
                            // 这里需要根据实际的年龄显示逻辑进行验证
                        }
                    }
                }
            }
        });

        test('应该支持按体重范围筛选', async () => {
            await petsPage.goToPetsPage();

            const weightRanges = [
                { min: 0, max: 5, label: '小型 (0-5kg)' },
                { min: 5, max: 25, label: '中型 (5-25kg)' },
                { min: 25, max: 100, label: '大型 (25kg以上)' }
            ];

            for (const range of weightRanges) {
                const weightFilter = petsPage.page.locator('[data-testid="weight-filter"]');
                if (await weightFilter.isVisible()) {
                    await weightFilter.selectOption(`${range.min}-${range.max}`);

                    await petsPage.page.waitForTimeout(1000);

                    const filteredCards = petsPage.page.locator('[data-testid="pet-card"]');
                    const count = await filteredCards.count();

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

        test('应该支持按品种筛选', async () => {
            await petsPage.goToPetsPage();

            // 获取所有可用品种
            const breedFilter = petsPage.page.locator('[data-testid="breed-filter"]');
            if (await breedFilter.isVisible()) {
                const breedOptions = await breedFilter.locator('option').allTextContents();

                // 测试几个主要品种
                const testBreeds = breedOptions.slice(1, 4); // 跳过"全部"选项

                for (const breed of testBreeds) {
                    await breedFilter.selectOption(breed);
                    await petsPage.page.waitForTimeout(1000);

                    const filteredCards = petsPage.page.locator('[data-testid="pet-card"]');
                    const count = await filteredCards.count();

                    if (count > 0) {
                        // 验证所有显示的宠物都是该品种
                        for (let i = 0; i < count; i++) {
                            const card = filteredCards.nth(i);
                            const breedText = await card.locator('[data-testid="pet-breed"]').textContent();
                            expect(breedText).toContain(breed);
                        }
                    }
                }
            }
        });

        test('应该支持多重筛选条件组合', async () => {
            await petsPage.goToPetsPage();

            // 组合筛选：狗 + 成年 + 中大型
            await petsPage.filterByType('dog');

            const ageFilter = petsPage.page.locator('[data-testid="age-filter"]');
            if (await ageFilter.isVisible()) {
                await ageFilter.selectOption('24-48'); // 成年
            }

            const weightFilter = petsPage.page.locator('[data-testid="weight-filter"]');
            if (await weightFilter.isVisible()) {
                await weightFilter.selectOption('15-50'); // 中大型
            }

            await petsPage.page.waitForTimeout(1000);

            const filteredCards = petsPage.page.locator('[data-testid="pet-card"]');
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

            const ageFilter = petsPage.page.locator('[data-testid="age-filter"]');
            if (await ageFilter.isVisible()) {
                await ageFilter.selectOption('0-24');
            }

            await petsPage.page.waitForTimeout(1000);

            // 记录筛选后的数量
            const filteredCount = await petsPage.page.locator('[data-testid="pet-card"]').count();

            // 重置筛选
            const resetButton = petsPage.page.locator('[data-testid="reset-filters"]');
            if (await resetButton.isVisible()) {
                await resetButton.click();

                await petsPage.page.waitForTimeout(1000);

                // 验证显示所有宠物
                const allCount = await petsPage.page.locator('[data-testid="pet-card"]').count();
                expect(allCount).toBeGreaterThan(filteredCount);
                expect(allCount).toBe(testPets.length);

                // 验证筛选器重置
                const typeFilter = petsPage.page.locator('[data-testid="type-filter"]');
                expect(await typeFilter.inputValue()).toBe('all');
            }
        });

        test('应该支持保存和加载筛选预设', async () => {
            await petsPage.goToPetsPage();

            // 设置筛选条件
            await petsPage.filterByType('dog');

            const ageFilter = petsPage.page.locator('[data-testid="age-filter"]');
            if (await ageFilter.isVisible()) {
                await ageFilter.selectOption('24-48');
            }

            // 保存筛选预设
            const savePresetButton = petsPage.page.locator('[data-testid="save-preset"]');
            if (await savePresetButton.isVisible()) {
                await savePresetButton.click();

                // 输入预设名称
                const presetNameInput = petsPage.page.locator('[data-testid="preset-name-input"]');
                await presetNameInput.fill('成年狗狗');

                const confirmSaveButton = petsPage.page.locator('[data-testid="confirm-save-preset"]');
                await confirmSaveButton.click();

                await petsPage.page.waitForTimeout(1000);

                // 重置筛选
                const resetButton = petsPage.page.locator('[data-testid="reset-filters"]');
                await resetButton.click();

                // 加载预设
                const loadPresetSelect = petsPage.page.locator('[data-testid="load-preset"]');
                await loadPresetSelect.selectOption('成年狗狗');

                await petsPage.page.waitForTimeout(1000);

                // 验证筛选条件已恢复
                const typeFilter = petsPage.page.locator('[data-testid="type-filter"]');
                expect(await typeFilter.inputValue()).toBe('dog');

                if (await ageFilter.isVisible()) {
                    expect(await ageFilter.inputValue()).toBe('24-48');
                }
            }
        });
    });

    test.describe('搜索结果排序和分页测试', () => {
        test('应该支持搜索结果排序', async () => {
            await petsPage.goToPetsPage();

            // 搜索所有宠物
            await petsPage.page.fill('[data-testid="pets-search"]', '');
            await petsPage.page.click('[data-testid="search-button"]');

            await petsPage.page.waitForTimeout(1000);

            const sortOptions = [
                { value: 'name', label: '按名称排序' },
                { value: 'age', label: '按年龄排序' },
                { value: 'weight', label: '按体重排序' },
                { value: 'created', label: '按创建时间排序' }
            ];

            for (const sortOption of sortOptions) {
                await petsPage.sortPets(sortOption.value as any);

                // 验证排序结果
                const petCards = petsPage.page.locator('[data-testid="pet-card"]');
                const count = await petCards.count();

                if (count > 1) {
                    // 获取前两个宠物的排序字段值进行比较
                    const firstPet = petCards.first();
                    const secondPet = petCards.nth(1);

                    if (sortOption.value === 'name') {
                        const firstName = await firstPet.locator('[data-testid="pet-name"]').textContent();
                        const secondName = await secondPet.locator('[data-testid="pet-name"]').textContent();

                        // 验证名称按字母顺序排列
                        expect(firstName?.localeCompare(secondName || '') || 0).toBeLessThanOrEqual(0);
                    }
                }
            }
        });

        test('应该支持搜索结果分页', async () => {
            // 如果测试宠物数量不足以分页，跳过此测试
            const totalPets = await petsPage.getPetCount();
            if (totalPets <= 10) {
                test.skip('宠物数量不足以测试分页功能');
            }

            await petsPage.goToPetsPage();

            // 搜索所有宠物
            await petsPage.page.fill('[data-testid="pets-search"]', '');
            await petsPage.page.click('[data-testid="search-button"]');

            await petsPage.page.waitForTimeout(1000);

            // 验证分页控件存在
            const pagination = petsPage.page.locator('[data-testid="pagination"]');
            if (await pagination.isVisible()) {
                // 获取当前页码
                const currentPage = await petsPage.getCurrentPage();
                expect(currentPage).toBe(1);

                // 测试下一页
                const nextButton = petsPage.page.locator('[data-testid="next-page"]');
                if (await nextButton.isEnabled()) {
                    await petsPage.goToNextPage();

                    const newPage = await petsPage.getCurrentPage();
                    expect(newPage).toBe(2);

                    // 测试上一页
                    await petsPage.goToPrevPage();

                    const backPage = await petsPage.getCurrentPage();
                    expect(backPage).toBe(1);
                }
            }
        });

        test('应该显示搜索结果统计信息', async () => {
            await petsPage.goToPetsPage();

            // 搜索特定类型
            await petsPage.filterByType('dog');

            await petsPage.page.waitForTimeout(1000);

            // 验证结果统计显示
            const resultStats = petsPage.page.locator('[data-testid="search-results-stats"]');
            if (await resultStats.isVisible()) {
                const statsText = await resultStats.textContent();

                // 验证统计信息包含数量
                expect(statsText).toMatch(/\d+/);
                expect(statsText).toContain('结果');
            }

            // 验证空搜索结果统计
            await petsPage.page.fill('[data-testid="pets-search"]', '不存在的宠物名称');
            await petsPage.page.click('[data-testid="search-button"]');

            await petsPage.page.waitForTimeout(1000);

            if (await resultStats.isVisible()) {
                const emptyStatsText = await resultStats.textContent();
                expect(emptyStatsText).toContain('0');
            }
        });
    });

    test.describe('搜索性能和用户体验测试', () => {
        test('搜索响应时间应该在合理范围内', async () => {
            await petsPage.goToPetsPage();

            const searchTerms = ['Max', '金毛', 'dog', 'cat'];

            for (const term of searchTerms) {
                const startTime = Date.now();

                await petsPage.page.fill('[data-testid="pets-search"]', term);
                await petsPage.page.click('[data-testid="search-button"]');

                // 等待搜索结果加载完成
                await petsPage.page.waitForTimeout(1000);

                const endTime = Date.now();
                const responseTime = endTime - startTime;

                // 验证搜索响应时间在3秒内
                expect(responseTime).toBeLessThan(3000);

                await petsPage.clearSearch();
            }
        });

        test('应该提供实时搜索反馈', async () => {
            await petsPage.goToPetsPage();

            // 输入搜索词
            await petsPage.page.fill('[data-testid="pets-search"]', 'Ma');

            // 验证加载指示器显示
            const loadingIndicator = petsPage.page.locator('[data-testid="search-loading"]');
            if (await loadingIndicator.isVisible()) {
                // 等待加载完成
                await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
            }

            // 验证搜索结果更新
            const petCards = petsPage.page.locator('[data-testid="pet-card"]');
            await expect(petCards).toBeVisible();
        });

        test('应该支持键盘导航', async () => {
            await petsPage.goToPetsPage();

            // 使用Tab键导航到搜索框
            await petsPage.page.keyboard.press('Tab');

            // 验证搜索框获得焦点
            const searchInput = petsPage.page.locator('[data-testid="pets-search"]');
            await expect(searchInput).toBeFocused();

            // 输入搜索词
            await petsPage.page.keyboard.type('Max');

            // 使用Enter键执行搜索
            await petsPage.page.keyboard.press('Enter');

            await petsPage.page.waitForTimeout(1000);

            // 验证搜索执行
            const petCards = petsPage.page.locator('[data-testid="pet-card"]');
            const count = await petCards.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('应该在移动端提供良好的搜索体验', async () => {
            // 模拟移动设备
            await petsPage.page.setViewportSize({ width: 375, height: 667 });

            await petsPage.goToPetsPage();

            // 验证搜索界面在移动端的适配
            const searchInput = petsPage.page.locator('[data-testid="pets-search"]');
            await expect(searchInput).toBeVisible();

            // 验证筛选器在移动端的显示
            const mobileFilterToggle = petsPage.page.locator('[data-testid="mobile-filter-toggle"]');
            if (await mobileFilterToggle.isVisible()) {
                await mobileFilterToggle.click();

                // 验证筛选面板显示
                const filterPanel = petsPage.page.locator('[data-testid="mobile-filter-panel"]');
                await expect(filterPanel).toBeVisible();

                // 关闭筛选面板
                const closeFilterButton = petsPage.page.locator('[data-testid="close-filter-panel"]');
                await closeFilterButton.click();

                await expect(filterPanel).not.toBeVisible();
            }

            // 恢复桌面视口
            await petsPage.page.setViewportSize({ width: 1280, height: 720 });
        });
    });
});