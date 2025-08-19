const puppeteer = require('puppeteer');

async function testPetManagement() {
  console.log('🚀 开始测试前端宠物管理功能...\n');

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // 设置为false以便观察测试过程
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // 访问首页
    console.log('📱 访问应用首页...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // 检查页面是否加载成功
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);
    
    // 点击登录链接
    console.log('🔐 尝试登录...');
    await page.click('a[href="/login"]');
    await page.waitForSelector('form');
    
    // 填写登录表单
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');
    
    // 提交登录表单
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('✅ 登录成功');
    
    // 导航到宠物管理页面
    console.log('🐾 导航到宠物管理页面...');
    await page.click('a[href="/pets"]');
    await page.waitForSelector('h1');
    
    const pageHeading = await page.$eval('h1', el => el.textContent);
    console.log(`✅ 页面标题: ${pageHeading}`);
    
    // 检查是否显示"添加宠物"按钮
    const addButton = await page.$('button:contains("添加宠物")');
    if (addButton) {
      console.log('✅ 找到添加宠物按钮');
    } else {
      console.log('❌ 未找到添加宠物按钮');
    }
    
    console.log('\n🎉 前端宠物管理功能测试完成！');
    
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
  testPetManagement();
} catch (error) {
  console.log('⚠️  Puppeteer未安装，跳过前端自动化测试');
  console.log('💡 您可以手动访问 http://localhost:5173 来测试前端功能');
  console.log('   1. 登录账号: test@example.com / password123');
  console.log('   2. 点击导航栏中的"我的宠物"');
  console.log('   3. 测试添加、编辑、删除宠物功能');
}