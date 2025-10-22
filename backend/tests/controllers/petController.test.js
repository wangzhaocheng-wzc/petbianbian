"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../../src/models/User"));
const Pet_1 = __importDefault(require("../../src/models/Pet"));
const pets_1 = __importDefault(require("../../src/routes/pets"));
const constants_1 = require("../../src/config/constants");
// 创建测试应用
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/pets', pets_1.default);
describe('Pet Controller', () => {
    let testUser;
    let accessToken;
    beforeEach(async () => {
        // 创建测试用户
        const userData = {
            username: 'testowner',
            email: 'owner@example.com',
            password: 'password123'
        };
        testUser = new User_1.default(userData);
        await testUser.save();
        // 生成访问令牌
        accessToken = jsonwebtoken_1.default.sign({ id: testUser._id.toString(), email: testUser.email }, constants_1.APP_CONFIG.JWT_SECRET, { expiresIn: '1h' });
    });
    describe('GET /pets', () => {
        beforeEach(async () => {
            // 创建测试宠物
            const pets = [
                {
                    name: '小白',
                    type: 'dog',
                    breed: '金毛',
                    ownerId: testUser._id
                },
                {
                    name: '小黑',
                    type: 'cat',
                    breed: '英短',
                    ownerId: testUser._id
                },
                {
                    name: '小花',
                    type: 'dog',
                    breed: '泰迪',
                    ownerId: testUser._id,
                    isActive: false // 已删除的宠物
                }
            ];
            for (const petData of pets) {
                const pet = new Pet_1.default(petData);
                await pet.save();
            }
        });
        it('should get user pets successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('获取宠物列表成功');
            expect(response.body.data.pets).toBeDefined();
            expect(response.body.data.pets).toHaveLength(2); // 只返回活跃的宠物
            expect(response.body.data.total).toBe(2);
            // 验证宠物按创建时间倒序排列
            const pets = response.body.data.pets;
            expect(new Date(pets[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(pets[1].createdAt).getTime());
        });
        it('should return empty array for user with no pets', async () => {
            // 删除所有宠物
            await Pet_1.default.deleteMany({ ownerId: testUser._id });
            const response = await (0, supertest_1.default)(app)
                .get('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.pets).toEqual([]);
            expect(response.body.data.total).toBe(0);
        });
        it('should return error without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/pets')
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('GET /pets/:id', () => {
        let testPet;
        beforeEach(async () => {
            const petData = {
                name: '小白',
                type: 'dog',
                breed: '金毛',
                age: 24,
                weight: 25.5,
                ownerId: testUser._id
            };
            testPet = new Pet_1.default(petData);
            await testPet.save();
        });
        it('should get pet by id successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('获取宠物信息成功');
            expect(response.body.data).toBeDefined();
            expect(response.body.data.name).toBe(testPet.name);
            expect(response.body.data.type).toBe(testPet.type);
            expect(response.body.data.breed).toBe(testPet.breed);
        });
        it('should return error for non-existent pet', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await (0, supertest_1.default)(app)
                .get(`/pets/${fakeId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物不存在或无权限访问');
        });
        it('should return error for invalid pet id', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/pets/invalid-id')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(500);
            expect(response.body.success).toBe(false);
        });
        it('should return error without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/pets/${testPet._id}`)
                .expect(401);
            expect(response.body.success).toBe(false);
        });
        it('should return error for pet owned by another user', async () => {
            // 创建另一个用户的宠物
            const anotherUser = new User_1.default({
                username: 'anotheruser',
                email: 'another@example.com',
                password: 'password123'
            });
            await anotherUser.save();
            const anotherPet = new Pet_1.default({
                name: '别人的宠物',
                type: 'cat',
                ownerId: anotherUser._id
            });
            await anotherPet.save();
            const response = await (0, supertest_1.default)(app)
                .get(`/pets/${anotherPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物不存在或无权限访问');
        });
    });
    describe('POST /pets', () => {
        it('should create pet successfully', async () => {
            const petData = {
                name: '小白',
                type: 'dog',
                breed: '金毛',
                gender: 'male',
                age: 24,
                weight: 25.5,
                description: '一只可爱的金毛犬'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(petData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('宠物添加成功');
            expect(response.body.data).toBeDefined();
            expect(response.body.data.name).toBe(petData.name);
            expect(response.body.data.type).toBe(petData.type);
            expect(response.body.data.breed).toBe(petData.breed);
            expect(response.body.data.ownerId.toString()).toBe(testUser._id.toString());
            // 验证宠物已保存到数据库
            const savedPet = await Pet_1.default.findById(response.body.data._id);
            expect(savedPet).toBeTruthy();
            expect(savedPet?.name).toBe(petData.name);
        });
        it('should create pet with minimal data', async () => {
            const petData = {
                name: '小黑',
                type: 'cat'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(petData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(petData.name);
            expect(response.body.data.type).toBe(petData.type);
            expect(response.body.data.isActive).toBe(true);
        });
        it('should return error for missing required fields', async () => {
            const incompleteData = {
                breed: '金毛'
                // 缺少name和type
            };
            const response = await (0, supertest_1.default)(app)
                .post('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(incompleteData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物名称和类型是必填项');
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors).toHaveLength(2);
        });
        it('should return error for duplicate pet name', async () => {
            // 先创建一个宠物
            const existingPet = new Pet_1.default({
                name: '小白',
                type: 'dog',
                ownerId: testUser._id
            });
            await existingPet.save();
            // 尝试创建同名宠物
            const duplicateData = {
                name: '小白',
                type: 'cat'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(duplicateData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('您已经有一个同名的宠物了');
            expect(response.body.errors[0].field).toBe('name');
        });
        it('should return validation error for invalid data', async () => {
            const invalidData = {
                name: 'a'.repeat(21), // 超过最大长度
                type: 'invalid-type', // 无效类型
                age: -1, // 负数年龄
                weight: 201 // 超过最大体重
            };
            const response = await (0, supertest_1.default)(app)
                .post('/pets')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('数据验证失败');
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors.length).toBeGreaterThan(0);
        });
        it('should return error without authentication', async () => {
            const petData = {
                name: '小白',
                type: 'dog'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/pets')
                .send(petData)
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('PUT /pets/:id', () => {
        let testPet;
        beforeEach(async () => {
            const petData = {
                name: '小白',
                type: 'dog',
                breed: '金毛',
                ownerId: testUser._id
            };
            testPet = new Pet_1.default(petData);
            await testPet.save();
        });
        it('should update pet successfully', async () => {
            const updateData = {
                name: '大白',
                breed: '拉布拉多',
                age: 36,
                weight: 30.0,
                description: '更新后的描述'
            };
            const response = await (0, supertest_1.default)(app)
                .put(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('宠物信息更新成功');
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.breed).toBe(updateData.breed);
            expect(response.body.data.age).toBe(updateData.age);
            expect(response.body.data.weight).toBe(updateData.weight);
            expect(response.body.data.description).toBe(updateData.description);
            // 验证数据库中的数据已更新
            const updatedPet = await Pet_1.default.findById(testPet._id);
            expect(updatedPet?.name).toBe(updateData.name);
        });
        it('should update partial pet data', async () => {
            const updateData = {
                age: 48
            };
            const response = await (0, supertest_1.default)(app)
                .put(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.age).toBe(updateData.age);
            expect(response.body.data.name).toBe(testPet.name); // 其他字段保持不变
        });
        it('should return error for non-existent pet', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const updateData = { name: '新名字' };
            const response = await (0, supertest_1.default)(app)
                .put(`/pets/${fakeId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物不存在或无权限访问');
        });
        it('should return error for duplicate name', async () => {
            // 创建另一个宠物
            const anotherPet = new Pet_1.default({
                name: '小黑',
                type: 'cat',
                ownerId: testUser._id
            });
            await anotherPet.save();
            // 尝试将testPet的名字改为与anotherPet相同
            const updateData = { name: '小黑' };
            const response = await (0, supertest_1.default)(app)
                .put(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('您已经有一个同名的宠物了');
        });
        it('should return validation error for invalid data', async () => {
            const invalidData = {
                name: 'a'.repeat(21), // 超过最大长度
                age: -1 // 负数年龄
            };
            const response = await (0, supertest_1.default)(app)
                .put(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('数据验证失败');
        });
        it('should return error without authentication', async () => {
            const updateData = { name: '新名字' };
            const response = await (0, supertest_1.default)(app)
                .put(`/pets/${testPet._id}`)
                .send(updateData)
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('DELETE /pets/:id', () => {
        let testPet;
        beforeEach(async () => {
            const petData = {
                name: '小白',
                type: 'dog',
                breed: '金毛',
                ownerId: testUser._id
            };
            testPet = new Pet_1.default(petData);
            await testPet.save();
        });
        it('should delete pet successfully (soft delete)', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('宠物删除成功');
            // 验证宠物被软删除（isActive设为false）
            const deletedPet = await Pet_1.default.findById(testPet._id);
            expect(deletedPet).toBeTruthy();
            expect(deletedPet?.isActive).toBe(false);
            // 验证在获取宠物列表时不会返回已删除的宠物
            const petsResponse = await (0, supertest_1.default)(app)
                .get('/pets')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(petsResponse.body.data.pets).toHaveLength(0);
        });
        it('should return error for non-existent pet', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await (0, supertest_1.default)(app)
                .delete(`/pets/${fakeId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物不存在或无权限访问');
        });
        it('should return error for already deleted pet', async () => {
            // 先删除宠物
            await Pet_1.default.findByIdAndUpdate(testPet._id, { isActive: false });
            const response = await (0, supertest_1.default)(app)
                .delete(`/pets/${testPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物不存在或无权限访问');
        });
        it('should return error without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete(`/pets/${testPet._id}`)
                .expect(401);
            expect(response.body.success).toBe(false);
        });
        it('should return error for pet owned by another user', async () => {
            // 创建另一个用户的宠物
            const anotherUser = new User_1.default({
                username: 'anotheruser',
                email: 'another@example.com',
                password: 'password123'
            });
            await anotherUser.save();
            const anotherPet = new Pet_1.default({
                name: '别人的宠物',
                type: 'cat',
                ownerId: anotherUser._id
            });
            await anotherPet.save();
            const response = await (0, supertest_1.default)(app)
                .delete(`/pets/${anotherPet._id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('宠物不存在或无权限访问');
        });
    });
});
//# sourceMappingURL=petController.test.js.map