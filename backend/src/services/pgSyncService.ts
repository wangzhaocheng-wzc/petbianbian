import { Pool } from 'pg';
import crypto from 'crypto';
import { getPostgresPool } from '../config/postgres';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const getUserIdByExternal = async (pool: Pool, externalId: string): Promise<string | null> => {
  const r = await pool.query('SELECT id FROM users WHERE external_id = $1', [externalId]);
  return r.rows[0]?.id || null;
};

const getPetIdByExternal = async (pool: Pool, externalId: string): Promise<string | null> => {
  const r = await pool.query('SELECT id FROM pets WHERE external_id = $1', [externalId]);
  return r.rows[0]?.id || null;
};

export const ensureUser = async (user: any, options?: { refreshToken?: string; refreshExpiresAt?: Date }) => {
  try {
    const pool = await getPostgresPool();
    const now = new Date();
    const ures = await pool.query(
      `INSERT INTO users (username,email,password_hash,avatar_url,role,is_active,is_verified,external_id,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, avatar_url = EXCLUDED.avatar_url, role = EXCLUDED.role, is_active = EXCLUDED.is_active, is_verified = EXCLUDED.is_verified, external_id = EXCLUDED.external_id, updated_at = now()
       RETURNING id`,
      [
        user.username,
        user.email,
        user.password,
        user.avatar || null,
        user.role || 'user',
        user.isActive !== false,
        !!user.isVerified,
        String(user._id),
        user.createdAt || now,
        user.updatedAt || now,
      ]
    );
    const userId = ures.rows[0].id;

    await pool.query(
      `INSERT INTO user_profiles (user_id, first_name, last_name, phone, location, bio)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone, location = EXCLUDED.location, bio = EXCLUDED.bio`,
      [userId, user.profile?.firstName || null, user.profile?.lastName || null, user.profile?.phone || null, user.profile?.location || null, user.profile?.bio || null]
    );

    await pool.query(
      `INSERT INTO user_preferences (user_id, notifications, email_updates, language)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET notifications = EXCLUDED.notifications, email_updates = EXCLUDED.email_updates, language = EXCLUDED.language`,
      [userId, user.preferences?.notifications !== false, user.preferences?.emailUpdates !== false, user.preferences?.language || 'zh-CN']
    );

    await pool.query(
      `INSERT INTO user_stats (user_id, total_analysis, total_posts, reputation, updated_at)
       VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (user_id) DO UPDATE SET total_analysis = EXCLUDED.total_analysis, total_posts = EXCLUDED.total_posts, reputation = EXCLUDED.reputation, updated_at = now()`,
      [userId, user.stats?.totalAnalysis || 0, user.stats?.totalPosts || 0, user.stats?.reputation || 0]
    );

    if (options?.refreshToken && options.refreshExpiresAt) {
      const tokenHash = hashToken(options.refreshToken);
      await pool.query(
        `INSERT INTO user_tokens (user_id, refresh_token_hash, expires_at)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id, refresh_token_hash) DO NOTHING`,
        [userId, tokenHash, options.refreshExpiresAt]
      );
    }
  } catch (err) {
    console.error('Postgres ensureUser 失败（不影响主流程）:', err);
  }
};

export const updateLastLogin = async (userExternalId: string, date: Date) => {
  try {
    const pool = await getPostgresPool();
    await pool.query('UPDATE users SET last_login_at = $2, updated_at = now() WHERE external_id = $1', [userExternalId, date]);
  } catch (err) {
    console.error('Postgres updateLastLogin 失败:', err);
  }
};

export const recordRefreshToken = async (userExternalId: string, token: string, expiresAt: Date) => {
  try {
    const pool = await getPostgresPool();
    const userId = await getUserIdByExternal(pool, userExternalId);
    if (!userId) return;
    const tokenHash = hashToken(token);
    await pool.query(
      `INSERT INTO user_tokens (user_id, refresh_token_hash, expires_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, refresh_token_hash) DO NOTHING`,
      [userId, tokenHash, expiresAt]
    );
  } catch (err) {
    console.error('Postgres recordRefreshToken 失败:', err);
  }
};

export const revokeToken = async (token: string, userExternalId?: string) => {
  try {
    const pool = await getPostgresPool();
    const tokenHash = hashToken(token);
    let userId: string | null = null;
    if (userExternalId) userId = await getUserIdByExternal(pool, userExternalId);
    await pool.query('INSERT INTO revoked_tokens (user_id, token_hash) VALUES ($1,$2) ON CONFLICT (token_hash) DO NOTHING', [userId, tokenHash]);
  } catch (err) {
    console.error('Postgres revokeToken 失败:', err);
  }
};

export const isTokenRevoked = async (token: string): Promise<boolean> => {
  try {
    const pool = await getPostgresPool();
    const tokenHash = hashToken(token);
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE token_hash = $1 LIMIT 1', [tokenHash]);
    return !!r.rows[0];
  } catch (err) {
    // 出错时不阻断主流程
    return false;
  }
};

