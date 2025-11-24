"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const postgres_1 = require("../config/postgres");
const User_1 = __importDefault(require("../models/User"));
const Pet_1 = __importDefault(require("../models/Pet"));
const pgSyncService_1 = require("../services/pgSyncService");
dotenv_1.default.config();
function envBool(name, def = false) {
    const v = (process.env[name] || '').toLowerCase();
    return v === '1' || v === 'true' || (v === '' ? def : false);
}
function envInt(name, def = 0) {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) && v > 0 ? v : def;
}
async function calibrateUsers(pool, dryRun, limit, summary) {
    const q = User_1.default.find();
    if (limit > 0)
        q.limit(limit);
    const users = await q.exec();
    console.log(`发现 Mongo 用户 ${users.length} 条（limit=${limit || 'none'}）`);
    for (const user of users) {
        summary.usersProcessed++;
        try {
            const externalId = String(user._id);
            // 如果 PG 中已按 external_id 命中，则跳过（节省写入）
            const hit = await pool.query('SELECT id, email FROM users WHERE external_id = $1 LIMIT 1', [externalId]);
            if (hit.rows[0]) {
                summary.usersSkipped++;
                continue;
            }
            // 若未命中，则执行 ensureUser（按 email 冲突更新 external_id）
            if (dryRun) {
                console.log(`[DRY] ensureUser email=${user.email} external_id=${externalId}`);
                summary.usersUpdated++;
            }
            else {
                await (0, pgSyncService_1.ensureUser)(user);
                summary.usersUpdated++;
            }
        }
        catch (err) {
            summary.usersFailed++;
            console.error('校准用户 external_id 失败:', err);
        }
    }
}
async function calibratePets(pool, dryRun, limit, summary) {
    const q = Pet_1.default.find();
    if (limit > 0)
        q.limit(limit);
    const pets = await q.exec();
    console.log(`发现 Mongo 宠物 ${pets.length} 条（limit=${limit || 'none'}）`);
    for (const pet of pets) {
        summary.petsProcessed++;
        try {
            const externalId = String(pet._id);
            const ownerExternalId = String(pet.ownerId);
            // 若已存在 external_id 映射，使用 upsert 以确保字段校准
            const existing = await pool.query('SELECT id FROM pets WHERE external_id = $1 LIMIT 1', [externalId]);
            if (existing.rows[0]) {
                if (dryRun) {
                    console.log(`[DRY] upsertPet (已存在 external_id) owner=${ownerExternalId} pet=${externalId}`);
                    summary.petsUpdated++;
                }
                else {
                    await (0, pgSyncService_1.upsertPet)(ownerExternalId, pet);
                    summary.petsUpdated++;
                }
                continue;
            }
            // 若不存在 external_id，尝试智能匹配：owner_id + name
            const ownerRow = await pool.query('SELECT id FROM users WHERE external_id = $1 LIMIT 1', [ownerExternalId]);
            const ownerId = ownerRow.rows[0]?.id || null;
            if (ownerId) {
                const match = await pool.query('SELECT id FROM pets WHERE owner_id = $1 AND name = $2 LIMIT 1', [ownerId, pet.name]);
                if (match.rows[0]?.id) {
                    const petId = match.rows[0].id;
                    if (dryRun) {
                        console.log(`[DRY] UPDATE pets SET external_id='${externalId}' WHERE id=${petId}`);
                        summary.petsCalibratedByMatch++;
                    }
                    else {
                        await pool.query('UPDATE pets SET external_id = $1, updated_at = now() WHERE id = $2', [externalId, petId]);
                        summary.petsCalibratedByMatch++;
                    }
                    continue;
                }
            }
            // 智能匹配失败，执行插入/更新以建立映射
            if (dryRun) {
                console.log(`[DRY] upsertPet (插入) owner=${ownerExternalId} pet=${externalId}`);
                summary.petsInserted++;
            }
            else {
                await (0, pgSyncService_1.upsertPet)(ownerExternalId, pet);
                summary.petsInserted++;
            }
        }
        catch (err) {
            summary.petsFailed++;
            console.error('校准宠物 external_id 失败:', err);
        }
    }
}
async function main() {
    const dryRun = envBool('SYNC_DRY_RUN', false);
    const limit = envInt('SYNC_LIMIT', 0);
    console.log(`启动 external_id 映射校准脚本（dryRun=${dryRun}, limit=${limit || 'none'}）`);
    // 连接 Mongo
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-health';
    await mongoose_1.default.connect(mongoUri);
    console.log('Mongo 连接成功');
    // 连接 Postgres
    const pool = await (0, postgres_1.getPostgresPool)();
    const version = await pool.query('SELECT version()');
    console.log(`Postgres 连接成功: ${version.rows?.[0]?.version}`);
    const summary = {
        usersProcessed: 0,
        usersUpdated: 0,
        usersSkipped: 0,
        usersFailed: 0,
        petsProcessed: 0,
        petsUpdated: 0,
        petsCalibratedByMatch: 0,
        petsInserted: 0,
        petsSkipped: 0,
        petsFailed: 0,
    };
    // 用户校准
    await calibrateUsers(pool, dryRun, limit, summary);
    // 宠物校准
    await calibratePets(pool, dryRun, limit, summary);
    // 关闭连接
    await mongoose_1.default.disconnect();
    await pool.end();
    console.log('校准完成：');
    console.table({
        usersProcessed: summary.usersProcessed,
        usersUpdated: summary.usersUpdated,
        usersSkipped: summary.usersSkipped,
        usersFailed: summary.usersFailed,
        petsProcessed: summary.petsProcessed,
        petsUpdated: summary.petsUpdated,
        petsCalibratedByMatch: summary.petsCalibratedByMatch,
        petsInserted: summary.petsInserted,
        petsSkipped: summary.petsSkipped,
        petsFailed: summary.petsFailed,
    });
}
main().catch(async (err) => {
    console.error('同步脚本执行失败:', err);
    try {
        await mongoose_1.default.disconnect();
    }
    catch { }
    process.exit(1);
});
//# sourceMappingURL=syncExternalIds.js.map