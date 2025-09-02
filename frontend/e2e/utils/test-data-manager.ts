import { APIRequestContext, request } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * 测试数据接口定义
 */
export interface TestUser {
  id?: string;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  createdAt?: Date;
}

export interface TestPet {
  id?: string;
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age: number;
  weight: number;
  gender?: 'male' | 'female';
  color?: string;
  avatar?: string;
  ownerId?: string;
}

export interface TestAnalysisRecord {
  id?: string;
  petId: string;
  imageUrl: string;
  result: AnalysisResult;
  notes: string;
  createdAt?: Date;
}

export interface AnalysisResult {
  healthStatus: 'healthy' | 'warning' | 'concerning';
  confidence: number;
  recommendations: string[];
  details?: {
    shape: string;
    color: string;
    consistency: string;
  };
}

export interface TestCommunityPost {
  id?: string;
  authorId: string;
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  createdAt?: Date;
}

/**
 * 测试数据模板
 */
export interface TestDataTemplate {
  users: Partial<TestUser>[];
  pets: Partial<TestPet>[];
  analysisRecords: Partial<TestAnalysisRecord>[];
  communityPosts: Partial<TestCommunityPost>[];
}

/**
 * 测试数据管理器
 * 负责创建、管理和清理测试数据
 */
export class TestDataManager {
  private apiContext: APIRequestContext;
  private baseURL: string;
  private createdUsers: string[] = [];
  private createdPets: string[] = [];
  private createdRecords: string[] = [];
  private createdPosts: string[] = [];
  private dataTemplates: Map<string, TestDataTemplate> = new Map();

  constructor(apiContext?: APIRequestContext) {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:5000/api';
    this.apiContext = apiContext!;
    this.initializeDataTemplates();
  }

  /**
   * 初始化数据模板
   */
  private initializeDataTemplates(): void {
    // 基础测试场景模板
    this.dataTemplates.set('basic', {
      users: [
        { username: 'testuser1', email: 'test1@example.com', password: 'TestPass123!' },
        { username: 'testuser2', email: 'test2@example.com', password: 'TestPass123!' }
      ],
      pets: [
        { name: 'Buddy', type: 'dog', breed: 'Golden Retriever', age: 3, weight: 25.5 },
        { name: 'Whiskers', type: 'cat', breed: 'Persian', age: 2, weight: 4.2 }
      ],
      analysisRecords: [],
      communityPosts: []
    });

    // 复杂测试场景模板
    this.dataTemplates.set('complex', {
      users: [
        { username: 'poweruser', email: 'power@example.com', password: 'PowerUser123!' },
        { username: 'newbie', email: 'newbie@example.com', password: 'Newbie123!' }
      ],
      pets: [
        { name: 'Max', type: 'dog', breed: 'German Shepherd', age: 5, weight: 35.0 },
        { name: 'Luna', type: 'cat', breed: 'Maine Coon', age: 4, weight: 6.8 },
        { name: 'Charlie', type: 'dog', breed: 'Bulldog', age: 2, weight: 22.3 }
      ],
      analysisRecords: [],
      communityPosts: []
    });

    // 性能测试场景模板
    this.dataTemplates.set('performance', {
      users: Array.from({ length: 10 }, (_, i) => ({
        username: `perfuser${i}`,
        email: `perf${i}@example.com`,
        password: 'PerfTest123!'
      })),
      pets: Array.from({ length: 50 }, (_, i) => ({
        name: `Pet${i}`,
        type: i % 2 === 0 ? 'dog' as const : 'cat' as const,
        breed: i % 2 === 0 ? 'Labrador' : 'Siamese',
        age: Math.floor(Math.random() * 15) + 1,
        weight: Math.round((Math.random() * 30 + 5) * 10) / 10
      })),
      analysisRecords: [],
      communityPosts: []
    });
  }

