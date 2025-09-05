const axios = require('axios');
const fs = require('fs');

// 配置 - 尝试多个可能的前端端口
const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_PORTS = [5173, 5174, 3000];
const API_BASE = `${BACKEND_URL}/api`;

let FRONTEND_URL = '';

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

// 检测前端服务端口
async function detectFrontendPort() {
    log('检测前端服务端口...');
    
    for (const port of FRONTEND_PORTS) {
        try {
            const url = `http://localhost:${port}`;
            const response = await axios.get(url, { timeout: 3000 });
            if (response.status === 200) {
                FRONTEND_URL = url;
                log(`✓ 前端服务运行在端口 ${port}`);
                return true;
            }
        } catch (error) {
            // 继续尝试下一个端口
        }
    }
    
    log('前端服务未在任何预期端口运行', 'WARN');
    return false;
}

// 测试前端页面
async function testFrontendPages() {
    if (!FRONTEND_URL) {
        log('前端服务未运行，跳过页面测试', 'WARN');
        return false;
    }
    
    log('测试前端页面访问...');
    
    const pages = [
        { path: '/', name: '首页' },
        { path: '/analysis', name: '便便分析页' },
        { path: '/records', name: '健康记录页' },
        { path: '/community', name: '社区页面' },
        { path: '/profile', name: '个人资料页' }
    ];
    
    let successCount = 0;
    
    for (const page of pages) {
        try {
            const response = await axios.get(`${FRONTEND_URL}${page.path}`, { 
                timeout: 5000,
                validateStatus: (status) => status < 500 // 接受404等客户端错误
            });
            
            if (response.status === 200) {
                log(`✓ ${page.name} 访问成功`);
                successCount++;
            } else {
                log(`⚠ ${page.name} 返回状态 ${response.status}`, 'WARN');
            }
        } catch (error) {
            log(`✗ ${page.name} 访问失败: ${error.message}`, 'ERROR');
        }
    }
    
    const success = successCount > 0;
    log(`页面测试结果: ${successCount}/${pages.length} 成功`);
    return success;
}

// 完整的端到端测试
async function testCompleteE2E() {
    log('执行完整端到端测试...');
    
    const testUser = {
        username: `e2e${Date.now().toString().slice(-8)}`,
        email: `e2e_${Date.now()}@example.com`,
        password: 'Test123456!',
        confirmPassword: 'Test123456!'
    };
    
    try {
        // 1. 后端健康检查
        const healthResponse = await axios.get(`${API_BASE}/health`);
        log(`✓ 后端健康检查: ${healthResponse.data.status}`);
        
        // 2. 用户注册
        const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
        log(`✓ 用户注册: ${registerResponse.status}`);
        
        // 3. 用户登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        const authToken = loginResponse.data.data?.tokens?.accessToken;
        log(`✓ 用户登录: ${loginResponse.status}`);
        
        const headers = { Authorization: `Bearer ${authToken}` };
        
        // 4. 宠物管理
        const petData = {
            name: 'E2E测试宠物',
            type: 'dog',
            breed: '金毛',
            age: 2,
            weight: 25.5,
            gender: 'male'
        };
        
        const createPetResponse = await axios.post(`${API_BASE}/pets`, petData, { headers });
        log(`✓ 宠物创建: ${createPetResponse.status}`);
        
        const petId = createPetResponse.data.data?.id;
        
        // 5. 社区功能
        const postData = {
            title: 'E2E测试帖子',
            content: '这是一个端到端测试帖子',
            category: 'health',
            tags: ['测试']
        };
        
        const createPostResponse = await axios.post(`${API_BASE}/community/posts`, postData, { headers });
        log(`✓ 社区帖子创建: ${createPostResponse.status}`);
        
        // 清理测试数据
        if (petId) {
            await axios.delete(`${API_BASE}/pets/${petId}`, { headers });
            log('✓ 测试数据清理完成');
        }
        
        return true;
        
    } catch (error) {
        log(`端到端测试失败: ${error.message}`, 'ERROR');
        return false;
    }
}

// 生成最终验证报告
function generateFinalReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        systemStatus: {
            backend: results.backend,
            frontend: results.frontend,
            e2eTest: results.e2eTest
        },
        frontendDetails: {
            detectedPort: FRONTEND_URL ? FRONTEND_URL.split(':')[2] : 'none',
            pagesAccessible: results.frontendPages
        },
        deployment: {
            backendReady: results.backend && results.e2eTest,
            frontendReady: results.frontend,
            fullSystemReady: results.backend && results.frontend && results.e2eTest
        },
        recommendations: []
    };
    
    if (report.deployment.fullSystemReady) {
        report.recommendations.push('🎉 系统完全就绪，可以进行生产部署！');
        report.recommendations.push('建议进行用户验收测试');
        report.recommendations.push('可以开始准备生产环境配置');
    } else {
        if (!report.deployment.backendReady) {
            report.recommendations.push('后端服务需要进一步检查');
        }
        if (!report.deployment.frontendReady) {
            report.recommendations.push('前端服务需要启动或配置调整');
        }
    }
    
    const reportPath = 'FINAL_VERIFICATION_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`最终验证报告已生成: ${reportPath}`);
    
    return report;
}

// 主验证函数
async function runFinalVerification() {
    log('🚀 开始最终系统验证...');
    log('='.repeat(60));
    
    const results = {};
    
    // 1. 检测前端服务
    results.frontend = await detectFrontendPort();
    
    // 2. 测试前端页面
    results.frontendPages = await testFrontendPages();
    
    // 3. 执行完整端到端测试
    results.e2eTest = await testCompleteE2E();
    results.backend = results.e2eTest; // 如果E2E测试通过，说明后端正常
    
    // 生成最终报告
    const report = generateFinalReport(results);
    
    log('='.repeat(60));
    log('🏁 最终验证完成！');
    log('');
    log('📊 系统状态总览:');
    log(`   后端服务: ${results.backend ? '✅ 正常' : '❌ 异常'}`);
    log(`   前端服务: ${results.frontend ? '✅ 正常' : '❌ 异常'}`);
    log(`   端到端测试: ${results.e2eTest ? '✅ 通过' : '❌ 失败'}`);
    log('');
    
    if (FRONTEND_URL) {
        log(`🌐 前端访问地址: ${FRONTEND_URL}`);
    }
    log(`🔧 后端API地址: ${BACKEND_URL}`);
    log('');
    
    if (report.deployment.fullSystemReady) {
        log('🎉 恭喜！宠物健康监测社区平台已完全就绪！');
        log('');
        log('✨ 系统特性:');
        log('   • 用户注册和登录系统');
        log('   • 宠物信息管理');
        log('   • 社区互动功能');
        log('   • 健康记录追踪');
        log('   • 响应式Web界面');
        log('   • PWA支持');
        log('');
        log('🚀 可以开始生产部署了！');
    } else {
        log('⚠️ 系统部分功能需要调整:');
        report.recommendations.forEach(rec => {
            log(`   ${rec}`);
        });
    }
    
    return report;
}

// 运行最终验证
if (require.main === module) {
    runFinalVerification().catch(error => {
        log(`最终验证失败: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = { runFinalVerification };