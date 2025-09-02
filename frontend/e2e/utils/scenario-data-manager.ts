/**
 * 测试场景数据管理器
 * 管理复杂测试场景的数据创建、配置和清理
 */

import { testDataGenerator, UserTestData, PetTestData, AnalysisTestData, CommunityPostTestData } from './test-data-generator';
import * as fs from 'fs';
import * as path from 'path';

export interface TestScenario {
  name: string;
  description: string;
  setup: ScenarioSetup;
  data: ScenarioData;
  cleanup: ScenarioCleanup;
  config: ScenarioConfig;
}

export interface ScenarioSetup {
  prerequisites: string[];
  environment: 'development' | 'staging' | 'test';
  database: 'clean' | 'seeded' | 'existing';
  authentication: boolean;
}

export interface ScenarioData {
  users?: UserTestData[];
  pets?: PetTestData[];
  analyses?: AnalysisTestData[];
  posts?: CommunityPostTestData[];
  relationships?: DataRelationship[];
  customData?: Record<string, any>;
}

export interface ScenarioCleanup {
  deleteUsers: boolean;
  deletePets: boolean;
  deleteAnalyses: boolean;
  deletePosts: boolean;
  resetDatabase: boolean;
  customCleanup?: string[];
}

export interface ScenarioConfig {
  timeout: number;
  retries: number;
  parallel: boolean;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface DataRelationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: { entity: string; field: string };
  to: { entity: string; field: string };
}

export class ScenarioDataManager {
  private scenarios: Map<string, TestScenario> = new Map();
  private activeScenarios: Set<string> = new Set();
  private scenarioData: Map<string, ScenarioData> = new Map();

  constructor() {
    this.loadPredefinedScenarios();
  }

  /**
   * 创建测试场景
   */
  async createScenario(scenarioName: string, config?: Partial<TestScenario>): Promise<ScenarioData> {
    const scenario = this.getScenario(scenarioName);
    if (!scenario) {
      throw new Error(`未找到测试场景: ${scenarioName}`);
    }

    // 合并配置
    const mergedScenario = this.mergeScenarioConfig(scenario, config);
    
    // 执行前置条件检查
    await this.checkPrerequisites(mergedScenario.setup);
    
    // 生成场景数据
    const scenarioData = await this.generateScenarioData(mergedScenario);
    
    // 建立数据关系
    await this.establishDataRelationships(scenarioData, mergedScenario.data.relationships || []);
    
    // 保存场景数据
    this.scenarioData.set(scenarioName, scenarioData);
    this.activeScenarios.add(scenarioName);
    
    return scenarioData;
  }

  /**
   * 获取场景数据
   */
  getScenarioData(scenarioName: string): ScenarioData | undefined {
    return this.scenarioData.get(scenarioName);
  }

  /**
   * 清理场景数据
   */
  async cleanupScenario(scenarioName: string): Promise<void> {
    const scenario = this.getScenario(scenarioName);
    const scenarioData = this.scenarioData.get(scenarioName);
    
    if (!scenario || !scenarioData) {
      return;
    }

    const cleanup = scenario.cleanup;
    
    // 执行清理操作
    if (cleanup.deleteUsers && scenarioData.users) {
      await this.cleanupUsers(scenarioData.users);
    }
    
    if (cleanup.deletePets && scenarioData.pets) {
      await this.cleanupPets(scenarioData.pets);
    }
    
    if (cleanup.deleteAnalyses && scenarioData.analyses) {
      await this.cleanupAnalyses(scenarioData.analyses);
    }
    
    if (cleanup.deletePosts && scenarioData.posts) {
      await this.cleanupPosts(scenarioData.posts);
    }
    
    if (cleanup.resetDatabase) {
      await this.resetDatabase();
    }
    
    // 执行自定义清理
    if (cleanup.customCleanup) {
      await this.executeCustomCleanup(cleanup.customCleanup);
    }
    
    // 移除场景数据
    this.scenarioData.delete(scenarioName);
    this.activeScenarios.delete(scenarioName);
  }

  /**
   * 清理所有活跃场景
   */
  async cleanupAllScenarios(): Promise<void> {
    const activeScenarios = Array.from(this.activeScenarios);
    
    for (const scenarioName of activeScenarios) {
      await this.cleanupScenario(scenarioName);
    }
  }

  /**
   * 注册自定义场景
   */
  registerScenario(scenario: TestScenario): void {
    this.scenarios.set(scenario.name, scenario);
  }

  /**
   * 获取所有可用场景
   */
  getAvailableScenarios(): string[] {
    return Array.from(this.scenarios.keys());
  }