  /**
   * 初始化API上下文
   */
  async init(): Promise<void> {
    if (!this.apiContext) {
      this.apiContext = await request.newContext({
        baseURL: this.baseURL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  /**
   * 创建测试用户
   */
  async createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
    const timestamp = Date.now();
    const defaultUser: TestUser = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'TestPassword123!',
      ...userData
    };

    try {
      const response = await this.apiContext.post('/auth/register', {
        data: defaultUser
      });

      if (!response.ok()) {
        throw new Error(`Failed to create user: ${response.status()}`);
      }

      const result = await response.json();
      const user = { ...defaultUser, id: result.user?.id || result.id };
      
      if (user.id) {
        this.createdUsers.push(user.id);
      }

      return user;
    } catch (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
  }

  /**
   * 创建测试宠物
   */
  async createTestPet(ownerId: string, petData?: Partial<TestPet>): Promise<TestPet> {
    const timestamp = Date.now();
    const defaultPet: TestPet = {
      name: `TestPet_${timestamp}`,
      type: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      weight: 25.5,
      ownerId,
      ...petData
    };

    try {
      // 首先需要登录获取token
      const loginResponse = await this.loginUser(ownerId);
      const token = loginResponse.token;

      const response = await this.apiContext.post('/pets', {
        data: defaultPet,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok()) {
        throw new Error(`Failed to create pet: ${response.status()}`);
      }

      const result = await response.json();
      const pet = { ...defaultPet, id: result.id };
      
      if (pet.id) {
        this.createdPets.push(pet.id);
      }

      return pet;
    } catch (error) {
      console.error('Error creating test pet:', error);
      throw error;
    }
  }

  /**
   * 用户登录获取token
   */
  private async loginUser(userId: string): Promise<{ token: string; user: any }> {
    // 这里需要根据实际的登录逻辑来实现
    // 暂时返回模拟数据
    return {
      token: 'mock_token_' + userId,
      user: { id: userId }
    };
  }

  /**
   * 创建测试分析记录
   */
  async createTestAnalysisRecord(petId: string, recordData?: Partial<TestAnalysisRecord>): Promise<TestAnalysisRecord> {
    const timestamp = Date.now();
    const defaultRecord: TestAnalysisRecord = {
      petId,
      imageUrl: `/uploads/test_image_${timestamp}.jpg`,
      result: {
        healthStatus: 'healthy',
        confidence: 0.95,
        recommendations: ['继续保持良好的饮食习惯']
      },
      notes: `测试记录 ${timestamp}`,
      createdAt: new Date(),
      ...recordData
    };

    try {
      const response = await this.apiContext.post('/analysis/records', {
        data: defaultRecord
      });

      if (!response.ok()) {
        throw new Error(`Failed to create analysis record: ${response.status()}`);
      }

      const result = await response.json();
      const record = { ...defaultRecord, id: result.id };
      
      if (record.id) {
        this.createdRecords.push(record.id);
      }

      return record;
    } catch (error) {
      console.error('Error creating test analysis record:', error);
      throw error;
    }
  }

  /**
   * 生成随机测试用户数据
   */
  generateRandomUserData(): TestUser {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    
    return {
      username: faker.internet.userName() + '_' + randomNum,
      email: faker.internet.email(),
      password: 'TestPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar()
    };
  }

  /**
   * 生成随机宠物数据
   */
  generateRandomPetData(): Omit<TestPet, 'ownerId'> {
    const petNames = [
      'Buddy', 'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Luna', 'Rocky', 
      'Daisy', 'Bear', 'Molly', 'Tucker', 'Sadie', 'Jack', 'Chloe'
    ];
    const dogBreeds = [
      'Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 
      'Poodle', 'Beagle', 'Rottweiler', 'Yorkshire Terrier'
    ];
    const catBreeds = [
      'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 
      'Ragdoll', 'Bengal', 'Russian Blue', 'Scottish Fold'
    ];
    const colors = ['黑色', '白色', '棕色', '金色', '灰色', '花色', '橘色'];
    
    const type = Math.random() > 0.5 ? 'dog' : 'cat';
    const breeds = type === 'dog' ? dogBreeds : catBreeds;
    const weightRange = type === 'dog' ? { min: 5, max: 50 } : { min: 2, max: 8 };
    
    return {
      name: faker.helpers.arrayElement(petNames),
      type,
      breed: faker.helpers.arrayElement(breeds),
      age: faker.number.int({ min: 1, max: 15 }),
      weight: faker.number.float({ 
        min: weightRange.min, 
        max: weightRange.max, 
        fractionDigits: 1 
      }),
      gender: faker.helpers.arrayElement(['male', 'female']),
      color: faker.helpers.arrayElement(colors),
      avatar: faker.image.urlLoremFlickr({ category: type })
    };
  }

  /**
   * 生成随机分析记录数据
   */
  generateRandomAnalysisData(petId: string): TestAnalysisRecord {
    const healthStatuses: AnalysisResult['healthStatus'][] = ['healthy', 'warning', 'concerning'];
    const shapes = ['正常成型', '软便', '硬便', '水样', '颗粒状'];
    const colors = ['棕色', '黄色', '绿色', '黑色', '红色'];
    const consistencies = ['正常', '偏软', '偏硬', '水样', '粘稠'];
    
    const healthStatus = faker.helpers.arrayElement(healthStatuses);
    const confidence = faker.number.float({ min: 0.6, max: 0.99, fractionDigits: 2 });
    
    const recommendations = {
      healthy: ['继续保持良好的饮食习惯', '定期检查身体状况', '保持充足的运动'],
      warning: ['注意观察宠物状态', '适当调整饮食', '如持续异常请咨询兽医'],
      concerning: ['建议立即咨询兽医', '密切观察宠物状态', '可能需要进一步检查']
    };

    return {
      petId,
      imageUrl: `/uploads/test_analysis_${Date.now()}.jpg`,
      result: {
        healthStatus,
        confidence,
        recommendations: faker.helpers.arrayElements(recommendations[healthStatus], { min: 1, max: 3 }),
        details: {
          shape: faker.helpers.arrayElement(shapes),
          color: faker.helpers.arrayElement(colors),
          consistency: faker.helpers.arrayElement(consistencies)
        }
      },
      notes: faker.lorem.sentence(),
      createdAt: faker.date.recent({ days: 30 })
    };
  }

  /**
   * 生成随机社区帖子数据
   */
  generateRandomPostData(authorId: string): TestCommunityPost {
    const titles = [
      '我家狗狗今天的便便分析结果',
      '分享一些宠物健康小贴士',
      '新手养宠物需要注意什么？',
      '宠物饮食搭配经验分享',
      '关于宠物健康检查的重要性'
    ];
    
    const tags = ['健康', '饮食', '训练', '医疗', '日常护理', '经验分享'];
    
    return {
      authorId,
      title: faker.helpers.arrayElement(titles),
      content: faker.lorem.paragraphs(2),
      images: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => 
        faker.image.urlLoremFlickr({ category: 'animals' })
      ),
      tags: faker.helpers.arrayElements(tags, { min: 1, max: 3 }),
      createdAt: faker.date.recent({ days: 7 })
    };
  }

  /**
   * 批量创建测试用户
   */
  async createMultipleUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const userData = this.generateRandomUserData();
      const user = await this.createTestUser(userData);
      users.push(user);
    }
    
    return users;
  }

  /**
   * 批量创建测试宠物
   */
  async createMultiplePets(ownerId: string, count: number): Promise<TestPet[]> {
    const pets: TestPet[] = [];
    
    for (let i = 0; i < count; i++) {
      const petData = this.generateRandomPetData();
      const pet = await this.createTestPet(ownerId, petData);
      pets.push(pet);
    }
    
    return pets;
  }

  /**
   * 清理指定用户的数据
   */
  async cleanupUser(userId: string): Promise<void> {
    try {
      await this.apiContext.delete(`/users/${userId}`);
      this.createdUsers = this.createdUsers.filter(id => id !== userId);
    } catch (error) {
      console.error(`Error cleaning up user ${userId}:`, error);
    }
  }

  /**
   * 清理指定宠物的数据
   */
  async cleanupPet(petId: string): Promise<void> {
    try {
      await this.apiContext.delete(`/pets/${petId}`);
      this.createdPets = this.createdPets.filter(id => id !== petId);
    } catch (error) {
      console.error(`Error cleaning up pet ${petId}:`, error);
    }
  }

  /**
   * 清理指定分析记录
   */
  async cleanupAnalysisRecord(recordId: string): Promise<void> {
    try {
      await this.apiContext.delete(`/analysis/records/${recordId}`);
      this.createdRecords = this.createdRecords.filter(id => id !== recordId);
    } catch (error) {
      console.error(`Error cleaning up analysis record ${recordId}:`, error);
    }
  }

  /**
   * 清理社区帖子
   */
  async cleanupCommunityPost(postId: string): Promise<void> {
    try {
      await this.apiContext.delete(`/community/posts/${postId}`);
      this.createdPosts = this.createdPosts.filter(id => id !== postId);
    } catch (error) {
      console.error(`Error cleaning up community post ${postId}:`, error);
    }
  }

  /**
   * 清理所有创建的测试数据
   */
  async cleanup(): Promise<void> {
    console.log('开始清理测试数据...');
    
    const cleanupPromises: Promise<void>[] = [];
    
    // 并行清理所有数据类型
    cleanupPromises.push(
      ...this.createdPosts.map(postId => this.cleanupCommunityPost(postId)),
      ...this.createdRecords.map(recordId => this.cleanupAnalysisRecord(recordId)),
      ...this.createdPets.map(petId => this.cleanupPet(petId)),
      ...this.createdUsers.map(userId => this.cleanupUser(userId))
    );
    
    try {
      await Promise.allSettled(cleanupPromises);
      console.log('测试数据清理完成');
    } catch (error) {
      console.error('清理过程中出现错误:', error);
    }
  }

  /**
   * 强制清理所有测试数据（使用批量删除API）
   */
  async forceCleanup(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Force cleanup is only allowed in test environment');
    }
    
    try {
      await this.apiContext.post('/test/cleanup-all');
      
      // 清空本地跟踪的ID列表
      this.createdUsers = [];
      this.createdPets = [];
      this.createdRecords = [];
      this.createdPosts = [];
      
      console.log('强制清理完成');
    } catch (error) {
      console.error('Force cleanup failed:', error);
      throw error;
    }
  }

