import { Page, Locator } from '@playwright/test';

/**
 * 可访问性测试工具类
 * 提供常用的可访问性检查和辅助功能
 */
export class AccessibilityUtils {
  constructor(private page: Page) {}

  /**
   * 计算颜色对比度
   * @param color1 前景色 (RGB格式)
   * @param color2 背景色 (RGB格式)
   * @returns 对比度比值
   */
  static calculateContrastRatio(color1: string, color2: string): number {
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
  }

  /**
   * 检查元素的颜色对比度
   * @param element 要检查的元素
   * @returns 对比度信息
   */
  async checkColorContrast(element: Locator) {
    return await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      let bgColor = computed.backgroundColor;
      let parent = el.parentElement;
      
      // 向上查找非透明背景色
      while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
        const parentStyles = window.getComputedStyle(parent);
        bgColor = parentStyles.backgroundColor;
        parent = parent.parentElement;
      }
      
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        bgColor = 'rgb(255, 255, 255)'; // 默认白色背景
      }
      
      const fontSize = parseFloat(computed.fontSize);
      const fontWeight = computed.fontWeight;
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      
      return {
        color: computed.color,
        backgroundColor: bgColor,
        fontSize: fontSize,
        fontWeight: fontWeight,
        isLargeText: isLargeText
      };
    });
  }

  /**
   * 获取所有可聚焦元素
   * @returns 可聚焦元素列表
   */
  async getFocusableElements(): Promise<Locator[]> {
    const selector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return await this.page.locator(selector).all();
  }

  /**
   * 检查Tab键导航顺序
   * @returns 导航顺序信息
   */
  async checkTabOrder(): Promise<Array<{ element: string; tabIndex: number }>> {
    const focusableElements = await this.getFocusableElements();
    const tabOrder: Array<{ element: string; tabIndex: number }> = [];
    
    for (const element of focusableElements) {
      if (await element.isVisible()) {
        const info = await element.evaluate((el) => {
          const tabIndex = el.getAttribute('tabindex');
          const tagName = el.tagName.toLowerCase();
          const id = el.id;
          const className = el.className;
          
          return {
            element: `${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ').join('.') : ''}`,
            tabIndex: tabIndex ? parseInt(tabIndex) : 0
          };
        });
        
        tabOrder.push(info);
      }
    }
    
    return tabOrder.sort((a, b) => {
      if (a.tabIndex === 0 && b.tabIndex === 0) return 0;
      if (a.tabIndex === 0) return 1;
      if (b.tabIndex === 0) return -1;
      return a.tabIndex - b.tabIndex;
    });
  }

  /**
   * 检查ARIA标签
   * @param element 要检查的元素
   * @returns ARIA标签信息
   */
  async checkAriaLabels(element: Locator) {
    return await element.evaluate((el) => {
      return {
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
        ariaDescribedby: el.getAttribute('aria-describedby'),
        role: el.getAttribute('role'),
        ariaRequired: el.getAttribute('aria-required'),
        ariaInvalid: el.getAttribute('aria-invalid'),
        ariaExpanded: el.getAttribute('aria-expanded'),
        ariaHidden: el.getAttribute('aria-hidden')
      };
    });
  }

  /**
   * 检查表单字段的标签关联
   * @param input 表单输入元素
   * @returns 标签关联信息
   */
  async checkFormLabeling(input: Locator) {
    return await input.evaluate((el) => {
      const id = el.getAttribute('id');
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledby = el.getAttribute('aria-labelledby');
      
      let hasLabel = false;
      let labelText = '';
      
      // 检查显式标签
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          hasLabel = true;
          labelText = label.textContent?.trim() || '';
        }
      }
      
      // 检查包装标签
      const parentLabel = el.closest('label');
      if (parentLabel) {
        hasLabel = true;
        labelText = parentLabel.textContent?.trim() || '';
      }
      
      // 检查ARIA标签
      if (ariaLabel) {
        hasLabel = true;
        labelText = ariaLabel;
      }
      
      if (ariaLabelledby) {
        const labelElement = document.getElementById(ariaLabelledby);
        if (labelElement) {
          hasLabel = true;
          labelText = labelElement.textContent?.trim() || '';
        }
      }
      
      return {
        hasLabel,
        labelText,
        id,
        ariaLabel,
        ariaLabelledby
      };
    });
  }

  /**
   * 检查标题层次结构
   * @returns 标题层次信息
   */
  async checkHeadingStructure() {
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    const structure: Array<{ level: number; text: string; hasContent: boolean }> = [];
    
    for (const heading of headings) {
      if (await heading.isVisible()) {
        const info = await heading.evaluate((el) => {
          const level = parseInt(el.tagName.charAt(1));
          const text = el.textContent?.trim() || '';
          
          return {
            level,
            text,
            hasContent: text.length > 0
          };
        });
        
        structure.push(info);
      }
    }
    
    return structure;
  }

  /**
   * 检查地标元素
   * @returns 地标元素信息
   */
  async checkLandmarks() {
    const landmarks = [
      { role: 'banner', selector: 'header, [role="banner"]' },
      { role: 'navigation', selector: 'nav, [role="navigation"]' },
      { role: 'main', selector: 'main, [role="main"]' },
      { role: 'contentinfo', selector: 'footer, [role="contentinfo"]' },
      { role: 'complementary', selector: 'aside, [role="complementary"]' },
      { role: 'region', selector: '[role="region"]' }
    ];
    
    const foundLandmarks: Array<{ role: string; hasLabel: boolean; labelText: string }> = [];
    
    for (const landmark of landmarks) {
      const elements = await this.page.locator(landmark.selector).all();
      
      for (const element of elements) {
        if (await element.isVisible()) {
          const info = await element.evaluate((el) => {
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledby = el.getAttribute('aria-labelledby');
            let labelText = '';
            
            if (ariaLabel) {
              labelText = ariaLabel;
            } else if (ariaLabelledby) {
              const labelElement = document.getElementById(ariaLabelledby);
              labelText = labelElement?.textContent?.trim() || '';
            }
            
            return {
              hasLabel: !!(ariaLabel || ariaLabelledby),
              labelText
            };
          });
          
          foundLandmarks.push({
            role: landmark.role,
            hasLabel: info.hasLabel,
            labelText: info.labelText
          });
        }
      }
    }
    
    return foundLandmarks;
  }

  /**
   * 模拟键盘导航
   * @param steps Tab键次数
   * @returns 导航路径
   */
  async simulateKeyboardNavigation(steps: number = 10): Promise<string[]> {
    const navigationPath: string[] = [];
    
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
      
      const focused = await this.page.locator(':focus').first();
      if (await focused.count() > 0) {
        const elementInfo = await focused.evaluate((el) => {
          const tagName = el.tagName.toLowerCase();
          const id = el.id;
          const className = el.className;
          const textContent = el.textContent?.trim().substring(0, 20) || '';
          
          return `${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ').slice(0, 2).join('.') : ''} "${textContent}"`;
        });
        
        navigationPath.push(elementInfo);
      }
    }
    
    return navigationPath;
  }

  /**
   * 检查实时区域
   * @returns 实时区域信息
   */
  async checkLiveRegions() {
    const liveRegions = await this.page.locator('[aria-live], [role="status"], [role="alert"], [role="log"]').all();
    const regions: Array<{ type: string; politeness: string; hasContent: boolean }> = [];
    
    for (const region of liveRegions) {
      if (await region.isVisible()) {
        const info = await region.evaluate((el) => {
          const ariaLive = el.getAttribute('aria-live');
          const role = el.getAttribute('role');
          const textContent = el.textContent?.trim() || '';
          
          let type = 'live-region';
          let politeness = ariaLive || 'off';
          
          if (role === 'status') {
            type = 'status';
            politeness = 'polite';
          } else if (role === 'alert') {
            type = 'alert';
            politeness = 'assertive';
          } else if (role === 'log') {
            type = 'log';
            politeness = 'polite';
          }
          
          return {
            type,
            politeness,
            hasContent: textContent.length > 0
          };
        });
        
        regions.push(info);
      }
    }
    
    return regions;
  }

  /**
   * 应用色盲滤镜
   * @param type 色盲类型
   */
  async applyColorBlindnessFilter(type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none') {
    const filters = {
      protanopia: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><defs><filter id=\'protanopia\'><feColorMatrix values=\'0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0\'/></filter></defs></svg>#protanopia")',
      deuteranopia: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><defs><filter id=\'deuteranopia\'><feColorMatrix values=\'0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0\'/></filter></defs></svg>#deuteranopia")',
      tritanopia: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><defs><filter id=\'tritanopia\'><feColorMatrix values=\'0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0\'/></filter></defs></svg>#tritanopia")',
      none: 'none'
    };
    
    await this.page.evaluate((filter) => {
      document.body.style.filter = filter;
    }, filters[type]);
  }

  /**
   * 检查触摸目标大小
   * @param element 要检查的元素
   * @returns 尺寸信息
   */
  async checkTouchTargetSize(element: Locator) {
    return await element.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const minSize = 44; // WCAG推荐的最小触摸目标大小
      
      return {
        width: rect.width,
        height: rect.height,
        meetsMinimum: rect.width >= minSize && rect.height >= minSize,
        area: rect.width * rect.height
      };
    });
  }

  /**
   * 运行axe-core可访问性检查
   * @param options axe检查选项
   * @returns 检查结果
   */
  async runAxeCheck(options: any = {}) {
    // 注入axe-core
    await this.page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
    });
    
    // 运行axe检查
    return await this.page.evaluate((opts) => {
      return new Promise((resolve) => {
        // @ts-ignore
        if (typeof axe !== 'undefined') {
          // @ts-ignore
          axe.run(opts, (err: any, results: any) => {
            if (err) {
              resolve({ violations: [], passes: [], error: err.message });
            } else {
              resolve(results);
            }
          });
        } else {
          resolve({ violations: [], passes: [], error: 'axe-core not loaded' });
        }
      });
    }, options);
  }
}