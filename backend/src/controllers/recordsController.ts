import { Request, Response } from 'express';
import { PoopRecord, IPoopRecord } from '../models/PoopRecord';
import Pet from '../models/Pet';
import { Logger } from '../utils/logger';
import mongoose from 'mongoose';

interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  petId?: string;
  healthStatus?: 'healthy' | 'warning' | 'concerning';
  shape?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  symptoms?: string[];
  minConfidence?: number;
  maxConfidence?: number;
  isShared?: boolean;
}

export class RecordsController {
  /**
   * 获取记录列表（支持复杂查询和筛选）
   */
  static async getRecords(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const {
        page = 1,
        limit = 10,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        petId,
        healthStatus,
        shape,
        startDate,
        endDate,
        search,
        symptoms,
        minConfidence,
        maxConfidence,
        isShared
      } = req.query as any;

      // 构建查询条件
      const query: any = { userId };

      // 宠物筛选
      if (petId) {
        query.petId = petId;
      }

      // 健康状态筛选
      if (healthStatus) {
        query['analysis.healthStatus'] = healthStatus;
      }

      // 形状筛选
      if (shape) {
        query['analysis.shape'] = shape;
      }

      // 日期范围筛选
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }

      // 置信度范围筛选
      if (minConfidence !== undefined || maxConfidence !== undefined) {
        query['analysis.confidence'] = {};
        if (minConfidence !== undefined) {
          query['analysis.confidence'].$gte = Number(minConfidence);
        }
        if (maxConfidence !== undefined) {
          query['analysis.confidence'].$lte = Number(maxConfidence);
        }
      }

      // 症状筛选
      if (symptoms && Array.isArray(symptoms)) {
        query.symptoms = { $in: symptoms };
      }

      // 分享状态筛选
      if (isShared !== undefined) {
        query.isShared = isShared === 'true';
      }

      // 文本搜索（用户备注和分析详情）
      if (search) {
        query.$or = [
          { userNotes: { $regex: search, $options: 'i' } },
          { 'analysis.details': { $regex: search, $options: 'i' } },
          { symptoms: { $regex: search, $options: 'i' } }
        ];
      }

