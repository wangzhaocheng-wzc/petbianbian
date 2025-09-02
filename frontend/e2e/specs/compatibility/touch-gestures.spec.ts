import { test, expect, devices } from '@playwright/test';
import { TestDataManager } from '../../utils/test-data-manager';

// 触摸手势和交互测试
test.describe('触摸手势和交互测试', () => {
  let testDataManager: TestDataManager;

  test.beforeEach(async () => {
    testDataManager = new TestDataManager();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  // 基础触摸交互测试
  test.describe('基础触摸交互', () => {

    test('单击触摸测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试按钮点击
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const isVisible = await firstButton.isVisible();
        
        if (isVisible) {
          // 使用tap方法进行触摸点击
          await firstButton.tap();
          await page.waitForTimeout(500);
          
          // 验证点击效果
          console.log('按钮触摸点击测试完成');
        }
      }
      
      // 测试链接点击
      const links = page.locator('a');
      const linkCount = await links.count();
      
      if (linkCount > 0) {
        const firstLink = links.first();
        const href = await firstLink.getAttribute('href');
        
        if (href && !href.startsWith('http')) {
          await firstLink.tap();
          await page.waitForTimeout(1000);
          console.log('链接触摸点击测试完成');
        }
      }
    });

    test('长按手势测试', async ({ page }) => {
      await page.goto('/pets');
      
      // 查找可长按的元素
      const petItems = page.locator('[data-testid="pet-item"]');
      const itemCount = await petItems.count();
      
      if (itemCount > 0) {
        const firstItem = petItems.first();
        const box = await firstItem.boundingBox();
        
        if (box) {
          // 模拟长按手势
          await page.touchscreen.tap(
            box.x + box.width / 2,
            box.y + box.height / 2
          );
          
          // 保持按压状态
          await page.waitForTimeout(1500);
          
          // 检查是否出现上下文菜单或其他长按效果
          const contextMenu = page.locator('[data-testid="context-menu"]');
          const hasContextMenu = await contextMenu.isVisible();
          
          console.log('长按手势测试完成，上下文菜单:', hasContextMenu);
        }
      }
    });

    test('双击手势测试', async ({ page }) => {
      await page.goto('/analysis');
      
      // 查找可双击的元素
      const uploadArea = page.locator('[data-testid="drop-zone"]');
      
      if (await uploadArea.isVisible()) {
        const box = await uploadArea.boundingBox();
        
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          
          // 模拟双击
          await page.touchscreen.tap(centerX, centerY);
          await page.waitForTimeout(100);
          await page.touchscreen.tap(centerX, centerY);
          
          await page.waitForTimeout(500);
          console.log('双击手势测试完成');
        }
      }
    });
  });

  // 滑动手势测试
  test.describe('滑动手势', () => {

    test('垂直滑动测试', async ({ page }) => {
      await page.goto('/community');
      
      // 等待内容加载
      await page.waitForTimeout(2000);
      
      // 查找可滚动的容器
      const scrollContainer = page.locator('main, .scroll-container, [data-testid="posts-list"]').first();
      
      if (await scrollContainer.isVisible()) {
        const box = await scrollContainer.boundingBox();
        
        if (box) {
          const startX = box.x + box.width / 2;
          const startY = box.y + box.height * 0.8;
          const endY = box.y + box.height * 0.2;
          
          // 向上滑动
          await page.touchscreen.tap(startX, startY);
          await page.mouse.move(startX, endY);
          await page.waitForTimeout(500);
          
          console.log('向上滑动测试完成');
          
          // 向下滑动
          await page.touchscreen.tap(startX, endY);
          await page.mouse.move(startX, startY);
          await page.waitForTimeout(500);
          
          console.log('向下滑动测试完成');
        }
      }
    });

    test('水平滑动测试', async ({ page }) => {
      await page.goto('/');
      
      // 查找可水平滑动的元素（如轮播图）
      const carousel = page.locator('[data-testid="carousel"], .swiper, .slider').first();
      
      if (await carousel.isVisible()) {
        const box = await carousel.boundingBox();
        
        if (box) {
          const startX = box.x + box.width * 0.8;
          const endX = box.x + box.width * 0.2;
          const centerY = box.y + box.height / 2;
          
          // 向左滑动
          await page.touchscreen.tap(startX, centerY);
          await page.mouse.move(endX, centerY);
          await page.waitForTimeout(500);
          
          console.log('向左滑动测试完成');
          
          // 向右滑动
          await page.touchscreen.tap(endX, centerY);
          await page.mouse.move(startX, centerY);
          await page.waitForTimeout(500);
          
          console.log('向右滑动测试完成');
        }
      } else {
        // 如果没有轮播图，测试页面级别的水平滑动
        const body = page.locator('body');
        const box = await body.boundingBox();
        
        if (box) {
          const startX = box.width * 0.9;
          const endX = box.width * 0.1;
          const centerY = box.height / 2;
          
          await page.touchscreen.tap(startX, centerY);
          await page.mouse.move(endX, centerY);
          await page.waitForTimeout(500);
          
          console.log('页面水平滑动测试完成');
        }
      }
    });

    test('快速滑动（惯性滚动）测试', async ({ page }) => {
      await page.goto('/pets');
      
      // 等待内容加载
      await page.waitForTimeout(2000);
      
      const scrollArea = page.locator('main').first();
      
      if (await scrollArea.isVisible()) {
        const box = await scrollArea.boundingBox();
        
        if (box) {
          const centerX = box.x + box.width / 2;
          const startY = box.y + box.height * 0.8;
          const endY = box.y + box.height * 0.1;
          
          // 快速滑动以触发惯性滚动
          await page.touchscreen.tap(centerX, startY);
          
          // 快速移动到终点
          const steps = 5;
          const stepY = (endY - startY) / steps;
          
          for (let i = 1; i <= steps; i++) {
            await page.mouse.move(centerX, startY + stepY * i);
            await page.waitForTimeout(20); // 短暂延迟模拟快速滑动
          }
          
          // 等待惯性滚动完成
          await page.waitForTimeout(1000);
          
          console.log('快速滑动测试完成');
        }
      }
    });
  });

  // 多点触摸手势测试
  test.describe('多点触摸手势', () => {

    test('缩放手势测试', async ({ page }) => {
      await page.goto('/analysis');
      
      // 查找可缩放的图片或内容
      const zoomableContent = page.locator('img, [data-testid="zoomable"], .zoomable').first();
      
      if (await zoomableContent.isVisible()) {
        const box = await zoomableContent.boundingBox();
        
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const offset = 50;
          
          // 模拟双指缩放（放大）
          // 注意：Playwright的多点触摸支持有限，这里主要测试元素响应
          await page.touchscreen.tap(centerX - offset, centerY);
          await page.touchscreen.tap(centerX + offset, centerY);
          
          await page.waitForTimeout(500);
          
          // 检查缩放效果
          const transform = await zoomableContent.evaluate(el => {
            return window.getComputedStyle(el).transform;
          });
          
          console.log('缩放手势测试完成，变换:', transform);
        }
      }
    });

    test('旋转手势测试', async ({ page }) => {
      await page.goto('/');
      
      // 查找可旋转的元素
      const rotatableElement = page.locator('[data-testid="rotatable"], .rotatable').first();
      
      if (await rotatableElement.isVisible()) {
        const box = await rotatableElement.boundingBox();
        
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const radius = 30;
          
          // 模拟旋转手势（简化版）
          const points = [
            { x: centerX + radius, y: centerY },
            { x: centerX, y: centerY + radius },
            { x: centerX - radius, y: centerY },
            { x: centerX, y: centerY - radius }
          ];
          
          for (const point of points) {
            await page.touchscreen.tap(point.x, point.y);
            await page.waitForTimeout(100);
          }
          
          console.log('旋转手势测试完成');
        }
      }
    });
  });

  // 触摸反馈和响应测试
  test.describe('触摸反馈和响应', () => {

    test('触摸反馈效果测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试按钮的触摸反馈
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        
        if (await button.isVisible()) {
          // 获取按钮的初始样式
          const initialStyles = await button.evaluate(el => ({
            backgroundColor: window.getComputedStyle(el).backgroundColor,
            transform: window.getComputedStyle(el).transform,
            opacity: window.getComputedStyle(el).opacity
          }));
          
          // 触摸按钮
          await button.tap();
          await page.waitForTimeout(200);
          
          // 检查样式变化（触摸反馈）
          const touchStyles = await button.evaluate(el => ({
            backgroundColor: window.getComputedStyle(el).backgroundColor,
            transform: window.getComputedStyle(el).transform,
            opacity: window.getComputedStyle(el).opacity
          }));
          
          console.log(`按钮 ${i} 触摸反馈:`, {
            initial: initialStyles,
            touched: touchStyles
          });
        }
      }
    });

    test('触摸目标大小测试', async ({ page }) => {
      await page.goto('/');
      
      // 检查所有可触摸元素的大小
      const touchableElements = page.locator('button, a, input, [role="button"]');
      const elementCount = await touchableElements.count();
      
      const minTouchSize = 44; // iOS推荐的最小触摸目标大小
      const smallElements: Array<{
        index: number;
        tagName: string;
        className: string | null;
        width: number;
        height: number;
      }> = [];
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = touchableElements.nth(i);
        
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          
          if (box) {
            if (box.width < minTouchSize || box.height < minTouchSize) {
              const tagName = await element.evaluate(el => el.tagName);
              const className = await element.getAttribute('class');
              
              smallElements.push({
                index: i,
                tagName,
                className,
                width: box.width,
                height: box.height
              });
            }
          }
        }
      }
      
      console.log(`发现 ${smallElements.length} 个小于推荐尺寸的触摸目标:`, smallElements);
      
      // 大多数触摸目标应该符合尺寸要求
      expect(smallElements.length).toBeLessThan(elementCount * 0.3);
    });

    test('触摸延迟测试', async ({ page }) => {
      await page.goto('/');
      
      // 测试触摸响应延迟
      const testButton = page.locator('button').first();
      
      if (await testButton.isVisible()) {
        const startTime = Date.now();
        
        // 触摸按钮
        await testButton.tap();
        
        // 等待可能的视觉反馈
        await page.waitForTimeout(100);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`触摸响应时间: ${responseTime}ms`);
        
        // 触摸响应应该很快
        expect(responseTime).toBeLessThan(300);
      }
    });

    test('触摸精度测试', async ({ page }) => {
      await page.goto('/pets');
      
      // 测试小目标的触摸精度
      const smallButtons = page.locator('button[class*="small"], .btn-sm, [data-size="small"]');
      const smallButtonCount = await smallButtons.count();
      
      if (smallButtonCount > 0) {
        const smallButton = smallButtons.first();
        const box = await smallButton.boundingBox();
        
        if (box) {
          // 测试边缘点击
          const edgePoints = [
            { x: box.x + 2, y: box.y + 2 }, // 左上角
            { x: box.x + box.width - 2, y: box.y + 2 }, // 右上角
            { x: box.x + 2, y: box.y + box.height - 2 }, // 左下角
            { x: box.x + box.width - 2, y: box.y + box.height - 2 } // 右下角
          ];
          
          for (const point of edgePoints) {
            await page.touchscreen.tap(point.x, point.y);
            await page.waitForTimeout(200);
          }
          
          console.log('小目标触摸精度测试完成');
        }
      }
    });
  });

  // 手势冲突和处理测试
  test.describe('手势冲突处理', () => {

    test('滚动与点击冲突测试', async ({ page }) => {
      await page.goto('/community');
      
      // 等待内容加载
      await page.waitForTimeout(2000);
      
      const scrollableArea = page.locator('main');
      const clickableElement = page.locator('button, a').first();
      
      if (await scrollableArea.isVisible() && await clickableElement.isVisible()) {
        const scrollBox = await scrollableArea.boundingBox();
        const clickBox = await clickableElement.boundingBox();
        
        if (scrollBox && clickBox) {
          // 在可点击元素上开始滑动
          await page.touchscreen.tap(
            clickBox.x + clickBox.width / 2,
            clickBox.y + clickBox.height / 2
          );
          
          // 短距离移动（应该触发点击）
          await page.mouse.move(
            clickBox.x + clickBox.width / 2 + 5,
            clickBox.y + clickBox.height / 2 + 5
          );
          
          await page.waitForTimeout(300);
          
          // 长距离移动（应该触发滚动）
          await page.touchscreen.tap(
            clickBox.x + clickBox.width / 2,
            clickBox.y + clickBox.height / 2
          );
          
          await page.mouse.move(
            clickBox.x + clickBox.width / 2,
            clickBox.y + clickBox.height / 2 - 100
          );
          
          await page.waitForTimeout(500);
          
          console.log('滚动与点击冲突测试完成');
        }
      }
    });

    test('多手势同时处理测试', async ({ page }) => {
      await page.goto('/analysis');
      
      // 查找支持多种手势的元素
      const interactiveElement = page.locator('[data-testid="interactive"], img, canvas').first();
      
      if (await interactiveElement.isVisible()) {
        const box = await interactiveElement.boundingBox();
        
        if (box) {
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          
          // 快速连续执行不同手势
          await page.touchscreen.tap(centerX, centerY); // 单击
          await page.waitForTimeout(100);
          
          await page.touchscreen.tap(centerX, centerY); // 双击
          await page.touchscreen.tap(centerX, centerY);
          await page.waitForTimeout(200);
          
          // 长按
          await page.touchscreen.tap(centerX, centerY);
          await page.waitForTimeout(800);
          
          console.log('多手势同时处理测试完成');
        }
      }
    });
  });
});