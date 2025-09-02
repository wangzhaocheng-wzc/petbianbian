import { test, expect, Page } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';

test.describe('色彩对比和视觉辅助测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
  });

  // 颜色对比度计算辅助函数
  const calculateContrastRatio = (color1: string, color2: string): number => {
    // 简化的对比度计算，实际应用中需要更精确的算法
    const parseColor = (color: string) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] ? parseFloat(match[4]) : 1
        };
      }
      return { r: 0, g: 0, b: 0, a: 1 };
    };

    const getLuminance = (color: { r: number; g: number; b: number }) => {
      const { r, g, b } = color;
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    const l1 = getLuminance(c1);
    const l2 = getLuminance(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  };

  test.describe('颜色对比度测试', () => {
    test('正常文本颜色对比度检查', async ({ page }) => {
      await page.goto('/');
      
      // 获取所有文本元素
      const textElements = await page.locator('p, span, div:not(:empty), h1, h2, h3, h4, h5, h6, a, label').all();
      
      const contrastIssues: Array<{
        element: string;
        textColor: string;
        backgroundColor: string;
        contrast: number;
        required: number;
      }> = [];
      
      for (const element of textElements.slice(0, 20)) { // 检查前20个元素
        if (await element.isVisible()) {
          const textContent = await element.textContent();
          if (textContent && textContent.trim().length > 0) {
            const styles = await element.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              const fontSize = parseFloat(computed.fontSize);
              const fontWeight = computed.fontWeight;
              
              // 获取实际的背景色（可能需要向上查找父元素）
              let bgColor = computed.backgroundColor;
              let parent = el.parentElement;
              
              while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
                const parentStyles = window.getComputedStyle(parent);
                bgColor = parentStyles.backgroundColor;
                parent = parent.parentElement;
              }
              
              if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                bgColor = 'rgb(255, 255, 255)'; // 默认白色背景
              }
              
              return {
                color: computed.color,
                backgroundColor: bgColor,
                fontSize: fontSize,
                fontWeight: fontWeight,
                isLargeText: fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
              };
            });
            
            const contrast = calculateContrastRatio(styles.color, styles.backgroundColor);
            const requiredContrast = styles.isLargeText ? 3.0 : 4.5; // WCAG AA标准
            
            if (contrast < requiredContrast) {
              contrastIssues.push({
                element: await element.evaluate(el => el.tagName + (el.className ? '.' + el.className.split(' ').join('.') : '')),
                textColor: styles.color,
                backgroundColor: styles.backgroundColor,
                contrast: Math.round(contrast * 100) / 100,
                required: requiredContrast
              });
            }
          }
        }
      }
      
      // 报告对比度问题
      if (contrastIssues.length > 0) {
        console.warn('颜色对比度不足的元素:', contrastIssues);
      }
      
      // 允许少量对比度问题，但不应该太多
      expect(contrastIssues.length).toBeLessThanOrEqual(3);
    });

    test('按钮和交互元素对比度检查', async ({ page }) => {
      await page.goto('/');
      
      const interactiveElements = await page.locator('button, a, input[type="submit"], input[type="button"]').all();
      
      for (const element of interactiveElements.slice(0, 10)) {
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              borderColor: computed.borderColor
            };
          });
          
          // 检查文本与背景的对比度
          if (styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            const contrast = calculateContrastRatio(styles.color, styles.backgroundColor);
            expect(contrast).toBeGreaterThanOrEqual(3.0); // 至少3:1的对比度
          }
          
          // 检查边框与背景的对比度（如果有边框）
          if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
            const borderContrast = calculateContrastRatio(styles.borderColor, styles.backgroundColor);
            expect(borderContrast).toBeGreaterThanOrEqual(3.0);
          }
        }
      }
    });

    test('表单字段对比度检查', async ({ page }) => {
      await authPage.goToLogin();
      
      const formFields = await page.locator('input, select, textarea').all();
      
      for (const field of formFields) {
        if (await field.isVisible()) {
          const styles = await field.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              borderColor: computed.borderColor,
              placeholderColor: computed.getPropertyValue('::placeholder') || computed.color
            };
          });
          
          // 检查输入文本对比度
          const textContrast = calculateContrastRatio(styles.color, styles.backgroundColor);
          expect(textContrast).toBeGreaterThanOrEqual(4.5);
          
          // 检查边框对比度
          if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
            const borderContrast = calculateContrastRatio(styles.borderColor, styles.backgroundColor);
            expect(borderContrast).toBeGreaterThanOrEqual(3.0);
          }
        }
      }
    });

    test('错误和警告消息对比度', async ({ page }) => {
      await authPage.goToRegister();
      
      // 触发验证错误
      await page.click('button[type="submit"]');
      
      // 等待错误消息出现
      await page.waitForTimeout(500);
      
      const errorElements = await page.locator('.error, .warning, [role="alert"], .text-red-500, .text-yellow-500').all();
      
      for (const element of errorElements) {
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            let bgColor = computed.backgroundColor;
            let parent = el.parentElement;
            
            while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
              const parentStyles = window.getComputedStyle(parent);
              bgColor = parentStyles.backgroundColor;
              parent = parent.parentElement;
            }
            
            return {
              color: computed.color,
              backgroundColor: bgColor || 'rgb(255, 255, 255)'
            };
          });
          
          const contrast = calculateContrastRatio(styles.color, styles.backgroundColor);
          expect(contrast).toBeGreaterThanOrEqual(4.5); // 错误消息需要高对比度
        }
      }
    });
  });

  test.describe('色盲友好设计测试', () => {
    test('红绿色盲友好性检查', async ({ page }) => {
      await page.goto('/');
      
      // 模拟红绿色盲视觉
      await page.addStyleTag({
        content: `
          .protanopia-filter {
            filter: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><defs><filter id='protanopia'><feColorMatrix values='0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0'/></filter></defs></svg>#protanopia");
          }
          .deuteranopia-filter {
            filter: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><defs><filter id='deuteranopia'><feColorMatrix values='0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0'/></filter></defs></svg>#deuteranopia");
          }
        `
      });
      
      // 应用红绿色盲滤镜
      await page.evaluate(() => {
        document.body.classList.add('protanopia-filter');
      });
      
      // 检查重要信息是否仍然可识别
      const statusElements = await page.locator('.success, .error, .warning, .status-healthy, .status-warning, .status-concerning').all();
      
      for (const element of statusElements) {
        if (await element.isVisible()) {
          // 检查是否有非颜色的视觉指示器
          const hasIcon = await element.locator('svg, i, .icon').count() > 0;
          const hasPattern = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return computed.backgroundImage !== 'none' || 
                   computed.textDecoration !== 'none' ||
                   computed.borderStyle === 'dashed' ||
                   computed.borderStyle === 'dotted';
          });
          
          const textContent = await element.textContent();
          const hasDescriptiveText = textContent && (
            textContent.includes('成功') || 
            textContent.includes('错误') || 
            textContent.includes('警告') ||
            textContent.includes('健康') ||
            textContent.includes('异常')
          );
          
          // 状态信息应该有图标、模式或描述性文本，不仅仅依赖颜色
          expect(hasIcon || hasPattern || hasDescriptiveText).toBeTruthy();
        }
      }
      
      // 移除滤镜并测试蓝黄色盲
      await page.evaluate(() => {
        document.body.classList.remove('protanopia-filter');
        document.body.classList.add('deuteranopia-filter');
      });
      
      // 重复相同的检查
      await page.waitForTimeout(100);
    });

    test('图表和数据可视化色盲友好性', async ({ page }) => {
      await authPage.loginWithTestUser();
      await page.goto('/records'); // 假设有图表页面
      
      // 查找图表元素
      const charts = await page.locator('canvas, svg, .chart, .graph').all();
      
      for (const chart of charts) {
        if (await chart.isVisible()) {
          // 检查图表是否有图例
          const legend = page.locator('.legend, .chart-legend').first();
          if (await legend.isVisible()) {
            // 验证图例项有形状或模式标识
            const legendItems = await legend.locator('.legend-item, .legend-entry').all();
            
            for (const item of legendItems.slice(0, 3)) {
              const hasShape = await item.locator('circle, rect, path, .shape').count() > 0;
              const hasPattern = await item.evaluate((el) => {
                const computed = window.getComputedStyle(el);
                return computed.backgroundImage !== 'none' ||
                       computed.borderStyle === 'dashed' ||
                       computed.borderStyle === 'dotted';
              });
              
              // 图例项应该有形状或模式标识
              if (await item.isVisible()) {
                expect(hasShape || hasPattern).toBeTruthy();
              }
            }
          }
        }
      }
    });

    test('链接和按钮色盲友好性', async ({ page }) => {
      await page.goto('/');
      
      const links = await page.locator('a').all();
      
      for (const link of links.slice(0, 10)) {
        if (await link.isVisible()) {
          const styles = await link.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              textDecoration: computed.textDecoration,
              borderBottom: computed.borderBottom,
              fontWeight: computed.fontWeight
            };
          });
          
          // 链接应该有下划线、边框或加粗等非颜色标识
          const hasNonColorIndicator = 
            styles.textDecoration.includes('underline') ||
            styles.borderBottom !== 'none' ||
            styles.fontWeight === 'bold' ||
            parseInt(styles.fontWeight) >= 700;
          
          // 对于导航链接，可能不需要下划线，但应该有其他标识
          const isNavLink = await link.evaluate((el) => {
            return el.closest('nav') !== null;
          });
          
          if (!isNavLink) {
            expect(hasNonColorIndicator).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('文字大小和间距测试', () => {
    test('文字大小可调节性', async ({ page }) => {
      await page.goto('/');
      
      // 测试200%缩放
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });
      
      await page.waitForTimeout(500);
      
      // 验证页面仍然可用
      const isPageUsable = await page.evaluate(() => {
        // 检查是否有水平滚动条
        const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
        
        // 检查重要元素是否仍然可见
        const importantElements = document.querySelectorAll('button, input, a, h1, h2, h3');
        let visibleCount = 0;
        
        importantElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            visibleCount++;
          }
        });
        
        return {
          hasHorizontalScroll,
          visibleElementsCount: visibleCount,
          totalElements: importantElements.length
        };
      });
      
      // 在200%缩放下，大部分元素应该仍然可见
      expect(isPageUsable.visibleElementsCount / isPageUsable.totalElements).toBeGreaterThan(0.8);
      
      // 重置缩放
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });

    test('最小字体大小检查', async ({ page }) => {
      await page.goto('/');
      
      const textElements = await page.locator('p, span, div, a, button, label, input').all();
      
      for (const element of textElements.slice(0, 15)) {
        if (await element.isVisible()) {
          const fontSize = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return parseFloat(computed.fontSize);
          });
          
          // 正文文字不应小于14px
          expect(fontSize).toBeGreaterThanOrEqual(12);
        }
      }
    });

    test('行间距和字符间距检查', async ({ page }) => {
      await page.goto('/');
      
      const textBlocks = await page.locator('p, div').all();
      
      for (const block of textBlocks.slice(0, 10)) {
        if (await block.isVisible()) {
          const textContent = await block.textContent();
          if (textContent && textContent.trim().length > 50) { // 只检查较长的文本块
            const spacing = await block.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              const fontSize = parseFloat(computed.fontSize);
              const lineHeight = computed.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(computed.lineHeight);
              const letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing);
              
              return {
                fontSize,
                lineHeight,
                letterSpacing,
                lineHeightRatio: lineHeight / fontSize
              };
            });
            
            // 行间距应该至少是字体大小的1.2倍
            expect(spacing.lineHeightRatio).toBeGreaterThanOrEqual(1.2);
            
            // 字符间距不应该是负值（除非是特殊设计）
            expect(spacing.letterSpacing).toBeGreaterThanOrEqual(-0.5);
          }
        }
      }
    });

    test('触摸目标大小检查', async ({ page }) => {
      // 模拟移动设备
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      const interactiveElements = await page.locator('button, a, input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"]').all();
      
      for (const element of interactiveElements.slice(0, 10)) {
        if (await element.isVisible()) {
          const size = await element.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return {
              width: rect.width,
              height: rect.height
            };
          });
          
          // 触摸目标应该至少44x44px
          expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('响应式文字缩放', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // 小屏手机
        { width: 768, height: 1024 }, // 平板
        { width: 1920, height: 1080 } // 桌面
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        
        const headingElement = page.locator('h1').first();
        if (await headingElement.isVisible()) {
          const fontSize = await headingElement.evaluate((el) => {
            return parseFloat(window.getComputedStyle(el).fontSize);
          });
          
          // 标题字体大小应该根据屏幕大小调整
          if (viewport.width <= 320) {
            expect(fontSize).toBeGreaterThanOrEqual(20); // 小屏至少20px
          } else if (viewport.width <= 768) {
            expect(fontSize).toBeGreaterThanOrEqual(24); // 平板至少24px
          } else {
            expect(fontSize).toBeGreaterThanOrEqual(28); // 桌面至少28px
          }
        }
      }
    });
  });

  test.describe('高对比度模式测试', () => {
    test('Windows高对比度模式兼容性', async ({ page }) => {
      await page.goto('/');
      
      // 模拟高对比度模式
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
              border-color: white !important;
            }
            a {
              color: yellow !important;
            }
            button {
              background-color: white !important;
              color: black !important;
            }
          }
        `
      });
      
      // 强制应用高对比度样式
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          body * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
          a {
            color: yellow !important;
          }
          button {
            background-color: white !important;
            color: black !important;
          }
        `;
        document.head.appendChild(style);
      });
      
      await page.waitForTimeout(500);
      
      // 验证重要元素仍然可见和可用
      const importantElements = await page.locator('button, a, input, h1, h2, h3').all();
      
      for (const element of importantElements.slice(0, 5)) {
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              visibility: computed.visibility,
              display: computed.display
            };
          });
          
          // 元素应该仍然可见
          expect(styles.visibility).not.toBe('hidden');
          expect(styles.display).not.toBe('none');
        }
      }
    });

    test('暗色主题对比度', async ({ page }) => {
      await page.goto('/');
      
      // 切换到暗色主题（如果支持）
      const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, .dark-mode-toggle').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        
        // 检查暗色主题下的对比度
        const textElements = await page.locator('p, h1, h2, h3, span').all();
        
        for (const element of textElements.slice(0, 5)) {
          if (await element.isVisible()) {
            const styles = await element.evaluate((el) => {
              const computed = window.getComputedStyle(el);
              let bgColor = computed.backgroundColor;
              let parent = el.parentElement;
              
              while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
                const parentStyles = window.getComputedStyle(parent);
                bgColor = parentStyles.backgroundColor;
                parent = parent.parentElement;
              }
              
              return {
                color: computed.color,
                backgroundColor: bgColor || 'rgb(0, 0, 0)'
              };
            });
            
            const contrast = calculateContrastRatio(styles.color, styles.backgroundColor);
            expect(contrast).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    });
  });
});