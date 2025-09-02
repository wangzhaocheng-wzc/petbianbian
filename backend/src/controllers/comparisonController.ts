import { Request, Response } from 'express';
import { ComparisonService } from '../services/comparisonService';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    type?: string;
    role?: string;
  };
}

/**
 * 获取多宠物对比分析
 */
export const getMultiPetComparison = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const { petIds, days = 30 } = req.query;

    // 验证参数
    if (!petIds) {
      return res.status(400).json({
        success: false,
        message: '请选择要对比的宠物'
      });
    }

    let petIdArray: string[];
    if (typeof petIds === 'string') {
      petIdArray = petIds.split(',').filter(id => id.trim());
    } else if (Array.isArray(petIds)) {
      petIdArray = petIds.filter(id => typeof id === 'string' && id.trim());
    } else {
      return res.status(400).json({
        success: false,
        message: '宠物ID格式不正确'
      });
    }

    if (petIdArray.length < 2) {
      return res.status(400).json({
        success: false,
        message: '至少需要选择2个宠物进行对比'
      });
    }

    if (petIdArray.length > 5) {
      return res.status(400).json({
        success: false,
        message: '最多只能同时对比5个宠物'
      });
    }

    const daysNumber = parseInt(days as string, 10);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return res.status(400).json({
        success: false,
        message: '天数必须在1-365之间'
      });
    }

    const comparisonData = await ComparisonService.getMultiPetComparison(
      userId,
      petIdArray,
      daysNumber
    );

    res.json({
      success: true,
      message: '获取对比分析成功',
      data: comparisonData
    });

  } catch (error) {
    console.error('获取多宠物对比分析失败:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取宠物健康趋势对比
 */
export const getPetHealthTrends = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const { petIds, days = 30 } = req.query;

    // 验证参数
    if (!petIds) {
      return res.status(400).json({
        success: false,
        message: '请选择要对比的宠物'
      });
    }

    let petIdArray: string[];
    if (typeof petIds === 'string') {
      petIdArray = petIds.split(',').filter(id => id.trim());
    } else if (Array.isArray(petIds)) {
      petIdArray = petIds.filter(id => typeof id === 'string' && id.trim());
    } else {
      return res.status(400).json({
        success: false,
        message: '宠物ID格式不正确'
      });
    }

    if (petIdArray.length < 2) {
      return res.status(400).json({
        success: false,
        message: '至少需要选择2个宠物进行趋势对比'
      });
    }

    const daysNumber = parseInt(days as string, 10);
    if (isNaN(daysNumber) || daysNumber < 7 || daysNumber > 365) {
      return res.status(400).json({
        success: false,
        message: '天数必须在7-365之间'
      });
    }

    const trendsData = await ComparisonService.getPetHealthTrends(
      userId,
      petIdArray,
      daysNumber
    );

    res.json({
      success: true,
      message: '获取健康趋势对比成功',
      data: trendsData
    });

  } catch (error) {
    console.error('获取宠物健康趋势对比失败:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取用户所有宠物的基本信息（用于选择对比宠物）
 */
export const getPetsForComparison = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const Pet = require('../models/Pet').default;
    const { PoopRecord } = require('../models/PoopRecord');

    // 获取用户的所有宠物
    const pets = await Pet.find({
      ownerId: userId,
      isActive: true
    }).select('name type breed age weight avatar createdAt');

    // 获取每个宠物的记录数量
    const petsWithRecordCount = await Promise.all(
      pets.map(async (pet: any) => {
        const recordCount = await PoopRecord.countDocuments({
          petId: pet._id
        });

        const lastRecord = await PoopRecord.findOne({
          petId: pet._id
        }).sort({ timestamp: -1 }).select('timestamp');

        return {
          id: pet._id.toString(),
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
          avatar: pet.avatar,
          recordCount,
          lastRecordDate: lastRecord?.timestamp,
          createdAt: pet.createdAt
        };
      })
    );

    // 按记录数量排序，有记录的宠物优先
    petsWithRecordCount.sort((a, b) => {
      if (a.recordCount === 0 && b.recordCount === 0) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.recordCount === 0) return 1;
      if (b.recordCount === 0) return -1;
      return b.recordCount - a.recordCount;
    });

    res.json({
      success: true,
      message: '获取宠物列表成功',
      data: {
        pets: petsWithRecordCount,
        total: petsWithRecordCount.length
      }
    });

  } catch (error) {
    console.error('获取宠物列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};