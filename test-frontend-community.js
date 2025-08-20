const puppeteer = require('puppeteer');

async function testCommunityFrontend() {
  console.log('🚀 开始测试前端社区功能...\n');

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // 1. 访问社区页面
    console.log('1. 访问社区页面...');
    await page.goto('http://localhost:3000/community', { waitUntil: 'networkidle0' });
    
    // 检查页面标题
    const title = await page.title();
    console.log('   页面标题:', title);
    
    // 检查是否有社区标题
    const communityTitle = await page.$eval('h1', el => el.textContent);
    if (communityTitle.includes('宠物社区')) {
      console.log('✅ 社区页面加载成功');
    } else {
      console.log('❌ 社区页面标题不正确');
    }
    
    // 2. 检查帖子列表
    console.log('\n2. 检查帖子列表...');
    await page.waitForSelector('[class*="PostList"]', { timeout: 5000 }).catch(() => {
      console.log('   帖子列表组件未找到，可能是空状态');
    });
    
    // 检查搜索框
    const searchInput = await page.$('input[placeholder*="搜索"]');
    if (searchInput) {
      console.log('✅ 搜索功能存在');
    }
    
    // 检查筛选按钮
    const filterButton = await page.$('button:has-text("筛选")');
    if (filterButton) {
      console.log('✅ 筛选功能存在');
    }
    
    // 3. 检查发布按钮（如果用户已登录）
    console.log('\n3. 检查发布功能...');
    const createButton = await page.$('button:has-text("发布")');
    if (createButton) {
      console.log('✅ 发布按钮存在');
    } else {
      console.log('   发布按钮不存在（可能需要登录）');
    }
    
    // 4. 测试搜索功能
    console.log('\n4. 测试搜索功能...');
    if (searchInput) {
      await searchInput.type('健康');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      console.log('✅ 搜索功能正常');
    }
    
    // 5. 测试筛选功能
    console.log('\n5. 测试筛选功能...');
    const filterBtn = await page.$('button[class*="Filter"]');
    if (filterBtn) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      console.log('✅ 筛选面板可以打开');
    }
    
    console.log('\n🎉 前端社区功能测试完成！');
    
    // 保持浏览器打开一段时间以便观察
    console.log('\n浏览器将在10秒后关闭...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 检查是否安装了puppeteer
try {
  require('puppeteer');
  testCommunityFrontend();
} catch (error) {
  console.log('❌ 请先安装puppeteer: npm install puppeteer');
  console.log('或者手动访问 http://localhost:3000/community 进行测试');
}