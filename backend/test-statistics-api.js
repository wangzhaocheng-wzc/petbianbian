const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试用户凭据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';
let testPetId = '';

async function login() {
  try {
    console.log('🔐 登录测试用户...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = response.data.data.token;
    console.log('✅ 登录成功');
    return true;
  } catch (error) {
    console.log('❌ 登录失败，尝试注册...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        username: 'testuser',
        ...testUser
      });
      console.log('✅ 注册成功，重新登录...');
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
      authToken = loginResponse.data.data.token;
      console.log('✅ 登录成功');
      return true;
    } catch (regError) {
      console.error('❌ 注册失败:', regError.response?.data?.message || regError.message);
      return false;
    }
  }
}

async function getOrCreatePet() {
  try {
    console.log('🐕 获取宠物列表...');
    const response = await axios.get(`${BASE_URL}/pets`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.data.length > 0) {
      testPetId = response.data.data[0]._id;
      console.log(`✅ 找到宠物: ${response.data.data[0].name} (ID: ${testPetId})`);
      return true;
    }
    
    console.log('📝 创建测试宠物...');
    const createResponse = await axios.post(`${BASE_URL}/pets`, {
      name: '测试宠物',
      type: 'dog',
      breed: '金毛',
      age: 24,
      weight: 25.5
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    testPetId = createResponse.data.data._id;
    console.log(`✅ 创建宠物成功: ${createResponse.data.data.name} (ID: ${testPetId})`);
    return true;
  } catch (error) {
    console.error('❌ 获取/创建宠物失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createTestRecords() {
  try {
    console.log('📊 创建测试记录...');
    
    const testRecords = [
      {
        petId: testPetId,
        analysis: {
          shape: 'type4',
          healthStatus: 'healthy',
          confidence: 85,
          details: '便便形状正常，颜色健康',
          recommendations: ['保持当前饮食'],
          detectedFeatures: {
            color: '棕色',
            texture: '正常',
            consistency: '适中',
            size: '正常'
          }
        },
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
        imageUrl: '/uploads/test1.jpg'
      },
      {
        petId: testPetId,
        analysis: {
          shape: 'type3',
          healthStatus: 'warning',
          confidence: 75,
          details: '便便稍硬，可能需要增加水分摄入',
          recommendations: ['增加饮水量', '适当增加纤维摄入'],
          detectedFeatures: {
            color: '深棕色',
            texture: '偏硬',
            consistency: '干燥',
            size: '正常'
          }
        },
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
        imageUrl: '/uploads/test2.jpg'
      },
      {
        petId: testPetId,
        analysis: {
          shape: 'type5',
          healthStatus: 'healthy',
          confidence: 90,
          details: '便便状态良好',
          recommendations: ['继续保持'],
          detectedFeatures: {
            color: '棕色',
            texture: '正常',
            consistency: '软适中',
            size: '正常'
          }
        },
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        imageUrl: '/uploads/test3.jpg'
      }
    ];
    
    for (const record of testRecords) {
      try {
        await axios.post(`${BASE_URL}/analysis/save-record`, record, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(`✅ 创建记录成功: ${record.analysis.healthStatus}`);
      } catch (error) {
        console.log(`⚠️ 创建记录失败: ${error.response?.data?.message || error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ 创建测试记录失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testStatisticsAPI() {
  try {
    console.log('\n📈 测试统计API...\n');
    
    // 测试健康趋势
    console.log('1. 测试健康趋势API...');
    try {
      const trendsResponse = await axios.get(`${BASE_URL}/statistics/trends/health/${testPetId}?days=30&granularity=daily`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ 健康趋势API成功');
      console.log(`   - 趋势数据点数: ${trendsResponse.data.data.trends.length}`);
    } catch (error) {
      console.log('❌ 健康趋势API失败:', error.response?.data?.message || error.message);
    }
    
    // 测试周期统计
    console.log('\n2. 测试周期统计API...');
    try {
      const periodResponse = await axios.get(`${BASE_URL}/statistics/period/${testPetId}?period=month`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ 周期统计API成功');
      console.log(`   - 总记录数: ${periodResponse.data.data.totalRecords}`);
      console.log(`   - 健康率: ${periodResponse.data.data.healthyPercentage}%`);
    } catch (error) {
      console.log('❌ 周期统计API失败:', error.response?.data?.message || error.message);
    }
    
    // 测试异常检测
    console.log('\n3. 测试异常检测API...');
    try {
      const anomaliesResponse = await axios.get(`${BASE_URL}/statistics/anomalies/${testPetId}?window=30`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ 异常检测API成功');
      console.log(`   - 检测到异常数: ${anomaliesResponse.data.data.anomaliesCount}`);
    } catch (error) {
      console.log('❌ 异常检测API失败:', error.response?.data?.message || error.message);
    }
    
    // 测试对比分析
    console.log('\n4. 测试对比分析API...');
    try {
      const comparisonResponse = await axios.get(`${BASE_URL}/statistics/comparison/${testPetId}?period=month`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ 对比分析API成功');
      console.log(`   - 趋势: ${comparisonResponse.data.data.trend}`);
      console.log(`   - 显著变化数: ${comparisonResponse.data.data.significantChanges.length}`);
    } catch (error) {
      console.log('❌ 对比分析API失败:', error.response?.data?.message || error.message);
    }
    
    // 测试多宠物汇总
    console.log('\n5. 测试多宠物汇总API...');
    try {
      const multiPetResponse = await axios.get(`${BASE_URL}/statistics/summary/multi-pet?period=month`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ 多宠物汇总API成功');
      console.log(`   - 宠物数量: ${multiPetResponse.data.data.totalPets}`);
      console.log(`   - 总记录数: ${multiPetResponse.data.data.overallStatistics.totalRecords}`);
    } catch (error) {
      console.log('❌ 多宠物汇总API失败:', error.response?.data?.message || error.message);
    }
    
    // 测试用户概览
    console.log('\n6. 测试用户概览API...');
    try {
      const overviewResponse = await axios.get(`${BASE_URL}/statistics/overview/user`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ 用户概览API成功');
      console.log(`   - 总宠物数: ${overviewResponse.data.data.totalPets}`);
      console.log(`   - 本月记录数: ${overviewResponse.data.data.summary.totalRecordsThisMonth}`);
    } catch (error) {
      console.log('❌ 用户概览API失败:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ 统计API测试失败:', error.message);
  }
}

async function main() {
  console.log('🚀 开始统计API测试\n');
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 无法登录，测试终止');
    return;
  }
  
  // 获取或创建宠物
  const petSuccess = await getOrCreatePet();
  if (!petSuccess) {
    console.log('❌ 无法获取宠物，测试终止');
    return;
  }
  
  // 创建测试记录
  await createTestRecords();
  
  // 等待一下让数据库处理完成
  console.log('⏳ 等待数据处理...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试统计API
  await testStatisticsAPI();
  
  console.log('\n🎉 统计API测试完成');
}

main().catch(console.error);