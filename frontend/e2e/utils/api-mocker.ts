import { Page, Route } from '@playwright/test';

/**
 * API响应模拟数据接口
 */
export interface MockResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
  delay?: number;
  failureRate?: number; // 失败率 0-1
  variableDelay?: { min: number; max: number }; // 可变延迟
}

/**
 * 网络条件模拟选项
 */
export interface NetworkConditions {
  offline?: boolean;
  downloadThroughput?: number;
  uploadThroughput?: number;
  latency?: number;
  packetLoss?: number; // 丢包率 0-1
  jitter?: number; // 网络抖动
}

/**
 * API调用统计信息
 */
export interface APICallStats {
  url: string;
  method: string;
  callCount: number;
  lastCalled: Date;
  averageResponseTime: number;
  errors: number;
}

/**
 * 错误类型枚举
 */
export enum NetworkErrorType {
  CONNECTION_REFUSED = 'connectionrefused',
  TIMEOUT = 'timedout',
  DNS_ERROR = 'namenotresolved',
  NETWORK_ERROR = 'failed',
  ABORTED = 'aborted'
}

/**
 * API模拟器
 * 用于模拟API响应、网络错误和各种网络条件
 */
export class APIMocker {
  private page: Page;
  private mockedRoutes: Map<string, MockResponse> = new Map();
  private callStats: Map<string, APICallStats> = new Map();
  private globalNetworkConditions: NetworkConditions | null = null;
  private interceptedRequests: any[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupRequestInterception();
  }

