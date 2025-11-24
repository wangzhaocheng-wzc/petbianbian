import mongoose from 'mongoose';
import { PoopRecord, IPoopRecord } from '../models/PoopRecord';
import { Logger } from '../utils/logger';
import { AIAnalysisResult } from './aiService';
import { upsertPoopRecord, deletePoopRecord } from './pgSyncService';
import { getPostgresPool } from '../config/postgres';

interface CreateAnalysisParams {
  userId: string;
  petId: string;
  imageUrl: string;
  result: AIAnalysisResult;
  userNotes?: string;
  symptoms?: string[] | string;
}

interface AnalysisQuery {
  userId?: string;
  petId?: string;
  startDate?: Date;
  endDate?: Date;
  healthStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ShareAnalysisParams {
  shareType: 'public' | 'private' | 'specific';
  shareWith?: string[];
}

interface AnalysisStatistics {
  totalRecords: number;
  healthStatusDistribution: {
    [key: string]: number;
  };
  shapeDistribution: {
    [key: string]: number;
  };
  averageConfidence: number;
  commonSymptoms: {
    symptom: string;
    count: number;
  }[];
  timeDistribution: {
    date: string;
    count: number;
  }[];
}

export class AnalysisService {
  /**
   * 解析并映射传入的用户/宠物ID到Mongo ObjectId
   * - 如果本身是合法的ObjectId字符串，直接转换
   * - 如果是Postgres的UUID，尝试从Postgres查找对应的external_id并转换
   */
  private static async resolveMongoObjectId(id: string, entity: 'user' | 'pet'): Promise<mongoose.Types.ObjectId> {
    // 先尝试直接作为ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }

    // 非ObjectId，尝试通过Postgres external_id映射
    try {
      const pool = await getPostgresPool();
      const table = entity === 'user' ? 'users' : 'pets';
      const { rows } = await pool.query(`SELECT external_id FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
      const externalId: string | undefined = rows[0]?.external_id;
      if (externalId && mongoose.Types.ObjectId.isValid(externalId)) {
        return new mongoose.Types.ObjectId(externalId);
      }
      throw new Error(`无法通过Postgres映射${entity}ID: ${id}`);
    } catch (err) {
      Logger.error('解析Mongo ObjectId失败:', err);
      throw err;
    }
  }

  /**
   * 创建分析记录
   */
  static async createAnalysisRecord(params: CreateAnalysisParams): Promise<any> {
    try {
      const dbPrimary = process.env.DB_PRIMARY || 'postgres';

      // 在 Postgres 主库模式下，直接写入 poop_records 表
      if (dbPrimary === 'postgres') {
        const pool = await getPostgresPool();

        // 症状入库处理：字符串按逗号拆分为数组
        const symptomsArray = Array.isArray(params.symptoms)
          ? params.symptoms
          : (typeof params.symptoms === 'string'
              ? params.symptoms.split(',').map(s => s.trim()).filter(Boolean)
              : []);

        const detectedFeaturesObj = params.result.detectedFeatures
          ? {
              color: params.result.detectedFeatures.color ?? null,
              texture: params.result.detectedFeatures.texture ?? null,
              consistency: params.result.detectedFeatures.consistency ?? null,
              size: params.result.detectedFeatures.size ?? null,
            }
          : null;

        const insertSql = `
          INSERT INTO poop_records (
            user_id, pet_id, image_url,
            shape, health_status, confidence, details,
            recommendations, detected_features,
            user_notes, symptoms,
            is_shared, timestamp, created_at, updated_at
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7,
            $8, $9,
            $10, $11,
            $12, now(), now(), now()
          ) RETURNING
            id, user_id, pet_id, image_url,
            shape, health_status, confidence, details,
            recommendations, detected_features,
            user_notes, symptoms,
            is_shared, timestamp, created_at, updated_at
        `;

        const values = [
          params.userId,
          params.petId,
          params.imageUrl,
          params.result.shape,
          params.result.healthStatus,
          params.result.confidence,
          params.result.details,
          params.result.recommendations || [],
          detectedFeaturesObj ? JSON.stringify(detectedFeaturesObj) : null,
          params.userNotes || null,
          symptomsArray,
          false,
        ];

        const { rows } = await pool.query(insertSql, values);
        const row = rows[0];

        // 返回与前端 PoopRecord 兼容的结构
        return {
          id: row.id,
          userId: row.user_id,
          petId: row.pet_id,
          imageUrl: row.image_url,
          thumbnailUrl: row.thumbnail_url || undefined,
          analysis: {
            shape: row.shape,
            healthStatus: row.health_status,
            confidence: row.confidence,
            details: row.details || '',
            recommendations: row.recommendations || [],
            detectedFeatures: (typeof row.detected_features === 'string'
              ? JSON.parse(row.detected_features)
              : (row.detected_features || {})),
          },
          userNotes: row.user_notes || undefined,
          symptoms: row.symptoms || [],
          timestamp: row.timestamp,
          isShared: row.is_shared,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }

      // 将传入的用户/宠物ID解析为Mongo ObjectId（支持从Postgres UUID映射）
      const mongoUserId = await AnalysisService.resolveMongoObjectId(params.userId, 'user');
      const mongoPetId = await AnalysisService.resolveMongoObjectId(params.petId, 'pet');

      const record = new PoopRecord({
        userId: mongoUserId,
        petId: mongoPetId,
        imageUrl: params.imageUrl,
        analysis: {
          healthStatus: params.result.healthStatus,
          shape: params.result.shape,
          confidence: params.result.confidence,
          details: params.result.details,
          recommendations: params.result.recommendations,
          detectedFeatures: params.result.detectedFeatures
        },
        userNotes: params.userNotes,
        symptoms: Array.isArray(params.symptoms)
          ? params.symptoms
          : (typeof params.symptoms === 'string'
              ? params.symptoms.split(',').map(s => s.trim()).filter(Boolean)
              : undefined),
        timestamp: new Date(),
        isShared: false
      });

      await record.save();
      // PG双写（若未建立用户或宠物映射则自动跳过）
      upsertPoopRecord(String(record.userId), String(record.petId), record);
      return record;
    } catch (error) {
      Logger.error('创建分析记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取分析记录列表
   */
  static async getAnalysisRecords(query: AnalysisQuery): Promise<{ records: IPoopRecord[]; total: number }> {
    try {
      const {
        userId,
        petId,
        startDate,
        endDate,
        healthStatus,
        page = 1,
        limit = 10,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = query;

      const filter: any = {};
      
      if (userId) filter.userId = userId;
      if (petId) filter.petId = petId;
      if (healthStatus) filter['analysis.healthStatus'] = healthStatus;
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = startDate;
        if (endDate) filter.timestamp.$lte = endDate;
      }

      const total = await PoopRecord.countDocuments(filter);
      
      const records = await PoopRecord.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      return {
        records,
        total
      };
    } catch (error) {
      Logger.error('获取分析记录列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个分析记录
   */
  static async getAnalysisRecord(id: string, userId?: string): Promise<IPoopRecord | null> {
    try {
      const filter: any = { _id: id };
      if (userId) filter.userId = userId;

      const record = await PoopRecord.findOne(filter);
      return record;
    } catch (error) {
      Logger.error('获取分析记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新分析记录
   */
  static async updateAnalysisRecord(id: string, userId: string, updateData: Partial<IPoopRecord>): Promise<IPoopRecord | null> {
    try {
      const record = await PoopRecord.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      );
      return record;
    } catch (error) {
      Logger.error('更新分析记录失败:', error);
      throw error;
    }
  }

  /**
   * 分享分析记录
   */
  static async shareAnalysisRecord(id: string, userId: string, params: ShareAnalysisParams): Promise<IPoopRecord | null> {
    try {
      const record = await PoopRecord.findOneAndUpdate(
        { _id: id, userId },
        {
          $set: {
            isShared: true,
            shareType: params.shareType,
            shareWith: params.shareWith || []
          }
        },
        { new: true }
      );
      return record;
    } catch (error) {
      Logger.error('分享分析记录失败:', error);
      throw error;
    }
  }

  /**
   * 删除分析记录
   */
  static async deleteAnalysisRecord(id: string): Promise<boolean> {
    try {
      const result = await PoopRecord.deleteOne({ _id: id });
      if (result.deletedCount && result.deletedCount > 0) {
        // 删除PG中的对应记录
        deletePoopRecord(String(id));
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('删除分析记录失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除分析记录
   */
  static async batchDeleteRecords(recordIds: string[]): Promise<{ success: boolean; message: string }> {
    try {
      const result = await PoopRecord.deleteMany({
        _id: { $in: recordIds.map(id => new mongoose.Types.ObjectId(id)) }
      });
      // 同步删除PG中的对应记录
      for (const rid of recordIds) {
        deletePoopRecord(String(rid));
      }
      return {
        success: true,
        message: `成功删除${result.deletedCount}条记录`
      };
    } catch (error) {
      Logger.error('批量删除分析记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取分析统计
   */
  static async getAnalysisStatistics(params: {
    userId: string;
    petId: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AnalysisStatistics> {
    try {
      const { userId, petId, startDate, endDate } = params;
      
      const filter: any = { userId, petId };
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = startDate;
        if (endDate) filter.timestamp.$lte = endDate;
      }

      // 获取所有符合条件的记录
      const records = await PoopRecord.find(filter);

      // 计算统计数据
      const statistics: AnalysisStatistics = {
        totalRecords: records.length,
        healthStatusDistribution: {},
        shapeDistribution: {},
        averageConfidence: 0,
        commonSymptoms: [],
        timeDistribution: []
      };

      // 临时存储症状计数
      const symptomsCount: { [key: string]: number } = {};
      let totalConfidence = 0;

      // 按日期分组的记录计数
      const dateCount: { [key: string]: number } = {};

      records.forEach((record: IPoopRecord) => {
        // 健康状态分布
        const healthStatus = record.analysis.healthStatus;
        statistics.healthStatusDistribution[healthStatus] = 
          (statistics.healthStatusDistribution[healthStatus] || 0) + 1;

        // 形状分布
        const shape = record.analysis.shape;
        statistics.shapeDistribution[shape] = 
          (statistics.shapeDistribution[shape] || 0) + 1;

        // 置信度累加
        totalConfidence += record.analysis.confidence;

        // 症状统计
        if (record.symptoms) {
          record.symptoms.forEach((symptom: string) => {
            symptomsCount[symptom] = (symptomsCount[symptom] || 0) + 1;
          });
        }

        // 时间分布
        const date = record.timestamp.toISOString().split('T')[0];
        dateCount[date] = (dateCount[date] || 0) + 1;
      });

      // 计算平均置信度
      statistics.averageConfidence = records.length > 0 
        ? totalConfidence / records.length 
        : 0;

      // 转换症状计数为数组并排序
      statistics.commonSymptoms = Object.entries(symptomsCount)
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);  // 只取前5个最常见的症状

      // 转换时间分布为数组并排序
      statistics.timeDistribution = Object.entries(dateCount)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return statistics;
    } catch (error) {
      Logger.error('获取分析统计失败:', error);
      throw error;
    }
  }
}