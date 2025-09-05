const axios = require('axios');

async function debugRegister() {
    console.log('🔍 调试用户注册问题 - 使用简短用户名...\n');

    const API_BASE = 'http://localhost:5000/api';
    const timestamp = Date.now().toString().slice(-6); // 只取后6位

    const registerData = {
        username: `user${timestamp}`, // 更短的用户名
        email: `test${timestamp}@example.com`,
        password: 'abc123456', // 包含字母和数字
        confirmPassword: 'abc123456'
    };

    console.log('注册数据:', JSON.stringify(registerData, null, 2));
    console.log('用户名长度:', registerData.username.length);

    try {
        const response = await axios.post(`${API_BASE}/auth/register`, registerData);
        console.log('✅ 注册成功!');
        console.log('用户ID:', response.data.data.user.id);
        console.log('用户名:', response.data.data.user.username);

        // 立即测试登录
        console.log('\n🔐 测试登录...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: registerData.email,
            password: registerData.password
        });

        console.log('✅ 登录成功!');
        console.log('访问令牌已获取');

    } catch (error) {
        console.log('❌ 操作失败!');
        console.log('状态码:', error.response?.status);
        console.log('错误详情:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.data?.errors) {
            console.log('\n具体错误:');
            error.response.data.errors.forEach((err, index) => {
                console.log(`  ${index + 1}. 字段: ${err.field}, 错误: ${err.message}`);
            });
        }
    }
}

debugRegister();