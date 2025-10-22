"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRefreshTokenById = exports.updateLastLoginById = exports.comparePassword = exports.createUser = exports.emailExists = exports.usernameExists = exports.getUserById = exports.getUserAuthByEmail = exports.getUserByEmail = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const postgres_1 = require("../config/postgres");
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
const mapUserAggregate = (row) => {
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        avatar: row.avatar_url || null,
        role: row.role,
        profile: {
            firstName: row.first_name || null,
            lastName: row.last_name || null,
            phone: row.phone || null,
            location: row.location || null,
            bio: row.bio || null,
        },
        preferences: {
            notifications: row.notifications ?? true,
            emailUpdates: row.email_updates ?? true,
            language: row.language || 'zh-CN',
        },
        stats: {
            totalAnalysis: row.total_analysis ?? 0,
            totalPosts: row.total_posts ?? 0,
            reputation: row.reputation ?? 0,
        },
        isActive: !!row.is_active,
        isVerified: !!row.is_verified,
        lastLoginAt: row.last_login_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};
const getUserByEmail = async (email) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const r = await pool.query(`SELECT u.id, u.username, u.email, u.avatar_url, u.role, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login_at,
            p.first_name, p.last_name, p.phone, p.location, p.bio,
            pref.notifications, pref.email_updates, pref.language,
            s.total_analysis, s.total_posts, s.reputation
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN user_preferences pref ON pref.user_id = u.id
       LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE u.email = $1
      LIMIT 1`, [email]);
    const row = r.rows[0];
    return row ? mapUserAggregate(row) : null;
};
exports.getUserByEmail = getUserByEmail;
const getUserAuthByEmail = async (email) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const r = await pool.query(`SELECT u.id, u.username, u.email, u.password_hash, u.avatar_url, u.role, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login_at,
            p.first_name, p.last_name, p.phone, p.location, p.bio,
            pref.notifications, pref.email_updates, pref.language,
            s.total_analysis, s.total_posts, s.reputation
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN user_preferences pref ON pref.user_id = u.id
       LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE u.email = $1
      LIMIT 1`, [email]);
    const row = r.rows[0];
    if (!row)
        return null;
    return { agg: mapUserAggregate(row), passwordHash: row.password_hash };
};
exports.getUserAuthByEmail = getUserAuthByEmail;
const getUserById = async (id) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const r = await pool.query(`SELECT u.id, u.username, u.email, u.avatar_url, u.role, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login_at,
            p.first_name, p.last_name, p.phone, p.location, p.bio,
            pref.notifications, pref.email_updates, pref.language,
            s.total_analysis, s.total_posts, s.reputation
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN user_preferences pref ON pref.user_id = u.id
       LEFT JOIN user_stats s ON s.user_id = u.id
      WHERE u.id = $1
      LIMIT 1`, [id]);
    const row = r.rows[0];
    return row ? mapUserAggregate(row) : null;
};
exports.getUserById = getUserById;
const usernameExists = async (username) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const r = await pool.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', [username]);
    return !!r.rows[0];
};
exports.usernameExists = usernameExists;
const emailExists = async (email) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const r = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);
    return !!r.rows[0];
};
exports.emailExists = emailExists;
const createUser = async (params) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const { username, email, password } = params;
    const now = new Date();
    const salt = await bcryptjs_1.default.genSalt(12);
    const hash = await bcryptjs_1.default.hash(password, salt);
    const ures = await pool.query(`INSERT INTO users (username, email, password_hash, role, is_active, is_verified, created_at, updated_at)
     VALUES ($1, $2, $3, 'user', true, false, $4, $5)
     RETURNING id, username, email, avatar_url, role, is_active, is_verified, created_at, updated_at, last_login_at`, [username, email, hash, now, now]);
    const userId = ures.rows[0].id;
    await pool.query(`INSERT INTO user_profiles (user_id, first_name, last_name, phone, location, bio)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO NOTHING`, [userId, '', '', '', '', '']);
    await pool.query(`INSERT INTO user_preferences (user_id, notifications, email_updates, language)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO NOTHING`, [userId, true, true, 'zh-CN']);
    await pool.query(`INSERT INTO user_stats (user_id, total_analysis, total_posts, reputation, updated_at)
     VALUES ($1, 0, 0, 0, $2)
     ON CONFLICT (user_id) DO NOTHING`, [userId, now]);
    const agg = await (0, exports.getUserById)(userId);
    if (!agg)
        throw new Error('创建用户失败');
    return agg;
};
exports.createUser = createUser;
const comparePassword = async (raw, hash) => {
    return bcryptjs_1.default.compare(raw, hash);
};
exports.comparePassword = comparePassword;
const updateLastLoginById = async (userId, date) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    await pool.query('UPDATE users SET last_login_at = $2, updated_at = now() WHERE id = $1', [userId, date]);
};
exports.updateLastLoginById = updateLastLoginById;
const recordRefreshTokenById = async (userId, token, expiresAt) => {
    const pool = await (0, postgres_1.getPostgresPool)();
    const tokenHash = hashToken(token);
    await pool.query(`INSERT INTO user_tokens (user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, refresh_token_hash) DO NOTHING`, [userId, tokenHash, expiresAt]);
};
exports.recordRefreshTokenById = recordRefreshTokenById;
//# sourceMappingURL=pgUserService.js.map