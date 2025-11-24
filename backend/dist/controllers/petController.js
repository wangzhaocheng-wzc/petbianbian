"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePet = exports.updatePet = exports.createPet = exports.getPetById = exports.getPets = void 0;
const postgres_1 = require("../config/postgres");
const pgSyncService_1 = require("../services/pgSyncService");
// 获取用户的宠物列表
const getPets = async (req, res) => {
    try {
        const externalUserId = req.user?.userId;
        if (!externalUserId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const pool = await (0, postgres_1.getPostgresPool)();
        // 映射到 Postgres 用户ID（优先视为PG id，其次尝试 external_id）
        let ownerIdForPg = null;
        try {
            const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(externalUserId)]);
            if (r1.rows[0]?.id) {
                ownerIdForPg = r1.rows[0].id;
            }
            else {
                const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(externalUserId)]);
                if (r2.rows[0]?.id) {
                    ownerIdForPg = r2.rows[0].id;
                }
            }
        }
        catch (e) {
            console.error('用户ID映射失败:', e);
        }
        let resultRows = [];
        if (ownerIdForPg) {
            const result = await pool.query(`SELECT p.id, p.owner_id, p.name, p.type, p.breed, p.gender, p.age, p.weight, p.avatar_url, p.description, p.created_at, p.updated_at, p.external_id,
                COALESCE(r.cnt, 0) AS record_count, r.last_ts AS last_record_date
           FROM pets p
           LEFT JOIN (
             SELECT pet_id, COUNT(*) AS cnt, MAX(timestamp) AS last_ts
             FROM poop_records
             GROUP BY pet_id
           ) r ON r.pet_id = p.id
          WHERE p.owner_id = $1 AND p.is_active = true
          ORDER BY p.created_at DESC`, [ownerIdForPg]);
            resultRows = result.rows;
        }
        const pets = resultRows.map((row) => ({
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
        // 已切换为 PG 查询，移除旧的 Mongo 补充逻辑
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
        const externalUserId = req.user?.userId;
        const petId = req.params.id;
        if (!externalUserId) {
            return res.status(401).json({ success: false, message: '用户未认证' });
        }
        const pool = await (0, postgres_1.getPostgresPool)();
        // 映射到 Postgres 用户ID（优先视为PG id，其次尝试 external_id）
        let ownerIdForPg = null;
        try {
            const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(externalUserId)]);
            if (r1.rows[0]?.id) {
                ownerIdForPg = r1.rows[0].id;
            }
            else {
                const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(externalUserId)]);
                if (r2.rows[0]?.id) {
                    ownerIdForPg = r2.rows[0].id;
                }
            }
        }
        catch (e) {
            console.error('用户ID映射失败:', e);
        }
        if (!ownerIdForPg) {
            return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
        }
        const r = await pool.query(`SELECT p.id, p.owner_id, p.name, p.type, p.breed, p.gender, p.age, p.weight, p.avatar_url, p.description, p.created_at, p.updated_at
         FROM pets p
        WHERE p.id = $1 AND p.owner_id = $2 AND p.is_active = true
        LIMIT 1`, [petId, ownerIdForPg]);
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
        const DB_PRIMARY = process.env.DB_PRIMARY || 'postgres';
        const pool = await (0, postgres_1.getPostgresPool)();
        // 将令牌中的ID映射到Postgres用户uuid（先视为PG id，其次尝试 external_id；必要时在Mongo主库确保同步）
        let ownerIdForPg = null;
        try {
            // 优先当作PG主键ID处理
            const r1 = await pool.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
            if (r1.rows[0]?.id) {
                ownerIdForPg = r1.rows[0].id;
            }
            else {
                // 其次尝试 external_id 映射（适配Mongo颁发的ObjectId令牌）
                const r2 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                if (r2.rows[0]?.id) {
                    ownerIdForPg = r2.rows[0].id;
                }
                else if (DB_PRIMARY === 'mongo') {
                    // 当主库为Mongo时，尽力确保PG侧存在映射用户
                    try {
                        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
                        const userDoc = await User.findById(userId).select('username email password avatar role isActive isVerified createdAt updatedAt');
                        if (userDoc) {
                            await (0, pgSyncService_1.ensureUser)(userDoc);
                            const r3 = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
                            if (r3.rows[0]?.id) {
                                ownerIdForPg = r3.rows[0].id;
                            }
                        }
                    }
                    catch (e) {
                        console.error('确保用户映射失败:', e);
                    }
                }
            }
        }
        catch (e) {
            console.error('用户ID映射查询失败:', e);
        }
        // 若仍未找到有效的PG用户ID，则拒绝创建以避免UUID类型错误
        if (!ownerIdForPg) {
            return res.status(401).json({
                success: false,
                message: '用户映射未建立，请重新登录后重试'
            });
        }
        const dup = await pool.query('SELECT 1 FROM pets WHERE owner_id = $1 AND lower(name) = lower($2) LIMIT 1', [ownerIdForPg, petData.name.trim()]);
        if (dup.rows[0]) {
            return res.status(400).json({
                success: false,
                message: '您已经有一个同名的宠物了',
                errors: [{ field: 'name', message: '宠物名称已存在' }]
            });
        }
        if (DB_PRIMARY === 'mongo') {
            try {
                const Pet = (await Promise.resolve().then(() => __importStar(require('../models/Pet')))).default;
                const petDoc = new Pet({
                    name: petData.name.trim(),
                    type: petData.type,
                    breed: petData.breed ?? undefined,
                    gender: petData.gender ?? undefined,
                    age: petData.age ?? undefined,
                    weight: petData.weight ?? undefined,
                    avatar: petData.avatar ?? undefined,
                    description: petData.description ?? undefined,
                    ownerId: userId,
                });
                await petDoc.save();
                await (0, pgSyncService_1.upsertPet)(String(userId), petDoc);
                const pr = await pool.query(`SELECT id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at
             FROM pets
            WHERE external_id = $1
            LIMIT 1`, [String(petDoc._id)]);
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
            }
            catch (e) {
                console.error('Mongo主库创建宠物失败:', e);
                return res.status(500).json({ success: false, message: '服务器内部错误' });
            }
        }
        const r = await pool.query(`INSERT INTO pets (owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
       RETURNING id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, created_at, updated_at`, [
            ownerIdForPg,
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
        if (!row) {
            return res.status(500).json({ success: false, message: '服务器内部错误' });
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
        // 将Mongo ObjectId映射到Postgres用户uuid
        let ownerIdForPg = userId;
        try {
            const mapped = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
            if (mapped.rows[0]?.id) {
                ownerIdForPg = mapped.rows[0].id;
            }
        }
        catch (e) {
            console.error('查询用户映射失败:', e);
        }
        // 查找宠物并验证权限
        const currentRes = await pool.query('SELECT name FROM pets WHERE id = $1 AND owner_id = $2 AND is_active = true', [petId, ownerIdForPg]);
        const current = currentRes.rows[0];
        if (!current) {
            return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
        }
        // 如果更新名称，检查是否与其他宠物重名
        if (updateData.name && updateData.name.trim() !== current.name) {
            const dup = await pool.query('SELECT 1 FROM pets WHERE owner_id = $1 AND lower(name) = lower($2) AND is_active = true AND id <> $3 LIMIT 1', [ownerIdForPg, updateData.name.trim(), petId]);
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
        const params = [petId, ownerIdForPg];
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
            const r = await pool.query('SELECT id, owner_id, name, type, breed, gender, age, weight, avatar_url, description, is_active, created_at, updated_at FROM pets WHERE id = $1 AND owner_id = $2', [petId, ownerIdForPg]);
            row = r.rows[0];
        }
        if (!row) {
            return res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
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
        // 将Mongo ObjectId映射到Postgres用户uuid
        let ownerIdForPg = userId;
        try {
            const mapped = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [String(userId)]);
            if (mapped.rows[0]?.id) {
                ownerIdForPg = mapped.rows[0].id;
            }
        }
        catch (e) {
            console.error('查询用户映射失败:', e);
        }
        const r = await pool.query('UPDATE pets SET is_active = false, updated_at = now() WHERE id = $1 AND owner_id = $2 AND is_active = true RETURNING id', [petId, ownerIdForPg]);
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