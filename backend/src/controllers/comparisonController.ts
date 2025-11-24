import { Request, Response } from 'express';
import { ComparisonService } from '../services/comparisonService';
import { getPostgresPool } from '../config/postgres';

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
      petIdArray = petIds
        .filter((id): id is string => typeof id === 'string')
        .filter(id => id.trim());
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
      petIdArray = petIds
        .filter((id): id is string => typeof id === 'string')
        .filter(id => id.trim());
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

    const pool = await getPostgresPool();

    // 将令牌中的ID映射到 Postgres 用户ID（优先视为PG id，其次尝试 external_id）
    let ownerIdForPg: string | null = null;
    try {
      const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
      if (r1.rows[0]?.id) {
        ownerIdForPg = r1.rows[0].id;
      } else {
        const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
        if (r2.rows[0]?.id) {
          ownerIdForPg = r2.rows[0].id;
        }
      }
    } catch (e) {
      console.error('用户ID映射失败:', e);
    }

    if (!ownerIdForPg) {
      return res.status(404).json({
        success: false,
        message: '宠物不存在或无权限访问'
      });
    }

    const result = await pool.query(
      `SELECT p.id, p.name, p.type, p.breed, p.age, p.weight, p.avatar_url, p.created_at,
              COALESCE(r.cnt, 0) AS record_count, r.last_ts AS last_record_date
         FROM pets p
         LEFT JOIN (
           SELECT pet_id, COUNT(*) AS cnt, MAX(timestamp) AS last_ts
             FROM poop_records
            GROUP BY pet_id
         ) r ON r.pet_id = p.id
        WHERE p.owner_id = $1 AND p.is_active = true
        ORDER BY p.created_at DESC`,
      [ownerIdForPg]
    );

    type PetForComparison = {
      id: string;
      name: string;
      type: string;
      breed: string | null;
      age: number | null;
      weight: number | null;
      avatar: string | null;
      recordCount: number;
      lastRecordDate: Date | string | null;
      createdAt: Date | string;
    };

    const pets: PetForComparison[] = result.rows.map((row: any) => ({
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      breed: row.breed ?? null,
      age: row.age ?? null,
      weight: row.weight ?? null,
      avatar: row.avatar_url ?? null,
      recordCount: Number(row.record_count || 0),
      lastRecordDate: row.last_record_date || null,
      createdAt: row.created_at
    }));

    // 按记录数量排序，有记录的宠物优先
    pets.sort((a, b) => {
      if (a.recordCount === 0 && b.recordCount === 0) {
        return new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime();
      }
      if (a.recordCount === 0) return 1;
      if (b.recordCount === 0) return -1;
      return b.recordCount - a.recordCount;
    });

    res.json({
      success: true,
      message: '获取宠物列表成功',
      data: {
        pets,
        total: pets.length
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