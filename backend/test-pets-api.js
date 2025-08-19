const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试用户凭据
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    if (response.data.success) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ 登录成功，获取到token');
      return true;
    }
  } catch (error) {
    console.log('❌ 登录失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 创建宠物
async function createPet() {
  try {
    const petData = {
      name: '小白',
      type: 'dog',
      breed: '金毛',
      gender: 'male',
      age: 24,
      weight: 30.5,
      description: '一只可爱的金毛犬',
      medicalHistory: {
        allergies: ['花粉'],
        medications: [],
        conditions: []
      }
    };

    const response = await axios.post(`${BASE_URL}/pets`, petData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      console.log('✅ 创建宠物成功:', response.data.data.name);
      return response.data.data.id;
    }
  } catch (error) {
    console.log('❌ 创建宠物失败:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('验证错误:', error.response.data.errors);
    }
    return null;
  }
}

// 获取宠物列表
async function getPets() {
  try {
    const response = await axios.get(`${BASE_URL}/pets`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      console.log('✅ 获取宠物列表成功，共', response.data.data.total, '只宠物');
      response.data.data.pets.forEach(pet => {
        console.log(`  - ${pet.name} (${pet.type}, ${pet.breed || '未知品种'})`);
      });
      return response.data.data.pets;
    }
  } catch (error) {
    console.log('❌ 获取宠物列表失败:', error.response?.data?.message || error.message);
    return [];
  }
}

// 获取特定宠物信息
async function getPetById(petId) {
  try {
    const response = await axios.get(`${BASE_URL}/pets/${petId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      console.log('✅ 获取宠物信息成功:', response.data.data.name);
      return response.data.data;
    }
  } catch (error) {
    console.log('❌ 获取宠物信息失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 更新宠物信息
async function updatePet(petId) {
  try {
    const updateData = {
      age: 25,
      weight: 31.0,
      description: '一只非常可爱的金毛犬，已经2岁多了'
    };

    const response = await axios.put(`${BASE_URL}/pets/${petId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      console.log('✅ 更新宠物信息成功');
      return response.data.data;
    }
  } catch (error) {
    console.log('❌ 更新宠物信息失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 删除宠物
async function deletePet(petId) {
  try {
    const response = await axios.delete(`${BASE_URL}/pets/${petId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      console.log('✅ 删除宠物成功');
      return true;
    }
  } catch (error) {
    console.log('❌ 删除宠物失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试重名宠物
async function testDuplicateName() {
  try {
    const petData = {
      name: '小白', // 使用相同的名称
      type: 'cat',
      breed: '英短'
    };

    const response = await axios.post(`${BASE_URL}/pets`, petData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('❌ 重名测试失败：应该阻止创建同名宠物');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ 重名验证成功：', error.response.data.message);
    } else {
      console.log('❌ 重名测试出现意外错误:', error.response?.data?.message || error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试宠物管理API...\n');

  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 无法继续测试，请确保有测试用户账号');
    return;
  }

  console.log('\n--- 测试创建宠物 ---');
  const petId = await createPet();
  
  if (petId) {
    console.log('\n--- 测试获取宠物列表 ---');
    await getPets();

    console.log('\n--- 测试获取特定宠物信息 ---');
    await getPetById(petId);

    console.log('\n--- 测试更新宠物信息 ---');
    await updatePet(petId);

    console.log('\n--- 测试重名验证 ---');
    await testDuplicateName();

    console.log('\n--- 测试删除宠物 ---');
    await deletePet(petId);

    console.log('\n--- 验证删除后的列表 ---');
    await getPets();
  }

  console.log('\n🎉 宠物管理API测试完成！');
}

// 运行测试
runTests().catch(console.error);