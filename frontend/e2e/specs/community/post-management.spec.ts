import { test, expect } from '@playwright/test';
import { CommunityPage } from '../../page-objects/community-page';
import { AuthPage } from '../../page-objects/auth-page';
import { TestDataManager } from '../../utils/test-data-manager';
import path from 'path';
import fs from 'fs';

/**
 * 社区帖子管理测试套件
 * 测试帖子发布、编辑、删除、富文本编辑器、图片上传、分类标签和搜索功能
 */
test.describe('社区帖子管理测试', () => {
  let communityPage: CommunityPage;
  let authPage: AuthPage;
  let dataManager: TestDataManager;
  let testUser: any;
  let testPet: any;

  test.beforeEach(async ({ page, request }) => {
    communityPage = new CommunityPage(page);
    authPage = new AuthPage(page);
    dataManager = new TestDataManager(request);
    await dataManager.init();

    // 创建测试用户和宠物
    testUser = await dataManager.createTestUser({
      username: 'community_user',
      email: 'community@test.com',
      password: 'TestPass123!'
    });

    testPet = await dataManager.createTestPet(testUser.id!, {
      name: 'CommunityPet',
      type: 'dog',
      breed: 'Labrador',
      age: 3,
      weight: 25.0
    });

    // 登录用户
    await authPage.login(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await dataManager.cleanup();
  });

  test.describe('帖子发布测试', () => {
    test('应该能够发布基本帖子', async () => {
      const postData = {
        title: '我家狗狗的健康分享',
        content: '今天带狗狗去体检，一切都很正常！分享一些心得...',
        category: 'health',
        tags: ['健康', '体检', '分享']
      };

      await communityPage.createPost(postData);

      // 验证帖子已发布
      const posts = await communityPage.getPostsList();
      const newPost = posts.find(p => p.title === postData.title);
      
      expect(newPost).toBeDefined();
      expect(newPost!.content).toContain(postData.content);
      expect(newPost!.category).toBe(postData.category);
      expect(newPost!.tags).toEqual(expect.arrayContaining(postData.tags));
    });

    test('应该能够保存草稿', async () => {
      const draftData = {
        title: '草稿帖子标题',
        content: '这是一个草稿内容...',
        isDraft: true
      };

      await communityPage.createPost(draftData);

      // 验证草稿已保存
      await communityPage.goToDrafts();
      const drafts = await communityPage.getDraftsList();
      const savedDraft = drafts.find(d => d.title === draftData.title);
      
      expect(savedDraft).toBeDefined();
      expect(savedDraft!.status).toBe('draft');
    });
  });
});  tes
t.describe('富文本编辑器测试', () => {
    test('应该支持基本文本格式化', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      await communityPage.waitForElement('[data-testid="post-form"]');

      // 输入标题
      await communityPage.safeFill('[data-testid="post-title-input"]', '富文本测试帖子');

      // 测试富文本格式化
      await communityPage.fillRichTextContent('这是一段测试文本');
      
      // 选中文本并应用格式
      await communityPage.page.locator('[data-testid="rich-text-editor"]').selectText();
      
      await communityPage.formatRichText({
        bold: true,
        italic: true,
        underline: true
      });

      // 验证格式化效果
      const editorContent = await communityPage.page.locator('[data-testid="rich-text-editor"]').innerHTML();
      expect(editorContent).toContain('<strong>');
      expect(editorContent).toContain('<em>');
      expect(editorContent).toContain('<u>');
    });

    test('应该支持插入链接', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      await communityPage.safeFill('[data-testid="post-title-input"]', '链接测试');
      await communityPage.fillRichTextContent('点击这里访问网站');
      
      // 选中文本并插入链接
      await communityPage.page.locator('[data-testid="rich-text-editor"]').selectText();
      await communityPage.formatRichText({
        addLink: {
          text: '点击这里访问网站',
          url: 'https://example.com'
        }
      });

      // 验证链接插入
      const editorContent = await communityPage.page.locator('[data-testid="rich-text-editor"]').innerHTML();
      expect(editorContent).toContain('<a href="https://example.com"');
    });

    test('应该支持插入列表和代码', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      await communityPage.safeFill('[data-testid="post-title-input"]', '列表和代码测试');
      
      // 插入列表
      await communityPage.formatRichText({ addList: true });
      await communityPage.fillRichTextContent('第一项\n第二项\n第三项');
      
      // 插入代码块
      await communityPage.formatRichText({ addCode: true });
      await communityPage.page.locator('[data-testid="rich-text-editor"]').type('console.log("Hello World");');

      // 验证列表和代码格式
      const editorContent = await communityPage.page.locator('[data-testid="rich-text-editor"]').innerHTML();
      expect(editorContent).toContain('<ul>');
      expect(editorContent).toContain('<code>');
    });

    test('应该支持插入表格', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      await communityPage.safeFill('[data-testid="post-title-input"]', '表格测试');
      
      // 插入表格
      await communityPage.formatRichText({ addTable: { rows: 3, cols: 3 } });
      
      // 填写表格内容
      await communityPage.page.locator('[data-testid="table-cell-0-0"]').fill('姓名');
      await communityPage.page.locator('[data-testid="table-cell-0-1"]').fill('年龄');
      await communityPage.page.locator('[data-testid="table-cell-0-2"]').fill('品种');
      
      // 验证表格插入
      const editorContent = await communityPage.page.locator('[data-testid="rich-text-editor"]').innerHTML();
      expect(editorContent).toContain('<table>');
      expect(editorContent).toContain('<tr>');
      expect(editorContent).toContain('<td>');
    });

    test('应该支持插入引用和分割线', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      await communityPage.safeFill('[data-testid="post-title-input"]', '引用和分割线测试');
      
      // 插入引用
      await communityPage.formatRichText({ addQuote: true });
      await communityPage.fillRichTextContent('这是一段引用内容');
      
      // 插入分割线
      await communityPage.formatRichText({ addDivider: true });
      
      // 验证引用和分割线
      const editorContent = await communityPage.page.locator('[data-testid="rich-text-editor"]').innerHTML();
      expect(editorContent).toContain('<blockquote>');
      expect(editorContent).toContain('<hr>');
    });
  });

  test.describe('图片上传测试', () => {
    test('应该支持单张图片上传', async () => {
      const testImagePath = await createTestImage('single-upload.jpg');

      try {
        const postData = {
          title: '图片分享帖子',
          content: '分享一张我家宠物的照片',
          images: [testImagePath]
        };

        await communityPage.createPost(postData);

        // 验证图片已上传
        const posts = await communityPage.getPostsList();
        const imagePost = posts.find(p => p.title === postData.title);
        expect(imagePost).toBeDefined();

        // 检查帖子是否包含图片
        const postCard = await communityPage.findPostCard(imagePost!.id);
        const images = postCard.locator('[data-testid="post-image"]');
        expect(await images.count()).toBe(1);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('应该支持多张图片上传', async () => {
      const testImages = [
        await createTestImage('multi-1.jpg'),
        await createTestImage('multi-2.jpg'),
        await createTestImage('multi-3.jpg')
      ];

      try {
        const postData = {
          title: '多图分享帖子',
          content: '分享多张宠物照片',
          images: testImages
        };

        await communityPage.createPost(postData);

        // 验证多张图片已上传
        const posts = await communityPage.getPostsList();
        const multiImagePost = posts.find(p => p.title === postData.title);
        expect(multiImagePost).toBeDefined();

        const postCard = await communityPage.findPostCard(multiImagePost!.id);
        const images = postCard.locator('[data-testid="post-image"]');
        expect(await images.count()).toBe(3);

      } finally {
        testImages.forEach(imagePath => {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    });

    test('应该验证图片格式和大小', async () => {
      // 测试不支持的格式
      const invalidImagePath = await createInvalidImage('invalid.txt');

      try {
        await communityPage.goToCommunityPage();
        await communityPage.page.click('[data-testid="create-post-button"]');
        
        // 尝试上传无效文件
        const fileInput = communityPage.page.locator('[data-testid="post-image-upload"]');
        await fileInput.setInputFiles(invalidImagePath);

        // 验证错误提示
        const errorMessage = await communityPage.getErrorMessage();
        expect(errorMessage).toContain('不支持的文件格式');

      } finally {
        if (fs.existsSync(invalidImagePath)) {
          fs.unlinkSync(invalidImagePath);
        }
      }
    });
  });

  test.describe('帖子编辑测试', () => {
    test('应该能够编辑已发布的帖子', async () => {
      // 先创建一个帖子
      const originalPost = {
        title: '原始帖子标题',
        content: '原始帖子内容',
        category: 'general',
        tags: ['原始标签']
      };

      await communityPage.createPost(originalPost);

      // 获取帖子ID
      const posts = await communityPage.getPostsList();
      const createdPost = posts.find(p => p.title === originalPost.title);
      expect(createdPost).toBeDefined();

      // 编辑帖子
      const updatedData = {
        title: '更新后的帖子标题',
        content: '更新后的帖子内容',
        category: 'health',
        tags: ['更新标签', '健康']
      };

      await communityPage.editPost(createdPost!.id, updatedData);

      // 验证编辑成功
      const updatedPosts = await communityPage.getPostsList();
      const editedPost = updatedPosts.find(p => p.id === createdPost!.id);
      
      expect(editedPost!.title).toBe(updatedData.title);
      expect(editedPost!.content).toContain(updatedData.content);
      expect(editedPost!.category).toBe(updatedData.category);
      expect(editedPost!.tags).toEqual(expect.arrayContaining(updatedData.tags));
    });

    test('应该能够编辑帖子的富文本内容', async () => {
      // 创建包含富文本的帖子
      const postData = {
        title: '富文本编辑测试',
        content: '原始内容'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const post = posts.find(p => p.title === postData.title);

      // 编辑帖子，添加富文本格式
      await communityPage.editPost(post!.id, {
        content: '更新后的内容，包含格式化文本'
      });

      // 在编辑模式下应用格式
      await communityPage.page.locator('[data-testid="rich-text-editor"]').selectText();
      await communityPage.formatRichText({
        bold: true,
        italic: true
      });

      // 保存编辑
      await communityPage.page.click('[data-testid="publish-post-button"]');
      await communityPage.waitForSuccessMessage('[data-testid="community-success"]');

      // 验证富文本格式保存成功
      const updatedPosts = await communityPage.getPostsList();
      const updatedPost = updatedPosts.find(p => p.id === post!.id);
      expect(updatedPost!.content).toContain('更新后的内容');
    });
  });

  test.describe('帖子删除测试', () => {
    test('应该能够删除自己的帖子', async () => {
      // 创建帖子
      const postData = {
        title: '待删除的帖子',
        content: '这个帖子将被删除'
      };

      await communityPage.createPost(postData);

      // 获取帖子ID
      const posts = await communityPage.getPostsList();
      const postToDelete = posts.find(p => p.title === postData.title);
      expect(postToDelete).toBeDefined();

      const originalPostCount = posts.length;

      // 删除帖子
      await communityPage.deletePost(postToDelete!.id);

      // 验证帖子已删除
      const remainingPosts = await communityPage.getPostsList();
      expect(remainingPosts.length).toBe(originalPostCount - 1);
      
      const deletedPost = remainingPosts.find(p => p.id === postToDelete!.id);
      expect(deletedPost).toBeUndefined();
    });

    test('应该显示删除确认对话框', async () => {
      const postData = {
        title: '确认删除测试帖子',
        content: '测试删除确认功能'
      };

      await communityPage.createPost(postData);

      const posts = await communityPage.getPostsList();
      const post = posts.find(p => p.title === postData.title);

      // 点击删除按钮
      const postCard = await communityPage.findPostCard(post!.id);
      await postCard.locator('[data-testid="delete-post-button"]').click();

      // 验证确认对话框出现
      await communityPage.waitForElement('[data-testid="delete-confirm-dialog"]');
      
      const confirmDialog = communityPage.page.locator('[data-testid="delete-confirm-dialog"]');
      expect(await confirmDialog.isVisible()).toBe(true);
      
      const confirmMessage = await confirmDialog.locator('[data-testid="confirm-message"]').textContent();
      expect(confirmMessage).toContain('确定要删除这篇帖子吗');

      // 取消删除
      await communityPage.page.click('[data-testid="cancel-delete-button"]');
      expect(await confirmDialog.isVisible()).toBe(false);

      // 验证帖子未被删除
      const postsAfterCancel = await communityPage.getPostsList();
      const stillExistingPost = postsAfterCancel.find(p => p.id === post!.id);
      expect(stillExistingPost).toBeDefined();
    });
  });
});

// 辅助函数
async function createTestImage(filename: string): Promise<string> {
  const testDir = path.join(__dirname, '../../fixtures/test-images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const imagePath = path.join(testDir, filename);
  const imageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(imagePath, imageData);
  
  return imagePath;
}

async function createInvalidImage(filename: string): Promise<string> {
  const testDir = path.join(__dirname, '../../fixtures/test-images');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, '这不是一个有效的图片文件');
  
  return filePath;
}  t
est.describe('帖子分类和标签测试', () => {
    test('应该能够按分类创建帖子', async () => {
      const categories = ['health', 'training', 'food', 'general'];
      
      for (const category of categories) {
        const postData = {
          title: `${category}分类测试帖子`,
          content: `这是一个${category}分类的帖子`,
          category: category
        };

        await communityPage.createPost(postData);
      }

      // 验证所有分类的帖子都已创建
      const posts = await communityPage.getPostsList();
      
      for (const category of categories) {
        const categoryPost = posts.find(p => p.category === category);
        expect(categoryPost).toBeDefined();
        expect(categoryPost!.title).toContain(`${category}分类测试帖子`);
      }
    });

    test('应该能够按分类筛选帖子', async () => {
      // 创建不同分类的帖子
      const testPosts = [
        { title: '健康帖子1', category: 'health' },
        { title: '健康帖子2', category: 'health' },
        { title: '训练帖子1', category: 'training' },
        { title: '食物帖子1', category: 'food' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost({
          title: postData.title,
          content: `${postData.category}相关内容`,
          category: postData.category
        });
      }

      // 按健康分类筛选
      await communityPage.filterByCategory('health');
      
      const healthPosts = await communityPage.getPostsList();
      expect(healthPosts.length).toBe(2);
      expect(healthPosts.every(p => p.category === 'health')).toBe(true);

      // 按训练分类筛选
      await communityPage.filterByCategory('training');
      
      const trainingPosts = await communityPage.getPostsList();
      expect(trainingPosts.length).toBe(1);
      expect(trainingPosts[0].category).toBe('training');
    });

    test('应该能够添加和管理标签', async () => {
      const postData = {
        title: '标签测试帖子',
        content: '测试标签功能',
        tags: ['健康', '营养', '护理', '经验分享']
      };

      await communityPage.createPost(postData);

      // 验证标签已添加
      const posts = await communityPage.getPostsList();
      const taggedPost = posts.find(p => p.title === postData.title);
      
      expect(taggedPost).toBeDefined();
      expect(taggedPost!.tags).toEqual(expect.arrayContaining(postData.tags));
      expect(taggedPost!.tags.length).toBe(4);
    });

    test('应该能够按标签筛选帖子', async () => {
      // 创建带不同标签的帖子
      const testPosts = [
        { title: '健康帖子A', tags: ['健康', '营养'] },
        { title: '健康帖子B', tags: ['健康', '运动'] },
        { title: '训练帖子A', tags: ['训练', '技巧'] },
        { title: '混合帖子', tags: ['健康', '训练', '营养'] }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost({
          title: postData.title,
          content: '标签筛选测试内容',
          tags: postData.tags
        });
      }

      // 按"健康"标签筛选
      await communityPage.filterByTag('健康');
      
      const healthTaggedPosts = await communityPage.getPostsList();
      expect(healthTaggedPosts.length).toBe(3); // 包含"健康"标签的帖子
      expect(healthTaggedPosts.every(p => p.tags.includes('健康'))).toBe(true);

      // 按"训练"标签筛选
      await communityPage.filterByTag('训练');
      
      const trainingTaggedPosts = await communityPage.getPostsList();
      expect(trainingTaggedPosts.length).toBe(2); // 包含"训练"标签的帖子
      expect(trainingTaggedPosts.every(p => p.tags.includes('训练'))).toBe(true);
    });

    test('应该限制标签数量和长度', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      await communityPage.safeFill('[data-testid="post-title-input"]', '标签限制测试');
      await communityPage.fillRichTextContent('测试标签限制功能');

      // 尝试添加过多标签
      const tooManyTags = Array.from({ length: 15 }, (_, i) => `标签${i + 1}`);
      
      for (const tag of tooManyTags) {
        await communityPage.safeFill('[data-testid="post-tags-input"]', tag);
        await communityPage.page.keyboard.press('Enter');
      }

      // 验证标签数量限制
      const addedTags = await communityPage.page.locator('[data-testid="selected-tag"]').count();
      expect(addedTags).toBeLessThanOrEqual(10); // 假设最多10个标签

      // 尝试添加过长的标签
      const longTag = 'a'.repeat(100);
      await communityPage.safeFill('[data-testid="post-tags-input"]', longTag);
      await communityPage.page.keyboard.press('Enter');

      // 验证长标签被拒绝或截断
      const errorMessage = await communityPage.getErrorMessage();
      expect(errorMessage).toContain('标签长度不能超过');
    });
  });

  test.describe('帖子搜索功能测试', () => {
    test('应该能够按标题搜索帖子', async () => {
      // 创建测试帖子
      const testPosts = [
        { title: '我家金毛的训练心得', content: '分享训练经验' },
        { title: '拉布拉多的健康饮食', content: '营养搭配建议' },
        { title: '小猫咪的日常护理', content: '护理技巧分享' },
        { title: '金毛犬的运动需求', content: '运动量建议' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      // 搜索包含"金毛"的帖子
      await communityPage.searchPosts('金毛');
      
      const searchResults = await communityPage.getPostsList();
      expect(searchResults.length).toBe(2);
      expect(searchResults.every(p => p.title.includes('金毛'))).toBe(true);
    });

    test('应该能够按内容搜索帖子', async () => {
      const testPosts = [
        { title: '宠物健康', content: '营养均衡很重要，要注意蛋白质摄入' },
        { title: '训练技巧', content: '耐心训练，奖励机制很有效' },
        { title: '日常护理', content: '定期洗澡，营养补充不能少' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      // 搜索包含"营养"的帖子
      await communityPage.searchPosts('营养');
      
      const nutritionResults = await communityPage.getPostsList();
      expect(nutritionResults.length).toBe(2);
      expect(nutritionResults.every(p => 
        p.title.includes('营养') || p.content.includes('营养')
      )).toBe(true);
    });

    test('应该支持模糊搜索', async () => {
      const testPosts = [
        { title: '狗狗健康指南', content: '全面的健康护理建议' },
        { title: '犬类营养搭配', content: '科学的饮食方案' },
        { title: '宠物狗训练', content: '基础训练方法' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      // 模糊搜索"狗"
      await communityPage.searchPosts('狗');
      
      const dogResults = await communityPage.getPostsList();
      expect(dogResults.length).toBe(2); // "狗狗"和"宠物狗"
      expect(dogResults.every(p => 
        p.title.includes('狗') || p.content.includes('狗')
      )).toBe(true);
    });

    test('应该能够组合搜索和筛选', async () => {
      const testPosts = [
        { title: '狗狗健康饮食', content: '营养搭配', category: 'health', tags: ['健康', '饮食'] },
        { title: '狗狗训练技巧', content: '基础训练', category: 'training', tags: ['训练', '技巧'] },
        { title: '猫咪健康护理', content: '日常护理', category: 'health', tags: ['健康', '护理'] },
        { title: '狗狗运动指南', content: '运动建议', category: 'health', tags: ['健康', '运动'] }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      // 搜索"狗狗"并筛选健康分类
      await communityPage.searchPosts('狗狗');
      await communityPage.filterByCategory('health');
      
      const combinedResults = await communityPage.getPostsList();
      expect(combinedResults.length).toBe(2); // "狗狗健康饮食"和"狗狗运动指南"
      expect(combinedResults.every(p => 
        p.title.includes('狗狗') && p.category === 'health'
      )).toBe(true);
    });

    test('应该显示搜索结果统计', async () => {
      const testPosts = [
        { title: '健康帖子1', content: '健康内容1' },
        { title: '健康帖子2', content: '健康内容2' },
        { title: '训练帖子1', content: '训练内容1' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      // 搜索"健康"
      await communityPage.searchPosts('健康');
      
      // 验证搜索结果统计
      const searchStats = await communityPage.getSearchStats();
      expect(searchStats.totalResults).toBe(2);
      expect(searchStats.searchTerm).toBe('健康');
      expect(searchStats.searchTime).toBeGreaterThan(0);
    });

    test('应该处理空搜索结果', async () => {
      // 搜索不存在的内容
      await communityPage.searchPosts('不存在的内容xyz123');
      
      // 验证空结果处理
      const emptyResults = await communityPage.getPostsList();
      expect(emptyResults.length).toBe(0);
      
      const emptyState = await communityPage.page.locator('[data-testid="empty-search-results"]');
      expect(await emptyState.isVisible()).toBe(true);
      
      const emptyMessage = await emptyState.textContent();
      expect(emptyMessage).toContain('没有找到相关帖子');
    });
  });

  test.describe('帖子模板功能测试', () => {
    test('应该能够使用预设模板创建帖子', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      // 选择健康分享模板
      await communityPage.page.click('[data-testid="template-selector"]');
      await communityPage.page.click('[data-testid="health-template"]');
      
      // 验证模板内容已填充
      const titleValue = await communityPage.page.inputValue('[data-testid="post-title-input"]');
      const contentValue = await communityPage.page.locator('[data-testid="rich-text-editor"]').textContent();
      
      expect(titleValue).toContain('健康分享');
      expect(contentValue).toContain('宠物基本信息');
      expect(contentValue).toContain('健康状况');
      expect(contentValue).toContain('注意事项');
    });

    test('应该能够保存自定义模板', async () => {
      await communityPage.goToCommunityPage();
      await communityPage.page.click('[data-testid="create-post-button"]');
      
      // 创建自定义内容
      await communityPage.safeFill('[data-testid="post-title-input"]', '我的自定义模板');
      await communityPage.fillRichTextContent('这是我的自定义模板内容\n包含多个段落');
      
      // 保存为模板
      await communityPage.page.click('[data-testid="save-template-button"]');
      await communityPage.waitForElement('[data-testid="template-dialog"]');
      await communityPage.safeFill('[data-testid="template-name-input"]', '自定义模板');
      await communityPage.safeFill('[data-testid="template-description-input"]', '我的个人模板');
      await communityPage.page.click('[data-testid="confirm-save-template"]');
      
      await communityPage.waitForSuccessMessage('[data-testid="community-success"]');
      
      // 验证模板已保存
      await communityPage.page.click('[data-testid="template-selector"]');
      const customTemplate = await communityPage.page.locator('[data-testid="custom-template"]');
      expect(await customTemplate.isVisible()).toBe(true);
    });
  });

  test.describe('批量操作测试', () => {
    test('应该能够批量删除帖子', async () => {
      // 创建多个测试帖子
      const testPosts = [
        { title: '批量删除测试1', content: '内容1' },
        { title: '批量删除测试2', content: '内容2' },
        { title: '批量删除测试3', content: '内容3' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      await communityPage.goToCommunityPage();
      
      // 进入批量选择模式
      await communityPage.page.click('[data-testid="batch-select-button"]');
      
      // 选择要删除的帖子
      const posts = await communityPage.getPostsList();
      const postsToDelete = posts.filter(p => p.title.includes('批量删除测试'));
      
      for (const post of postsToDelete) {
        await communityPage.page.click(`[data-testid="select-post-${post.id}"]`);
      }
      
      // 批量删除
      await communityPage.page.click('[data-testid="batch-delete-button"]');
      await communityPage.page.click('[data-testid="confirm-batch-delete"]');
      
      await communityPage.waitForSuccessMessage('[data-testid="community-success"]');
      
      // 验证帖子已删除
      const remainingPosts = await communityPage.getPostsList();
      const deletedPosts = remainingPosts.filter(p => p.title.includes('批量删除测试'));
      expect(deletedPosts.length).toBe(0);
    });

    test('应该能够批量修改帖子分类', async () => {
      // 创建测试帖子
      const testPosts = [
        { title: '批量分类测试1', content: '内容1', category: 'general' },
        { title: '批量分类测试2', content: '内容2', category: 'general' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      await communityPage.goToCommunityPage();
      
      // 进入批量选择模式
      await communityPage.page.click('[data-testid="batch-select-button"]');
      
      // 选择帖子
      const posts = await communityPage.getPostsList();
      const postsToUpdate = posts.filter(p => p.title.includes('批量分类测试'));
      
      for (const post of postsToUpdate) {
        await communityPage.page.click(`[data-testid="select-post-${post.id}"]`);
      }
      
      // 批量修改分类
      await communityPage.page.click('[data-testid="batch-category-button"]');
      await communityPage.page.selectOption('[data-testid="batch-category-select"]', 'health');
      await communityPage.page.click('[data-testid="confirm-batch-category"]');
      
      await communityPage.waitForSuccessMessage('[data-testid="community-success"]');
      
      // 验证分类已修改
      const updatedPosts = await communityPage.getPostsList();
      const healthPosts = updatedPosts.filter(p => 
        p.title.includes('批量分类测试') && p.category === 'health'
      );
      expect(healthPosts.length).toBe(2);
    });
  });

  test.describe('帖子排序功能测试', () => {
    test('应该能够按时间排序', async () => {
      // 创建不同时间的帖子
      const testPosts = [
        { title: '最新帖子', content: '最新内容' },
        { title: '较早帖子', content: '较早内容' },
        { title: '最早帖子', content: '最早内容' }
      ];

      for (let i = 0; i < testPosts.length; i++) {
        await communityPage.createPost(testPosts[i]);
        // 添加延迟确保时间差异
        await communityPage.page.waitForTimeout(1000);
      }

      // 按最新排序
      await communityPage.sortPosts('latest');
      
      const latestSorted = await communityPage.getPostsList();
      expect(latestSorted[0].title).toBe('最新帖子');
      expect(latestSorted[latestSorted.length - 1].title).toBe('最早帖子');
    });

    test('应该能够按热度排序', async () => {
      // 创建帖子并模拟不同的互动量
      const testPosts = [
        { title: '高热度帖子', content: '热门内容' },
        { title: '中等热度帖子', content: '普通内容' },
        { title: '低热度帖子', content: '冷门内容' }
      ];

      for (const postData of testPosts) {
        await communityPage.createPost(postData);
      }

      // 模拟不同的点赞和评论数
      const posts = await communityPage.getPostsList();
      
      // 给高热度帖子更多互动
      const highHeatPost = posts.find(p => p.title === '高热度帖子');
      if (highHeatPost) {
        // 模拟多次点赞和评论
        for (let i = 0; i < 5; i++) {
          await communityPage.likePost(highHeatPost.id);
          await communityPage.commentOnPost(highHeatPost.id, `评论${i + 1}`);
        }
      }

      // 按热度排序
      await communityPage.sortPosts('popular');
      
      const popularSorted = await communityPage.getPostsList();
      expect(popularSorted[0].title).toBe('高热度帖子');
      expect(popularSorted[0].likeCount).toBeGreaterThan(0);
      expect(popularSorted[0].commentCount).toBeGreaterThan(0);
    });
  });
});