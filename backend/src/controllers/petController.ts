import { Request, Response } from 'express';
import { CreatePetRequest, UpdatePetRequest } from '../types';
import { getPostgresPool } from '../config/postgres';
import { ensureUser, upsertPet } from '../services/pgSyncService';

// 获取用户的宠物列表
export const getPets = async (req: Request, res: Response) => {
  try {
    const externalUserId = req.user?.userId;
    if (!externalUserId) {
      return res.status(401).json({ success: false, message: '用户未认证' });
    }

    const pool = await getPostgresPool();
    const result = await pool.query(
      `SELECT p.id, p.owner_id, p.name, p.type, p.breed, p.gender, p.age, p.weight, p.avatar_url, p.description, p.created_at, p.updated_at, p.external_id,
              COALESCE(r.cnt, 0) AS record_count, r.last_ts AS last_record_date
         FROM pets p
         JOIN users u ON u.id = p.owner_id
         LEFT JOIN (
           SELECT pet_id, COUNT(*) AS cnt, MAX(timestamp) AS last_ts
           FROM poop_records
           GROUP BY pet_id
         ) r ON r.pet_id = p.id
        WHERE u.external_id = $1
        ORDER BY p.created_at DESC`,
      [externalUserId]
    );

    const pets = result.rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      type: row.type,
      breed: row.breed,
      gender: row.gender,
      age: row.age,
      weight: row.weight,
      avatar: row.avatar_url,
      description: row.description,
      isActive: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recordCount: Number(row.record_count || 0),
      lastRecordDate: row.last_record_date || null,
      externalId: row.external_id,
    }));

    // 若存在Mongo主库新增但未同步到PG的宠物，进行补充（避免列表缺失）
    try {
      const Pet = (await import('../models/Pet')).default;
      const mongoPets = await Pet.find({ ownerId: externalUserId }).sort({ createdAt: -1 });
      const existingExternalIds = new Set(pets.map((p: any) => String(p.externalId)).filter(Boolean));
      for (const mp of mongoPets) {
        const extId = String(mp._id);
        if (!existingExternalIds.has(extId)) {
          pets.push({
            id: extId,
            ownerId: String(mp.ownerId),
            name: mp.name,
            type: mp.type,
            breed: mp.breed ?? null,
            gender: mp.gender ?? null,
            age: mp.age ?? null,
            weight: mp.weight ?? null,
            avatar: mp.avatar ?? null,
            description: mp.description ?? null,
            isActive: true,
            createdAt: mp.createdAt,
            updatedAt: mp.updatedAt,
            recordCount: 0,
            lastRecordDate: null,
            externalId: extId,
          });
        }
      }
    } catch (e) {
      // 补充失败不阻断主流程
      console.warn('Mongo列表补充失败（忽略）:', e);
    }

    res.json({ success: true, message: '获取宠物列表成功', data: { pets, total: pets.length } });
  } catch (error) {
    console.error('获取宠物列表错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

// 获取特定宠物信息
export const getPetById = async (req: Request, res: Response) => {
  try {
    const externalUserId = req.user?.userId;
    const petId = req.params.id;

    if (!externalUserId) {
      return res.status(401).json({ success: false, message: '用户未认证' });
    }

    const pool = await getPostgresPool();
    const r = await pool.query(
      `SELECT p.id, p.owner_id, p.name, p.type, p.breed, p.gender, p.age, p.weight, p.avatar_url, p.description, p.created_at, p.updated_at
         FROM pets p
         JOIN users u ON u.id = p.owner_id
        WHERE p.id = $1 AND u.external_id = $2
        LIMIT 1`,
      [petId, externalUserId]
    );
    const row = r.rows[0];
    if (!row) {
      return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
    }
    const pet = {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      type: row.type,
      breed: row.breed,
      gender: row.gender,
      age: row.age,
      weight: row.weight,
      avatar: row.avatar_url,
      description: row.description,
      isActive: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    res.json({ success: true, message: '获取宠物信息成功', data: pet });
  } catch (error) {
    console.error('获取宠物信息错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

// 创建新宠物
export const createPet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' });
    }

    const petData: CreatePetRequest = req.body;
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

    const DB_PRIMARY = process.env.DB_PRIMARY || 'mongo';
    const pool = await getPostgresPool();

    // 将Mongo ObjectId令牌映射到Postgres用户uuid（如需要）
    let ownerIdForPg: string = userId;
    try {
      const mapped = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
      if (mapped.rows[0]?.id) {
        ownerIdForPg = mapped.rows[0].id;
      } else if (DB_PRIMARY === 'mongo') {
        try {
          const User = (await import('../models/User')).default;
          const userDoc = await User.findById(userId).select('username email password avatar role isActive isVerified createdAt updatedAt');
          if (userDoc) {
            await ensureUser(userDoc as any);
            const mapped2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
            if (mapped2.rows[0]?.id) {
              ownerIdForPg = mapped2.rows[0].id;
            }
          }
        } catch (e) {
          console.error('确保用户映射失败:', e);
        }
      }
    } catch (e) {
      console.error('查询用户映射失败:', e);
    }

    const dup = await pool.query(
      'SELECT 1 FROM pets WHERE owner_id = $1 AND lower(name) = lower($2) LIMIT 1',
      [ownerIdForPg, petData.name.trim()]
    );
    if (dup.rows[0]) {
      return res.status(400).json({
        success: false,
        message: '您已经有一个同名的宠物了',
        errors: [{ field: 'name', message: '宠物名称已存在' }]
      });
    }

    if (DB_PRIMARY === 'mongo') {
      try {
        const Pet = (await import('../models/Pet')).default;
        const petDoc = new Pet({
          name: petData.name.trim(),
          type: petData.type,
          breed: petData.breed ?? undefined,
          gender: petData.gender ?? undefined,
          age: petData.age ?? undefined,
          weight: petData.weight ?? undefined,
          avatar: (petData as any).avatar ?? undefined,
          description: petData.description ?? undefined,
          ownerId: userId,
        });
        await petDoc.save();

        await upsertPet(String(userId), petDoc as any);

        const pr = await pool.query(
          `SELECT id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at
             FROM pets
            WHERE external_id = $1
            LIMIT 1`,
          [String(petDoc._id)]
        );
        const row = pr.rows[0];
        if (!row) {
          const fallback = {
            id: String(petDoc._id),
            ownerId: String(petDoc.ownerId),
            name: petDoc.name,
            type: petDoc.type,
            breed: petDoc.breed ?? null,
            gender: petDoc.gender ?? null,
            age: petDoc.age ?? null,
            weight: petDoc.weight ?? null,
            avatar: petDoc.avatar ?? null,
            description: petDoc.description ?? null,
            isActive: true,
            createdAt: petDoc.createdAt,
            updatedAt: petDoc.updatedAt,
            recordCount: 0,
            lastRecordDate: null,
          };
          return res.status(201).json({ success: true, message: '宠物添加成功', data: fallback });
        }

        const petWithRecordInfo = {
          id: row.id,
          ownerId: row.owner_id,
          name: row.name,
          type: row.type,
          breed: row.breed,
          gender: row.gender,
          age: row.age,
          weight: row.weight,
          avatar: row.avatar_url,
          description: row.description,
          isActive: true,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          recordCount: 0,
          lastRecordDate: null,
        };

        return res.status(201).json({ success: true, message: '宠物添加成功', data: petWithRecordInfo });
      } catch (e) {
        console.error('Mongo主库创建宠物失败:', e);
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }
    }

    const r = await pool.query(
      `INSERT INTO pets (owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
       RETURNING id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at`,
      [
        ownerIdForPg,
        petData.name.trim(),
        petData.type,
        petData.breed ?? null,
        petData.gender ?? null,
        petData.age ?? null,
        petData.weight ?? null,
        (petData as any).avatar ?? null,
        petData.description ?? null,
      ]
    );
    const row = r.rows[0];
    const petWithRecordInfo = {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      type: row.type,
      breed: row.breed,
      gender: row.gender,
      age: row.age,
      weight: row.weight,
      avatar: row.avatar_url,
      description: row.description,
      isActive: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recordCount: 0,
      lastRecordDate: null,
    };

    res.status(201).json({ success: true, message: '宠物添加成功', data: petWithRecordInfo });
  } catch (error: any) {
    console.error('创建宠物错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

// 更新宠物信息
export const updatePet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const petId = req.params.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' });
    }

    const updateData: UpdatePetRequest = req.body;
    const pool = await getPostgresPool();

    // 将Mongo ObjectId映射到Postgres用户uuid
    let ownerIdForPg: string = userId;
    try {
      const mapped = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
      if (mapped.rows[0]?.id) {
        ownerIdForPg = mapped.rows[0].id;
      }
    } catch (e) {
      console.error('查询用户映射失败:', e);
    }

    // 查找宠物并验证权限
    const currentRes = await pool.query(
      'SELECT name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true',
      [petId, ownerIdForPg]
    );
    const current = currentRes.rows[0];
    if (!current) {
      return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
    }

    // 如果更新名称，检查是否与其他宠物重名
    if (updateData.name && updateData.name.trim() !== current.name) {
      const dup = await pool.query(
        'SELECT 1 FROM pets WHERE owner_id = $1 AND lower(name) = lower($2) AND is_active = true AND id <> $3 LIMIT 1',
        [ownerIdForPg, updateData.name.trim(), petId]
      );
      if (dup.rows[0]) {
        return res.status(400).json({
          success: false,
          message: '您已经有一个同名的宠物了',
          errors: [{ field: 'name', message: '宠物名称已存在' }]
        });
      }
    }

    // 动态构建更新语句
    const sets: string[] = [];
    const params: any[] = [petId, ownerIdForPg];
    let i = 3;
    const push = (field: string, value: any) => { sets.push(`${field} = $${i}`); params.push(value); i++; };

    if (updateData.name) push('name', updateData.name.trim());
    if (updateData.type) push('type', updateData.type);
    if (updateData.breed !== undefined) push('breed', updateData.breed ?? null);
    if (updateData.gender !== undefined) push('gender', updateData.gender ?? null);
    if (updateData.age !== undefined) push('age', updateData.age ?? null);
    if (updateData.weight !== undefined) push('weight', updateData.weight ?? null);
    if ((updateData as any).avatar !== undefined) push('avatar_url', (updateData as any).avatar ?? null);
    if (updateData.description !== undefined) push('description', updateData.description ?? null);

    let row;
    if (sets.length > 0) {
      const sql = `UPDATE pets SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, is_active, created_at, updated_at`;
      const r = await pool.query(sql, params);
      row = r.rows[0];
    } else {
      const r = await pool.query(
        'SELECT id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, is_active, created_at, updated_at FROM pets WHERE id = $1 AND owner_id = $2',
        [petId, ownerIdForPg]
      );
      row = r.rows[0];
    }

    const updatedPet = {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      type: row.type,
      breed: row.breed,
      gender: row.gender,
      age: row.age,
      weight: row.weight,
      avatar: row.avatar_url,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ success: true, message: '宠物信息更新成功', data: updatedPet });
  } catch (error: any) {
    console.error('更新宠物错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

// 删除宠物（软删除）
export const deletePet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const petId = req.params.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' });
    }

    const pool = await getPostgresPool();

    // 将Mongo ObjectId映射到Postgres用户uuid
    let ownerIdForPg: string = userId;
    try {
      const mapped = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
      if (mapped.rows[0]?.id) {
        ownerIdForPg = mapped.rows[0].id;
      }
    } catch (e) {
      console.error('查询用户映射失败:', e);
    }

    const r = await pool.query('UPDATE pets SET is_active = false, updated_at = now() WHERE id = $1 AND owner_id = $2 AND is_active = true RETURNING id', [petId, ownerIdForPg]);
    if (!r.rows[0]) {
      return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
    }

    res.json({ success: true, message: '宠物删除成功' });
  } catch (error) {
    console.error('删除宠物错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};