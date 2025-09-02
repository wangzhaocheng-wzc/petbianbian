import { test, expect, APIRequestContext } from '@playwright/test';
import { TestDataManager } from '../../utils/test-data-manager';

test.describe('API集成测试', () => {
  let apiContext: APIRequestContext;
  let testDataManager: TestDataManager;
  let authToken: string;
  let testUser: any;

  test.beforeAll(async ({ playwright }) => {
    // 创建API请求上下文
    apiContext = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:5000',
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });
    
    testDataManager = new TestDataManager();
  });

  test.beforeEach(async () => {
    // 清理测试数据
    await testDataManager.cleanup();
    
    // 创建测试用户并获取认证token
    testUser = await testDataManager.createTestUser();
    const loginResponse = await apiContext.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.token;
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('认证API端点测试', () => {
    test('POST /api/auth/register - 用户注册', async () => {
      const newUser = await testDataManager.createTestUser();
      
      const response = await apiContext.post('/api/auth/register', {
        data: {
          username: newUser.username,
          email: newUser.email,
          password: newUser.password
        }
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(newUser.email);
      expect(data.user.username).toBe(newUser.username);
    });

    test('POST /api/auth/login - 用户登录', async () => {
      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(testUser.email);
    });

    test('GET /api/auth/profile - 获取用户资料', async () => {
      const response = await apiContext.get('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.email).toBe(testUser.email);
      expect(data.username).toBe(testUser.username);
    });

    test('PUT /api/auth/profile - 更新用户资料', async () => {
      const updateData = {
        username: 'updated_username',
        bio: '更新的个人简介'
      };
      
      const response = await apiContext.put('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: updateData
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.username).toBe(updateData.username);
      expect(data.bio).toBe(updateData.bio);
    });
  });

  test.describe('宠物管理API端点测试', () => {
    test('POST /api/pets - 创建宠物', async () => {
      const petData = await testDataManager.createTestPet(testUser.id);
      
      const response = await apiContext.post('/api/pets', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: petData
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.name).toBe(petData.name);
      expect(data.type).toBe(petData.type);
      expect(data.breed).toBe(petData.breed);
      expect(data.ownerId).toBe(testUser.id);
    });

    test('GET /api/pets - 获取宠物列表', async () => {
      // 先创建几个宠物
      const pet1 = await testDataManager.createTestPet(testUser.id);
      const pet2 = await testDataManager.createTestPet(testUser.id);
      
      await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: pet1
      });
      
      await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: pet2
      });
      
      const response = await apiContext.get('/api/pets', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBe(2);
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('type');
    });

    test('GET /api/pets/:id - 获取单个宠物', async () => {
      const petData = await testDataManager.createTestPet(testUser.id);
      
      const createResponse = await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: petData
      });
      
      const createdPet = await createResponse.json();
      
      const response = await apiContext.get(`/api/pets/${createdPet.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(createdPet.id);
      expect(data.name).toBe(petData.name);
    });

    test('PUT /api/pets/:id - 更新宠物信息', async () => {
      const petData = await testDataManager.createTestPet(testUser.id);
      
      const createResponse = await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: petData
      });
      
      const createdPet = await createResponse.json();
      
      const updateData = {
        name: '更新的宠物名',
        weight: 5.5,
        notes: '更新的备注'
      };
      
      const response = await apiContext.put(`/api/pets/${createdPet.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: updateData
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.name).toBe(updateData.name);
      expect(data.weight).toBe(updateData.weight);
      expect(data.notes).toBe(updateData.notes);
    });

    test('DELETE /api/pets/:id - 删除宠物', async () => {
      const petData = await testDataManager.createTestPet(testUser.id);
      
      const createResponse = await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: petData
      });
      
      const createdPet = await createResponse.json();
      
      const response = await apiContext.delete(`/api/pets/${createdPet.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      
      // 验证宠物已被删除
      const getResponse = await apiContext.get(`/api/pets/${createdPet.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('分析API端点测试', () => {
    let testPet: any;

    test.beforeEach(async () => {
      const petData = await testDataManager.createTestPet(testUser.id);
      const createResponse = await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: petData
      });
      testPet = await createResponse.json();
    });

    test('POST /api/analysis/upload - 图片上传', async () => {
      const response = await apiContext.post('/api/analysis/upload', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        multipart: {
          image: {
            name: 'test-poop.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-data')
          },
          petId: testPet.id
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('imageUrl');
      expect(data).toHaveProperty('uploadId');
    });

    test('POST /api/analysis/analyze - 开始分析', async () => {
      // 先上传图片
      const uploadResponse = await apiContext.post('/api/analysis/upload', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        multipart: {
          image: {
            name: 'test-poop.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-data')
          },
          petId: testPet.id
        }
      });
      
      const uploadData = await uploadResponse.json();
      
      const response = await apiContext.post('/api/analysis/analyze', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          uploadId: uploadData.uploadId,
          petId: testPet.id
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('analysisId');
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('processing');
    });

    test('GET /api/analysis/:id/status - 获取分析状态', async () => {
      // 创建分析任务
      const uploadResponse = await apiContext.post('/api/analysis/upload', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        multipart: {
          image: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('data') },
          petId: testPet.id
        }
      });
      
      const uploadData = await uploadResponse.json();
      
      const analyzeResponse = await apiContext.post('/api/analysis/analyze', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: { uploadId: uploadData.uploadId, petId: testPet.id }
      });
      
      const analyzeData = await analyzeResponse.json();
      
      const response = await apiContext.get(`/api/analysis/${analyzeData.analysisId}/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(['processing', 'completed', 'failed']).toContain(data.status);
    });

    test('GET /api/analysis/:id/result - 获取分析结果', async () => {
      // 模拟完成的分析
      const mockAnalysisId = 'mock-analysis-id';
      
      const response = await apiContext.get(`/api/analysis/${mockAnalysisId}/result`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      // 根据实际API实现调整状态码
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('healthStatus');
        expect(data).toHaveProperty('recommendations');
        expect(data).toHaveProperty('confidence');
      } else {
        expect([404, 202]).toContain(response.status());
      }
    });
  });

  test.describe('记录管理API端点测试', () => {
    let testPet: any;

    test.beforeEach(async () => {
      const petData = await testDataManager.createTestPet(testUser.id);
      const createResponse = await apiContext.post('/api/pets', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: petData
      });
      testPet = await createResponse.json();
    });

    test('POST /api/records - 保存分析记录', async () => {
      const recordData = {
        petId: testPet.id,
        imageUrl: 'https://example.com/image.jpg',
        healthStatus: '健康',
        recommendations: ['保持当前饮食', '定期检查'],
        confidence: 0.95,
        notes: '测试记录'
      };
      
      const response = await apiContext.post('/api/records', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: recordData
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.petId).toBe(testPet.id);
      expect(data.healthStatus).toBe(recordData.healthStatus);
      expect(data.confidence).toBe(recordData.confidence);
    });

    test('GET /api/records - 获取记录列表', async () => {
      // 先创建几条记录
      const record1 = {
        petId: testPet.id,
        imageUrl: 'https://example.com/image1.jpg',
        healthStatus: '健康',
        recommendations: ['建议1'],
        confidence: 0.9
      };
      
      const record2 = {
        petId: testPet.id,
        imageUrl: 'https://example.com/image2.jpg',
        healthStatus: '警告',
        recommendations: ['建议2'],
        confidence: 0.8
      };
      
      await apiContext.post('/api/records', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: record1
      });
      
      await apiContext.post('/api/records', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: record2
      });
      
      const response = await apiContext.get('/api/records', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBe(2);
    });

    test('GET /api/records/:id - 获取单条记录', async () => {
      const recordData = {
        petId: testPet.id,
        imageUrl: 'https://example.com/image.jpg',
        healthStatus: '健康',
        recommendations: ['建议'],
        confidence: 0.9
      };
      
      const createResponse = await apiContext.post('/api/records', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: recordData
      });
      
      const createdRecord = await createResponse.json();
      
      const response = await apiContext.get(`/api/records/${createdRecord.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(createdRecord.id);
      expect(data.healthStatus).toBe(recordData.healthStatus);
    });
  });

  test.describe('API错误处理测试', () => {
    test('401 - 未授权访问', async () => {
      const response = await apiContext.get('/api/pets');
      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('未授权');
    });

    test('403 - 访问其他用户资源', async () => {
      // 创建另一个用户的宠物ID（模拟）
      const otherUserPetId = 'other-user-pet-id';
      
      const response = await apiContext.get(`/api/pets/${otherUserPetId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect([403, 404]).toContain(response.status());
    });

    test('404 - 资源不存在', async () => {
      const response = await apiContext.get('/api/pets/non-existent-id', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('400 - 无效请求数据', async () => {
      const response = await apiContext.post('/api/pets', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          // 缺少必需字段
          name: ''
        }
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('429 - 请求频率限制', async () => {
      // 快速发送多个请求测试频率限制
      const requests = Array(10).fill(null).map(() => 
        apiContext.get('/api/pets', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );
      
      const responses = await Promise.all(requests);
      
      // 检查是否有429响应
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      if (rateLimitedResponses.length > 0) {
        const data = await rateLimitedResponses[0].json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('请求过于频繁');
      }
    });
  });

  test.describe('API性能测试', () => {
    test('响应时间测试', async () => {
      const startTime = Date.now();
      
      const response = await apiContext.get('/api/pets', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(2000); // 响应时间应小于2秒
    });

    test('并发请求处理', async () => {
      const concurrentRequests = 5;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        apiContext.get('/api/pets', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
      
      // 并发处理时间应该合理
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000);
    });
  });

  test.describe('API版本兼容性测试', () => {
    test('API版本头测试', async () => {
      const response = await apiContext.get('/api/health', {
        headers: {
          'API-Version': '1.0'
        }
      });
      
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers).toHaveProperty('api-version');
    });

    test('向后兼容性测试', async () => {
      // 测试旧版本API格式
      const response = await apiContext.post('/api/auth/login', {
        headers: {
          'API-Version': '1.0'
        },
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('token');
    });
  });
});