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
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function getTestPet() {
  try {
    console.log('🐕 获取测试宠物...');
    const response = await axios.get(`${BASE_URL}/pets`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.length > 0) {
      testPetId = response.data.data[0]._id;
      console.log('✅ 获取测试宠物成功:', response.data.data[0].name);
      return true;
    } else {
      console.log('❌ 没有找到测试宠物');
      return false;
    }
  } catch (error) {
    console.log('❌ 获取宠物失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetRecords() {
  try {
    console.log('\n📋 测试获取记录列表...');
    
    // 基本查询
    const response1 = await axios.get(`${BASE_URL}/records`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 基本查询成功');
    console.log('记录数量:', response1.data.data.records.length);
    console.log('分页信息:', response1.data.data.pagination);
    
    // 带筛选条件的查询
    const response2 = await axios.get(`${BASE_URL}/records`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        petId: testPetId,
        healthStatus: 'healthy',
        page: 1,
        limit: 5,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }
    });
    
    console.log('✅ 筛选查询成功');
    console.log('筛选后记录数量:', response2.data.data.records.length);
    
    return response1.data.data.records.length > 0 ? response1.data.data.records[0].id : null;
    
  } catch (error) {
    console.log('❌ 获取记录列表失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetRecordById(recordId) {
  if (!recordId) {
    console.log('⏭️ 跳过单个记录测试（没有记录ID）');
    return;
  }
  
  try {
    console.log('\n📄 测试获取单个记录...');
    const response = await axios.get(`${BASE_URL}/records/${recordId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 获取单个记录成功');
    console.log('记录详情:', {
      id: response.data.data.id,
      petName: response.data.data.pet?.name,
      healthStatus: response.data.data.analysis.healthStatus,
      timestamp: response.data.data.timestamp
    });
    
  } catch (error) {
    console.log('❌ 获取单个记录失败:', error.response?.data?.message || error.message);
  }
}

async function testUpdateRecord(recordId) {
  if (!recordId) {
    console.log('⏭️ 跳过更新记录测试（没有记录ID）');
    return;
  }
  
  try {
    console.log('\n✏️ 测试更新记录...');
    const response = await axios.put(`${BASE_URL}/records/${recordId}`, {
      userNotes: '测试更新备注 - ' + new Date().toISOString(),
      symptoms: ['测试症状1', '测试症状2'],
      isShared: false
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 更新记录成功');
    console.log('更新后备注:', response.data.data.userNotes);
    
  } catch (error) {
    console.log('❌ 更新记录失败:', error.response?.data?.message || error.message);
  }
}

async function testGetStatistics() {
  try {
    console.log('\n📊 测试获取统计概览...');
    const response = await axios.get(`${BASE_URL}/records/statistics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { period: 'month' }
    });
    
    console.log('✅ 获取统计概览成功');
    console.log('统计数据:', {
      totalRecords: response.data.data.totalRecords,
      healthyPercentage: response.data.data.healthyPercentage,
      warningPercentage: response.data.data.warningPercentage,
      concerningPercentage: response.data.data.concerningPercentage,
      uniquePetsCount: response.data.data.uniquePetsCount
    });
    
  } catch (error) {
    console.log('❌ 获取统计概览失败:', error.response?.data?.message || error.message);
  }
}

async function testGetPetStatistics() {
  if (!testPetId) {
    console.log('⏭️ 跳过宠物统计测试（没有宠物ID）');
    return;
  }
  
  try {
    console.log('\n🐕 测试获取宠物统计...');
    const response = await axios.get(`${BASE_URL}/records/statistics/pet/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { period: 'month' }
    });
    
    console.log('✅ 获取宠物统计成功');
    console.log('宠物统计:', {
      petName: response.data.data.petName,
      totalRecords: response.data.data.totalRecords,
      healthyPercentage: response.data.data.healthyPercentage
    });
    
  } catch (error) {
    console.log('❌ 获取宠物统计失败:', error.response?.data?.message || error.message);
  }
}

async function testGetHealthTrends() {
  if (!testPetId) {
    console.log('⏭️ 跳过健康趋势测试（没有宠物ID）');
    return;
  }
  
  try {
    console.log('\n📈 测试获取健康趋势...');
    const response = await axios.get(`${BASE_URL}/records/trends/health/${testPetId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { period: 'month' }
    });
    
    console.log('✅ 获取健康趋势成功');
    console.log('趋势数据点数量:', response.data.data.trends.length);
    
  } catch (error) {
    console.log('❌ 获取健康趋势失败:', error.response?.data?.message || error.message);
  }
}

async function testGetAggregationSummary() {
  try {
    console.log('\n📊 测试获取聚合汇总...');
    const response = await axios.get(`${BASE_URL}/records/aggregation/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 获取聚合汇总成功');
    console.log('汇总数据:', {
      totalPets: response.data.data.totalPets,
      totalRecords: response.data.data.totalRecords,
      petSummariesCount: response.data.data.petSummaries.length
    });
    
  } catch (error) {
    console.log('❌ 获取聚合汇总失败:', error.response?.data?.message || error.message);
  }
}

async function runTests() {
  console.log('🚀 开始记录管理API测试\n');
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 登录失败，终止测试');
    return;
  }
  
  // 获取测试宠物
  await getTestPet();
  
  // 测试各个API端点
  const testRecordId = await testGetRecords();
  await testGetRecordById(testRecordId);
  await testUpdateRecord(testRecordId);
  await testGetStatistics();
  await testGetPetStatistics();
  await testGetHealthTrends();
  await testGetAggregationSummary();
  
  console.log('\n✅ 记录管理API测试完成');
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试运行失败:', error.message);
});