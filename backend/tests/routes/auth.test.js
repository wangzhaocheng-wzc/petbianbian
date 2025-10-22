"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../../src/models/User"));
const auth_1 = __importDefault(require("../../src/routes/auth"));
const constants_1 = require("../../src/config/constants");
// 创建测试应用
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/auth', auth_1.default);
describe('Auth Routes', () => {
    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(userData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('用户注册成功');
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.username).toBe(userData.username);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.user.password).toBeUndefined(); // 密码不应该返回
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
            // 验证用户已保存到数据库
            const savedUser = await User_1.default.findOne({ email: userData.email });
            expect(savedUser).toBeTruthy();
            expect(savedUser?.username).toBe(userData.username);
        });
        it('should return error for duplicate username', async () => {
            // 先创建一个用户
            const userData = {
                username: 'testuser',
                email: 'test1@example.com',
                password: 'password123'
            };
            await (0, supertest_1.default)(app).post('/auth/register').send(userData);
            // 尝试使用相同用户名注册
            const duplicateData = {
                username: 'testuser', // 相同用户名
                email: 'test2@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(duplicateData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('用户名已存在');
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].field).toBe('username');
        });
        it('should return error for duplicate email', async () => {
            // 先创建一个用户
            const userData = {
                username: 'testuser1',
                email: 'test@example.com',
                password: 'password123'
            };
            await (0, supertest_1.default)(app).post('/auth/register').send(userData);
            // 尝试使用相同邮箱注册
            const duplicateData = {
                username: 'testuser2',
                email: 'test@example.com', // 相同邮箱
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(duplicateData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('邮箱已存在');
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].field).toBe('email');
        });
        it('should return validation error for missing fields', async () => {
            const incompleteData = {
                username: 'testuser'
                // 缺少email和password
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(incompleteData)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
        it('should return validation error for invalid email format', async () => {
            const invalidData = {
                username: 'testuser',
                email: 'invalid-email',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(invalidData)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
        it('should return validation error for short password', async () => {
            const invalidData = {
                username: 'testuser',
                email: 'test@example.com',
                password: '123' // 太短
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(invalidData)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('POST /auth/login', () => {
        let testUser;
        beforeEach(async () => {
            // 创建测试用户
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(userData);
            testUser = response.body.data.user;
        });
        it('should login successfully with valid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send(loginData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('登录成功');
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe(loginData.email);
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
            expect(response.body.data.user.lastLoginAt).toBeDefined();
        });
        it('should return error for non-existent user', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send(loginData)
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('邮箱或密码错误');
            expect(response.body.errors[0].field).toBe('email');
        });
        it('should return error for incorrect password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send(loginData)
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('邮箱或密码错误');
            expect(response.body.errors[0].field).toBe('password');
        });
        it('should return error for inactive user', async () => {
            // 禁用用户
            await User_1.default.findOneAndUpdate({ email: 'test@example.com' }, { isActive: false });
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send(loginData)
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('账户已被禁用，请联系管理员');
        });
        it('should return validation error for missing fields', async () => {
            const incompleteData = {
                email: 'test@example.com'
                // 缺少password
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send(incompleteData)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('POST /auth/refresh', () => {
        let refreshToken;
        let testUser;
        beforeEach(async () => {
            // 注册并登录用户获取refresh token
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(userData);
            refreshToken = registerResponse.body.data.tokens.refreshToken;
            testUser = registerResponse.body.data.user;
        });
        it('should refresh tokens successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('令牌刷新成功');
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
            // 新的token应该与原来的不同
            expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
        });
        it('should return error for missing refresh token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({})
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('刷新令牌缺失');
        });
        it('should return error for invalid refresh token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('无效的刷新令牌');
        });
        it('should return error for access token used as refresh token', async () => {
            // 使用access token作为refresh token
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send({
                email: 'test@example.com',
                password: 'password123'
            });
            const accessToken = loginResponse.body.data.tokens.accessToken;
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken: accessToken })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('无效的刷新令牌');
        });
        it('should return error for expired refresh token', async () => {
            // 创建一个已过期的refresh token
            const expiredToken = jsonwebtoken_1.default.sign({ id: testUser.id, email: testUser.email, type: 'refresh' }, constants_1.APP_CONFIG.JWT_SECRET, { expiresIn: '-1h' } // 已过期
            );
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken: expiredToken })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('刷新令牌已过期，请重新登录');
        });
        it('should return error for non-existent user', async () => {
            // 创建一个不存在用户的refresh token
            const fakeToken = jsonwebtoken_1.default.sign({ id: '507f1f77bcf86cd799439011', email: 'fake@example.com', type: 'refresh' }, constants_1.APP_CONFIG.JWT_SECRET, { expiresIn: '7d' });
            const response = await (0, supertest_1.default)(app)
                .post('/auth/refresh')
                .send({ refreshToken: fakeToken })
                .expect(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('用户不存在或已被禁用');
        });
    });
    describe('POST /auth/logout', () => {
        let accessToken;
        beforeEach(async () => {
            // 注册并登录用户获取access token
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(userData);
            accessToken = registerResponse.body.data.tokens.accessToken;
        });
        it('should logout successfully with valid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('登出成功');
        });
        it('should return error without token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/logout')
                .expect(401);
            expect(response.body.success).toBe(false);
        });
        it('should return error with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/logout')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('GET /auth/me', () => {
        let accessToken;
        let testUser;
        beforeEach(async () => {
            // 注册并登录用户获取access token
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(userData);
            accessToken = registerResponse.body.data.tokens.accessToken;
            testUser = registerResponse.body.data.user;
        });
        it('should get current user info successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.id).toBe(testUser.id);
            expect(response.body.data.user.username).toBe(testUser.username);
            expect(response.body.data.user.email).toBe(testUser.email);
            expect(response.body.data.user.password).toBeUndefined();
        });
        it('should return error without token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/auth/me')
                .expect(401);
            expect(response.body.success).toBe(false);
        });
        it('should return error with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            expect(response.body.success).toBe(false);
        });
        it('should return error for deleted user', async () => {
            // 删除用户
            await User_1.default.findByIdAndDelete(testUser.id);
            const response = await (0, supertest_1.default)(app)
                .get('/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('用户不存在');
        });
    });
    describe('Token Generation', () => {
        it('should generate valid JWT tokens', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/auth/register')
                .send(userData);
            const { accessToken, refreshToken } = response.body.data.tokens;
            // 验证access token
            const decodedAccess = jsonwebtoken_1.default.verify(accessToken, constants_1.APP_CONFIG.JWT_SECRET);
            expect(decodedAccess.id).toBeDefined();
            expect(decodedAccess.email).toBe(userData.email);
            expect(decodedAccess.type).toBeUndefined(); // access token没有type字段
            // 验证refresh token
            const decodedRefresh = jsonwebtoken_1.default.verify(refreshToken, constants_1.APP_CONFIG.JWT_SECRET);
            expect(decodedRefresh.id).toBeDefined();
            expect(decodedRefresh.email).toBe(userData.email);
            expect(decodedRefresh.type).toBe('refresh');
        });
    });
});
//# sourceMappingURL=auth.test.js.map