"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePet = exports.updatePet = exports.createPet = exports.getPetById = exports.getPets = void 0;
const Pet_1 = __importDefault(require("../models/Pet"));
// 获取用户的宠物列表
const getPets = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        const pets = await Pet_1.default.find({
            ownerId: userId,
            isActive: true
        }).sort({ createdAt: -1 });
        res.json({
            success: true,
            message: '获取宠物列表成功',
            data: {
                pets: pets,
                total: pets.length
            }
        });
    }
    catch (error) {
        console.error('获取宠物列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getPets = getPets;
// 获取特定宠物信息
const getPetById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const petId = req.params.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        const pet = await Pet_1.default.findOne({
            _id: petId,
            ownerId: userId,
            isActive: true
        });
        if (!pet) {
            return res.status(404).json({
                success: false,
                message: '宠物不存在或无权限访问'
            });
        }
        res.json({
            success: true,
            message: '获取宠物信息成功',
            data: pet
        });
    }
    catch (error) {
        console.error('获取宠物信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getPetById = getPetById;
// 创建新宠物
const createPet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        const petData = req.body;
        // 验证必填字段
        if (!petData.name || !petData.type) {
            return res.status(400).json({
                success: false,
                message: '宠物名称和类型是必填项',
                errors: [
                    ...(petData.name ? [] : [{ field: 'name', message: '宠物名称是必填项' }]),
                    ...(petData.type ? [] : [{ field: 'type', message: '宠物类型是必填项' }])
                ]
            });
        }
        // 检查用户是否已有同名宠物
        const existingPet = await Pet_1.default.findOne({
            ownerId: userId,
            name: petData.name.trim(),
            isActive: true
        });
        if (existingPet) {
            return res.status(400).json({
                success: false,
                message: '您已经有一个同名的宠物了',
                errors: [{ field: 'name', message: '宠物名称已存在' }]
            });
        }
        // 创建新宠物
        const newPet = new Pet_1.default({
            ...petData,
            ownerId: userId,
            isActive: true
        });
        const savedPet = await newPet.save();
        res.status(201).json({
            success: true,
            message: '宠物添加成功',
            data: savedPet
        });
    }
    catch (error) {
        console.error('创建宠物错误:', error);
        // 处理验证错误
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }));
            return res.status(400).json({
                success: false,
                message: '数据验证失败',
                errors
            });
        }
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.createPet = createPet;
// 更新宠物信息
const updatePet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const petId = req.params.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        const updateData = req.body;
        // 查找宠物并验证权限
        const pet = await Pet_1.default.findOne({
            _id: petId,
            ownerId: userId,
            isActive: true
        });
        if (!pet) {
            return res.status(404).json({
                success: false,
                message: '宠物不存在或无权限访问'
            });
        }
        // 如果更新名称，检查是否与其他宠物重名
        if (updateData.name && updateData.name !== pet.name) {
            const existingPet = await Pet_1.default.findOne({
                ownerId: userId,
                name: updateData.name.trim(),
                isActive: true,
                _id: { $ne: petId }
            });
            if (existingPet) {
                return res.status(400).json({
                    success: false,
                    message: '您已经有一个同名的宠物了',
                    errors: [{ field: 'name', message: '宠物名称已存在' }]
                });
            }
        }
        // 更新宠物信息
        const updatedPet = await Pet_1.default.findByIdAndUpdate(petId, { $set: updateData }, { new: true, runValidators: true });
        res.json({
            success: true,
            message: '宠物信息更新成功',
            data: updatedPet
        });
    }
    catch (error) {
        console.error('更新宠物错误:', error);
        // 处理验证错误
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }));
            return res.status(400).json({
                success: false,
                message: '数据验证失败',
                errors
            });
        }
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.updatePet = updatePet;
// 删除宠物（软删除）
const deletePet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const petId = req.params.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        // 查找宠物并验证权限
        const pet = await Pet_1.default.findOne({
            _id: petId,
            ownerId: userId,
            isActive: true
        });
        if (!pet) {
            return res.status(404).json({
                success: false,
                message: '宠物不存在或无权限访问'
            });
        }
        // 软删除宠物
        await Pet_1.default.findByIdAndUpdate(petId, { isActive: false });
        res.json({
            success: true,
            message: '宠物删除成功'
        });
    }
    catch (error) {
        console.error('删除宠物错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.deletePet = deletePet;
//# sourceMappingURL=petController.js.map