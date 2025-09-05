const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';
const API_BASE = `${BACKEND_URL}/api`;

// 测试数据
const testUser = {
    username: `test${Date.now().toString().slice(-8)}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123456!',
    confirmPassword: 'Test123456!'
};

const testPet = {
    name: '小白',
    type: 'dog',
    breed: '金毛',
    age: 2,
    weight: 25.5,
    gender: 'male'
};

let authToken = '';
let userId = '';
let petId = '';

// 工具函数
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

function logError(message, error) {
    log(`${message}: ${error.message}`, 'ERROR');
    if (error.response) {
        log(`Response status: ${error.response.status}`, 'ERROR');
        log(`Response data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
}

// 检查服务状态
async function checkServices() {
    log('检查服务状态...');
    
    try {
        // 检查后端
        const backendResponse = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
        log(`后端服务状态: ${backendResponse.status} - ${JSON.stringify(backendResponse.data)}`);
    } catch (error) {
        logError('后端服务检查失败', error);
        return false;
    }

    try {
        // 检查前端
        const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
        log(`前端服务状态: ${frontendResponse.status}`);
    } catch (error) {
        log('前端服务暂未就绪，继续API测试', 'WARN');
    }

    return true;
}

// 用户注册测试
async function testUserRegistration() {
    log('测试用户注册...');
    
    try {
        const response = await axios.post(`${API_BASE}/auth/register`, testUser);
        log(`用户注册成功: ${response.status}`);
        log(`用户数据: ${JSON.stringify(response.data)}`);
        
        if (response.data.data?.user) {
            userId = response.data.data.user._id || response.data.data.user.id;
            log(`用户ID: ${userId}`);
        }
        
        return true;
    } catch (error) {
        logError('用户注册失败', error);
        return false;
    }
}

// 用户登录测试
async function testUserLogin() {
    log('测试用户登录...');
    
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        log(`用户登录成功: ${response.status}`);
        authToken = response.data.data?.tokens?.accessToken || response.data.token;
        log(`获取到认证令牌: ${authToken ? authToken.substring(0, 20) + '...' : '未找到token'}`);
        
        return true;
    } catch (error) {
        logError('用户登录失败', error);
        return false;
    }
}

// 宠物管理测试
async function testPetManagement() {
    log('测试宠物管理功能...');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 创建宠物
        log('创建宠物...');
        const createResponse = await axios.post(`${API_BASE}/pets`, testPet, { headers });
        log(`宠物创建成功: ${createResponse.status}`);
        
        petId = createResponse.data._id || createResponse.data.id;
        log(`宠物ID: ${petId}`);
        
        // 获取宠物列表
        log('获取宠物列表...');
        const listResponse = await axios.get(`${API_BASE}/pets`, { headers });
        log(`宠物列表获取成功: ${listResponse.status}`);
        log(`宠物数量: ${listResponse.data.length}`);
        
        // 获取单个宠物
        log('获取单个宠物信息...');
        const getResponse = await axios.get(`${API_BASE}/pets/${petId}`, { headers });
        log(`宠物信息获取成功: ${getResponse.status}`);
        log(`宠物名称: ${getResponse.data.name}`);
        
        // 更新宠物信息
        log('更新宠物信息...');
        const updateData = { ...testPet, age: 3 };
        const updateResponse = await axios.put(`${API_BASE}/pets/${petId}`, updateData, { headers });
        log(`宠物信息更新成功: ${updateResponse.status}`);
        
        return true;
    } catch (error) {
        logError('宠物管理测试失败', error);
        return false;
    }
}

// 健康记录测试
async function testHealthRecords() {
    log('测试健康记录功能...');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 创建健康记录
        const recordData = {
            petId: petId,
            type: 'poop',
            description: '正常排便',
            status: 'healthy',
            notes: '形状正常，颜色健康'
        };
        
        const createResponse = await axios.post(`${API_BASE}/records`, recordData, { headers });
        log(`健康记录创建成功: ${createResponse.status}`);
        
        // 获取健康记录
        const getResponse = await axios.get(`${API_BASE}/records?petId=${petId}`, { headers });
        log(`健康记录获取成功: ${getResponse.status}`);
        log(`记录数量: ${getResponse.data.length}`);
        
        return true;
    } catch (error) {
        logError('健康记录测试失败', error);
        return false;
    }
}

