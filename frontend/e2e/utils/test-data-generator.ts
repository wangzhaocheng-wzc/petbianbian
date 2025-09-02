/**
 * 测试数据生成工具
 * 提供随机测试数据生成、数据脱敏和模板管理功能
 */

import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

// 配置中文本地化
faker.locale = 'zh_CN';

export interface UserTestData {
  id?: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  createdAt?: Date;
}

export interface PetTestData {
  id?: string;
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  ownerId?: string;
  avatar?: string;
  description?: string;
}

export interface AnalysisTestData {
  id?: string;
  petId: string;
  imageUrl: string;
  result: {
    healthStatus: 'healthy' | 'warning' | 'concerning';
    score: number;
    description: string;
    recommendations: string[];
  };
  notes?: string;
  createdAt?: Date;
}

export interface CommunityPostTestData {
  id?: string;
  authorId: string;
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  likes?: number;
  comments?: number;
  createdAt?: Date;
}

export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private templates: Map<string, any> = new Map();
  private generatedData: Map<string, any[]> = new Map();

  private constructor() {
    this.loadTemplates();
  }

  public static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  /**
   * 生成随机用户数据
   */
  generateUser(overrides: Partial<UserTestData> = {}): UserTestData {
    const baseData: UserTestData = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'Test123!@#',
      phone: faker.phone.number('1##########'),
      avatar: faker.image.avatar(),
      createdAt: faker.date.recent(30)
    };

    return { ...baseData, ...overrides };
  }

  /**
   * 生成随机宠物数据
   */
  generatePet(overrides: Partial<PetTestData> = {}): PetTestData {
    const petTypes = ['dog', 'cat'] as const;
    const dogBreeds = ['金毛', '拉布拉多', '哈士奇', '边牧', '泰迪', '比熊'];
    const catBreeds = ['英短', '美短', '布偶', '暹罗', '波斯', '缅因'];
    
    const type = faker.helpers.arrayElement(petTypes);
    const breeds = type === 'dog' ? dogBreeds : catBreeds;
    
    const baseData: PetTestData = {
      name: faker.name.firstName(),
      type,
      breed: faker.helpers.arrayElement(breeds),
      age: faker.datatype.number({ min: 1, max: 15 }),
      weight: faker.datatype.number({ min: 1, max: 50, precision: 0.1 }),
      gender: faker.helpers.arrayElement(['male', 'female']),
      avatar: faker.image.animals(),
      description: faker.lorem.sentence()
    };

    return { ...baseData, ...overrides };
  }

  /**
   * 生成随机分析数据
   */
  generateAnalysis(petId: string, overrides: Partial<AnalysisTestData> = {}): AnalysisTestData {
    const healthStatuses = ['healthy', 'warning', 'concerning'] as const;
    const status = faker.helpers.arrayElement(healthStatuses);
    
    const recommendations = [
      '保持当前饮食习惯',
      '增加水分摄入',
      '适当增加运动量',
      '建议咨询兽医',
      '调整饮食结构'
    ];

    const baseData: AnalysisTestData = {
      petId,
      imageUrl: faker.image.animals(),
      result: {
        healthStatus: status,
        score: faker.datatype.number({ min: 0, max: 100 }),
        description: this.getHealthDescription(status),
        recommendations: faker.helpers.arrayElements(recommendations, 2)
      },
      notes: faker.lorem.paragraph(),
      createdAt: faker.date.recent(7)
    };

    return { ...baseData, ...overrides };
  }

  /**
   * 生成随机社区帖子数据
   */
  generateCommunityPost(authorId: string, overrides: Partial<CommunityPostTestData> = {}): CommunityPostTestData {
    const tags = ['健康', '饮食', '训练', '疾病', '日常', '分享', '求助'];
    
    const baseData: CommunityPostTestData = {
      authorId,
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      images: Array.from({ length: faker.datatype.number({ min: 0, max: 3 }) }, () => faker.image.animals()),
      tags: faker.helpers.arrayElements(tags, faker.datatype.number({ min: 1, max: 3 })),
      likes: faker.datatype.number({ min: 0, max: 100 }),
      comments: faker.datatype.number({ min: 0, max: 50 }),
      createdAt: faker.date.recent(30)
    };

    return { ...baseData, ...overrides };
  }

  /**
   * 批量生成用户数据
   */
  generateUsers(count: number, template?: string): UserTestData[] {
    const users: UserTestData[] = [];
    const templateData = template ? this.getTemplate(template) : {};

    for (let i = 0; i < count; i++) {
      users.push(this.generateUser(templateData));
    }

    this.generatedData.set('users', users);
    return users;
  }

  /**
   * 批量生成宠物数据
   */
  generatePets(count: number, ownerId?: string, template?: string): PetTestData[] {
    const pets: PetTestData[] = [];
    const templateData = template ? this.getTemplate(template) : {};

    for (let i = 0; i < count; i++) {
      const petData = this.generatePet({ ...templateData, ownerId });
      pets.push(petData);
    }

    this.generatedData.set('pets', pets);
    return pets;
  }

  /**
   * 数据脱敏处理
   */
  sanitizeData<T extends Record<string, any>>(data: T, sensitiveFields: string[] = []): T {
    const defaultSensitiveFields = ['password', 'email', 'phone', 'address'];
    const fieldsToSanitize = [...defaultSensitiveFields, ...sensitiveFields];
    
    const sanitized = { ...data };
    
    fieldsToSanitize.forEach(field => {
      if (sanitized[field]) {
        if (field === 'email') {
          sanitized[field] = this.maskEmail(sanitized[field]);
        } else if (field === 'phone') {
          sanitized[field] = this.maskPhone(sanitized[field]);
        } else {
          sanitized[field] = '***';
        }
      }
    });

    return sanitized;
  }

  /**
   * 真实数据转换为测试数据
   */
  convertRealDataToTest<T extends Record<string, any>>(
    realData: T[], 
    fieldMappings: Record<string, string> = {}
  ): T[] {
    return realData.map(item => {
      const testItem = { ...item };
      
      // 应用字段映射
      Object.entries(fieldMappings).forEach(([realField, testField]) => {
        if (testItem[realField] !== undefined) {
          testItem[testField] = testItem[realField];
          delete testItem[realField];
        }
      });

      // 脱敏处理
      return this.sanitizeData(testItem);
    });
  }

  /**
   * 创建测试场景数据
   */
  createScenarioData(scenarioName: string, config: any): any {
    const scenarios: Record<string, () => any> = {
      'user-registration': () => ({
        users: this.generateUsers(5),
        expectedErrors: ['邮箱已存在', '用户名已被使用']
      }),
      
      'pet-management': () => {
        const users = this.generateUsers(2);
        const pets = this.generatePets(10, users[0].id);
        return { users, pets };
      },
      
      'analysis-workflow': () => {
        const users = this.generateUsers(1);
        const pets = this.generatePets(3, users[0].id);
        const analyses = pets.map(pet => this.generateAnalysis(pet.id!));
        return { users, pets, analyses };
      },
      
      'community-interaction': () => {
        const users = this.generateUsers(5);
        const posts = users.flatMap(user => 
          Array.from({ length: faker.datatype.number({ min: 1, max: 3 }) }, () =>
            this.generateCommunityPost(user.id!)
          )
        );
        return { users, posts };
      }
    };

    const generator = scenarios[scenarioName];
    if (!generator) {
      throw new Error(`未知的测试场景: ${scenarioName}`);
    }

    const data = generator();
    this.generatedData.set(scenarioName, data);
    return data;
  }

  /**
   * 保存生成的数据到文件
   */
  async saveDataToFile(data: any, filename: string): Promise<void> {
    const filePath = path.join(process.cwd(), 'frontend/e2e/fixtures/generated', filename);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 从文件加载数据
   */
  async loadDataFromFile(filename: string): Promise<any> {
    const filePath = path.join(process.cwd(), 'frontend/e2e/fixtures/generated', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`数据文件不存在: ${filename}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 清理生成的数据
   */
  clearGeneratedData(): void {
    this.generatedData.clear();
  }

  /**
   * 获取已生成的数据
   */
  getGeneratedData(key: string): any[] {
    return this.generatedData.get(key) || [];
  }

  // 私有方法
  private loadTemplates(): void {
    const templatesPath = path.join(process.cwd(), 'frontend/e2e/fixtures/templates');
    
    if (!fs.existsSync(templatesPath)) {
      return;
    }

    const templateFiles = fs.readdirSync(templatesPath).filter(file => file.endsWith('.json'));
    
    templateFiles.forEach(file => {
      const templateName = path.basename(file, '.json');
      const templatePath = path.join(templatesPath, file);
      const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
      this.templates.set(templateName, templateData);
    });
  }

  private getTemplate(templateName: string): any {
    return this.templates.get(templateName) || {};
  }

  private getHealthDescription(status: 'healthy' | 'warning' | 'concerning'): string {
    const descriptions = {
      healthy: '便便形状正常，颜色健康，无异常气味',
      warning: '便便略有异常，建议观察几天',
      concerning: '便便异常，建议及时咨询兽医'
    };
    return descriptions[status];
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, 2) + '***' + username.substring(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }

  private maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}

// 导出单例实例
export const testDataGenerator = TestDataGenerator.getInstance();

// 便捷函数
export const generateTestUser = (overrides?: Partial<UserTestData>) => 
  testDataGenerator.generateUser(overrides);

export const generateTestPet = (overrides?: Partial<PetTestData>) => 
  testDataGenerator.generatePet(overrides);

export const generateTestAnalysis = (petId: string, overrides?: Partial<AnalysisTestData>) => 
  testDataGenerator.generateAnalysis(petId, overrides);

export const generateTestPost = (authorId: string, overrides?: Partial<CommunityPostTestData>) => 
  testDataGenerator.generateCommunityPost(authorId, overrides);