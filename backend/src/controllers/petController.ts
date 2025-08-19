import { Request, Response } from 'express';
import Pet, { IPet } from '../models/Pet';
import { CreatePetRequest, UpdatePetRequest } from '../../../shared/types';

// 获取用户的宠物列表
export const getPets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const pets = await Pet.find({ 
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
  } catch (error) {
    console.error('获取宠物列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取特定宠物信息
export const getPetById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const petId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const pet = await Pet.findOne({ 
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
  } catch (error) {
    console.error('获取宠物信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 创建新宠物
export const createPet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const petData: CreatePetRequest = req.body;

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
    const existingPet = await Pet.findOne({
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
    const newPet = new Pet({
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
  } catch (error: any) {
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

// 更新宠物信息
export const updatePet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const petId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const updateData: UpdatePetRequest = req.body;

    // 查找宠物并验证权限
    const pet = await Pet.findOne({ 
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
      const existingPet = await Pet.findOne({
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
    const updatedPet = await Pet.findByIdAndUpdate(
      petId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: '宠物信息更新成功',
      data: updatedPet
    });
  } catch (error: any) {
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

// 删除宠物（软删除）
export const deletePet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const petId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 查找宠物并验证权限
    const pet = await Pet.findOne({ 
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
    await Pet.findByIdAndUpdate(petId, { isActive: false });

    res.json({
      success: true,
      message: '宠物删除成功'
    });
  } catch (error) {
    console.error('删除宠物错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};