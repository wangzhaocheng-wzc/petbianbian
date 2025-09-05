const axios = require('axios');
const fs = require('fs');

// 配置
const BACKEND_URL = 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

// 测试数据
const testUser = {
    username: `test${Date.now().toString().slice(-8)}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test123456!',
    confirmPassword: 'Test123456!'
};

let authToken = '';
let userId = '';
let petId = '';
let postId = '';

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

// 测试结果收集器
class TestCollector {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }
    
    addResult(testName, passed, details = {}) {
        this.results.push({
            test: testName,
            passed,
            timestamp: new Date().toISOString(),
            details
        });
        
        const status = passed ? '✓' : '✗';
        log(`${status} ${testName}: ${passed ? '通过' : '失败'}`);
    }
    
    getSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        const duration = Date.now() - this.startTime;
        
        return {
            total,
            passed,
            failed,
            duration: `${duration}ms`,
            successRate: `${((passed / total) * 100).toFixed(1)}%`
        };
    }
    
    generateReport() {
        const summary = this.getSummary();
        const report = {
            timestamp: new Date().toISOString(),
            summary,
            results: this.results
        };
        
        const reportPath = 'COMPREHENSIVE_TEST_REPORT.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`综合测试报告已生成: ${reportPath}`);
        
        return report;
    }
}

const collector = new TestCollector();

// 1. 系统健康检查
async function testSystemHealth() {
    try {
        const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
        const isHealthy = response.status === 200 && response.data.status === 'OK';
        
        collector.addResult('系统健康检查', isHealthy, {
            status: response.status,
            data: response.data
        });
        
        return isHealthy;
    } catch (error) {
        collector.addResult('系统健康检查', false, { error: error.message });
        return false;
    }
}

// 2. 用户注册测试
async function testUserRegistration() {
    try {
        const response = await axios.post(`${API_BASE}/auth/register`, testUser);
        const success = response.status === 201 && response.data.success;
        
        if (success && response.data.data?.user) {
            userId = response.data.data.user.id;
        }
        
        collector.addResult('用户注册', success, {
            status: response.status,
            userId: userId
        });
        
        return success;
    } catch (error) {
        collector.addResult('用户注册', false, { error: error.message });
        return false;
    }
}

// 3. 用户登录测试
async function testUserLogin() {
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        
        const success = response.status === 200;
        authToken = response.data.data?.tokens?.accessToken || response.data.token;
        
        collector.addResult('用户登录', success && !!authToken, {
            status: response.status,
            hasToken: !!authToken
        });
        
        return success && !!authToken;
    } catch (error) {
        collector.addResult('用户登录', false, { error: error.message });
        return false;
    }
}

// 4. 宠物管理测试
async function testPetManagement() {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 创建宠物
        const petData = {
            name: '测试宠物',
            type: 'dog',
            breed: '金毛',
            age: 2,
            weight: 25.5,
            gender: 'male'
        };
        
        const createResponse = await axios.post(`${API_BASE}/pets`, petData, { headers });
        const createSuccess = createResponse.status === 201;
        
        if (createSuccess) {
            petId = createResponse.data.data?._id || createResponse.data.data?.id || createResponse.data._id || createResponse.data.id;
        }
        
        // 获取宠物列表
        const listResponse = await axios.get(`${API_BASE}/pets`, { headers });
        const listSuccess = listResponse.status === 200;
        
        // 如果没有从创建响应中获取到petId，尝试从列表中获取
        if (!petId && listSuccess && listResponse.data.data?.pets?.length > 0) {
            petId = listResponse.data.data.pets[0]._id || listResponse.data.data.pets[0].id;
        }
        
        const overallSuccess = createSuccess && listSuccess && !!petId;
        
        collector.addResult('宠物管理', overallSuccess, {
            createStatus: createResponse.status,
            listStatus: listResponse.status,
            petId: petId
        });
        
        return overallSuccess;
    } catch (error) {
        collector.addResult('宠物管理', false, { error: error.message });
        return false;
    }
}

// 5. 社区功能测试
async function testCommunityFeatures() {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 创建帖子
        const postData = {
            title: '测试帖子',
            content: '这是一个测试帖子的内容',
            category: 'health',
            tags: ['测试', '健康']
        };
        
        const createResponse = await axios.post(`${API_BASE}/community/posts`, postData, { headers });
        const createSuccess = createResponse.status === 201;
        
        if (createSuccess) {
            postId = createResponse.data.data?._id || createResponse.data._id;
        }
        
        // 获取帖子列表
        const listResponse = await axios.get(`${API_BASE}/community/posts`);
        const listSuccess = listResponse.status === 200;
        
        // 点赞测试
        let likeSuccess = false;
        if (postId) {
            try {
                const likeResponse = await axios.post(`${API_BASE}/community/posts/${postId}/like`, {}, { headers });
                likeSuccess = likeResponse.status === 200;
            } catch (likeError) {
                log(`点赞测试失败: ${likeError.message}`, 'WARN');
            }
        }
        
        const overallSuccess = createSuccess && listSuccess;
        
        collector.addResult('社区功能', overallSuccess, {
            createStatus: createResponse.status,
            listStatus: listResponse.status,
            likeSuccess: likeSuccess,
            postId: postId
        });
        
        return overallSuccess;
    } catch (error) {
        collector.addResult('社区功能', false, { error: error.message });
        return false;
    }
}

// 6. API性能测试
async function testAPIPerformance() {
    const headers = { Authorization: `Bearer ${authToken}` };
    const testCount = 20;
    const results = [];
    
    try {
        for (let i = 0; i < testCount; i++) {
            const startTime = Date.now();
            await axios.get(`${API_BASE}/health`);
            const endTime = Date.now();
            results.push(endTime - startTime);
        }
        
        const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
        const maxTime = Math.max(...results);
        const minTime = Math.min(...results);
        
        const performanceGood = avgTime < 500; // 平均响应时间小于500ms
        
        collector.addResult('API性能测试', performanceGood, {
            testCount,
            avgTime: `${avgTime.toFixed(2)}ms`,
            maxTime: `${maxTime}ms`,
            minTime: `${minTime}ms`
        });
        
        return performanceGood;
    } catch (error) {
        collector.addResult('API性能测试', false, { error: error.message });
        return false;
    }
}

// 7. 数据一致性测试
async function testDataConsistency() {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 获取用户信息
        const userResponse = await axios.get(`${API_BASE}/users/profile`, { headers });
        const userSuccess = userResponse.status === 200;
        
        // 获取宠物信息
        const petsResponse = await axios.get(`${API_BASE}/pets`, { headers });
        const petsSuccess = petsResponse.status === 200;
        
        // 获取社区帖子
        const postsResponse = await axios.get(`${API_BASE}/community/posts`);
        const postsSuccess = postsResponse.status === 200;
        
        const overallSuccess = userSuccess && petsSuccess && postsSuccess;
        
        collector.addResult('数据一致性测试', overallSuccess, {
            userStatus: userResponse.status,
            petsStatus: petsResponse.status,
            postsStatus: postsResponse.status
        });
        
        return overallSuccess;
    } catch (error) {
        collector.addResult('数据一致性测试', false, { error: error.message });
        return false;
    }
}

// 8. 错误处理测试
async function testErrorHandling() {
    try {
        let errorHandlingGood = true;
        
        // 测试无效认证
        try {
            await axios.get(`${API_BASE}/pets`, { 
                headers: { Authorization: 'Bearer invalid_token' } 
            });
            errorHandlingGood = false; // 应该返回错误
        } catch (error) {
            if (error.response?.status !== 401) {
                errorHandlingGood = false;
            }
        }
        
        // 测试不存在的端点
        try {
            await axios.get(`${API_BASE}/nonexistent`);
            errorHandlingGood = false; // 应该返回404
        } catch (error) {
            if (error.response?.status !== 404) {
                errorHandlingGood = false;
            }
        }
        
        collector.addResult('错误处理测试', errorHandlingGood, {
            description: '测试无效认证和不存在端点的错误处理'
        });
        
        return errorHandlingGood;
    } catch (error) {
        collector.addResult('错误处理测试', false, { error: error.message });
        return false;
    }
}

// 清理测试数据
async function cleanup() {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    try {
        // 删除测试宠物
        if (petId) {
            try {
                await axios.delete(`${API_BASE}/pets/${petId}`, { headers });
                log('测试宠物已删除');
            } catch (error) {
                log(`删除宠物失败: ${error.message}`, 'WARN');
            }
        }
        
        // 删除测试帖子
        if (postId) {
            try {
                await axios.delete(`${API_BASE}/community/posts/${postId}`, { headers });
                log('测试帖子已删除');
            } catch (error) {
                log(`删除帖子失败: ${error.message}`, 'WARN');
            }
        }
        
    } catch (error) {
        log(`清理过程出错: ${error.message}`, 'WARN');
    }
}

// 主测试函数
async function runComprehensiveTests() {
    log('开始综合功能测试...');
    log('='.repeat(50));
    
    // 1. 系统健康检查
    const healthOk = await testSystemHealth();
    if (!healthOk) {
        log('系统健康检查失败，终止测试', 'ERROR');
        return collector.generateReport();
    }
    
    // 2. 用户注册
    const registerOk = await testUserRegistration();
    if (!registerOk) {
        log('用户注册失败，跳过需要认证的测试', 'WARN');
    }
    
    // 3. 用户登录
    let loginOk = false;
    if (registerOk) {
        loginOk = await testUserLogin();
    }
    
    // 4. 宠物管理测试
    if (loginOk) {
        await testPetManagement();
    }
    
    // 5. 社区功能测试
    if (loginOk) {
        await testCommunityFeatures();
    }
    
    // 6. API性能测试
    await testAPIPerformance();
    
    // 7. 数据一致性测试
    if (loginOk) {
        await testDataConsistency();
    }
    
    // 8. 错误处理测试
    await testErrorHandling();
    
    // 清理测试数据
    if (loginOk) {
        await cleanup();
    }
    
    // 生成最终报告
    const report = collector.generateReport();
    
    log('='.repeat(50));
    log('综合测试完成！');
    log(`测试结果: ${report.summary.passed}/${report.summary.total} 通过`);
    log(`成功率: ${report.summary.successRate}`);
    log(`总耗时: ${report.summary.duration}`);
    
    if (report.summary.failed > 0) {
        log(`有 ${report.summary.failed} 个测试失败`, 'WARN');
        
        // 显示失败的测试
        const failedTests = collector.results.filter(r => !r.passed);
        failedTests.forEach(test => {
            log(`  ✗ ${test.test}`, 'ERROR');
        });
    } else {
        log('🎉 所有测试都通过了！', 'SUCCESS');
    }
    
    return report;
}

// 运行测试
if (require.main === module) {
    runComprehensiveTests().catch(error => {
        log(`测试执行失败: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = { runComprehensiveTests };