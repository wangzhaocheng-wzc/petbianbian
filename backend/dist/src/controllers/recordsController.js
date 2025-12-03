"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordsController = void 0;
const logger_1 = require("../utils/logger");
const postgres_1 = require("../config/postgres");
class RecordsController {
    /**
     * 获取记录列表（支持复杂查询和筛选）
     */
    static async getRecords(req, res) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 10, sortBy = 'timestamp', sortOrder = 'desc', petId, healthStatus, shape, startDate, endDate, search, symptoms, minConfidence, maxConfidence, isShared } = req.query;
            // 分页 & 排序
            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.min(50, Math.max(1, Number(limit)));
            const offset = (pageNum - 1) * limitNum;
            const validSortFieldsMap = {
                'timestamp': 'pr.timestamp',
                'createdAt': 'pr.created_at',
                'analysis.confidence': 'pr.confidence',
                'analysis.healthStatus': 'pr.health_status'
            };
            const sortColumn = validSortFieldsMap[sortBy] || 'pr.timestamp';
            const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
            const pool = await (0, postgres_1.getPostgresPool)();
            const whereClauses = ['pr.user_id = $1'];
            const values = [userId];
            let idx = 2;
            if (petId) {
                whereClauses.push(`pr.pet_id = $${idx}`);
                values.push(petId);
                idx++;
            }
            if (healthStatus) {
                whereClauses.push(`pr.health_status = $${idx}`);
                values.push(healthStatus);
                idx++;
            }
            if (shape) {
                whereClauses.push(`pr.shape = $${idx}`);
                values.push(shape);
                idx++;
            }
            if (startDate) {
                whereClauses.push(`pr.timestamp >= $${idx}`);
                values.push(new Date(startDate));
                idx++;
            }
            if (endDate) {
                whereClauses.push(`pr.timestamp <= $${idx}`);
                values.push(new Date(endDate));
                idx++;
            }
            if (minConfidence !== undefined) {
                whereClauses.push(`pr.confidence >= $${idx}`);
                values.push(Number(minConfidence));
                idx++;
            }
            if (maxConfidence !== undefined) {
                whereClauses.push(`pr.confidence <= $${idx}`);
                values.push(Number(maxConfidence));
                idx++;
            }
            const symptomsArray = Array.isArray(symptoms)
                ? symptoms
                : (typeof symptoms === 'string' ? symptoms.split(',').map((s) => s.trim()).filter(Boolean) : []);
            if (symptomsArray.length > 0) {
                whereClauses.push(`EXISTS (SELECT 1 FROM unnest(pr.symptoms) s WHERE s = ANY($${idx}::text[]))`);
                values.push(symptomsArray);
                idx++;
            }
            if (isShared !== undefined) {
                const sharedFlag = typeof isShared === 'string' ? isShared === 'true' : !!isShared;
                whereClauses.push(`pr.is_shared = $${idx}`);
                values.push(sharedFlag);
                idx++;
            }
            if (search) {
                whereClauses.push(`(pr.user_notes ILIKE $${idx} OR pr.details ILIKE $${idx} OR EXISTS (SELECT 1 FROM unnest(pr.symptoms) s WHERE s ILIKE $${idx}))`);
                values.push(`%${search}%`);
                idx++;
            }
            const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const listSql = `
        SELECT pr.*, p.name AS pet_name, p.type AS pet_type, p.breed AS pet_breed, p.avatar_url AS pet_avatar_url
        FROM poop_records pr
        JOIN pets p ON p.id = pr.pet_id
        ${whereSQL}
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
            const listValues = [...values, limitNum, offset];
            const countSql = `SELECT COUNT(*)::int AS count FROM poop_records pr ${whereSQL}`;
            const [listRes, countRes] = await Promise.all([
                pool.query(listSql, listValues),
                pool.query(countSql, values)
            ]);
            const totalCount = countRes.rows[0]?.count || 0;
            const totalPages = Math.ceil(totalCount / limitNum);
            const formattedRecords = listRes.rows.map((row) => ({
                id: row.id,
                petId: row.pet_id,
                pet: {
                    id: row.pet_id,
                    name: row.pet_name,
                    type: row.pet_type,
                    breed: row.pet_breed,
                    avatar: row.pet_avatar_url
                },
                imageUrl: row.image_url,
                thumbnailUrl: row.thumbnail_url,
                analysis: {
                    shape: row.shape,
                    healthStatus: row.health_status,
                    confidence: row.confidence,
                    details: row.details || '',
                    detectedFeatures: row.detected_features || null,
                    recommendations: row.recommendations || [],
                    shapeDescription: row.shape_description || RecordsController.getShapeDescription(row.shape),
                    healthStatusDescription: row.health_status_description || RecordsController.getHealthStatusDescription(row.health_status)
                },
                userNotes: row.user_notes || '',
                symptoms: row.symptoms || [],
                timestamp: row.timestamp,
                isShared: row.is_shared,
                createdAt: row.created_at,
                updatedAt: row.updated_at
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
                        symptoms: symptomsArray,
                        minConfidence,
                        maxConfidence,
                        isShared
                    }
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取记录列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取记录列表失败'
            });
        }
    }
    /**
     * 获取单个记录详情
     */
    static async getRecordById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const pool = await (0, postgres_1.getPostgresPool)();
            const sql = `
        SELECT pr.*, p.name AS pet_name, p.type AS pet_type, p.breed AS pet_breed, p.avatar_url AS pet_avatar_url
        FROM poop_records pr
        JOIN pets p ON p.id = pr.pet_id
        WHERE pr.id = $1 AND pr.user_id = $2
        LIMIT 1
      `;
            const { rows } = await pool.query(sql, [id, userId]);
            const row = rows[0];
            if (!row) {
                res.status(404).json({ success: false, message: '记录不存在或无权限访问' });
                return;
            }
            const formattedRecord = {
                id: row.id,
                petId: row.pet_id,
                pet: {
                    id: row.pet_id,
                    name: row.pet_name,
                    type: row.pet_type,
                    breed: row.pet_breed,
                    avatar: row.pet_avatar_url
                },
                imageUrl: row.image_url,
                thumbnailUrl: row.thumbnail_url,
                analysis: {
                    shape: row.shape,
                    healthStatus: row.health_status,
                    confidence: row.confidence,
                    details: row.details || '',
                    detectedFeatures: row.detected_features || null,
                    recommendations: row.recommendations || [],
                    shapeDescription: row.shape_description || RecordsController.getShapeDescription(row.shape),
                    healthStatusDescription: row.health_status_description || RecordsController.getHealthStatusDescription(row.health_status)
                },
                userNotes: row.user_notes || '',
                symptoms: row.symptoms || [],
                timestamp: row.timestamp,
                location: (row.latitude != null && row.longitude != null) ? { latitude: row.latitude, longitude: row.longitude } : undefined,
                weather: row.weather || null,
                isShared: row.is_shared,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            res.json({ success: true, data: formattedRecord });
        }
        catch (error) {
            logger_1.Logger.error('获取记录详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取记录详情失败'
            });
        }
    }
    /**
     * 更新记录
     */
    static async updateRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { userNotes, symptoms, isShared } = req.body;
            const pool = await (0, postgres_1.getPostgresPool)();
            const setClauses = [];
            const values = [userId, id];
            let idx = 3;
            if (userNotes !== undefined) {
                setClauses.push(`user_notes = $${idx}`);
                values.push(userNotes);
                idx++;
            }
            if (symptoms !== undefined) {
                setClauses.push(`symptoms = $${idx}::text[]`);
                values.push(Array.isArray(symptoms) ? symptoms : (symptoms == null ? [] : [String(symptoms)]));
                idx++;
            }
            if (isShared !== undefined) {
                const sharedFlag = typeof isShared === 'string' ? isShared === 'true' : !!isShared;
                setClauses.push(`is_shared = $${idx}`);
                values.push(sharedFlag);
                idx++;
            }
            if (setClauses.length === 0) {
                res.status(400).json({ success: false, message: '没有可更新的有效字段' });
                return;
            }
            setClauses.push('updated_at = now()');
            const sql = `
        UPDATE poop_records AS pr
        SET ${setClauses.join(', ')}
        WHERE pr.user_id = $1 AND pr.id = $2
        RETURNING pr.*
      `;
            const updateRes = await pool.query(sql, values);
            const row = updateRes.rows[0];
            if (!row) {
                res.status(404).json({ success: false, message: '记录不存在或无权限修改' });
                return;
            }
            const petRes = await pool.query('SELECT name, type, breed, avatar_url FROM pets WHERE id = $1', [row.pet_id]);
            const pet = petRes.rows[0] || {};
            const formattedRecord = {
                id: row.id,
                petId: row.pet_id,
                pet: { id: row.pet_id, name: pet.name, type: pet.type, breed: pet.breed, avatar: pet.avatar_url },
                imageUrl: row.image_url,
                thumbnailUrl: row.thumbnail_url,
                analysis: {
                    shape: row.shape,
                    healthStatus: row.health_status,
                    confidence: row.confidence,
                    details: row.details || '',
                    detectedFeatures: row.detected_features || null,
                    recommendations: row.recommendations || [],
                    shapeDescription: row.shape_description || RecordsController.getShapeDescription(row.shape),
                    healthStatusDescription: row.health_status_description || RecordsController.getHealthStatusDescription(row.health_status)
                },
                userNotes: row.user_notes || '',
                symptoms: row.symptoms || [],
                timestamp: row.timestamp,
                isShared: row.is_shared,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            logger_1.Logger.info(`记录更新成功: ${id}`);
            res.json({ success: true, message: '记录更新成功', data: formattedRecord });
        }
        catch (error) {
            logger_1.Logger.error('更新记录失败:', error);
            res.status(500).json({
                success: false,
                message: '更新记录失败'
            });
        }
    }
    /**
     * 删除记录
     */
    static async deleteRecord(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const pool = await (0, postgres_1.getPostgresPool)();
            const { rowCount } = await pool.query('DELETE FROM poop_records WHERE id = $1 AND user_id = $2', [id, userId]);
            const affected = rowCount ?? 0;
            if (affected === 0) {
                res.status(404).json({ success: false, message: '记录不存在或无权限删除' });
                return;
            }
            logger_1.Logger.info(`记录删除成功: ${id}`);
            res.json({ success: true, message: '记录删除成功' });
        }
        catch (error) {
            logger_1.Logger.error('删除记录失败:', error);
            res.status(500).json({
                success: false,
                message: '删除记录失败'
            });
        }
    }
    /**
     * 获取统计概览
     */
    static async getStatisticsOverview(req, res) {
        try {
            const userId = req.user.userId;
            const { period = 'month' } = req.query;
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
            const periodStr = typeof period === 'string'
                ? period
                : Array.isArray(period) && typeof period[0] === 'string'
                    ? period[0]
                    : 'month';
            const days = daysMap[periodStr] ?? 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const pool = await (0, postgres_1.getPostgresPool)();
            const sql = `
        SELECT
          COUNT(*)::int AS total_records,
          SUM(CASE WHEN health_status = 'healthy' THEN 1 ELSE 0 END)::int AS healthy_count,
          SUM(CASE WHEN health_status = 'warning' THEN 1 ELSE 0 END)::int AS warning_count,
          SUM(CASE WHEN health_status = 'concerning' THEN 1 ELSE 0 END)::int AS concerning_count,
          ROUND(AVG(confidence))::int AS avg_confidence,
          COUNT(DISTINCT pet_id)::int AS unique_pets
        FROM poop_records
        WHERE user_id = $1 AND timestamp >= $2
      `;
            const { rows } = await pool.query(sql, [userId, startDate]);
            const r = rows[0] || {};
            const totalRecords = r.total_records || 0;
            const healthyCount = r.healthy_count || 0;
            const warningCount = r.warning_count || 0;
            const concerningCount = r.concerning_count || 0;
            const avgConfidence = r.avg_confidence || 0;
            const uniquePetsCount = r.unique_pets || 0;
            const healthyPercentage = totalRecords > 0 ? Math.round((healthyCount / totalRecords) * 100) : 0;
            const warningPercentage = totalRecords > 0 ? Math.round((warningCount / totalRecords) * 100) : 0;
            const concerningPercentage = totalRecords > 0 ? Math.round((concerningCount / totalRecords) * 100) : 0;
            const averagePerWeek = Math.round((totalRecords / days) * 7);
            res.json({
                success: true,
                data: {
                    period: periodStr,
                    days,
                    totalRecords,
                    healthyCount,
                    warningCount,
                    concerningCount,
                    healthyPercentage,
                    warningPercentage,
                    concerningPercentage,
                    avgConfidence,
                    uniquePetsCount,
                    averagePerWeek
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取统计概览失败:', error);
            res.status(500).json({
                success: false,
                message: '获取统计概览失败'
            });
        }
    }
    /**
     * 获取宠物记录统计
     */
    static async getPetStatistics(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.userId;
            const { period = 'month' } = req.query;
            const pool = await (0, postgres_1.getPostgresPool)();
            const petRes = await pool.query('SELECT name FROM pets WHERE id = $1 AND owner_id = $2', [petId, userId]);
            const pet = petRes.rows[0];
            if (!pet) {
                res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
                return;
            }
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
            const periodStr = typeof period === 'string'
                ? period
                : Array.isArray(period) && typeof period[0] === 'string'
                    ? period[0]
                    : 'month';
            const days = daysMap[periodStr] ?? 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const statsSql = `
        SELECT
          COUNT(*)::int AS total_records,
          SUM(CASE WHEN health_status = 'healthy' THEN 1 ELSE 0 END)::int AS healthy_count,
          SUM(CASE WHEN health_status = 'warning' THEN 1 ELSE 0 END)::int AS warning_count,
          SUM(CASE WHEN health_status = 'concerning' THEN 1 ELSE 0 END)::int AS concerning_count,
          ROUND(AVG(confidence))::int AS avg_confidence
        FROM poop_records
        WHERE user_id = $1 AND pet_id = $2 AND timestamp >= $3
      `;
            const { rows } = await pool.query(statsSql, [userId, petId, startDate]);
            const r = rows[0] || {};
            const totalRecords = r.total_records || 0;
            const healthyCount = r.healthy_count || 0;
            const warningCount = r.warning_count || 0;
            const concerningCount = r.concerning_count || 0;
            const avgConfidence = r.avg_confidence || 0;
            const healthyPercentage = totalRecords > 0 ? Math.round((healthyCount / totalRecords) * 100) : 0;
            const averagePerWeek = Math.round((totalRecords / days) * 7);
            res.json({
                success: true,
                data: {
                    petId,
                    petName: pet.name,
                    period: periodStr,
                    days,
                    totalRecords,
                    healthyPercentage,
                    avgConfidence,
                    healthyCount,
                    warningCount,
                    concerningCount,
                    averagePerWeek
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取宠物统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取宠物统计失败'
            });
        }
    }
    /**
     * 获取健康趋势数据
     */
    static async getHealthTrends(req, res) {
        try {
            const { petId } = req.params;
            const userId = req.user.userId;
            const { period = 'month' } = req.query;
            const pool = await (0, postgres_1.getPostgresPool)();
            const petRes = await pool.query('SELECT name FROM pets WHERE id = $1 AND owner_id = $2', [petId, userId]);
            const pet = petRes.rows[0];
            if (!pet) {
                res.status(404).json({ success: false, message: '宠物不存在或无权限访问' });
                return;
            }
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
            const periodStr = typeof period === 'string'
                ? period
                : Array.isArray(period) && typeof period[0] === 'string'
                    ? period[0]
                    : 'month';
            const days = daysMap[periodStr] ?? 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const sql = `
        SELECT DATE_TRUNC('day', timestamp) AS day,
          SUM(CASE WHEN health_status = 'healthy' THEN 1 ELSE 0 END)::int AS healthy,
          SUM(CASE WHEN health_status = 'warning' THEN 1 ELSE 0 END)::int AS warning,
          SUM(CASE WHEN health_status = 'concerning' THEN 1 ELSE 0 END)::int AS concerning
        FROM poop_records
        WHERE user_id = $1 AND pet_id = $2 AND timestamp >= $3
        GROUP BY day
        ORDER BY day ASC
      `;
            const { rows } = await pool.query(sql, [userId, petId, startDate]);
            const trends = rows.map(r => ({
                _id: new Date(r.day).toISOString().slice(0, 10),
                healthy: r.healthy || 0,
                warning: r.warning || 0,
                concerning: r.concerning || 0
            }));
            res.json({ success: true, data: { petId, petName: pet.name, period: periodStr, days, trends } });
        }
        catch (error) {
            logger_1.Logger.error('获取健康趋势失败:', error);
            res.status(500).json({
                success: false,
                message: '获取健康趋势失败'
            });
        }
    }
    /**
     * 获取聚合汇总数据
     */
    static async getAggregationSummary(req, res) {
        try {
            const userId = req.user.id;
            const pool = await (0, postgres_1.getPostgresPool)();
            const sql = `
        SELECT 
          p.id AS pet_id, p.name AS pet_name, p.type AS pet_type,
          COUNT(*)::int AS total_records,
          SUM(CASE WHEN pr.health_status = 'healthy' THEN 1 ELSE 0 END)::int AS healthy_count,
          SUM(CASE WHEN pr.health_status = 'warning' THEN 1 ELSE 0 END)::int AS warning_count,
          SUM(CASE WHEN pr.health_status = 'concerning' THEN 1 ELSE 0 END)::int AS concerning_count,
          ROUND(AVG(pr.confidence)::numeric, 1) AS avg_confidence,
          MAX(pr.timestamp) AS last_record,
          ARRAY_AGG(pr.shape) AS shape_list
        FROM poop_records pr
        JOIN pets p ON p.id = pr.pet_id
        WHERE pr.user_id = $1
        GROUP BY p.id, p.name, p.type
        ORDER BY total_records DESC
      `;
            const { rows } = await pool.query(sql, [userId]);
            const petSummaries = rows.map(r => {
                const shapeCount = {};
                (r.shape_list || []).forEach((shape) => {
                    shapeCount[shape] = (shapeCount[shape] || 0) + 1;
                });
                const healthyPercentage = r.total_records > 0 ? Math.round((r.healthy_count / r.total_records) * 100) : 0;
                return {
                    petId: r.pet_id,
                    petName: r.pet_name,
                    petType: r.pet_type,
                    totalRecords: r.total_records,
                    healthyCount: r.healthy_count,
                    warningCount: r.warning_count,
                    concerningCount: r.concerning_count,
                    healthyPercentage,
                    avgConfidence: Number(r.avg_confidence) || 0,
                    lastRecord: r.last_record,
                    shapeDistribution: shapeCount
                };
            });
            res.json({
                success: true,
                data: {
                    petSummaries,
                    totalPets: petSummaries.length,
                    totalRecords: petSummaries.reduce((sum, pet) => sum + pet.totalRecords, 0)
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('获取聚合汇总失败:', error);
            res.status(500).json({
                success: false,
                message: '获取聚合汇总失败'
            });
        }
    }
    /**
     * 批量删除记录
     */
    static async batchDeleteRecords(req, res) {
        try {
            const { recordIds } = req.body;
            const userId = req.user.id;
            if (!Array.isArray(recordIds) || recordIds.length === 0) {
                res.status(400).json({ success: false, message: '请提供要删除的记录ID列表' });
                return;
            }
            const pool = await (0, postgres_1.getPostgresPool)();
            const { rowCount } = await pool.query('DELETE FROM poop_records WHERE user_id = $1 AND id = ANY($2::uuid[])', [userId, recordIds]);
            logger_1.Logger.info(`批量删除记录: ${rowCount}/${recordIds.length}`);
            res.json({
                success: true,
                message: `成功删除 ${rowCount} 条记录`,
                data: {
                    deletedCount: rowCount,
                    requestedCount: recordIds.length
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('批量删除记录失败:', error);
            res.status(500).json({
                success: false,
                message: '批量删除记录失败'
            });
        }
    }
    /**
     * 批量更新记录
     */
    static async batchUpdateRecords(req, res) {
        try {
            const { recordIds, updateData } = req.body;
            const userId = req.user.id;
            if (!Array.isArray(recordIds) || recordIds.length === 0) {
                res.status(400).json({ success: false, message: '请提供要更新的记录ID列表' });
                return;
            }
            if (!updateData || typeof updateData !== 'object') {
                res.status(400).json({ success: false, message: '请提供更新数据' });
                return;
            }
            const setClauses = [];
            const values = [userId, recordIds];
            let idx = 3;
            if (Object.prototype.hasOwnProperty.call(updateData, 'userNotes')) {
                setClauses.push(`user_notes = $${idx}`);
                values.push(updateData.userNotes);
                idx++;
            }
            if (Object.prototype.hasOwnProperty.call(updateData, 'symptoms')) {
                setClauses.push(`symptoms = $${idx}::text[]`);
                values.push(Array.isArray(updateData.symptoms) ? updateData.symptoms : (updateData.symptoms == null ? [] : [String(updateData.symptoms)]));
                idx++;
            }
            if (Object.prototype.hasOwnProperty.call(updateData, 'isShared')) {
                const sharedFlag = typeof updateData.isShared === 'string' ? updateData.isShared === 'true' : !!updateData.isShared;
                setClauses.push(`is_shared = $${idx}`);
                values.push(sharedFlag);
                idx++;
            }
            if (setClauses.length === 0) {
                res.status(400).json({ success: false, message: '没有可更新的有效字段' });
                return;
            }
            setClauses.push('updated_at = now()');
            const pool = await (0, postgres_1.getPostgresPool)();
            const sql = `
        UPDATE poop_records AS pr
        SET ${setClauses.join(', ')}
        WHERE pr.user_id = $1 AND pr.id = ANY($2::uuid[])
      `;
            const result = await pool.query(sql, values);
            logger_1.Logger.info(`批量更新记录: ${result.rowCount}/${recordIds.length}`);
            res.json({
                success: true,
                message: `成功更新 ${result.rowCount} 条记录`,
                data: {
                    modifiedCount: result.rowCount,
                    matchedCount: result.rowCount,
                    requestedCount: recordIds.length
                }
            });
        }
        catch (error) {
            logger_1.Logger.error('批量更新记录失败:', error);
            res.status(500).json({
                success: false,
                message: '批量更新记录失败'
            });
        }
    }
    // 辅助方法
    static getShapeDescription(shape) {
        const descriptions = {
            type1: '第1型 - 硬球状（严重便秘）',
            type2: '第2型 - 块状（轻度便秘）',
            type3: '第3型 - 裂纹香肠状（正常偏硬）',
            type4: '第4型 - 光滑香肠状（理想状态）',
            type5: '第5型 - 软块状（正常偏软）',
            type6: '第6型 - 糊状（轻度腹泻）',
            type7: '第7型 - 水状（严重腹泻）'
        };
        return descriptions[shape] || '未知类型';
    }
    static getHealthStatusDescription(status) {
        const descriptions = {
            healthy: '健康 - 便便状态正常',
            warning: '警告 - 需要关注，建议调整',
            concerning: '异常 - 建议咨询兽医'
        };
        return descriptions[status] || '未知状态';
    }
}
exports.RecordsController = RecordsController;
//# sourceMappingURL=recordsController.js.map