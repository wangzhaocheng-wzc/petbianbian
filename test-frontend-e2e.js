const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');

// 配置
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

// 等待服务启动
async function waitForService(url, maxAttempts = 30, interval = 2000) {
    log(`等待服务启动: ${url}`);
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(url, { timeout: 3000 });
            log(`服务已启动: ${url} (状态: ${response.status})`);
            return true;
        } catch (error) {
            log(`尝试 ${i + 1}/${maxAttempts}: 服务未就绪`, 'WARN');
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    
    log(`服务启动超时: ${url}`, 'ERROR');
    return false;
}

// 启动前端服务
function startFrontend() {
    return new Promise((resolve, reject) => {
        log('启动前端服务...');
        
        const frontend = spawn('npm', ['run', 'dev'], {
            cwd: './frontend',
            stdio: 'pipe',
            shell: true
        });
        
        let started = false;
        
        frontend.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Frontend: ${output.trim()}`);
            
            // 检查是否包含启动成功的标志
            if (output.includes('Local:') || output.includes('localhost:5173') || output.includes('ready in')) {
                if (!started) {
                    started = true;
                    log('前端服务启动成功！');
                    resolve(frontend);
                }
            }
        });
        
        frontend.stderr.on('data', (data) => {
            console.error(`Frontend Error: ${data.toString()}`);
        });
        
        frontend.on('error', (error) => {
            log(`前端服务启动失败: ${error.message}`, 'ERROR');
            reject(error);
        });
        
        // 超时处理
        setTimeout(() => {
            if (!started) {
                log('前端服务启动超时', 'ERROR');
                reject(new Error('Frontend startup timeout'));
            }
        }, 30000);
    });
}

// 测试前端页面访问
async function testFrontendPages() {
    log('测试前端页面访问...');
    
    const pages = [
        { path: '/', name: '首页' },
        { path: '/analysis', name: '便便分析页' },
        { path: '/records', name: '健康记录页' },
        { path: '/community', name: '社区页面' },
        { path: '/profile', name: '个人资料页' }
    ];
    
    const results = [];
    
    for (const page of pages) {
        try {
            const response = await axios.get(`${FRONTEND_URL}${page.path}`, { timeout: 5000 });
            log(`✓ ${page.name} 访问成功 (${response.status})`);
            results.push({ page: page.name, status: 'success', code: response.status });
        } catch (error) {
            log(`✗ ${page.name} 访问失败: ${error.message}`, 'ERROR');
            results.push({ page: page.name, status: 'failed', error: error.message });
        }
    }
    
    return results;
}

// 测试前端资源加载
async function testFrontendResources() {
    log('测试前端资源加载...');
    
    const resources = [
        '/src/main.tsx',
        '/src/App.tsx',
        '/src/components/Layout.tsx'
    ];
    
    const results = [];
    
    for (const resource of resources) {
        try {
            const response = await axios.get(`${FRONTEND_URL}${resource}`, { timeout: 5000 });
            log(`✓ 资源加载成功: ${resource}`);
            results.push({ resource, status: 'success' });
        } catch (error) {
            log(`✗ 资源加载失败: ${resource} - ${error.message}`, 'WARN');
            results.push({ resource, status: 'failed', error: error.message });
        }
    }
    
    return results;
}

// 检查前端构建状态
async function checkFrontendBuild() {
    log('检查前端构建状态...');
    
    try {
        // 检查是否有构建文件
        const distExists = fs.existsSync('./frontend/dist');
        log(`构建目录存在: ${distExists}`);
        
        if (distExists) {
            const files = fs.readdirSync('./frontend/dist');
            log(`构建文件: ${files.join(', ')}`);
        }
        
        return { buildExists: distExists };
    } catch (error) {
        log(`检查构建状态失败: ${error.message}`, 'ERROR');
        return { buildExists: false, error: error.message };
    }
}

// 生成前端测试报告
function generateFrontendReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        frontend: {
            serviceStatus: results.serviceStatus,
            pageAccess: results.pageAccess,
            resourceLoading: results.resourceLoading,
            buildStatus: results.buildStatus
        },
        summary: {
            totalTests: Object.keys(results).length,
            serviceReady: results.serviceStatus,
            pagesAccessible: results.pageAccess ? results.pageAccess.filter(p => p.status === 'success').length : 0,
            totalPages: results.pageAccess ? results.pageAccess.length : 0
        }
    };
    
    const reportPath = 'FRONTEND_E2E_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`前端测试报告已生成: ${reportPath}`);
    
    return report;
}

// 主测试函数
async function runFrontendE2ETests() {
    log('开始前端端到端测试...');
    
    const results = {};
    
    try {
        // 检查后端服务
        log('检查后端服务状态...');
        const backendReady = await waitForService(`${BACKEND_URL}/api/health`, 5, 1000);
        if (!backendReady) {
            log('后端服务未就绪，无法进行完整测试', 'ERROR');
            return;
        }
        
        // 检查构建状态
        results.buildStatus = await checkFrontendBuild();
        
        // 检查前端服务是否已经运行
        log('检查前端服务状态...');
        try {
            await axios.get(FRONTEND_URL, { timeout: 3000 });
            log('前端服务已在运行');
            results.serviceStatus = true;
        } catch (error) {
            log('前端服务未运行，尝试启动...', 'WARN');
            
            try {
                // 启动前端服务
                const frontendProcess = await startFrontend();
                
                // 等待服务就绪
                const frontendReady = await waitForService(FRONTEND_URL, 15, 2000);
                results.serviceStatus = frontendReady;
                
                if (frontendReady) {
                    // 测试页面访问
                    results.pageAccess = await testFrontendPages();
                    
                    // 测试资源加载
                    results.resourceLoading = await testFrontendResources();
                }
                
                // 清理进程
                if (frontendProcess && frontendProcess.kill) {
                    frontendProcess.kill();
                    log('前端服务进程已终止');
                }
                
            } catch (startError) {
                log(`前端服务启动失败: ${startError.message}`, 'ERROR');
                results.serviceStatus = false;
            }
        }
        
        // 如果服务已经运行，直接测试
        if (results.serviceStatus) {
            if (!results.pageAccess) {
                results.pageAccess = await testFrontendPages();
            }
            if (!results.resourceLoading) {
                results.resourceLoading = await testFrontendResources();
            }
        }
        
    } catch (error) {
        log(`测试执行出错: ${error.message}`, 'ERROR');
        results.error = error.message;
    }
    
    // 生成报告
    const report = generateFrontendReport(results);
    
    log('前端端到端测试完成！');
    log(`服务状态: ${results.serviceStatus ? '✓' : '✗'}`);
    
    if (results.pageAccess) {
        const successPages = results.pageAccess.filter(p => p.status === 'success').length;
        log(`页面访问: ${successPages}/${results.pageAccess.length} 成功`);
    }
    
    return report;
}

// 运行测试
if (require.main === module) {
    runFrontendE2ETests().catch(error => {
        log(`测试执行失败: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = { runFrontendE2ETests };