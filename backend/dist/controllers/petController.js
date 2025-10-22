"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePet = exports.updatePet = exports.createPet = exports.getPetById = exports.getPets = void 0;
const postgres_1 = require("../config/postgres");
// 获取用户的宠物列表
const getPets = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const pool = await (0, postgres_1.getPostgresPool)();
        const result = await pool.query(`SELECT p.id, p.owner_id, p.name, p.type, p.breed, p.gender, p.age, p.weight, p.avatar_url, p.description, p.created_at, p.updated_at,
              COALESCE(r.cnt, 0) AS record_count, r.last_ts AS last_record_date
         FROM pets p
         LEFT JOIN (
           SELECT pet_id, COUNT(*) AS cnt, MAX(timestamp) AS last_ts
           FROM poop_records
           GROUP BY pet_id
         ) r ON r.pet_id = p.id
        WHERE p.owner_id = $1
        ORDER BY p.created_at DESC`, [userId]);
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
        }));
        res.json({ success: true, message: '获取宠物列表成功', data: { pets, total: pets.length } });
    }
    catch (error) {
        console.error('获取宠物列表错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.getPets = getPets;
// 获取特定宠物信息
const getPetById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const petId = req.params.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const pool = await (0, postgres_1.getPostgresPool)();
        const r = await pool.query(`SELECT id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at
         FROM pets
        WHERE id = $1 AND owner_id = $2
        LIMIT 1`, [petId, userId]);
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
    }
    catch (error) {
        console.error('获取宠物信息错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.getPetById = getPetById;
// 创建新宠物
const createPet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const petData = req.body;
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
        const pool = await (0, postgres_1.getPostgresPool)();
        const dup = await pool.query('SELECT 1 FROM pets WHERE owner_id = $1 AND lower(name) = lower($2) LIMIT 1', [userId, petData.name.trim()]);
        if (dup.rows[0]) {
            return res.status(400).json({
                success: false,
                message: '您已经有一个同名的宠物了',
                errors: [{ field: 'name', message: '宠物名称已存在' }]
            });
        }
        const r = await pool.query(`INSERT INTO pets (owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
       RETURNING id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at`, [
            userId,
            petData.name.trim(),
            petData.type,
            petData.breed ?? null,
            petData.gender ?? null,
            petData.age ?? null,
            petData.weight ?? null,
            petData.avatar ?? null,
            petData.description ?? null,
        ]);
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
    }
    catch (error) {
        console.error('创建宠物错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.createPet = createPet;
// 更新宠物信息
const updatePet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const petId = req.params.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const updateData = req.body;
        const pool = await (0, postgres_1.getPostgresPool)();
        // 查找宠物并验证权限
        const currentRes = await pool.query('SELECT name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true', [petId, userId]);
        const current = currentRes.rows[0];
        if (!current) {
            return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
        }
        // 如果更新名称，检查是否与其他宠物重名
        if (updateData.name && updateData.name.trim() !== current.name) {
            const dup = await pool.query('SELECT 1 FROM pets WHERE owner_id = $1 AND lower(name) = lower($2) AND is_active = true AND id <> $3 LIMIT 1', [userId, updateData.name.trim(), petId]);
            if (dup.rows[0]) {
                return res.status(400).json({
                    success: false,
                    message: '您已经有一个同名的宠物了',
                    errors: [{ field: 'name', message: '宠物名称已存在' }]
                });
            }
        }
        // 动态构建更新语句
        const sets = [];
        const params = [petId, userId];
        let i = 3;
        const push = (field, value) => { sets.push(`${field} = $${i}`); params.push(value); i++; };
        if (updateData.name)
            push('name', updateData.name.trim());
        if (updateData.type)
            push('type', updateData.type);
        if (updateData.breed !== undefined)
            push('breed', updateData.breed ?? null);
        if (updateData.gender !== undefined)
            push('gender', updateData.gender ?? null);
        if (updateData.age !== undefined)
            push('age', updateData.age ?? null);
        if (updateData.weight !== undefined)
            push('weight', updateData.weight ?? null);
        if (updateData.avatar !== undefined)
            push('avatar_url', updateData.avatar ?? null);
        if (updateData.description !== undefined)
            push('description', updateData.description ?? null);
        let row;
        if (sets.length > 0) {
            const sql = `UPDATE pets SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, is_active, created_at, updated_at`;
            const r = await pool.query(sql, params);
            row = r.rows[0];
        }
        else {
            const r = await pool.query('SELECT id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, is_active, created_at, updated_at FROM pets WHERE id = $1 AND owner_id = $2', [petId, userId]);
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
    }
    catch (error) {
        console.error('更新宠物错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.updatePet = updatePet;
// 删除宠物（软删除）
const deletePet = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const petId = req.params.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const pool = await (0, postgres_1.getPostgresPool)();
        const r = await pool.query('UPDATE pets SET is_active = false, updated_at = now() WHERE id = $1 AND owner_id = $2 AND is_active = true RETURNING id', [petId, userId]);
        if (!r.rows[0]) {
            return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
        }
        res.json({ success: true, message: '宠物删除成功' });
    }
    catch (error) {
        console.error('删除宠物错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
exports.deletePet = deletePet;
//# sourceMappingURL=petController.js.map