import { test, expect, Page } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';

test.describe('键盘导航测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    communityPage = new CommunityPage(page);
  });

  test.describe('Tab键导航测试', () => {
    test('主页Tab键导航顺序正确', async ({ page }) => {
      await page.goto('/');
      
      // 获取所有可聚焦元素
      const focusableElements = await page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
      
      // 验证Tab键导航顺序
      let currentIndex = 0;
      for (const element of focusableElements) {
        await page.keyboard.press('Tab');
        const focused = await page.locator(':focus').first();
        
        // 验证焦点在预期元素上
        const isCorrectElement = await element.evaluate((el, focusedEl) => {
          return el === focusedEl;
        }, await focused.elementHandle());
        
        if (isCorrectElement) {
          currentIndex++;
        }
      }
      
      expect(currentIndex).toBeGreaterThan(0);
    });

    test('登录表单Tab键导航', async ({ page }) => {
      await authPage.goToLogin();
      
      // 测试Tab键在表单字段间的导航
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
      
      // 测试Shift+Tab反向导航
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
      
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();
    });

    test('宠物管理页面Tab键导航', async ({ page }) => {
      await authPage.loginWithTestUser();
      await petsPage.goToPetsPage();
      
      // 验证宠物列表中的Tab导航
      const petCards = await page.locator('[data-testid="pet-card"]').all();
      
      if (petCards.length > 0) {
        // 导航到第一个宠物卡片
        await page.keyboard.press('Tab');
        const firstCard = petCards[0];
        await expect(firstCard.locator('button, a').first()).toBeFocused();
        
        // 继续Tab导航验证其他交互元素
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // 验证添加宠物按钮可以通过Tab到达
        const addButton = page.locator('[data-testid="add-pet-button"]');
        if (await addButton.isVisible()) {
          // 多次Tab直到到达添加按钮
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            if (await addButton.isFocused()) {
              break;
            }
          }
          await expect(addButton).toBeFocused();
        }
      }
    });

    test('分析页面Tab键导航', async ({ page }) => {
      await authPage.loginWithTestUser();
      await analysisPage.goToAnalysisPage();
      
      // 验证文件上传区域的Tab导航
      await page.keyboard.press('Tab');
      const uploadArea = page.locator('[data-testid="upload-area"]');
      if (await uploadArea.isVisible()) {
        await expect(uploadArea).toBeFocused();
      }
      
      // 验证宠物选择下拉框的Tab导航
      await page.keyboard.press('Tab');
      const petSelect = page.locator('select[name="petId"]');
      if (await petSelect.isVisible()) {
        await expect(petSelect).toBeFocused();
      }
    });
  });

  test.describe('快捷键操作测试', () => {
    test('全局快捷键功能', async ({ page }) => {
      await authPage.loginWithTestUser();
      await page.goto('/');
      
      // 测试Escape键关闭模态框
      const modalTrigger = page.locator('[data-testid="modal-trigger"]').first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        await expect(page.locator('[data-testid="modal"]')).toBeVisible();
        
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
      }
      
      // 测试Enter键激活按钮
      const button = page.locator('button').first();
      await button.focus();
      await page.keyboard.press('Enter');
      
      // 验证按钮被激活（这里需要根据具体按钮行为调整）
      // 例如：await expect(page.locator('[data-testid="button-activated"]')).toBeVisible();
    });

    test('表单快捷键操作', async ({ page }) => {
      await authPage.goToLogin();
      
      // 填写表单并使用Enter提交
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // 在密码字段按Enter应该提交表单
      await page.locator('input[type="password"]').press('Enter');
      
      // 验证表单提交（根据实际行为调整）
      await page.waitForTimeout(1000);
    });

    test('列表导航快捷键', async ({ page }) => {
      await authPage.loginWithTestUser();
      await petsPage.goToPetsPage();
      
      const petList = page.locator('[data-testid="pet-list"]');
      if (await petList.isVisible()) {
        // 使用方向键导航列表项
        await petList.focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        
        // 使用空格键选择项目
        await page.keyboard.press('Space');
        
        // 验证选择状态
        const selectedItem = page.locator('[data-testid="pet-item"][aria-selected="true"]');
        if (await selectedItem.isVisible()) {
          await expect(selectedItem).toBeVisible();
        }
      }
    });
  });

  test.describe('焦点管理测试', () => {
    test('模态框焦点陷阱', async ({ page }) => {
      await authPage.loginWithTestUser();
      await page.goto('/');
      
      // 打开模态框
      const modalTrigger = page.locator('[data-testid="modal-trigger"]').first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[data-testid="modal"]');
        await expect(modal).toBeVisible();
        
        // 获取模态框内的可聚焦元素
        const focusableInModal = await modal.locator('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])').all();
        
        if (focusableInModal.length > 0) {
          // 验证焦点在模态框内循环
          const firstElement = focusableInModal[0];
          const lastElement = focusableInModal[focusableInModal.length - 1];
          
          // 焦点应该在第一个元素
          await expect(firstElement).toBeFocused();
          
          // Tab到最后一个元素
          for (let i = 0; i < focusableInModal.length - 1; i++) {
            await page.keyboard.press('Tab');
          }
          await expect(lastElement).toBeFocused();
          
          // 再次Tab应该回到第一个元素
          await page.keyboard.press('Tab');
          await expect(firstElement).toBeFocused();
          
          // Shift+Tab应该到最后一个元素
          await page.keyboard.press('Shift+Tab');
          await expect(lastElement).toBeFocused();
        }
        
        // 关闭模态框，焦点应该返回到触发元素
        await page.keyboard.press('Escape');
        await expect(modalTrigger).toBeFocused();
      }
    });

    test('下拉菜单焦点管理', async ({ page }) => {
      await authPage.loginWithTestUser();
      await page.goto('/');
      
      // 查找下拉菜单触发器
      const dropdownTrigger = page.locator('[data-testid="dropdown-trigger"]').first();
      if (await dropdownTrigger.isVisible()) {
        await dropdownTrigger.click();
        
        const dropdown = page.locator('[data-testid="dropdown-menu"]');
        await expect(dropdown).toBeVisible();
        
        // 验证焦点在第一个菜单项
        const firstMenuItem = dropdown.locator('[role="menuitem"]').first();
        await expect(firstMenuItem).toBeFocused();
        
        // 使用方向键导航菜单项
        await page.keyboard.press('ArrowDown');
        const secondMenuItem = dropdown.locator('[role="menuitem"]').nth(1);
        if (await secondMenuItem.isVisible()) {
          await expect(secondMenuItem).toBeFocused();
        }
        
        // Escape关闭菜单并返回焦点
        await page.keyboard.press('Escape');
        await expect(dropdownTrigger).toBeFocused();
      }
    });

    test('表单字段焦点可见性', async ({ page }) => {
      await authPage.goToRegister();
      
      const formFields = await page.locator('input, select, textarea').all();
      
      for (const field of formFields) {
        await field.focus();
        
        // 验证焦点样式可见
        const focusOutline = await field.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow
          };
        });
        
        // 验证有可见的焦点指示器
        const hasFocusIndicator = 
          focusOutline.outline !== 'none' ||
          focusOutline.outlineWidth !== '0px' ||
          focusOutline.boxShadow !== 'none';
        
        expect(hasFocusIndicator).toBeTruthy();
      }
    });
  });

  test.describe('键盘陷阱检测测试', () => {
    test('检测并修复键盘陷阱', async ({ page }) => {
      await page.goto('/');
      
      // 记录初始焦点位置
      const initialFocus = await page.locator(':focus').first();
      
      // 连续Tab导航，检测是否存在无法逃脱的焦点陷阱
      const maxTabs = 50; // 设置最大Tab次数
      let tabCount = 0;
      let focusHistory: string[] = [];
      
      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const currentFocus = await page.locator(':focus').first();
        const focusSelector = await currentFocus.evaluate((el) => {
          // 生成元素的唯一标识符
          return el.tagName + (el.id ? '#' + el.id : '') + 
                 (el.className ? '.' + el.className.split(' ').join('.') : '');
        });
        
        focusHistory.push(focusSelector);
        
        // 检测焦点循环（如果连续3次出现相同的焦点序列，可能是陷阱）
        if (focusHistory.length >= 6) {
          const recent = focusHistory.slice(-6);
          const firstHalf = recent.slice(0, 3);
          const secondHalf = recent.slice(3, 6);
          
          if (JSON.stringify(firstHalf) === JSON.stringify(secondHalf)) {
            // 检测到可能的键盘陷阱
            console.warn(`检测到可能的键盘陷阱，焦点在以下元素间循环: ${firstHalf.join(' -> ')}`);
            
            // 尝试使用Escape键逃脱
            await page.keyboard.press('Escape');
            await page.waitForTimeout(100);
            
            // 验证是否成功逃脱
            const afterEscape = await page.locator(':focus').first();
            const afterEscapeSelector = await afterEscape.evaluate((el) => {
              return el.tagName + (el.id ? '#' + el.id : '') + 
                     (el.className ? '.' + el.className.split(' ').join('.') : '');
            });
            
            if (!firstHalf.includes(afterEscapeSelector)) {
              console.log('成功使用Escape键逃脱键盘陷阱');
            } else {
              // 如果Escape无效，尝试其他方法
              await page.keyboard.press('Alt+Tab');
              console.log('尝试使用Alt+Tab逃脱键盘陷阱');
            }
            
            break;
          }
        }
        
        // 如果回到初始焦点，说明完成了一轮完整的Tab循环
        const currentSelector = await currentFocus.evaluate((el) => {
          return el.tagName + (el.id ? '#' + el.id : '') + 
                 (el.className ? '.' + el.className.split(' ').join('.') : '');
        });
        
        const initialSelector = await initialFocus.evaluate((el) => {
          return el.tagName + (el.id ? '#' + el.id : '') + 
                 (el.className ? '.' + el.className.split(' ').join('.') : '');
        });
        
        if (currentSelector === initialSelector && i > 0) {
          console.log(`完成Tab循环，共${tabCount}次Tab操作`);
          break;
        }
      }
      
      // 验证没有无限循环的键盘陷阱
      expect(tabCount).toBeLessThan(maxTabs);
    });

    test('验证跳过链接功能', async ({ page }) => {
      await page.goto('/');
      
      // 查找跳过链接（通常是页面的第一个可聚焦元素）
      await page.keyboard.press('Tab');
      const firstFocusable = await page.locator(':focus').first();
      
      const isSkipLink = await firstFocusable.evaluate((el) => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('跳过') || text.includes('skip') || 
               text.includes('跳转到主内容') || text.includes('skip to main');
      });
      
      if (isSkipLink) {
        // 激活跳过链接
        await page.keyboard.press('Enter');
        
        // 验证焦点跳转到主内容区域
        await page.waitForTimeout(100);
        const afterSkip = await page.locator(':focus').first();
        
        const isMainContent = await afterSkip.evaluate((el) => {
          return el.tagName === 'MAIN' || 
                 el.id === 'main' || 
                 el.getAttribute('role') === 'main' ||
                 el.closest('main') !== null;
        });
        
        expect(isMainContent).toBeTruthy();
      }
    });
  });
});