export const upsertPet = async (ownerExternalId: string, pet: any) => {
  try {
    const pool = await getPostgresPool();
    const ownerId = await getUserIdByExternal(pool, ownerExternalId);
    if (!ownerId) return;
    const now = new Date();
    await pool.query(
      `INSERT INTO pets (owner_id, name, type, breed, gender, age, weight, avatar_url, description, is_active, external_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (external_id) DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         breed = EXCLUDED.breed,
         gender = EXCLUDED.gender,
         age = EXCLUDED.age,
         weight = EXCLUDED.weight,
         avatar_url = EXCLUDED.avatar_url,
         description = EXCLUDED.description,
         is_active = EXCLUDED.is_active,
         updated_at = now()`,
      [
        ownerId,
        pet.name,
        pet.type,
        pet.breed || null,
        pet.gender || null,
        pet.age ?? null,
        pet.weight ?? null,
        pet.avatar || null,
        pet.description || null,
        pet.isActive !== false,
        String(pet._id),
        pet.createdAt || now,
        pet.updatedAt || now,
      ]
    );
  } catch (err) {
    console.error('Postgres upsertPet 失败:', err);
  }
};

export const deactivatePet = async (petExternalId: string) => {
  try {
    const pool = await getPostgresPool();
    await pool.query('UPDATE pets SET is_active = false, updated_at = now() WHERE external_id = $1', [petExternalId]);
  } catch (err) {
    console.error('Postgres deactivatePet 失败:', err);
  }
};

export const upsertPoopRecord = async (userExternalId: string, petExternalId: string, record: any) => {
  try {
    const pool = await getPostgresPool();
    const userId = await getUserIdByExternal(pool, userExternalId);
    const petId = await getPetIdByExternal(pool, petExternalId);
    if (!userId || !petId) return; // 未建立映射则跳过（符合“无需迁移旧数据”的策略）

    const now = new Date();
    const weather = record.weather
      ? { temperature: record.weather.temperature ?? null, humidity: record.weather.humidity ?? null }
      : null;
    const detectedFeatures = record.analysis?.detectedFeatures
      ? {
          color: record.analysis.detectedFeatures.color ?? null,
          texture: record.analysis.detectedFeatures.texture ?? null,
          consistency: record.analysis.detectedFeatures.consistency ?? null,
          size: record.analysis.detectedFeatures.size ?? null,
        }
      : null;

    await pool.query(
      `INSERT INTO poop_records (
         user_id, pet_id, image_url, thumbnail_url,
         shape, health_status, confidence, details,
         recommendations, detected_features,
         shape_description, health_status_description,
         user_notes, symptoms,
         latitude, longitude, weather,
         is_shared, timestamp,
         created_at, updated_at, external_id
       ) VALUES (
         $1,$2,$3,$4,
         $5,$6,$7,$8,
         $9,$10,
         $11,$12,
         $13,$14,
         $15,$16,$17,
         $18,$19,
         $20,$21,$22
       ) ON CONFLICT (external_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         pet_id = EXCLUDED.pet_id,
         image_url = EXCLUDED.image_url,
         thumbnail_url = EXCLUDED.thumbnail_url,
         shape = EXCLUDED.shape,
         health_status = EXCLUDED.health_status,
         confidence = EXCLUDED.confidence,
         details = EXCLUDED.details,
         recommendations = EXCLUDED.recommendations,
         detected_features = EXCLUDED.detected_features,
         shape_description = EXCLUDED.shape_description,
         health_status_description = EXCLUDED.health_status_description,
         user_notes = EXCLUDED.user_notes,
         symptoms = EXCLUDED.symptoms,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         weather = EXCLUDED.weather,
         is_shared = EXCLUDED.is_shared,
         timestamp = EXCLUDED.timestamp,
         updated_at = now()`,
      [
        userId,
        petId,
        record.imageUrl,
        record.thumbnailUrl || null,
        record.analysis?.shape,
        record.analysis?.healthStatus,
        record.analysis?.confidence,
        record.analysis?.details || null,
        Array.isArray(record.analysis?.recommendations) ? record.analysis.recommendations : [],
        detectedFeatures ? JSON.stringify(detectedFeatures) : null,
        typeof record.getShapeDescription === 'function' ? record.getShapeDescription() : null,
        typeof record.getHealthStatusDescription === 'function' ? record.getHealthStatusDescription() : null,
        record.userNotes || null,
        Array.isArray(record.symptoms) ? record.symptoms : [],
        record.location?.latitude ?? null,
        record.location?.longitude ?? null,
        weather ? JSON.stringify(weather) : null,
        !!record.isShared,
        record.timestamp || now,
        record.createdAt || now,
        record.updatedAt || now,
        String(record._id),
      ]
    );
  } catch (err) {
    console.error('Postgres upsertPoopRecord 失败:', err);
  }
};

export const deletePoopRecord = async (recordExternalId: string) => {
  try {
    const pool = await getPostgresPool();
    await pool.query('DELETE FROM poop_records WHERE external_id = $1', [recordExternalId]);
  } catch (err) {
    console.error('Postgres deletePoopRecord 失败:', err);
  }
};