  /**
   * 根据模板创建测试数据
   */
  async createDataFromTemplate(templateName: string): Promise<{
    users: TestUser[];
    pets: TestPet[];
    records: TestAnalysisRecord[];
    posts: TestCommunityPost[];
  }> {
    const template = this.dataTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const createdUsers: TestUser[] = [];
    const createdPets: TestPet[] = [];
    const createdRecords: TestAnalysisRecord[] = [];
    const createdPosts: TestCommunityPost[] = [];

    // 创建用户
    for (const userData of template.users) {
      const user = await this.createTestUser(userData);
      createdUsers.push(user);
    }

    // 创建宠物
    for (let i = 0; i < template.pets.length; i++) {
      const petData = template.pets[i];
      const ownerId = createdUsers[i % createdUsers.length].id!;
      const pet = await this.createTestPet(ownerId, petData);
      createdPets.push(pet);
    }

    // 创建分析记录
    for (const recordData of template.analysisRecords) {
      const petId = createdPets[0]?.id;
      if (petId) {
        const record = await this.createTestAnalysisRecord(petId, recordData);
        createdRecords.push(record);
      }
    }

    // 创建社区帖子
    for (const postData of template.communityPosts) {
      const authorId = createdUsers[0]?.id;
      if (authorId) {
        const post = await this.createTestCommunityPost(authorId, postData);
        createdPosts.push(post);
      }
    }

    return { users: createdUsers, pets: createdPets, records: createdRecords, posts: createdPosts };
  }

