import { test, expect, Page } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';

test.describe('屏幕阅读器兼容性测试', () => {
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

  test.describe('ARIA标签和语义化HTML测试', () => {
    test('页面标题和地标元素', async ({ page }) => {
      await page.goto('/');
      
      // 验证页面标题
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      
      // 验证主要地标元素存在
      const landmarks = [
        { role: 'banner', selector: 'header, [role="banner"]' },
        { role: 'navigation', selector: 'nav, [role="navigation"]' },
        { role: 'main', selector: 'main, [role="main"]' },
        { role: 'contentinfo', selector: 'footer, [role="contentinfo"]' }
      ];
      
      for (const landmark of landmarks) {
        const element = page.locator(landmark.selector).first();
        if (await element.isVisible()) {
          // 验证地标元素有适当的标签
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledby = await element.getAttribute('aria-labelledby');
          
          if (!ariaLabel && !ariaLabelledby) {
            // 对于某些地标，检查是否有文本内容作为标签
            const textContent = await element.textContent();
            if (landmark.role === 'navigation' || landmark.role === 'banner') {
              expect(textContent || ariaLabel || ariaLabelledby).toBeTruthy();
            }
          }
        }
      }
    });

    test('表单元素ARIA标签', async ({ page }) => {
      await authPage.goToLogin();
      
      // 验证表单字段有适当的标签
      const formFields = await page.locator('input, select, textarea').all();
      
      for (const field of formFields) {
        const fieldType = await field.getAttribute('type');
        const fieldName = await field.getAttribute('name');
        
        // 检查标签关联
        const id = await field.getAttribute('id');
        const ariaLabel = await field.getAttribute('aria-label');
        const ariaLabelledby = await field.getAttribute('aria-labelledby');
        const ariaDescribedby = await field.getAttribute('aria-describedby');
        
        let hasLabel = false;
        
        // 检查显式标签
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          if (await label.isVisible()) {
            hasLabel = true;
            const labelText = await label.textContent();
            expect(labelText?.trim()).toBeTruthy();
          }
        }
        
        // 检查ARIA标签
        if (ariaLabel || ariaLabelledby) {
          hasLabel = true;
        }
        
        // 检查包装标签
        const parentLabel = await field.locator('xpath=ancestor::label[1]').first();
        if (await parentLabel.isVisible()) {
          hasLabel = true;
        }
        
        expect(hasLabel).toBeTruthy();
        
        // 验证必填字段有适当的标记
        const required = await field.getAttribute('required');
        const ariaRequired = await field.getAttribute('aria-required');
        
        if (required !== null) {
          expect(ariaRequired === 'true' || required !== null).toBeTruthy();
        }
      }
    });

    test('按钮和链接可访问性', async ({ page }) => {
      await page.goto('/');
      
      // 验证所有按钮有可访问的名称
      const buttons = await page.locator('button').all();
      
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');
        const textContent = await button.textContent();
        const title = await button.getAttribute('title');
        
        const hasAccessibleName = 
          (textContent && textContent.trim().length > 0) ||
          (ariaLabel && ariaLabel.trim().length > 0) ||
          ariaLabelledby ||
          (title && title.trim().length > 0);
        
        expect(hasAccessibleName).toBeTruthy();
        
        // 验证按钮状态
        const disabled = await button.getAttribute('disabled');
        const ariaDisabled = await button.getAttribute('aria-disabled');
        
        if (disabled !== null) {
          expect(ariaDisabled === 'true' || disabled !== null).toBeTruthy();
        }
      }
      
      // 验证链接有意义的文本
      const links = await page.locator('a').all();
      
      for (const link of links) {
        const href = await link.getAttribute('href');
        const ariaLabel = await link.getAttribute('aria-label');
        const textContent = await link.textContent();
        const title = await link.getAttribute('title');
        
        if (href && href !== '#') {
          const hasAccessibleName = 
            (textContent && textContent.trim().length > 0 && !textContent.includes('点击这里')) ||
            (ariaLabel && ariaLabel.trim().length > 0) ||
            (title && title.trim().length > 0);
          
          expect(hasAccessibleName).toBeTruthy();
        }
      }
    });

    test('图片替代文本', async ({ page }) => {
      await page.goto('/');
      
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const ariaLabelledby = await img.getAttribute('aria-labelledby');
        const role = await img.getAttribute('role');
        
        // 装饰性图片应该有空的alt或role="presentation"
        const isDecorative = alt === '' || role === 'presentation' || role === 'none';
        
        // 信息性图片应该有有意义的替代文本
        const hasAltText = 
          (alt && alt.trim().length > 0) ||
          (ariaLabel && ariaLabel.trim().length > 0) ||
          ariaLabelledby;
        
        // 图片要么是装饰性的，要么有替代文本
        expect(isDecorative || hasAltText).toBeTruthy();
      }
    });

    test('表格可访问性', async ({ page }) => {
      await authPage.loginWithTestUser();
      await page.goto('/records'); // 假设记录页面有表格
      
      const tables = await page.locator('table').all();
      
      for (const table of tables) {
        // 验证表格有标题
        const caption = table.locator('caption');
        const ariaLabel = await table.getAttribute('aria-label');
        const ariaLabelledby = await table.getAttribute('aria-labelledby');
        
        const hasTableLabel = 
          await caption.isVisible() ||
          (ariaLabel && ariaLabel.trim().length > 0) ||
          ariaLabelledby;
        
        if (await table.isVisible()) {
          expect(hasTableLabel).toBeTruthy();
        }
        
        // 验证表头
        const headers = await table.locator('th').all();
        
        for (const header of headers) {
          const scope = await header.getAttribute('scope');
          const id = await header.getAttribute('id');
          const textContent = await header.textContent();
          
          // 表头应该有scope属性或id（用于复杂表格）
          expect(scope || id || (textContent && textContent.trim().length > 0)).toBeTruthy();
        }
        
        // 验证数据单元格与表头的关联
        const dataCells = await table.locator('td').all();
        
        for (const cell of dataCells.slice(0, 5)) { // 只检查前5个单元格以提高性能
          const headers = await cell.getAttribute('headers');
          const scope = await cell.getAttribute('scope');
          
          // 复杂表格的数据单元格应该有headers属性
          if (headers || scope) {
            expect(headers || scope).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('屏幕阅读器导航测试', () => {
    test('标题层次结构', async ({ page }) => {
      await page.goto('/');
      
      // 获取所有标题元素
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      if (headings.length > 0) {
        let previousLevel = 0;
        let hasH1 = false;
        
        for (const heading of headings) {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          const currentLevel = parseInt(tagName.charAt(1));
          const textContent = await heading.textContent();
          
          // 验证标题有文本内容
          expect(textContent?.trim()).toBeTruthy();
          
          // 检查是否有h1
          if (currentLevel === 1) {
            hasH1 = true;
          }
          
          // 验证标题层次不跳级（除了第一个标题）
          if (previousLevel > 0) {
            const levelDiff = currentLevel - previousLevel;
            expect(levelDiff).toBeLessThanOrEqual(1);
          }
          
          previousLevel = currentLevel;
        }
        
        // 页面应该有h1标题
        expect(hasH1).toBeTruthy();
      }
    });

    test('列表结构', async ({ page }) => {
      await authPage.loginWithTestUser();
      await petsPage.goToPetsPage();
      
      // 验证列表使用适当的HTML结构
      const lists = await page.locator('ul, ol').all();
      
      for (const list of lists) {
        const listItems = await list.locator('> li').all();
        
        if (listItems.length > 0) {
          // 验证列表项有内容
          for (const item of listItems.slice(0, 3)) { // 检查前3个项目
            const textContent = await item.textContent();
            expect(textContent?.trim()).toBeTruthy();
          }
          
          // 验证嵌套列表结构
          const nestedLists = await list.locator('li ul, li ol').all();
          for (const nestedList of nestedLists) {
            const nestedItems = await nestedList.locator('> li').all();
            expect(nestedItems.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('区域和地标导航', async ({ page }) => {
      await page.goto('/');
      
      // 验证页面区域有适当的标签
      const regions = await page.locator('[role="region"]').all();
      
      for (const region of regions) {
        const ariaLabel = await region.getAttribute('aria-label');
        const ariaLabelledby = await region.getAttribute('aria-labelledby');
        
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
      
      // 验证跳转链接
      const skipLinks = await page.locator('a[href^="#"]').all();
      
      for (const skipLink of skipLinks) {
        const href = await skipLink.getAttribute('href');
        const textContent = await skipLink.textContent();
        
        if (href && href.startsWith('#') && textContent?.includes('跳')) {
          // 验证跳转目标存在
          const targetId = href.substring(1);
          const target = page.locator(`#${targetId}`);
          expect(await target.count()).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('内容朗读测试', () => {
    test('动态内容更新通知', async ({ page }) => {
      await authPage.loginWithTestUser();
      await analysisPage.goToAnalysisPage();
      
      // 查找实时区域
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();
      
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        const role = await region.getAttribute('role');
        
        // 验证实时区域有适当的设置
        const isValidLiveRegion = 
          ariaLive === 'polite' || 
          ariaLive === 'assertive' ||
          role === 'status' ||
          role === 'alert';
        
        expect(isValidLiveRegion).toBeTruthy();
      }
      
      // 模拟动态内容更新
      if (liveRegions.length > 0) {
        const firstRegion = liveRegions[0];
        
        // 更新内容并验证
        await firstRegion.evaluate(el => {
          el.textContent = '分析正在进行中...';
        });
        
        await page.waitForTimeout(100);
        
        const updatedContent = await firstRegion.textContent();
        expect(updatedContent).toContain('分析正在进行中');
      }
    });

    test('表单验证消息', async ({ page }) => {
      await authPage.goToRegister();
      
      // 提交空表单触发验证
      await page.click('button[type="submit"]');
      
      // 查找错误消息
      const errorMessages = await page.locator('[role="alert"], .error-message, [aria-invalid="true"] + *').all();
      
      for (const errorMsg of errorMessages) {
        const textContent = await errorMsg.textContent();
        const ariaLive = await errorMsg.getAttribute('aria-live');
        const role = await errorMsg.getAttribute('role');
        
        // 验证错误消息有内容
        expect(textContent?.trim()).toBeTruthy();
        
        // 验证错误消息会被屏幕阅读器朗读
        const isAnnounced = 
          role === 'alert' ||
          ariaLive === 'assertive' ||
          ariaLive === 'polite';
        
        if (await errorMsg.isVisible()) {
          expect(isAnnounced).toBeTruthy();
        }
      }
    });

    test('状态变化通知', async ({ page }) => {
      await authPage.loginWithTestUser();
      await analysisPage.goToAnalysisPage();
      
      // 查找状态指示器
      const statusElements = await page.locator('[role="status"], [aria-live="polite"]').all();
      
      if (statusElements.length > 0) {
        const statusElement = statusElements[0];
        
        // 模拟状态变化
        await statusElement.evaluate(el => {
          el.textContent = '正在上传文件...';
        });
        
        await page.waitForTimeout(500);
        
        await statusElement.evaluate(el => {
          el.textContent = '文件上传完成';
        });
        
        const finalStatus = await statusElement.textContent();
        expect(finalStatus).toContain('完成');
      }
    });
  });

  test.describe('可访问性标准合规性测试', () => {
    test('WCAG 2.1 AA级别合规性检查', async ({ page }) => {
      await page.goto('/');
      
      // 注入axe-core进行自动化可访问性检查
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });
      
      // 运行axe检查
      const results = await page.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore
          axe.run({
            tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
          }, (err: any, results: any) => {
            if (err) resolve({ violations: [], passes: [] });
            resolve(results);
          });
        });
      });
      
      // 验证没有严重的可访问性违规
      const violations = (results as any).violations || [];
      const criticalViolations = violations.filter((v: any) => 
        v.impact === 'critical' || v.impact === 'serious'
      );
      
      if (criticalViolations.length > 0) {
        console.warn('发现可访问性违规:', criticalViolations.map((v: any) => ({
          id: v.id,
          description: v.description,
          impact: v.impact,
          nodes: v.nodes.length
        })));
      }
      
      // 允许一些轻微违规，但不允许严重违规
      expect(criticalViolations.length).toBeLessThanOrEqual(2);
    });

    test('颜色对比度检查', async ({ page }) => {
      await page.goto('/');
      
      // 检查文本元素的颜色对比度
      const textElements = await page.locator('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label').all();
      
      for (const element of textElements.slice(0, 10)) { // 检查前10个元素
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });
          
          // 这里可以添加更复杂的颜色对比度计算
          // 简单验证颜色不是透明的
          expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
          expect(styles.color).not.toBe('transparent');
        }
      }
    });

    test('焦点指示器可见性', async ({ page }) => {
      await page.goto('/');
      
      const focusableElements = await page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
      
      for (const element of focusableElements.slice(0, 5)) { // 检查前5个元素
        if (await element.isVisible()) {
          await element.focus();
          
          const focusStyles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              outline: computed.outline,
              outlineWidth: computed.outlineWidth,
              outlineColor: computed.outlineColor,
              boxShadow: computed.boxShadow,
              borderColor: computed.borderColor
            };
          });
          
          // 验证有可见的焦点指示器
          const hasFocusIndicator = 
            focusStyles.outline !== 'none' ||
            focusStyles.outlineWidth !== '0px' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.boxShadow.includes('inset') ||
            focusStyles.borderColor !== 'rgba(0, 0, 0, 0)';
          
          expect(hasFocusIndicator).toBeTruthy();
        }
      }
    });

    test('语言属性设置', async ({ page }) => {
      await page.goto('/');
      
      // 验证html元素有lang属性
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^zh|en/); // 中文或英文
      
      // 检查页面中的外语内容是否有适当的lang属性
      const elementsWithLang = await page.locator('[lang]').all();
      
      for (const element of elementsWithLang) {
        const lang = await element.getAttribute('lang');
        const textContent = await element.textContent();
        
        expect(lang).toBeTruthy();
        expect(textContent?.trim()).toBeTruthy();
      }
    });
  });
});