  /**
   * 设置请求拦截
   */
  private setupRequestInterception(): void {
    // 记录所有请求用于统计
    this.page.on('request', (request) => {
      this.interceptedRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date(),
        headers: request.headers(),
        postData: request.postData()
      });
    });
  }

  /**
   * 模拟API响应（增强版）
   */
  async mockAPIResponse(urlPattern: string | RegExp, response: MockResponse): Promise<void> {
    const routeKey = typeof urlPattern === 'string' ? urlPattern : urlPattern.source;
    this.mockedRoutes.set(routeKey, response);

    await this.page.route(urlPattern, async (route: Route) => {
      const startTime = Date.now();
      const request = route.request();
      
      // 更新调用统计
      this.updateCallStats(request.url(), request.method(), startTime);

      const { 
        status = 200, 
        body, 
        headers = {}, 
        delay = 0, 
        failureRate = 0,
        variableDelay 
      } = response;

      // 模拟失败率
      if (failureRate > 0 && Math.random() < failureRate) {
        await route.abort('failed');
        return;
      }

      // 计算延迟时间
      let actualDelay = delay;
      if (variableDelay) {
        actualDelay = Math.random() * (variableDelay.max - variableDelay.min) + variableDelay.min;
      }

      // 应用全局网络条件
      if (this.globalNetworkConditions) {
        actualDelay += this.globalNetworkConditions.latency || 0;
        
        // 模拟丢包
        if (this.globalNetworkConditions.packetLoss && 
            Math.random() < this.globalNetworkConditions.packetLoss) {
          await route.abort('failed');
          return;
        }
      }

      // 模拟延迟
      if (actualDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }

      await route.fulfill({
        status,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
      });

      // 更新响应时间统计
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeStats(request.url(), responseTime);
    });
  }

  /**
   * 更新API调用统计
   */
  private updateCallStats(url: string, method: string, startTime: number): void {
    const key = `${method} ${url}`;
    const existing = this.callStats.get(key);
    
    if (existing) {
      existing.callCount++;
      existing.lastCalled = new Date();
    } else {
      this.callStats.set(key, {
        url,
        method,
        callCount: 1,
        lastCalled: new Date(),
        averageResponseTime: 0,
        errors: 0
      });
    }
  }

  /**
   * 更新响应时间统计
   */
  private updateResponseTimeStats(url: string, responseTime: number): void {
    for (const [key, stats] of this.callStats.entries()) {
      if (stats.url === url) {
        const totalTime = stats.averageResponseTime * (stats.callCount - 1) + responseTime;
        stats.averageResponseTime = totalTime / stats.callCount;
        break;
      }
    }
  }

  /**
   * 模拟登录API成功响应
   */
  async mockLoginSuccess(userData?: any): Promise<void> {
    const defaultResponse = {
      status: 200,
      body: {
        success: true,
        token: 'mock_jwt_token_' + Date.now(),
        user: {
          id: 'mock_user_id',
          username: 'testuser',
          email: 'test@example.com',
          ...userData
        }
      }
    };

    await this.mockAPIResponse('**/api/auth/login', defaultResponse);
  }

  /**
   * 模拟登录API失败响应
   */
  async mockLoginFailure(errorMessage: string = '用户名或密码错误'): Promise<void> {
    const errorResponse = {
      status: 401,
      body: {
        success: false,
        message: errorMessage
      }
    };

    await this.mockAPIResponse('**/api/auth/login', errorResponse);
  }

  /**
   * 模拟注册API响应
   */
  async mockRegisterResponse(success: boolean = true, userData?: any): Promise<void> {
    const response = success ? {
      status: 201,
      body: {
        success: true,
        message: '注册成功',
        user: {
          id: 'mock_user_id_' + Date.now(),
          username: 'newuser',
          email: 'newuser@example.com',
          ...userData
        }
      }
    } : {
      status: 400,
      body: {
        success: false,
        message: '注册失败，邮箱已存在'
      }
    };

    await this.mockAPIResponse('**/api/auth/register', response);
  }

  /**
   * 模拟宠物列表API响应
   */
  async mockPetListResponse(pets?: any[]): Promise<void> {
    const defaultPets = pets || [
      {
        id: 'pet1',
        name: 'Buddy',
        type: 'dog',
        breed: 'Golden Retriever',
        age: 3,
        weight: 25.5
      },
      {
        id: 'pet2',
        name: 'Whiskers',
        type: 'cat',
        breed: 'Persian',
        age: 2,
        weight: 4.2
      }
    ];

    await this.mockAPIResponse('**/api/pets', {
      status: 200,
      body: {
        success: true,
        pets: defaultPets
      }
    });
  }

  /**
   * 模拟便便分析API响应
   */
  async mockAnalysisResponse(result?: any, delay: number = 2000): Promise<void> {
    const defaultResult = result || {
      healthStatus: 'healthy',
      confidence: 0.95,
      recommendations: [
        '您的宠物便便状态良好',
        '继续保持当前的饮食习惯',
        '建议定期检查'
      ],
      details: {
        shape: 'normal',
        color: 'brown',
        consistency: 'firm'
      }
    };

    await this.mockAPIResponse('**/api/analysis/analyze', {
      status: 200,
      body: {
        success: true,
        result: defaultResult
      },
      delay
    });
  }

  /**
   * 模拟分析API错误响应
   */
  async mockAnalysisError(errorMessage: string = '分析失败，请重试'): Promise<void> {
    await this.mockAPIResponse('**/api/analysis/analyze', {
      status: 500,
      body: {
        success: false,
        message: errorMessage
      }
    });
  }

  /**
   * 模拟社区帖子列表响应
   */
  async mockCommunityPostsResponse(posts?: any[]): Promise<void> {
    const defaultPosts = posts || [
      {
        id: 'post1',
        title: '我家狗狗的健康分享',
        content: '今天带狗狗去体检，一切正常！',
        author: {
          id: 'user1',
          username: 'petlover123'
        },
        createdAt: new Date().toISOString(),
        likes: 15,
        comments: 3
      }
    ];

    await this.mockAPIResponse('**/api/community/posts', {
      status: 200,
      body: {
        success: true,
        posts: defaultPosts
      }
    });
  }

  /**
   * 模拟特定类型的网络错误
   */
  async mockNetworkError(
    urlPattern: string | RegExp, 
    errorType: NetworkErrorType = NetworkErrorType.NETWORK_ERROR
  ): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      const request = route.request();
      this.updateErrorStats(request.url());
      await route.abort(errorType);
    });
  }

  /**
   * 模拟间歇性网络错误
   */
  async mockIntermittentError(
    urlPattern: string | RegExp,
    errorRate: number = 0.3,
    errorType: NetworkErrorType = NetworkErrorType.NETWORK_ERROR
  ): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      if (Math.random() < errorRate) {
        const request = route.request();
        this.updateErrorStats(request.url());
        await route.abort(errorType);
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 模拟网络超时（增强版）
   */
  async mockNetworkTimeout(
    urlPattern: string | RegExp, 
    timeout: number = 30000,
    timeoutRate: number = 1.0
  ): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      if (Math.random() < timeoutRate) {
        await new Promise(resolve => setTimeout(resolve, timeout));
        const request = route.request();
        this.updateErrorStats(request.url());
        await route.abort('timedout');
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 模拟慢响应（增强版）
   */
  async mockSlowResponse(
    urlPattern: string | RegExp, 
    delay: number | { min: number; max: number } = 5000
  ): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      const actualDelay = typeof delay === 'number' 
        ? delay 
        : Math.random() * (delay.max - delay.min) + delay.min;
        
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      await route.continue();
    });
  }

  /**
   * 模拟服务器错误（增强版）
   */
  async mockServerError(
    urlPattern: string | RegExp, 
    statusCode: number = 500,
    errorRate: number = 1.0,
    customMessage?: string
  ): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      if (Math.random() < errorRate) {
        const request = route.request();
        this.updateErrorStats(request.url());
        
        await route.fulfill({
          status: statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: customMessage || this.getErrorMessage(statusCode),
            timestamp: new Date().toISOString()
          })
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(statusCode: number): string {
    const errorMessages: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权访问',
      403: '禁止访问',
      404: '资源未找到',
      429: '请求过于频繁',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用',
      504: '网关超时'
    };
    
    return errorMessages[statusCode] || '未知错误';
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(url: string): void {
    for (const [key, stats] of this.callStats.entries()) {
      if (stats.url === url) {
        stats.errors++;
        break;
      }
    }
  }

  /**
   * 模拟网络条件（增强版）
   */
  async simulateNetworkConditions(conditions: NetworkConditions): Promise<void> {
    this.globalNetworkConditions = conditions;
    const { offline, downloadThroughput, uploadThroughput, latency, packetLoss, jitter } = conditions;

    if (offline) {
      await this.page.route('**/*', route => route.abort('failed'));
      return;
    }

    // 应用网络条件到所有请求
    await this.page.route('**/*', async (route: Route) => {
      // 模拟丢包
      if (packetLoss && Math.random() < packetLoss) {
        await route.abort('failed');
        return;
      }

      // 计算延迟（包含抖动）
      let totalLatency = latency || 0;
      if (jitter) {
        totalLatency += (Math.random() - 0.5) * jitter * 2;
      }

      // 模拟带宽限制（简化实现）
      if (downloadThroughput || uploadThroughput) {
        const requestSize = route.request().postData()?.length || 1000;
        const throughput = downloadThroughput || uploadThroughput || 1000000;
        const transferTime = (requestSize / throughput) * 1000; // 转换为毫秒
        totalLatency += transferTime;
      }

      if (totalLatency > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.max(0, totalLatency)));
      }

      await route.continue();
    });
  }

  /**
   * 模拟移动网络条件
   */
  async simulateMobileNetwork(networkType: '2G' | '3G' | '4G' | '5G' = '4G'): Promise<void> {
    const networkProfiles: Record<string, NetworkConditions> = {
      '2G': {
        downloadThroughput: 250 * 1024 / 8, // 250 Kbps
        uploadThroughput: 50 * 1024 / 8,    // 50 Kbps
        latency: 300,
        packetLoss: 0.05,
        jitter: 100
      },
      '3G': {
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
        latency: 150,
        packetLoss: 0.02,
        jitter: 50
      },
      '4G': {
        downloadThroughput: 10 * 1024 * 1024 / 8, // 10 Mbps
        uploadThroughput: 5 * 1024 * 1024 / 8,    // 5 Mbps
        latency: 50,
        packetLoss: 0.01,
        jitter: 20
      },
      '5G': {
        downloadThroughput: 100 * 1024 * 1024 / 8, // 100 Mbps
        uploadThroughput: 50 * 1024 * 1024 / 8,    // 50 Mbps
        latency: 10,
        packetLoss: 0.001,
        jitter: 5
      }
    };

    await this.simulateNetworkConditions(networkProfiles[networkType]);
  }

  /**
   * 重置网络条件
   */
  async resetNetworkConditions(): Promise<void> {
    this.globalNetworkConditions = null;
    await this.page.unroute('**/*');
    this.setupRequestInterception();
  }

  /**
   * 模拟文件上传响应
   */
  async mockFileUploadResponse(success: boolean = true, uploadedFile?: any): Promise<void> {
    const response = success ? {
      status: 200,
      body: {
        success: true,
        message: '文件上传成功',
        file: {
          id: 'file_' + Date.now(),
          filename: 'test-image.jpg',
          url: '/uploads/test-image.jpg',
          size: 1024000,
          ...uploadedFile
        }
      }
    } : {
      status: 400,
      body: {
        success: false,
        message: '文件上传失败，请检查文件格式和大小'
      }
    };

    await this.mockAPIResponse('**/api/upload', response);
  }

  /**
   * 模拟分页响应
   */
  async mockPaginatedResponse(
    urlPattern: string | RegExp,
    data: any[],
    page: number = 1,
    limit: number = 10
  ): Promise<void> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    await this.mockAPIResponse(urlPattern, {
      status: 200,
      body: {
        success: true,
        data: paginatedData,
        pagination: {
          page,
          limit,
          total: data.length,
          totalPages: Math.ceil(data.length / limit)
        }
      }
    });
  }

  /**
   * 清除所有模拟路由
   */
  async clearAllMocks(): Promise<void> {
    await this.page.unroute('**/*');
    this.mockedRoutes.clear();
  }

  /**
   * 清除特定路由的模拟
   */
  async clearMock(urlPattern: string | RegExp): Promise<void> {
    await this.page.unroute(urlPattern);
    const routeKey = typeof urlPattern === 'string' ? urlPattern : urlPattern.source;
    this.mockedRoutes.delete(routeKey);
  }

  /**
   * 获取已模拟的路由列表
   */
  getMockedRoutes(): string[] {
    return Array.from(this.mockedRoutes.keys());
  }

  /**
   * 验证API调用次数
   */
  async verifyAPICall(urlPattern: string | RegExp, expectedCalls: number = 1): Promise<boolean> {
    const matchingCalls = this.interceptedRequests.filter(req => {
      if (typeof urlPattern === 'string') {
        return req.url.includes(urlPattern);
      } else {
        return urlPattern.test(req.url);
      }
    });
    
    return matchingCalls.length === expectedCalls;
  }

  /**
   * 验证API调用顺序
   */
  verifyAPICallOrder(urlPatterns: (string | RegExp)[]): boolean {
    const matchedCalls: number[] = [];
    
    for (const pattern of urlPatterns) {
      const matchIndex = this.interceptedRequests.findIndex((req, index) => {
        if (index <= (matchedCalls[matchedCalls.length - 1] || -1)) return false;
        
        if (typeof pattern === 'string') {
          return req.url.includes(pattern);
        } else {
          return pattern.test(req.url);
        }
      });
      
      if (matchIndex === -1) return false;
      matchedCalls.push(matchIndex);
    }
    
    return true;
  }

  /**
   * 验证请求参数
   */
  verifyRequestData(urlPattern: string | RegExp, expectedData: any): boolean {
    const matchingRequests = this.interceptedRequests.filter(req => {
      if (typeof urlPattern === 'string') {
        return req.url.includes(urlPattern);
      } else {
        return urlPattern.test(req.url);
      }
    });

    if (matchingRequests.length === 0) return false;

    const lastRequest = matchingRequests[matchingRequests.length - 1];
    if (!lastRequest.postData) return false;

    try {
      const requestData = JSON.parse(lastRequest.postData);
      return this.deepEqual(requestData, expectedData);
    } catch {
      return lastRequest.postData === expectedData;
    }
  }

  /**
   * 深度比较对象
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  /**
   * 获取API调用统计
   */
  getAPICallStats(): APICallStats[] {
    return Array.from(this.callStats.values());
  }

  /**
   * 获取特定URL的调用统计
   */
  getCallStatsForURL(urlPattern: string | RegExp): APICallStats | null {
    for (const stats of this.callStats.values()) {
      if (typeof urlPattern === 'string') {
        if (stats.url.includes(urlPattern)) return stats;
      } else {
        if (urlPattern.test(stats.url)) return stats;
      }
    }
    return null;
  }

  /**
   * 获取所有拦截的请求
   */
  getInterceptedRequests(): any[] {
    return [...this.interceptedRequests];
  }

  /**
   * 清除请求历史
   */
  clearRequestHistory(): void {
    this.interceptedRequests = [];
    this.callStats.clear();
  }

  /**
   * 动态响应生成器（增强版）
   */
  async mockDynamicResponse(
    urlPattern: string | RegExp,
    responseGenerator: (request: any) => MockResponse | Promise<MockResponse>
  ): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      const startTime = Date.now();
      const request = route.request();
      
      this.updateCallStats(request.url(), request.method(), startTime);

      const requestData = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date()
      };

      try {
        const response = await Promise.resolve(responseGenerator(requestData));
        const { status = 200, body, headers = {}, delay = 0 } = response;

        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        await route.fulfill({
          status,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: typeof body === 'string' ? body : JSON.stringify(body)
        });

        const responseTime = Date.now() - startTime;
        this.updateResponseTimeStats(request.url(), responseTime);
      } catch (error) {
        console.error('Dynamic response generator error:', error);
        this.updateErrorStats(request.url());
        await route.abort('failed');
      }
    });
  }

  /**
   * 模拟API限流
   */
  async mockRateLimit(
    urlPattern: string | RegExp,
    requestsPerMinute: number = 60,
    resetInterval: number = 60000
  ): Promise<void> {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    await this.page.route(urlPattern, async (route: Route) => {
      const clientId = route.request().headers()['x-client-id'] || 'default';
      const now = Date.now();
      
      let clientData = requestCounts.get(clientId);
      if (!clientData || now > clientData.resetTime) {
        clientData = { count: 0, resetTime: now + resetInterval };
        requestCounts.set(clientId, clientData);
      }

      clientData.count++;

      if (clientData.count > requestsPerMinute) {
        await route.fulfill({
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
          },
          body: JSON.stringify({
            success: false,
            message: '请求过于频繁，请稍后再试',
            retryAfter: clientData.resetTime - now
          })
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 模拟分布式系统故障
   */
  async mockDistributedSystemFailure(
    services: { pattern: string | RegExp; failureRate: number }[]
  ): Promise<void> {
    for (const service of services) {
      await this.page.route(service.pattern, async (route: Route) => {
        if (Math.random() < service.failureRate) {
          const errorTypes = [
            NetworkErrorType.CONNECTION_REFUSED,
            NetworkErrorType.TIMEOUT,
            NetworkErrorType.NETWORK_ERROR
          ];
          const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
          
          this.updateErrorStats(route.request().url());
          await route.abort(errorType);
        } else {
          await route.continue();
        }
      });
    }
  }

  /**
   * 生成测试报告
   */
  generateTestReport(): {
    summary: {
      totalRequests: number;
      totalErrors: number;
      averageResponseTime: number;
      errorRate: number;
    };
    details: APICallStats[];
    networkConditions: NetworkConditions | null;
  } {
    const stats = Array.from(this.callStats.values());
    const totalRequests = stats.reduce((sum, stat) => sum + stat.callCount, 0);
    const totalErrors = stats.reduce((sum, stat) => sum + stat.errors, 0);
    const totalResponseTime = stats.reduce((sum, stat) => sum + (stat.averageResponseTime * stat.callCount), 0);
    
    return {
      summary: {
        totalRequests,
        totalErrors,
        averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0
      },
      details: stats,
      networkConditions: this.globalNetworkConditions
    };
  }

  /**
   * 模拟HTTP状态码错误（专用于服务器错误处理测试）
   */
  async mockHTTPError(
    urlPattern: string | RegExp,
    statusCode: number,
    errorMessage?: string,
    retryAfter?: number
  ): Promise<void> {
    const errorMessages: Record<number, string> = {
      400: '请求格式不正确，请检查输入数据',
      401: '请先登录后再访问此页面',
      403: '您没有权限访问此资源',
      404: '请求的资源不存在',
      409: '数据冲突，请检查输入信息',
      422: '数据验证失败',
      429: '请求过于频繁，请稍后再试',
      500: '服务器内部错误，请稍后重试',
      502: '网关错误，服务暂时不可用',
      503: '分析服务暂时不可用，请稍后重试',
      504: '请求处理超时，请重试'
    };

    const response: MockResponse = {
      status: statusCode,
      body: {
        error: this.getHTTPErrorName(statusCode),
        message: errorMessage || errorMessages[statusCode] || '未知错误',
        timestamp: new Date().toISOString()
      }
    };

    // 添加特定状态码的额外字段
    if (statusCode === 422) {
      response.body.details = {
        name: '宠物名称不能为空',
        age: '年龄必须是正整数'
      };
    }

    if (statusCode === 429 || statusCode === 503) {
      response.body.retryAfter = retryAfter || (statusCode === 429 ? 60 : 300);
    }

    await this.mockAPIResponse(urlPattern, response);
  }

  /**
   * 获取HTTP错误名称
   */
  private getHTTPErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    
    return errorNames[statusCode] || 'Unknown Error';
  }

  /**
   * 模拟渐进式错误恢复（先失败后成功）
   */
  async mockProgressiveRecovery(
    urlPattern: string | RegExp,
    failureCount: number = 2,
    errorStatusCode: number = 500,
    successResponse?: any
  ): Promise<void> {
    let requestCount = 0;

    await this.page.route(urlPattern, async (route: Route) => {
      requestCount++;
      
      if (requestCount <= failureCount) {
        this.updateErrorStats(route.request().url());
        await route.fulfill({
          status: errorStatusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: this.getHTTPErrorName(errorStatusCode),
            message: this.getErrorMessage(errorStatusCode),
            attempt: requestCount
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(successResponse || { success: true, recovered: true })
        });
      }
    });
  }

  /**
   * 模拟熔断器模式
   */
  async mockCircuitBreaker(
    urlPattern: string | RegExp,
    failureThreshold: number = 5,
    recoveryTimeout: number = 30000
  ): Promise<void> {
    let failureCount = 0;
    let circuitOpen = false;
    let lastFailureTime = 0;

    await this.page.route(urlPattern, async (route: Route) => {
      const now = Date.now();
      
      // 检查是否应该尝试恢复
      if (circuitOpen && (now - lastFailureTime) > recoveryTimeout) {
        circuitOpen = false;
        failureCount = 0;
      }

      if (circuitOpen) {
        await route.fulfill({
          status: 503,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Circuit Breaker Open',
            message: '服务暂时不可用，熔断器已开启',
            retryAfter: Math.ceil((recoveryTimeout - (now - lastFailureTime)) / 1000)
          })
        });
        return;
      }

      // 模拟随机失败
      if (Math.random() < 0.7) { // 70% 失败率
        failureCount++;
        lastFailureTime = now;
        
        if (failureCount >= failureThreshold) {
          circuitOpen = true;
        }

        this.updateErrorStats(route.request().url());
        await route.fulfill({
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: '服务器内部错误',
            failureCount
          })
        });
      } else {
        // 成功响应，重置失败计数
        failureCount = Math.max(0, failureCount - 1);
        await route.continue();
      }
    });
  }

  /**
   * 模拟级联故障
   */
  async mockCascadingFailure(
    services: Array<{
      pattern: string | RegExp;
      dependsOn?: string[];
      failureDelay?: number;
    }>
  ): Promise<void> {
    const serviceStates = new Map<string, { failed: boolean; failureTime: number }>();
    
    for (const service of services) {
      const serviceName = typeof service.pattern === 'string' ? service.pattern : service.pattern.source;
      serviceStates.set(serviceName, { failed: false, failureTime: 0 });
    }

    for (const service of services) {
      await this.page.route(service.pattern, async (route: Route) => {
        const serviceName = typeof service.pattern === 'string' ? service.pattern : service.pattern.source;
        const serviceState = serviceStates.get(serviceName)!;
        
        // 检查依赖服务是否失败
        let dependencyFailed = false;
        if (service.dependsOn) {
          for (const dependency of service.dependsOn) {
            const depState = serviceStates.get(dependency);
            if (depState?.failed) {
              dependencyFailed = true;
              break;
            }
          }
        }

        if (dependencyFailed || serviceState.failed) {
          // 模拟级联故障延迟
          if (service.failureDelay && !serviceState.failed) {
            await new Promise(resolve => setTimeout(resolve, service.failureDelay));
            serviceState.failed = true;
            serviceState.failureTime = Date.now();
          }

          this.updateErrorStats(route.request().url());
          await route.fulfill({
            status: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Service Unavailable',
              message: dependencyFailed ? '依赖服务不可用' : '服务故障',
              cascading: true
            })
          });
        } else {
          // 随机触发故障
          if (Math.random() < 0.1) { // 10% 故障率
            serviceState.failed = true;
            serviceState.failureTime = Date.now();
            
            this.updateErrorStats(route.request().url());
            await route.fulfill({
              status: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                error: 'Internal Server Error',
                message: '服务内部错误'
              })
            });
          } else {
            await route.continue();
          }
        }
      });
    }
  }

  /**
   * 重置所有模拟状态（专用于测试清理）
   */
  async reset(): Promise<void> {
    await this.cleanup();
    this.setupRequestInterception();
  }

  /**
   * 清理所有模拟和统计数据
   */
  async cleanup(): Promise<void> {
    await this.clearAllMocks();
    this.clearRequestHistory();
    this.globalNetworkConditions = null;
  }
}