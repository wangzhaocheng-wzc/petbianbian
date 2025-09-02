import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/auth-page';
import { PetsPage } from '../../page-objects/pets-page';
import { TestDataManager } from '../../utils/test-data-manager';

/**
 * 宠物权限管理测试套件
 * 测试宠物访问权限、共享功能和数据隐私保护
 */
test.describe('宠物权限管理测试', () => {
  let authPage: AuthPage;
  let petsPage: PetsPage;
  let dataManager: TestDataManager;
  let testUsers: any[] = [];
  let testPets: any[] = [];

  test.beforeEach(async ({ page, request }) => {
    authPage = new AuthPage(page);
    petsPage = new PetsPage(page);
    dataManager = new TestDataManager(request);
    await dataManager.init();
  });

  test.afterEach(async () => {
    // 清理测试数据
    await dataManager.cleanup();
  });

  test.describe('宠物访问权限测试', () => {
    test('用户只能查看自己的宠物', async () => {
      // 创建两个测试用户
      const user1 = await dataManager.createTestUser({
        username: 'petowner1',
        email: 'owner1@test.com',
        password: 'TestPass123!'
      });
      
      const user2 = await dataManager.createTestUser({
        username: 'petowner2', 
        email: 'owner2@test.com',
        password: 'TestPass123!'
      });

      // 用户1登录并创建宠物
      await authPage.login(user1.email, user1.password);
      await petsPage.addPet({
        name: 'User1Pet',
        type: 'dog',
        breed: 'Golden Retriever',
        age: 3,
        weight: 25.5
      });

      // 登出用户1
      await authPage.logout();

      // 用户2登录
      await authPage.login(user2.email, user2.password);
      
      // 用户2创建自己的宠物
      await petsPage.addPet({
        name: 'User2Pet',
        type: 'cat',
        breed: 'Persian',
        age: 2,
        weight: 4.2
      });

      // 验证用户2只能看到自己的宠物
      const petList = await petsPage.getPetList();
      expect(petList).toHaveLength(1);
      expect(petList[0].name).toBe('User2Pet');
      
      // 确认看不到用户1的宠物
      const petNames = petList.map(pet => pet.name);
      expect(petNames).not.toContain('User1Pet');
    });

    test('未登录用户无法访问宠物管理页面', async () => {
      // 直接访问宠物页面
      await petsPage.goToPetsPage();
      
      // 应该被重定向到登录页面
      await expect(petsPage.page).toHaveURL(/.*login/);
    });

    test('用户无法通过URL直接访问其他用户的宠物详情', async ({ request }) => {
      // 创建两个用户和宠物
      const user1 = await dataManager.createTestUser({
        username: 'owner1',
        email: 'owner1@test.com', 
        password: 'TestPass123!'
      });

      const user2 = await dataManager.createTestUser({
        username: 'owner2',
        email: 'owner2@test.com',
        password: 'TestPass123!'
      });

      // 用户1创建宠物
      await authPage.login(user1.email, user1.password);
      const pet1 = await dataManager.createTestPet(user1.id!, {
        name: 'PrivatePet',
        type: 'dog',
        breed: 'Labrador'
      });

      // 获取宠物ID
      const petId = pet1.id;
      await authPage.logout();

      // 用户2登录
      await authPage.login(user2.email, user2.password);

      // 尝试通过API访问用户1的宠物
      const response = await request.get(`/api/pets/${petId}`, {
        headers: {
          'Authorization': `Bearer ${await petsPage.page.evaluate(() => localStorage.getItem('token'))}`
        }
      });

      // 应该返回403或404错误
      expect([403, 404]).toContain(response.status());
    });
  });

  test.describe('宠物共享功能测试', () => {
    test('宠物主人可以分享宠物给其他用户', async () => {
      // 创建宠物主人和被分享用户
      const owner = await dataManager.createTestUser({
        username: 'petowner',
        email: 'owner@test.com',
        password: 'TestPass123!'
      });

      const sharedUser = await dataManager.createTestUser({
        username: 'shareduser',
        email: 'shared@test.com',
        password: 'TestPass123!'
      });

      // 主人登录并创建宠物
      await authPage.login(owner.email, owner.password);
      await petsPage.addPet({
        name: 'SharedPet',
        type: 'dog',
        breed: 'Beagle',
        age: 4,
        weight: 15.0
      });

      // 分享宠物给其他用户
      await petsPage.sharePetWithUser('SharedPet', sharedUser.email);
      
      // 验证分享成功消息
      const successMessage = await petsPage.getSuccessMessage();
      expect(successMessage).toContain('分享成功');

      // 登出主人
      await authPage.logout();

      // 被分享用户登录
      await authPage.login(sharedUser.email, sharedUser.password);

      // 验证可以看到共享的宠物
      const sharedPets = await petsPage.getSharedPetList();
      expect(sharedPets).toHaveLength(1);
      expect(sharedPets[0].name).toBe('SharedPet');
      expect(sharedPets[0].isShared).toBe(true);
    });

    test('被分享用户具有只读权限', async () => {
      // 创建主人和被分享用户
      const owner = await dataManager.createTestUser({
        username: 'owner',
        email: 'owner@test.com',
        password: 'TestPass123!'
      });

      const viewer = await dataManager.createTestUser({
        username: 'viewer',
        email: 'viewer@test.com', 
        password: 'TestPass123!'
      });

      // 主人创建并分享宠物
      await authPage.login(owner.email, owner.password);
      await petsPage.addPet({
        name: 'ReadOnlyPet',
        type: 'cat',
        breed: 'Siamese',
        age: 3,
        weight: 5.5
      });

      await petsPage.sharePetWithUser('ReadOnlyPet', viewer.email, 'read');
      await authPage.logout();

      // 被分享用户登录
      await authPage.login(viewer.email, viewer.password);

      // 查看共享宠物
      const petDetails = await petsPage.viewSharedPetDetails('ReadOnlyPet');
      expect(petDetails.name).toBe('ReadOnlyPet');

      // 验证无法编辑
      const canEdit = await petsPage.canEditSharedPet('ReadOnlyPet');
      expect(canEdit).toBe(false);

      // 验证无法删除
      const canDelete = await petsPage.canDeleteSharedPet('ReadOnlyPet');
      expect(canDelete).toBe(false);
    });

    test('主人可以撤销宠物分享权限', async () => {
      // 创建用户
      const owner = await dataManager.createTestUser({
        username: 'owner',
        email: 'owner@test.com',
        password: 'TestPass123!'
      });

      const sharedUser = await dataManager.createTestUser({
        username: 'shared',
        email: 'shared@test.com',
        password: 'TestPass123!'
      });

      // 主人创建并分享宠物
      await authPage.login(owner.email, owner.password);
      await petsPage.addPet({
        name: 'TempSharedPet',
        type: 'dog',
        breed: 'Poodle',
        age: 2,
        weight: 8.0
      });

      await petsPage.sharePetWithUser('TempSharedPet', sharedUser.email);
      
      // 撤销分享
      await petsPage.revokePetSharing('TempSharedPet', sharedUser.email);
      
      // 验证撤销成功
      const successMessage = await petsPage.getSuccessMessage();
      expect(successMessage).toContain('撤销成功');

      await authPage.logout();

      // 被撤销用户登录
      await authPage.login(sharedUser.email, sharedUser.password);

      // 验证无法再看到该宠物
      const sharedPets = await petsPage.getSharedPetList();
      const petNames = sharedPets.map(pet => pet.name);
      expect(petNames).not.toContain('TempSharedPet');
    });

    test('分享权限级别管理', async () => {
      // 创建用户
      const owner = await dataManager.createTestUser({
        username: 'owner',
        email: 'owner@test.com',
        password: 'TestPass123!'
      });

      const editor = await dataManager.createTestUser({
        username: 'editor',
        email: 'editor@test.com',
        password: 'TestPass123!'
      });

      const viewer = await dataManager.createTestUser({
        username: 'viewer', 
        email: 'viewer@test.com',
        password: 'TestPass123!'
      });

      // 主人创建宠物
      await authPage.login(owner.email, owner.password);
      await petsPage.addPet({
        name: 'MultiPermissionPet',
        type: 'dog',
        breed: 'Bulldog',
        age: 5,
        weight: 20.0
      });

      // 分享给编辑者（编辑权限）
      await petsPage.sharePetWithUser('MultiPermissionPet', editor.email, 'edit');
      
      // 分享给查看者（只读权限）
      await petsPage.sharePetWithUser('MultiPermissionPet', viewer.email, 'read');

      await authPage.logout();

      // 测试编辑者权限
      await authPage.login(editor.email, editor.password);
      
      const canEditAsEditor = await petsPage.canEditSharedPet('MultiPermissionPet');
      expect(canEditAsEditor).toBe(true);
      
      const canDeleteAsEditor = await petsPage.canDeleteSharedPet('MultiPermissionPet');
      expect(canDeleteAsEditor).toBe(false); // 编辑权限不包括删除

      await authPage.logout();

      // 测试查看者权限
      await authPage.login(viewer.email, viewer.password);
      
      const canEditAsViewer = await petsPage.canEditSharedPet('MultiPermissionPet');
      expect(canEditAsViewer).toBe(false);
      
      const canDeleteAsViewer = await petsPage.canDeleteSharedPet('MultiPermissionPet');
      expect(canDeleteAsViewer).toBe(false);
    });
  });

  test.describe('多用户宠物管理权限测试', () => {
    test('多个用户同时管理各自宠物', async () => {
      // 创建多个用户
      const users = await dataManager.createMultipleUsers(3);
      
      // 每个用户创建宠物
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        await authPage.login(user.email, user.password);
        
        await petsPage.addPet({
          name: `User${i}Pet`,
          type: i % 2 === 0 ? 'dog' : 'cat',
          breed: i % 2 === 0 ? 'Labrador' : 'Persian',
          age: i + 2,
          weight: i % 2 === 0 ? 20.0 : 5.0
        });
        
        // 验证只能看到自己的宠物
        const petList = await petsPage.getPetList();
        expect(petList).toHaveLength(1);
        expect(petList[0].name).toBe(`User${i}Pet`);
        
        await authPage.logout();
      }
    });

    test('用户删除宠物不影响其他用户', async () => {
      // 创建两个用户
      const user1 = await dataManager.createTestUser({
        username: 'user1',
        email: 'user1@test.com',
        password: 'TestPass123!'
      });

      const user2 = await dataManager.createTestUser({
        username: 'user2',
        email: 'user2@test.com', 
        password: 'TestPass123!'
      });

      // 用户1创建宠物
      await authPage.login(user1.email, user1.password);
      await petsPage.addPet({
        name: 'User1Pet',
        type: 'dog',
        breed: 'Retriever',
        age: 3,
        weight: 25.0
      });
      await authPage.logout();

      // 用户2创建宠物
      await authPage.login(user2.email, user2.password);
      await petsPage.addPet({
        name: 'User2Pet',
        type: 'cat',
        breed: 'Persian',
        age: 2,
        weight: 4.0
      });

      // 用户2删除自己的宠物
      await petsPage.deletePet('User2Pet');
      
      // 验证用户2没有宠物了
      const user2Pets = await petsPage.getPetList();
      expect(user2Pets).toHaveLength(0);

      await authPage.logout();

      // 用户1登录验证宠物仍然存在
      await authPage.login(user1.email, user1.password);
      const user1Pets = await petsPage.getPetList();
      expect(user1Pets).toHaveLength(1);
      expect(user1Pets[0].name).toBe('User1Pet');
    });

    test('并发用户操作不会产生数据冲突', async ({ browser }) => {
      // 创建多个浏览器上下文模拟并发用户
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);

      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
      
      // 为每个上下文创建用户和页面对象
      const userSessions = await Promise.all(
        pages.map(async (page, index) => {
          const user = await dataManager.createTestUser({
            username: `concurrent_user_${index}`,
            email: `concurrent${index}@test.com`,
            password: 'TestPass123!'
          });

          const authPageInstance = new AuthPage(page);
          const petsPageInstance = new PetsPage(page);
          
          await authPageInstance.login(user.email, user.password);
          
          return { user, authPage: authPageInstance, petsPage: petsPageInstance };
        })
      );

      // 并发创建宠物
      await Promise.all(
        userSessions.map(async (session, index) => {
          await session.petsPage.addPet({
            name: `ConcurrentPet${index}`,
            type: index % 2 === 0 ? 'dog' : 'cat',
            breed: 'TestBreed',
            age: index + 1,
            weight: 10.0 + index
          });
        })
      );

      // 验证每个用户只能看到自己的宠物
      for (let i = 0; i < userSessions.length; i++) {
        const session = userSessions[i];
        const pets = await session.petsPage.getPetList();
        
        expect(pets).toHaveLength(1);
        expect(pets[0].name).toBe(`ConcurrentPet${i}`);
      }

      // 清理上下文
      await Promise.all(contexts.map(ctx => ctx.close()));
    });
  });

  test.describe('宠物数据隐私保护测试', () => {
    test('宠物敏感信息访问控制', async () => {
      // 创建用户和宠物
      const owner = await dataManager.createTestUser({
        username: 'privacy_owner',
        email: 'privacy@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(owner.email, owner.password);
      
      // 创建包含敏感信息的宠物
      await petsPage.addPet({
        name: 'PrivacyPet',
        type: 'dog',
        breed: 'Sensitive Breed',
        age: 3,
        weight: 25.0,
        description: '包含敏感医疗信息的描述'
      });

      // 验证主人可以查看所有信息
      const petDetails = await petsPage.viewPetDetails('PrivacyPet');
      expect(petDetails.info).toContain('敏感医疗信息');

      await authPage.logout();

      // 创建另一个用户
      const otherUser = await dataManager.createTestUser({
        username: 'other_user',
        email: 'other@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(otherUser.email, otherUser.password);

      // 验证其他用户无法通过搜索找到私有宠物
      const searchResults = await petsPage.searchPets('PrivacyPet');
      expect(searchResults).toHaveLength(0);
    });

    test('宠物医疗记录隐私保护', async ({ request }) => {
      // 创建用户和宠物
      const owner = await dataManager.createTestUser({
        username: 'medical_owner',
        email: 'medical@test.com',
        password: 'TestPass123!'
      });

      const pet = await dataManager.createTestPet(owner.id!, {
        name: 'MedicalPet',
        type: 'dog',
        breed: 'Labrador'
      });

      // 创建医疗记录
      const medicalRecord = await dataManager.createTestAnalysisRecord(pet.id!, {
        result: {
          healthStatus: 'concerning',
          confidence: 0.85,
          recommendations: ['需要立即就医', '密切观察症状']
        },
        notes: '敏感医疗记录信息'
      });

      // 创建其他用户
      const otherUser = await dataManager.createTestUser({
        username: 'other_medical',
        email: 'othermedical@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(otherUser.email, otherUser.password);

      // 尝试访问其他用户的医疗记录
      const response = await request.get(`/api/analysis/records/${medicalRecord.id}`, {
        headers: {
          'Authorization': `Bearer ${await petsPage.page.evaluate(() => localStorage.getItem('token'))}`
        }
      });

      // 应该被拒绝访问
      expect([403, 404]).toContain(response.status());
    });

    test('宠物图片隐私保护', async () => {
      // 创建用户
      const owner = await dataManager.createTestUser({
        username: 'photo_owner',
        email: 'photo@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(owner.email, owner.password);

      // 上传宠物头像
      await petsPage.addPet({
        name: 'PhotoPet',
        type: 'cat',
        breed: 'Persian',
        age: 2,
        weight: 4.5,
        avatarPath: 'frontend/e2e/fixtures/test-pet-avatar.jpg'
      });

      // 获取头像URL
      const petDetails = await petsPage.viewPetDetails('PhotoPet');
      const avatarUrl = await petsPage.getPetAvatarUrl('PhotoPet');
      
      expect(avatarUrl).toBeTruthy();

      await authPage.logout();

      // 创建其他用户
      const otherUser = await dataManager.createTestUser({
        username: 'other_photo',
        email: 'otherphoto@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(otherUser.email, otherUser.password);

      // 尝试直接访问其他用户的宠物头像
      const response = await petsPage.page.goto(avatarUrl);
      
      // 应该被重定向或返回错误
      expect([403, 404, 302]).toContain(response?.status() || 404);
    });

    test('数据导出权限控制', async () => {
      // 创建用户和宠物数据
      const owner = await dataManager.createTestUser({
        username: 'export_owner',
        email: 'export@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(owner.email, owner.password);

      // 创建多个宠物和记录
      const pets = await dataManager.createMultiplePets(owner.id!, 3);
      
      for (const pet of pets) {
        await dataManager.createTestAnalysisRecord(pet.id!, {
          result: {
            healthStatus: 'healthy',
            confidence: 0.9,
            recommendations: ['继续保持']
          }
        });
      }

      // 主人可以导出自己的数据
      const canExport = await petsPage.canExportPetData();
      expect(canExport).toBe(true);

      const exportData = await petsPage.exportPetData();
      expect(exportData.pets).toHaveLength(3);
      expect(exportData.records).toHaveLength(3);

      await authPage.logout();

      // 其他用户无法导出
      const otherUser = await dataManager.createTestUser({
        username: 'other_export',
        email: 'otherexport@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(otherUser.email, otherUser.password);

      const otherCanExport = await petsPage.canExportPetData();
      expect(otherCanExport).toBe(true); // 可以导出，但只能导出自己的数据

      const otherExportData = await petsPage.exportPetData();
      expect(otherExportData.pets).toHaveLength(0); // 没有宠物数据
      expect(otherExportData.records).toHaveLength(0); // 没有记录数据
    });

    test('账户删除时的数据清理', async () => {
      // 创建用户和宠物
      const user = await dataManager.createTestUser({
        username: 'delete_user',
        email: 'delete@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(user.email, user.password);

      // 创建宠物和记录
      const pet = await dataManager.createTestPet(user.id!, {
        name: 'DeleteTestPet',
        type: 'dog',
        breed: 'Labrador'
      });

      const record = await dataManager.createTestAnalysisRecord(pet.id!, {
        notes: '将被删除的记录'
      });

      // 分享宠物给其他用户
      const sharedUser = await dataManager.createTestUser({
        username: 'shared_delete',
        email: 'shareddelete@test.com',
        password: 'TestPass123!'
      });

      await petsPage.sharePetWithUser('DeleteTestPet', sharedUser.email);
      await authPage.logout();

      // 验证被分享用户可以看到宠物
      await authPage.login(sharedUser.email, sharedUser.password);
      const sharedPets = await petsPage.getSharedPetList();
      expect(sharedPets).toHaveLength(1);
      await authPage.logout();

      // 删除原用户账户
      await authPage.login(user.email, user.password);
      await petsPage.deleteUserAccount();

      // 验证被分享用户无法再看到已删除用户的宠物
      await authPage.login(sharedUser.email, sharedUser.password);
      const remainingSharedPets = await petsPage.getSharedPetList();
      expect(remainingSharedPets).toHaveLength(0);
    });
  });

  test.describe('权限边界测试', () => {
    test('SQL注入攻击防护', async ({ request }) => {
      const user = await dataManager.createTestUser({
        username: 'security_user',
        email: 'security@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(user.email, user.password);

      // 尝试SQL注入攻击
      const maliciousQueries = [
        "'; DROP TABLE pets; --",
        "' OR '1'='1",
        "'; SELECT * FROM users; --",
        "' UNION SELECT * FROM pets WHERE owner_id != '" + user.id + "' --"
      ];

      for (const query of maliciousQueries) {
        const searchResults = await petsPage.searchPets(query);
        
        // 搜索应该返回空结果或正常结果，不应该暴露其他用户数据
        expect(searchResults.length).toBeLessThanOrEqual(0);
      }
    });

    test('XSS攻击防护', async () => {
      const user = await dataManager.createTestUser({
        username: 'xss_user',
        email: 'xss@test.com',
        password: 'TestPass123!'
      });

      await authPage.login(user.email, user.password);

      // 尝试XSS攻击
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">'
      ];

      for (const payload of xssPayloads) {
        await petsPage.addPet({
          name: payload,
          type: 'dog',
          breed: 'Test',
          age: 1,
          weight: 10.0,
          description: payload
        });

        // 验证内容被正确转义
        const petList = await petsPage.getPetList();
        const addedPet = petList.find(pet => pet.name.includes('script') || pet.name.includes('img'));
        
        if (addedPet) {
          // 检查页面是否执行了恶意脚本
          const hasAlert = await petsPage.page.evaluate(() => {
            return window.alert.toString().includes('[native code]');
          });
          expect(hasAlert).toBe(true); // alert应该是原生的，没有被重写
        }
      }
    });

    test('权限提升攻击防护', async ({ request }) => {
      // 创建普通用户
      const normalUser = await dataManager.createTestUser({
        username: 'normal_user',
        email: 'normal@test.com',
        password: 'TestPass123!'
      });

      // 创建管理员用户（如果有的话）
      const adminUser = await dataManager.createTestUser({
        username: 'admin_user',
        email: 'admin@test.com',
        password: 'TestPass123!',
        role: 'admin'
      });

      await authPage.login(normalUser.email, normalUser.password);

      // 尝试访问管理员功能
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/pets',
        '/api/admin/system',
        '/api/admin/reports'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${await petsPage.page.evaluate(() => localStorage.getItem('token'))}`
          }
        });

        // 普通用户应该被拒绝访问
        expect([401, 403]).toContain(response.status());
      }
    });

    test('会话劫持防护', async ({ browser }) => {
      const user = await dataManager.createTestUser({
        username: 'session_user',
        email: 'session@test.com',
        password: 'TestPass123!'
      });

      // 在第一个上下文中登录
      const context1 = await browser.newContext();
      const page1 = new AuthPage(await context1.newPage());
      await page1.login(user.email, user.password);

      // 获取会话token
      const token = await page1.page.evaluate(() => localStorage.getItem('token'));

      // 在第二个上下文中尝试使用相同token
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      await page2.evaluate((token) => {
        localStorage.setItem('token', token);
      }, token);

      // 尝试访问受保护资源
      await page2.goto('/pets');

      // 应该被重定向到登录页面或显示错误
      const isRedirectedToLogin = page2.url().includes('/login');
      const hasAuthError = await page2.locator('[data-testid="auth-error"]').isVisible();

      expect(isRedirectedToLogin || hasAuthError).toBe(true);

      await context1.close();
      await context2.close();
    });
  });
});