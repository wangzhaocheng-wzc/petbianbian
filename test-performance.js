const axios = require('axios');

async function runPerformanceTests() {
  console.log('⚡ 运行系统性能测试...\n');

  const API_BASE = 'http://localhost:5000/api';
  const timestamp = Date.now().toString().slice(-6);
  let token = '';

  const performanceResults = {
    apiResponseTime: [],
    concurrentUsers: 0,
    memoryUsage: {},
    errorRate: 0
  };

  try {
    // 1. 准备测试用户
    console.log('1. 🔐 准备测试用户...');
    const registerData = {
      username: `perfuser${timestamp}`,
      email: `perf${timestamp}@example.com`,
      password: 'abc123456',
      confirmPassword: 'abc123456'
    };

    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    token = registerResponse.data.data.tokens.accessToken;
    console.log('✅ 测试用户准备完成');

    // 2. API响应时间测试
    console.log('\n2. ⏱️  API响应时间测试...');

    const apiEndpoints = [
      { name: '健康检查', url: '/health', method: 'GET', auth: false },
      { name: '用户信息', url: '/auth/me', method: 'GET', auth: true },
      { name: '宠物列表', url: '/pets', method: 'GET', auth: true },
      { name: '社区帖子', url: '/community/posts', method: 'GET', auth: true },
      { name: '分析记录', url: '/records', method: 'GET', auth: true },
      { name: '统计数据', url: '/records/statistics/overview', method: 'GET', auth: true }
    ];

    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      try {
        const config = endpoint.auth ? {
          headers: { Authorization: `Bearer ${token}` }
        } : {};

        await axios.get(`${API_BASE}${endpoint.url}`, config);
        const responseTime = Date.now() - startTime;
        performanceResults.apiResponseTime.push({
          endpoint: endpoint.name,
          time: responseTime
        });

        const status = responseTime < 1000 ? '✅' : responseTime < 2000 ? '⚠️' : '❌';
        console.log(`${status} ${endpoint.name}: ${responseTime}ms`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: 请求失败`);
      }
    }

    // 3. 并发用户测试
    console.log('\n3. 👥 并发用户测试...');

    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        axios.get(`${API_BASE}/health`).then(() => ({ success: true })).catch(() => ({ success: false }))
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const successCount = results.filter(r => r.success).length;
    const errorRate = ((concurrentRequests - successCount) / concurrentRequests) * 100;

    performanceResults.concurrentUsers = concurrentRequests;
    performanceResults.errorRate = errorRate;

    console.log(`✅ 并发请求完成: ${concurrentRequests} 个请求`);
    console.log(`   成功率: ${successCount}/${concurrentRequests} (${100 - errorRate}%)`);
    console.log(`   总耗时: ${totalTime}ms`);
    console.log(`   平均响应时间: ${Math.round(totalTime / concurrentRequests)}ms`);

    // 4. 内存使用情况（模拟）
    console.log('\n4. 💾 系统资源使用情况...');

    // 获取系统健康状态
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ 系统状态检查完成');
    console.log(`   数据库连接: ${healthResponse.data.database}`);
    console.log(`   缓存状态: ${healthResponse.data.cache}`);

    // 5. 大数据量测试
    console.log('\n5. 📊 大数据量处理测试...');

    // 创建多个宠物来测试数据处理
    const petCreationPromises = [];
    for (let i = 0; i < 5; i++) {
      petCreationPromises.push(
        axios.post(`${API_BASE}/pets`, {
          name: `性能测试宠物${i}`,
          type: 'dog',
          breed: '测试品种',
          age: Math.floor(Math.random() * 10) + 1,
          weight: Math.random() * 50 + 10,
          gender: i % 2 === 0 ? 'male' : 'female',
          description: `这是第${i}只性能测试宠物`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(() => ({ success: true })).catch(() => ({ success: false }))
      );
    }

    const petResults = await Promise.all(petCreationPromises);
    const petSuccessCount = petResults.filter(r => r.success).length;
    console.log(`✅ 批量宠物创建: ${petSuccessCount}/5 成功`);

    // 6. 性能基准测试
    console.log('\n6. 🎯 性能基准测试...');

    const benchmarks = {
      apiResponseTime: {
        excellent: 200,
        good: 500,
        acceptable: 1000,
        poor: 2000
      },
      concurrentHandling: {
        excellent: 50,
        good: 20,
        acceptable: 10,
        poor: 5
      },
      errorRate: {
        excellent: 0,
        good: 1,
        acceptable: 5,
        poor: 10
      }
    };

    // 计算平均响应时间
    const avgResponseTime = performanceResults.apiResponseTime.reduce((sum, item) => sum + item.time, 0) / performanceResults.apiResponseTime.length;

    console.log('📈 性能评估结果:');

    // API响应时间评估
    let responseTimeRating = 'poor';
    if (avgResponseTime <= benchmarks.apiResponseTime.excellent) responseTimeRating = 'excellent';
    else if (avgResponseTime <= benchmarks.apiResponseTime.good) responseTimeRating = 'good';
    else if (avgResponseTime <= benchmarks.apiResponseTime.acceptable) responseTimeRating = 'acceptable';

    console.log(`   API响应时间: ${Math.round(avgResponseTime)}ms (${responseTimeRating})`);

    // 并发处理能力评估
    let concurrentRating = 'poor';
    if (performanceResults.concurrentUsers >= benchmarks.concurrentHandling.excellent) concurrentRating = 'excellent';
    else if (performanceResults.concurrentUsers >= benchmarks.concurrentHandling.good) concurrentRating = 'good';
    else if (performanceResults.concurrentUsers >= benchmarks.concurrentHandling.acceptable) concurrentRating = 'acceptable';

    console.log(`   并发处理能力: ${performanceResults.concurrentUsers} 用户 (${concurrentRating})`);

    // 错误率评估
    let errorRating = 'poor';
    if (performanceResults.errorRate <= benchmarks.errorRate.excellent) errorRating = 'excellent';
    else if (performanceResults.errorRate <= benchmarks.errorRate.good) errorRating = 'good';
    else if (performanceResults.errorRate <= benchmarks.errorRate.acceptable) errorRating = 'acceptable';

    console.log(`   错误率: ${performanceResults.errorRate}% (${errorRating})`);

    // 总体评估
    const ratings = [responseTimeRating, concurrentRating, errorRating];
    const excellentCount = ratings.filter(r => r === 'excellent').length;
    const goodCount = ratings.filter(r => r === 'good').length;
    const acceptableCount = ratings.filter(r => r === 'acceptable').length;

    let overallRating = 'poor';
    if (excellentCount >= 2) overallRating = 'excellent';
    else if (excellentCount + goodCount >= 2) overallRating = 'good';
    else if (excellentCount + goodCount + acceptableCount >= 2) overallRating = 'acceptable';

    console.log(`\n🏆 总体性能评级: ${overallRating.toUpperCase()}`);

    // 性能建议
    console.log('\n💡 性能优化建议:');
    if (avgResponseTime > benchmarks.apiResponseTime.good) {
      console.log('   - 考虑添加API响应缓存');
      console.log('   - 优化数据库查询性能');
    }
    if (performanceResults.errorRate > benchmarks.errorRate.good) {
      console.log('   - 检查错误处理机制');
      console.log('   - 增强系统稳定性');
    }
    if (performanceResults.concurrentUsers < benchmarks.concurrentHandling.good) {
      console.log('   - 考虑增加并发处理能力');
      console.log('   - 优化服务器配置');
    }

    console.log('\n🎉 性能测试完成！');

  } catch (error) {
    console.log('\n❌ 性能测试过程中出现错误:');
    console.log('错误信息:', error.response?.data?.message || error.message);
  }
}

runPerformanceTests();