  /**
   * 创建测试社区帖子
   */
  async createTestCommunityPost(authorId: string, postData?: Partial<TestCommunityPost>): Promise<TestCommunityPost> {
    const defaultPost = this.generateRandomPostData(authorId);
    const finalPost = { ...defaultPost, ...postData };

    try {
      const response = await this.apiContext.post('/community/posts', {
        data: finalPost
      });

      if (!response.ok()) {
        throw new Error(`Failed to create community post: ${response.status()}`);
      }

      const result = await response.json();
      const post = { ...finalPost, id: result.id };
      
      if (post.id) {
        this.createdPosts.push(post.id);
      }

      return post;
    } catch (error) {
      console.error('Error creating test community post:', error);
      throw error;
    }
  }

  /**
   * 添加自定义数据模板
   */
  addDataTemplate(name: string, template: TestDataTemplate): void {
    this.dataTemplates.set(name, template);
  }

  /**
   * 获取可用的数据模板列表
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.dataTemplates.keys());
  }

  /**
   * 重置数据库到初始状态（仅测试环境）
   */
  async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Database reset is only allowed in test environment');
    }
    
    try {
      await this.apiContext.post('/test/reset-database');
      
      // 清空本地跟踪的ID列表
      this.createdUsers = [];
      this.createdPets = [];
      this.createdRecords = [];
      this.createdPosts = [];
      
      console.log('数据库重置完成');
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  /**
   * 检查数据库连接状态
   */
  async checkDatabaseConnection(): Promise<boolean> {
    try {
      const response = await this.apiContext.get('/health');
      return response.ok();
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * 等待数据库就绪
   */
  async waitForDatabaseReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.checkDatabaseConnection()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Database not ready within timeout period');
  }

  /**
   * 获取创建的数据统计
   */
  getCreatedDataStats(): { 
    users: number; 
    pets: number; 
    records: number; 
    posts: number;
    total: number;
  } {
    return {
      users: this.createdUsers.length,
      pets: this.createdPets.length,
      records: this.createdRecords.length,
      posts: this.createdPosts.length,
      total: this.createdUsers.length + this.createdPets.length + 
             this.createdRecords.length + this.createdPosts.length
    };
  }

  /**
   * 导出创建的数据ID列表（用于调试）
   */
  exportCreatedDataIds(): {
    users: string[];
    pets: string[];
    records: string[];
    posts: string[];
  } {
    return {
      users: [...this.createdUsers],
      pets: [...this.createdPets],
      records: [...this.createdRecords],
      posts: [...this.createdPosts]
    };
  }

  /**
   * 验证数据完整性
   */
  async validateDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // 检查用户是否存在
      for (const userId of this.createdUsers) {
        const response = await this.apiContext.get(`/users/${userId}`);
        if (!response.ok()) {
          issues.push(`User ${userId} not found`);
        }
      }
      
      // 检查宠物是否存在
      for (const petId of this.createdPets) {
        const response = await this.apiContext.get(`/pets/${petId}`);
        if (!response.ok()) {
          issues.push(`Pet ${petId} not found`);
        }
      }
      
      // 检查分析记录是否存在
      for (const recordId of this.createdRecords) {
        const response = await this.apiContext.get(`/analysis/records/${recordId}`);
        if (!response.ok()) {
          issues.push(`Analysis record ${recordId} not found`);
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation error: ${error}`);
      return {
        valid: false,
        issues
      };
    }
  }

  /**
   * 销毁API上下文
   */
  async dispose(): Promise<void> {
    if (this.apiContext) {
      await this.apiContext.dispose();
    }
  }
}