  /**
   * 导出场景数据到文件
   */
  async exportScenarioData(scenarioName: string, filePath?: string): Promise<string> {
    const scenarioData = this.scenarioData.get(scenarioName);
    if (!scenarioData) {
      throw new Error(`场景数据不存在: ${scenarioName}`);
    }

    const exportPath = filePath || path.join(
      process.cwd(), 
      'frontend/e2e/fixtures/generated', 
      `${scenarioName}-data.json`
    );

    const dir = path.dirname(exportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(exportPath, JSON.stringify(scenarioData, null, 2), 'utf-8');
    return exportPath;
  }

  /**
   * 从文件导入场景数据
   */
  async importScenarioData(scenarioName: string, filePath: string): Promise<ScenarioData> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`场景数据文件不存在: ${filePath}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const scenarioData = JSON.parse(content) as ScenarioData;
    
    this.scenarioData.set(scenarioName, scenarioData);
    this.activeScenarios.add(scenarioName);
    
    return scenarioData;
  }

  // 私有方法
  private loadPredefinedScenarios(): void {
    // 用户注册流程场景
    this.registerScenario({
      name: 'user-registration-flow',
      description: '完整的用户注册流程测试',
      setup: {
        prerequisites: ['clean-database'],
        environment: 'test',
        database: 'clean',
        authentication: false
      },
      data: {
        users: [],
        customData: {
          validEmails: ['test1@example.com', 'test2@example.com'],
          invalidEmails: ['invalid-email', 'test@'],
          existingEmail: 'existing@example.com'
        }
      },
      cleanup: {
        deleteUsers: true,
        deletePets: false,
        deleteAnalyses: false,
        deletePosts: false,
        resetDatabase: false
      },
      config: {
        timeout: 30000,
        retries: 2,
        parallel: false,
        tags: ['auth', 'registration'],
        priority: 'high'
      }
    });

    // 宠物管理场景
    this.registerScenario({
      name: 'pet-management-flow',
      description: '宠物管理完整流程测试',
      setup: {
        prerequisites: ['authenticated-user'],
        environment: 'test',
        database: 'seeded',
        authentication: true
      },
      data: {
        users: [],
        pets: [],
        relationships: [{
          type: 'one-to-many',
          from: { entity: 'users', field: 'id' },
          to: { entity: 'pets', field: 'ownerId' }
        }]
      },
      cleanup: {
        deleteUsers: true,
        deletePets: true,
        deleteAnalyses: false,
        deletePosts: false,
        resetDatabase: false
      },
      config: {
        timeout: 45000,
        retries: 3,
        parallel: true,
        tags: ['pets', 'crud'],
        priority: 'high'
      }
    });

    // 分析工作流场景
    this.registerScenario({
      name: 'analysis-workflow',
      description: '便便分析完整工作流程',
      setup: {
        prerequisites: ['authenticated-user', 'pet-exists'],
        environment: 'test',
        database: 'seeded',
        authentication: true
      },
      data: {
        users: [],
        pets: [],
        analyses: [],
        relationships: [
          {
            type: 'one-to-many',
            from: { entity: 'users', field: 'id' },
            to: { entity: 'pets', field: 'ownerId' }
          },
          {
            type: 'one-to-many',
            from: { entity: 'pets', field: 'id' },
            to: { entity: 'analyses', field: 'petId' }
          }
        ]
      },
      cleanup: {
        deleteUsers: true,
        deletePets: true,
        deleteAnalyses: true,
        deletePosts: false,
        resetDatabase: false
      },
      config: {
        timeout: 60000,
        retries: 2,
        parallel: false,
        tags: ['analysis', 'workflow'],
        priority: 'high'
      }
    });

    // 社区互动场景
    this.registerScenario({
      name: 'community-interaction',
      description: '社区功能互动测试',
      setup: {
        prerequisites: ['multiple-users'],
        environment: 'test',
        database: 'seeded',
        authentication: true
      },
      data: {
        users: [],
        posts: [],
        relationships: [{
          type: 'one-to-many',
          from: { entity: 'users', field: 'id' },
          to: { entity: 'posts', field: 'authorId' }
        }]
      },
      cleanup: {
        deleteUsers: true,
        deletePets: false,
        deleteAnalyses: false,
        deletePosts: true,
        resetDatabase: false
      },
      config: {
        timeout: 40000,
        retries: 2,
        parallel: true,
        tags: ['community', 'social'],
        priority: 'medium'
      }
    });
  }

  private getScenario(scenarioName: string): TestScenario | undefined {
    return this.scenarios.get(scenarioName);
  }

  private mergeScenarioConfig(scenario: TestScenario, config?: Partial<TestScenario>): TestScenario {
    if (!config) return scenario;
    
    return {
      ...scenario,
      ...config,
      setup: { ...scenario.setup, ...config.setup },
      data: { ...scenario.data, ...config.data },
      cleanup: { ...scenario.cleanup, ...config.cleanup },
      config: { ...scenario.config, ...config.config }
    };
  }

  private async checkPrerequisites(setup: ScenarioSetup): Promise<void> {
    for (const prerequisite of setup.prerequisites) {
      switch (prerequisite) {
        case 'clean-database':
          await this.ensureCleanDatabase();
          break;
        case 'authenticated-user':
          await this.ensureAuthenticatedUser();
          break;
        case 'pet-exists':
          await this.ensurePetExists();
          break;
        case 'multiple-users':
          await this.ensureMultipleUsers();
          break;
        default:
          console.warn(`未知的前置条件: ${prerequisite}`);
      }
    }
  }

  private async generateScenarioData(scenario: TestScenario): Promise<ScenarioData> {
    const data: ScenarioData = {};

    // 生成用户数据
    if (scenario.data.users !== undefined) {
      const userCount = Array.isArray(scenario.data.users) ? scenario.data.users.length : 3;
      data.users = testDataGenerator.generateUsers(userCount);
    }

    // 生成宠物数据
    if (scenario.data.pets !== undefined && data.users) {
      const petCount = Array.isArray(scenario.data.pets) ? scenario.data.pets.length : 5;
      data.pets = testDataGenerator.generatePets(petCount, data.users[0].id);
    }

    // 生成分析数据
    if (scenario.data.analyses !== undefined && data.pets) {
      data.analyses = data.pets.map(pet => 
        testDataGenerator.generateAnalysis(pet.id!)
      );
    }

    // 生成社区帖子数据
    if (scenario.data.posts !== undefined && data.users) {
      data.posts = data.users.flatMap(user =>
        Array.from({ length: 2 }, () => testDataGenerator.generateCommunityPost(user.id!))
      );
    }

    // 添加自定义数据
    if (scenario.data.customData) {
      data.customData = scenario.data.customData;
    }

    return data;
  }

  private async establishDataRelationships(
    scenarioData: ScenarioData, 
    relationships: DataRelationship[]
  ): Promise<void> {
    for (const relationship of relationships) {
      await this.establishRelationship(scenarioData, relationship);
    }
  }

  private async establishRelationship(
    scenarioData: ScenarioData, 
    relationship: DataRelationship
  ): Promise<void> {
    const fromEntity = scenarioData[relationship.from.entity as keyof ScenarioData] as any[];
    const toEntity = scenarioData[relationship.to.entity as keyof ScenarioData] as any[];

    if (!fromEntity || !toEntity) {
      return;
    }

    switch (relationship.type) {
      case 'one-to-many':
        toEntity.forEach((item, index) => {
          const parentIndex = index % fromEntity.length;
          item[relationship.to.field] = fromEntity[parentIndex][relationship.from.field];
        });
        break;
      case 'one-to-one':
        toEntity.forEach((item, index) => {
          if (fromEntity[index]) {
            item[relationship.to.field] = fromEntity[index][relationship.from.field];
          }
        });
        break;
      case 'many-to-many':
        // 实现多对多关系逻辑
        break;
    }
  }

  // 清理方法
  private async cleanupUsers(users: UserTestData[]): Promise<void> {
    // 实现用户清理逻辑
    console.log(`清理 ${users.length} 个测试用户`);
  }

  private async cleanupPets(pets: PetTestData[]): Promise<void> {
    // 实现宠物清理逻辑
    console.log(`清理 ${pets.length} 个测试宠物`);
  }

  private async cleanupAnalyses(analyses: AnalysisTestData[]): Promise<void> {
    // 实现分析记录清理逻辑
    console.log(`清理 ${analyses.length} 个测试分析记录`);
  }

  private async cleanupPosts(posts: CommunityPostTestData[]): Promise<void> {
    // 实现帖子清理逻辑
    console.log(`清理 ${posts.length} 个测试帖子`);
  }

  private async resetDatabase(): Promise<void> {
    // 实现数据库重置逻辑
    console.log('重置测试数据库');
  }

  private async executeCustomCleanup(cleanupTasks: string[]): Promise<void> {
    for (const task of cleanupTasks) {
      console.log(`执行自定义清理任务: ${task}`);
      // 实现自定义清理逻辑
    }
  }

  // 前置条件检查方法
  private async ensureCleanDatabase(): Promise<void> {
    console.log('确保数据库为空');
  }

  private async ensureAuthenticatedUser(): Promise<void> {
    console.log('确保存在已认证用户');
  }

  private async ensurePetExists(): Promise<void> {
    console.log('确保存在测试宠物');
  }

  private async ensureMultipleUsers(): Promise<void> {
    console.log('确保存在多个测试用户');
  }
}

// 导出单例实例
export const scenarioDataManager = new ScenarioDataManager();