      // 分页参数
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit))); // 限制最大50条
      const skip = (pageNum - 1) * limitNum;

      // 排序参数
      const sortOptions: any = {};
      const validSortFields = ['timestamp', 'createdAt', 'analysis.confidence', 'analysis.healthStatus'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
      sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

      // 执行查询
      const [records, totalCount] = await Promise.all([
        PoopRecord.find(query)
          .populate('petId', 'name type breed avatar')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        PoopRecord.countDocuments(query)
      ]);

      // 计算分页信息
      const totalPages = Math.ceil(totalCount / limitNum);

      // 格式化响应数据
      const formattedRecords = records.map(record => ({
        id: record._id,
        petId: record.petId,
        pet: record.petId,
        imageUrl: record.imageUrl,
        thumbnailUrl: record.thumbnailUrl,
        analysis: {
          ...record.analysis,
          shapeDescription: RecordsController.getShapeDescription(record.analysis.shape),
          healthStatusDescription: RecordsController.getHealthStatusDescription(record.analysis.healthStatus)
        },
        userNotes: record.userNotes,
        symptoms: record.symptoms,
        timestamp: record.timestamp,
        isShared: record.isShared,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));

      res.json({
        success: true,
        data: {
          records: formattedRecords,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          },
          filters: {
            petId,
            healthStatus,
            shape,
            startDate,
            endDate,
            search,
            symptoms,
            minConfidence,
            maxConfidence,
            isShared
          }
        }
      });

    } catch (error) {
      Logger.error('获取记录列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取记录列表失败'
      });
    }
  }

  /**
   * 获取单个记录详情
   */
  static async getRecordById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: '无效的记录ID'
        });
        return;
      }

      const record = await PoopRecord.findOne({ _id: id, userId })
        .populate('petId', 'name type breed avatar age weight')
        .lean();

      if (!record) {
        res.status(404).json({
          success: false,
          message: '记录不存在或无权限访问'
        });
        return;
      }

      // 格式化响应数据
      const formattedRecord = {
        id: record._id,
        petId: record.petId,
        pet: record.petId,
        imageUrl: record.imageUrl,
        thumbnailUrl: record.thumbnailUrl,
        analysis: {
          ...record.analysis,
          shapeDescription: RecordsController.getShapeDescription(record.analysis.shape),
          healthStatusDescription: RecordsController.getHealthStatusDescription(record.analysis.healthStatus)
        },
        userNotes: record.userNotes,
        symptoms: record.symptoms,
        timestamp: record.timestamp,
        location: record.location,
        weather: record.weather,
        isShared: record.isShared,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };

      res.json({
        success: true,
        data: formattedRecord
      });

    } catch (error) {
      Logger.error('获取记录详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取记录详情失败'
      });
    }
  }

  /**
   * 更新记录
   */
  static async updateRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const { userNotes, symptoms, isShared } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: '无效的记录ID'
        });
        return;
      }

      // 构建更新数据
      const updateData: any = {};
      if (userNotes !== undefined) updateData.userNotes = userNotes;
      if (symptoms !== undefined) updateData.symptoms = symptoms;
      if (isShared !== undefined) updateData.isShared = isShared;

      const updatedRecord = await PoopRecord.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      ).populate('petId', 'name type breed avatar');

      if (!updatedRecord) {
        res.status(404).json({
          success: false,
          message: '记录不存在或无权限修改'
        });
        return;
      }

      Logger.info(`记录更新成功: ${id}`);

      res.json({
        success: true,
        message: '记录更新成功',
        data: updatedRecord
      });

    } catch (error) {
      Logger.error('更新记录失败:', error);
      res.status(500).json({
        success: false,
        message: '更新记录失败'
      });
    }
  }

  /**
   * 删除记录
   */
  static async deleteRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: '无效的记录ID'
        });
        return;
      }

      const deletedRecord = await PoopRecord.findOneAndDelete({ _id: id, userId });

      if (!deletedRecord) {
        res.status(404).json({
          success: false,
          message: '记录不存在或无权限删除'
        });
        return;
      }

      Logger.info(`记录删除成功: ${id}`);

      res.json({
        success: true,
        message: '记录删除成功'
      });

    } catch (error) {
      Logger.error('删除记录失败:', error);
      res.status(500).json({
        success: false,
        message: '删除记录失败'
      });
    }
  }

  /**
   * 获取统计概览
   */
  static async getStatisticsOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { period = 'month' } = req.query;

      // 根据周期确定天数
      const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
      const days = daysMap[period as keyof typeof daysMap] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 聚合查询
      const pipeline = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            healthyCount: {
              $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'healthy'] }, 1, 0] }
            },
            warningCount: {
              $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'warning'] }, 1, 0] }
            },
            concerningCount: {
              $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'concerning'] }, 1, 0] }
            },
            avgConfidence: { $avg: '$analysis.confidence' },
            uniquePets: { $addToSet: '$petId' }
          }
        }
      ];

      const [result] = await PoopRecord.aggregate(pipeline);

      if (!result) {
        res.json({
          success: true,
          data: {
            period,
            days,
            totalRecords: 0,
            healthyCount: 0,
            warningCount: 0,
            concerningCount: 0,
            healthyPercentage: 0,
            warningPercentage: 0,
            concerningPercentage: 0,
            avgConfidence: 0,
            uniquePetsCount: 0,
            averagePerWeek: 0
          }
        });
        return;
      }

      // 计算百分比
      const healthyPercentage = result.totalRecords > 0 
        ? Math.round((result.healthyCount / result.totalRecords) * 100) 
        : 0;
      const warningPercentage = result.totalRecords > 0 
        ? Math.round((result.warningCount / result.totalRecords) * 100) 
        : 0;
      const concerningPercentage = result.totalRecords > 0 
        ? Math.round((result.concerningCount / result.totalRecords) * 100) 
        : 0;

      // 计算平均每周记录数
      const averagePerWeek = Math.round((result.totalRecords / days) * 7);

      res.json({
        success: true,
        data: {
          period,
          days,
          totalRecords: result.totalRecords,
          healthyCount: result.healthyCount,
          warningCount: result.warningCount,
          concerningCount: result.concerningCount,
          healthyPercentage,
          warningPercentage,
          concerningPercentage,
          avgConfidence: Math.round(result.avgConfidence || 0),
          uniquePetsCount: result.uniquePets.length,
          averagePerWeek
        }
      });

    } catch (error) {
      Logger.error('获取统计概览失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计概览失败'
      });
    }
  }

  /**
   * 获取宠物记录统计
   */
  static async getPetStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const userId = (req as any).user.id;
      const { period = 'month' } = req.query;

      if (!mongoose.Types.ObjectId.isValid(petId)) {
        res.status(400).json({
          success: false,
          message: '无效的宠物ID'
        });
        return;
      }

      // 验证宠物所有权
      const pet = await Pet.findOne({ _id: petId, ownerId: userId });
      if (!pet) {
        res.status(404).json({
          success: false,
          message: '宠物不存在或无权限访问'
        });
        return;
      }

      const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
      const days = daysMap[period as keyof typeof daysMap] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 获取统计数据
      const statistics = await (PoopRecord as any).getHealthStatistics(petId, days);

      res.json({
        success: true,
        data: {
          petId,
          petName: pet.name,
          period,
          days,
          ...statistics
        }
      });

    } catch (error) {
      Logger.error('获取宠物统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取宠物统计失败'
      });
    }
  }

  /**
   * 获取健康趋势数据
   */
  static async getHealthTrends(req: Request, res: Response): Promise<void> {
    try {
      const { petId } = req.params;
      const userId = (req as any).user.id;
      const { period = 'month' } = req.query;

      if (!mongoose.Types.ObjectId.isValid(petId)) {
        res.status(400).json({
          success: false,
          message: '无效的宠物ID'
        });
        return;
      }

      // 验证宠物所有权
      const pet = await Pet.findOne({ _id: petId, ownerId: userId });
      if (!pet) {
        res.status(404).json({
          success: false,
          message: '宠物不存在或无权限访问'
        });
        return;
      }

      const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
      const days = daysMap[period as keyof typeof daysMap] || 30;

      // 获取趋势数据
      const trends = await (PoopRecord as any).getHealthTrends(petId, days);

      res.json({
        success: true,
        data: {
          petId,
          petName: pet.name,
          period,
          days,
          trends
        }
      });

    } catch (error) {
      Logger.error('获取健康趋势失败:', error);
      res.status(500).json({
        success: false,
        message: '获取健康趋势失败'
      });
    }
  }

  /**
   * 获取聚合汇总数据
   */
  static async getAggregationSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      // 复杂聚合查询
      const pipeline: any[] = [
        {
          $match: { userId: new mongoose.Types.ObjectId(userId) }
        },
        {
          $lookup: {
            from: 'pets',
            localField: 'petId',
            foreignField: '_id',
            as: 'pet'
          }
        },
        {
          $unwind: '$pet'
        },
        {
          $group: {
            _id: {
              petId: '$petId',
              petName: '$pet.name',
              petType: '$pet.type'
            },
            totalRecords: { $sum: 1 },
            healthyCount: {
              $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'healthy'] }, 1, 0] }
            },
            warningCount: {
              $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'warning'] }, 1, 0] }
            },
            concerningCount: {
              $sum: { $cond: [{ $eq: ['$analysis.healthStatus', 'concerning'] }, 1, 0] }
            },
            avgConfidence: { $avg: '$analysis.confidence' },
            lastRecord: { $max: '$timestamp' },
            shapeDistribution: {
              $push: '$analysis.shape'
            }
          }
        },
        {
          $project: {
            petId: '$_id.petId',
            petName: '$_id.petName',
            petType: '$_id.petType',
            totalRecords: 1,
            healthyCount: 1,
            warningCount: 1,
            concerningCount: 1,
            healthyPercentage: {
              $cond: [
                { $gt: ['$totalRecords', 0] },
                { $multiply: [{ $divide: ['$healthyCount', '$totalRecords'] }, 100] },
                0
              ]
            },
            avgConfidence: { $round: ['$avgConfidence', 1] },
            lastRecord: 1,
            shapeDistribution: 1,
            _id: 0
          }
        },
        {
          $sort: { totalRecords: -1 }
        }
      ];

      const petSummaries = await PoopRecord.aggregate(pipeline);

      // 计算形状分布
      const processedSummaries = petSummaries.map(summary => {
        const shapeCount: { [key: string]: number } = {};
        summary.shapeDistribution.forEach((shape: string) => {
          shapeCount[shape] = (shapeCount[shape] || 0) + 1;
        });

        return {
          ...summary,
          shapeDistribution: shapeCount,
          healthyPercentage: Math.round(summary.healthyPercentage)
        };
      });

      res.json({
        success: true,
        data: {
          petSummaries: processedSummaries,
          totalPets: processedSummaries.length,
          totalRecords: processedSummaries.reduce((sum, pet) => sum + pet.totalRecords, 0)
        }
      });

    } catch (error) {
      Logger.error('获取聚合汇总失败:', error);
      res.status(500).json({
        success: false,
        message: '获取聚合汇总失败'
      });
    }
  }

  /**
   * 批量删除记录
   */
  static async batchDeleteRecords(req: Request, res: Response): Promise<void> {
    try {
      const { recordIds } = req.body;
      const userId = (req as any).user.id;

      if (!Array.isArray(recordIds) || recordIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '请提供要删除的记录ID列表'
        });
        return;
      }

      // 验证所有ID格式
      const validIds = recordIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== recordIds.length) {
        res.status(400).json({
          success: false,
          message: '包含无效的记录ID'
        });
        return;
      }

      // 批量删除
      const result = await PoopRecord.deleteMany({
        _id: { $in: validIds },
        userId
      });

      Logger.info(`批量删除记录: ${result.deletedCount}/${recordIds.length}`);

      res.json({
        success: true,
        message: `成功删除 ${result.deletedCount} 条记录`,
        data: {
          deletedCount: result.deletedCount,
          requestedCount: recordIds.length
        }
      });

    } catch (error) {
      Logger.error('批量删除记录失败:', error);
      res.status(500).json({
        success: false,
        message: '批量删除记录失败'
      });
    }
  }

  /**
   * 批量更新记录
   */
  static async batchUpdateRecords(req: Request, res: Response): Promise<void> {
    try {
      const { recordIds, updateData } = req.body;
      const userId = (req as any).user.id;

      if (!Array.isArray(recordIds) || recordIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '请提供要更新的记录ID列表'
        });
        return;
      }

      if (!updateData || typeof updateData !== 'object') {
        res.status(400).json({
          success: false,
          message: '请提供更新数据'
        });
        return;
      }

      // 验证所有ID格式
      const validIds = recordIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== recordIds.length) {
        res.status(400).json({
          success: false,
          message: '包含无效的记录ID'
        });
        return;
      }

      // 只允许更新特定字段
      const allowedFields = ['userNotes', 'symptoms', 'isShared'];
      const filteredUpdateData: any = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredUpdateData).length === 0) {
        res.status(400).json({
          success: false,
          message: '没有可更新的有效字段'
        });
        return;
      }

      // 批量更新
      const result = await PoopRecord.updateMany(
        {
          _id: { $in: validIds },
          userId
        },
        filteredUpdateData
      );

      Logger.info(`批量更新记录: ${result.modifiedCount}/${recordIds.length}`);

      res.json({
        success: true,
        message: `成功更新 ${result.modifiedCount} 条记录`,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
          requestedCount: recordIds.length
        }
      });

    } catch (error) {
      Logger.error('批量更新记录失败:', error);
      res.status(500).json({
        success: false,
        message: '批量更新记录失败'
      });
    }
  }

  // 辅助方法
  private static getShapeDescription(shape: string): string {
    const descriptions = {
      type1: '第1型 - 硬球状（严重便秘）',
      type2: '第2型 - 块状（轻度便秘）',
      type3: '第3型 - 裂纹香肠状（正常偏硬）',
      type4: '第4型 - 光滑香肠状（理想状态）',
      type5: '第5型 - 软块状（正常偏软）',
      type6: '第6型 - 糊状（轻度腹泻）',
      type7: '第7型 - 水状（严重腹泻）'
    };
    return descriptions[shape as keyof typeof descriptions] || '未知类型';
  }

  private static getHealthStatusDescription(status: string): string {
    const descriptions = {
      healthy: '健康 - 便便状态正常',
      warning: '警告 - 需要关注，建议调整',
      concerning: '异常 - 建议咨询兽医'
    };
    return descriptions[status as keyof typeof descriptions] || '未知状态';
  }
}