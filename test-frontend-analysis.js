const puppeteer = require('puppeteer');

async function testFrontendAnalysis() {
  console.log('🧪 测试前端便便分析功能...\n');
  
  let browser;
  
  try {
    // 启动浏览器
    console.log('1. 启动浏览器...');
    browser = await puppeteer.launch({ 
      headless: false, // 显示浏览器界面
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    console.log('✓ 浏览器启动成功');
    
    // 访问前端应用
    console.log('\n2. 访问前端应用...');
    await page.goto('http://localhost:3002');
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✓ 前端应用加载成功');
    
    // 检查页面标题
    const title = await page.title();
    console.log('页面标题:', title);
    
    // 查找登录按钮或便便分析链接
    console.log('\n3. 查找导航元素...');
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 截图保存当前状态
    await page.screenshot({ path: 'frontend-homepage.png' });
    console.log('✓ 首页截图已保存: frontend-homepage.png');
    
    // 查找便便分析相关元素
    const analysisElements = await page.evaluate(() => {
      const elements = [];
      
      // 查找包含"分析"、"便便"等关键词的元素
      const allElements = document.querySelectorAll('*');
      for (let el of allElements) {
        const text = el.textContent || '';
        if (text.includes('分析') || text.includes('便便') || text.includes('健康')) {
          elements.push({
            tag: el.tagName,
            text: text.trim().substring(0, 50),
            className: el.className
          });
        }
      }
      
      return elements.slice(0, 10); // 只返回前10个
    });
    
    console.log('✓ 找到相关元素:', analysisElements.length, '个');
    analysisElements.forEach((el, index) => {
      console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
    });
    
    // 尝试查找并点击便便分析链接
    console.log('\n4. 尝试访问便便分析页面...');
    
    try {
      // 直接访问分析页面
      await page.goto('http://localhost:3002/analysis');
      await page.waitForSelector('body', { timeout: 5000 });
      
      // 截图分析页面
      await page.screenshot({ path: 'frontend-analysis-page.png' });
      console.log('✓ 便便分析页面截图已保存: frontend-analysis-page.png');
      
      // 检查页面内容
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          hasUploadArea: !!document.querySelector('[type="file"]') || 
                        !!document.querySelector('.dropzone') ||
                        document.body.textContent.includes('上传') ||
                        document.body.textContent.includes('拖拽'),
          hasAnalysisText: document.body.textContent.includes('分析') ||
                          document.body.textContent.includes('便便'),
          bodyText: document.body.textContent.substring(0, 200)
        };
      });
      
      console.log('✓ 分析页面内容检查:');
      console.log('  - 页面标题:', pageContent.title);
      console.log('  - 包含上传功能:', pageContent.hasUploadArea);
      console.log('  - 包含分析相关文本:', pageContent.hasAnalysisText);
      console.log('  - 页面文本预览:', pageContent.bodyText);
      
    } catch (error) {
      console.log('⚠️ 无法直接访问分析页面，可能需要登录');
      
      // 尝试查找登录相关元素
      await page.goto('http://localhost:3002');
      await page.waitForTimeout(1000);
      
      const loginElements = await page.evaluate(() => {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        for (let el of allElements) {
          const text = el.textContent || '';
          if (text.includes('登录') || text.includes('注册') || text.includes('Login')) {
            elements.push({
              tag: el.tagName,
              text: text.trim(),
              href: el.href || '',
              className: el.className
            });
          }
        }
        return elements;
      });
      
      console.log('找到登录相关元素:', loginElements.length, '个');
      loginElements.forEach((el, index) => {
        console.log(`  ${index + 1}. ${el.tag}: "${el.text}"`);
      });
    }
    
    console.log('\n🎉 前端便便分析功能测试完成！');
    
  } catch (error) {
    console.error('❌ 前端测试失败:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✓ 浏览器已关闭');
    }
  }
}

// 检查是否安装了puppeteer
try {
  require('puppeteer');
  testFrontendAnalysis().catch(console.error);
} catch (error) {
  console.log('⚠️ 未安装puppeteer，跳过前端自动化测试');
  console.log('可以手动访问 http://localhost:3002 查看前端功能');
  console.log('或运行: npm install puppeteer 安装测试依赖');
}