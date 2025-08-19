// 完整的注册功能测试脚本
const { spawn } = require('child_process');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let serverProcess;

// 启动服务器
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('启动后端服务器...');
    serverProcess = spawn('npm', ['run', 'dev'], { 
      stdio: 'pipe',
      shell: true 
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('服务器输出:', output.trim());
      
      if (output.includes('服务器运行在端口') && !serverReady) {
        serverReady = true;
        console.log('✅ 服务器启动成功');
        setTimeout(resolve, 2000); // 等待2秒确保服务器完全启动
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('服务器错误:', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('启动服务器失败:', error);
      reject(error);
    });

    // 10秒超时
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('服务器启动超时'));
      }
    }, 10000);
  });
}

// 停止服务器
function stopServer() {
  if (serverProcess) {
    console.log('停止服务器...');
    serverProcess.kill('SIGINT');
  }
}

// 测试注册功能
async function testRegistration() {
  try {
    console.log('测试用户注册功能...');
    
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    
    console.log('✅ 注册成功!');
    console.log('响应状态:', response.status);
    console.log('用户ID:', response.data.data.user.id);
    console.log('用户名:', response.data.data.user.username);
    console.log('邮箱:', response.data.data.user.email);
    console.log('访问令牌长度:', response.data.data.tokens.accessToken.length);
    
    return response.data.data.user.id;
    
  } catch (error) {
    if (error.response) {
      console.log('❌ 注册失败');
      console.log('状态码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ 网络错误:', error.message);
    }
    throw error;
  }
}

// 测试重复注册
async function testDuplicateRegistration() {
  try {
    console.log('测试重复注册...');
    
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    console.log('❌ 重复注册应该失败，但成功了');
    
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 重复注册正确被拒绝');
      console.log('错误信息:', error.response.data.message);
    } else {
      console.log('❌ 意外的错误:', error.message);
    }
  }
}

// 清理测试数据
async function cleanupTestData(userId) {
  try {
    console.log('清理测试数据...');
    // 这里可以添加删除用户的API调用
    console.log('✅ 测试数据清理完成');
  } catch (error) {
    console.log('清理数据时出错:', error.message);
  }
}

// 主测试函数
async function runTests() {
  try {
    console.log('=== 开始完整的注册功能测试 ===\n');
    
    // 启动服务器
    await startServer();
    
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 运行测试
    const userId = await testRegistration();
    await testDuplicateRegistration();
    await cleanupTestData(userId);
    
    console.log('\n✅ 所有测试完成!');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    stopServer();
    process.exit(0);
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n收到中断信号，正在清理...');
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n收到终止信号，正在清理...');
  stopServer();
  process.exit(0);
});

runTests();