// 社区功能测试
async function testCommunityFeatures() {
    log('测试社区功能...');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 创建社区帖子
        const postData = {
            title: '我家小白的健康分享',
            content: '今天小白的便便很健康，分享给大家看看！',
            category: 'health',
            tags: ['健康', '分享']
        };
        
        const createResponse = await axios.post(`${API_BASE}/community/posts`, postData, { headers });
        log(`社区帖子创建成功: ${createResponse.status}`);
        
        const postId = createResponse.data.data?._id || createResponse.data.data?.id || createResponse.data._id || createResponse.data.id;
        
        // 获取社区帖子列表
        const listResponse = await axios.get(`${API_BASE}/community/posts`);
        log(`社区帖子列表获取成功: ${listResponse.status}`);
        const posts = listResponse.data.data || listResponse.data;
        log(`帖子数量: ${Array.isArray(posts) ? posts.length : '未知'}`);
        
        // 点赞帖子
        const likeResponse = await axios.post(`${API_BASE}/community/posts/${postId}/like`, {}, { headers });
        log(`帖子点赞成功: ${likeResponse.status}`);
        
        // 添加评论
        const commentData = { content: '很棒的分享！' };
        const commentResponse = await axios.post(`${API_BASE}/community/posts/${postId}/comments`, commentData, { headers });
        log(`评论添加成功: ${commentResponse.status}`);
        
        return true;
    } catch (error) {
        logError('社区功能测试失败', error);
        return false;
    }
}

// 性能测试
async function testPerformance() {
    log('测试系统性能...');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const testCount = 10;
    const results = [];
    
    try {
        for (let i = 0; i < testCount; i++) {
            const startTime = Date.now();
            await axios.get(`${API_BASE}/pets`, { headers });
            const endTime = Date.now();
            results.push(endTime - startTime);
        }
        
        const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
        const maxTime = Math.max(...results);
        const minTime = Math.min(...results);
        
        log(`性能测试结果 (${testCount}次请求):`);
        log(`平均响应时间: ${avgTime.toFixed(2)}ms`);
        log(`最大响应时间: ${maxTime}ms`);
        log(`最小响应时间: ${minTime}ms`);
        
        return avgTime < 1000; // 平均响应时间应小于1秒
    } catch (error) {
        logError('性能测试失败', error);
        return false;
    }
}

// 清理测试数据
async function cleanup() {
    log('清理测试数据...');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 删除宠物
        if (petId) {
            await axios.delete(`${API_BASE}/pets/${petId}`, { headers });
            log('测试宠物已删除');
        }
        
        // 删除用户（如果API支持）
        try {
            await axios.delete(`${API_BASE}/users/profile`, { headers });
            log('测试用户已删除');
        } catch (error) {
            log('用户删除API不可用，跳过', 'WARN');
        }
        
    } catch (error) {
        logError('清理测试数据失败', error);
    }
}

// 生成测试报告
function generateReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => r.passed === false).length
        },
        details: results
    };
    
    const reportPath = 'E2E_TEST_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`测试报告已生成: ${reportPath}`);
    
    return report;
}

// 主测试函数
async function runE2ETests() {
    log('开始端到端测试...');
    
    const results = [];
    
    // 检查服务状态
    const servicesOk = await checkServices();
    results.push({ test: '服务状态检查', passed: servicesOk });
    
    if (!servicesOk) {
        log('服务未就绪，终止测试', 'ERROR');
        return;
    }
    
    // 用户注册
    const registerOk = await testUserRegistration();
    results.push({ test: '用户注册', passed: registerOk });
    
    if (!registerOk) {
        log('用户注册失败，终止测试', 'ERROR');
        return;
    }
    
    // 用户登录
    const loginOk = await testUserLogin();
    results.push({ test: '用户登录', passed: loginOk });
    
    if (!loginOk) {
        log('用户登录失败，终止测试', 'ERROR');
        return;
    }
    
    // 宠物管理
    const petOk = await testPetManagement();
    results.push({ test: '宠物管理', passed: petOk });
    
    // 健康记录
    const recordsOk = await testHealthRecords();
    results.push({ test: '健康记录', passed: recordsOk });
    
    // 社区功能
    const communityOk = await testCommunityFeatures();
    results.push({ test: '社区功能', passed: communityOk });
    
    // 性能测试
    const performanceOk = await testPerformance();
    results.push({ test: '性能测试', passed: performanceOk });
    
    // 清理
    await cleanup();
    
    // 生成报告
    const report = generateReport(results);
    
    log('端到端测试完成！');
    log(`测试结果: ${report.summary.passed}/${report.summary.total} 通过`);
    
    if (report.summary.failed > 0) {
        log(`有 ${report.summary.failed} 个测试失败`, 'WARN');
    } else {
        log('所有测试都通过了！', 'SUCCESS');
    }
}

// 运行测试
runE2ETests().catch(error => {
    log(`测试执行出错: ${error.message}`, 'ERROR');
    process.exit(1);
});