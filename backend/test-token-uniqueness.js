const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试令牌唯一性
async function testTokenUniqueness() {
    console.log('🧪 测试令牌唯一性...\n');

    try {
        // 快速连续登录多次
        console.log('进行5次快速连续登录...');
        const loginPromises = [];

        for (let i = 0; i < 5; i++) {
            loginPromises.push(
                axios.post(`${BASE_URL}/auth/login`, {
                    email: 'test@example.com',
                    password: 'password123'
                })
            );
        }

        const responses = await Promise.all(loginPromises);

        // 提取所有访问令牌
        const accessTokens = responses.map(response => response.data.data.tokens.accessToken);
        const refreshTokens = responses.map(response => response.data.data.tokens.refreshToken);

        // 检查唯一性
        const uniqueAccessTokens = new Set(accessTokens);
        const uniqueRefreshTokens = new Set(refreshTokens);

        console.log('✅ 登录次数:', responses.length);
        console.log('✅ 访问令牌唯一性:', uniqueAccessTokens.size === accessTokens.length ? '通过' : '失败');
        console.log('✅ 刷新令牌唯一性:', uniqueRefreshTokens.size === refreshTokens.length ? '通过' : '失败');

        console.log('\n访问令牌数量:', accessTokens.length);
        console.log('唯一访问令牌数量:', uniqueAccessTokens.size);
        console.log('刷新令牌数量:', refreshTokens.length);
        console.log('唯一刷新令牌数量:', uniqueRefreshTokens.size);

        // 验证每个令牌都能正常工作
        console.log('\n验证所有令牌的有效性...');
        let validTokenCount = 0;

        for (let i = 0; i < accessTokens.length; i++) {
            try {
                const response = await axios.get(`${BASE_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${accessTokens[i]}` }
                });
                if (response.data.success) {
                    validTokenCount++;
                }
            } catch (error) {
                console.log(`令牌 ${i + 1} 无效:`, error.response?.data?.message);
            }
        }

        console.log('✅ 有效令牌数量:', validTokenCount);
        console.log('✅ 令牌有效性:', validTokenCount === accessTokens.length ? '全部有效' : '部分无效');

        if (uniqueAccessTokens.size === accessTokens.length && uniqueRefreshTokens.size === refreshTokens.length) {
            console.log('\n🎉 令牌唯一性测试通过！');
        } else {
            console.log('\n⚠️ 令牌唯一性测试失败');
        }

    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
    }
}

// 运行测试
testTokenUniqueness();