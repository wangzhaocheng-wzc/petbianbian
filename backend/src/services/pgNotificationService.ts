import { Pool } from 'pg';
import { getPostgresPool } from '../config/postgres';
import { Logger } from '../utils/logger';

export interface PgListOptions {
  status?: 'unread' | 'read' | 'archived';
  type?: 'alert' | 'system' | 'community' | 'reminder';
  category?: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  page?: number;
  limit?: number;
}

export interface CreateNotificationRequestPg {
  userId: string;
  petId?: string;
  type: 'alert' | 'system' | 'community' | 'reminder';
  category: 'health' | 'frequency' | 'pattern' | 'emergency' | 'general';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channels?: { inApp?: boolean; email?: boolean; push?: boolean };
  scheduledFor?: Date;
  expiresAt?: Date;
}

export class PGNotificationService {
  private static poolPromise: Promise<Pool> = getPostgresPool();

  static async createNotification(payload: CreateNotificationRequestPg): Promise<any> {
    const {
      userId, petId, type, category, title, message,
      data, priority = 'normal', channels, scheduledFor, expiresAt
    } = payload;

    const channelsJson = {
      inApp: { enabled: channels?.inApp !== false, sent: false },
      email: { enabled: channels?.email === true, sent: false },
      push:  { enabled: channels?.push === true,  sent: false }
    };

    const statsJson = { viewCount: 0, clickCount: 0 };

    const sql = `
      INSERT INTO notifications (
        user_id, pet_id, type, category, title, message,
        data, status, priority, channels, scheduled_for, expires_at, stats
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, 'unread', $8, $9, $10, $11, $12
      )
      RETURNING *
    `;

    const params = [
      userId,
      petId ?? null,
      type,
      category,
      title,
      message,
      data ?? null,
      priority,
      channelsJson,
      scheduledFor ?? null,
      expiresAt ?? null,
      statsJson
    ];

    const pool = await this.poolPromise;
    const { rows } = await pool.query(sql, params);
    return rows[0];
  }

  static async getUserNotifications(userId: string, options: PgListOptions): Promise<any> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const filters: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (options.status) { filters.push(`status = $${idx++}`); params.push(options.status); }
    if (options.type) { filters.push(`type = $${idx++}`); params.push(options.type); }
    if (options.category) { filters.push(`category = $${idx++}`); params.push(options.category); }
    if (options.priority) { filters.push(`priority = $${idx++}`); params.push(options.priority); }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const listSql = `
      SELECT * FROM notifications
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const listParams = [...params, limit, offset];

    const countSql = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'unread') AS unread_count,
        COUNT(*) AS total
      FROM notifications
      ${where}
    `;

    const pool = await this.poolPromise;
    const [listRes, countRes] = await Promise.all([
      pool.query(listSql, listParams),
      pool.query(countSql, params)
    ]);

    return {
      items: listRes.rows,
      page,
      limit,
      total: Number(countRes.rows[0].total),
      unreadCount: Number(countRes.rows[0].unread_count)
    };
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const pool = await this.poolPromise;
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS c FROM notifications WHERE user_id = $1 AND status = 'unread'`,
      [userId]
    );
    return Number(rows[0]?.c ?? 0);
  }

  static async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const pool = await this.poolPromise;
    const { rowCount } = await pool.query(
      `UPDATE notifications SET status = 'read', updated_at = now() WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  static async markNotificationsAsRead(notificationIds: string[], userId: string): Promise<number> {
    if (!notificationIds?.length) return 0;
    const pool = await this.poolPromise;
    const { rowCount } = await pool.query(
      `UPDATE notifications SET status = 'read', updated_at = now() WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [userId, notificationIds]
    );
    return rowCount ?? 0;
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const pool = await this.poolPromise;
    const { rowCount } = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  static async getNotificationStatistics(userId: string, days = 30): Promise<any> {
    const sinceSql = `now() - interval '${Math.max(1, days)} days'`;

    const statusSql = `
      SELECT status AS key, COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1 AND created_at >= ${sinceSql}
      GROUP BY status
    `;

    const typeSql = `
      SELECT type AS key, COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1 AND created_at >= ${sinceSql}
      GROUP BY type
    `;

    const categorySql = `
      SELECT category AS key, COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1 AND created_at >= ${sinceSql}
      GROUP BY category
    `;

    const prioritySql = `
      SELECT priority AS key, COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1 AND created_at >= ${sinceSql}
      GROUP BY priority
    `;

    const dailySql = `
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1 AND created_at >= ${sinceSql}
      GROUP BY day
      ORDER BY day ASC
    `;

    const pool = await this.poolPromise;
    const [statusRes, typeRes, categoryRes, priorityRes, dailyRes] = await Promise.all([
      pool.query(statusSql, [userId]),
      pool.query(typeSql, [userId]),
      pool.query(categorySql, [userId]),
      pool.query(prioritySql, [userId]),
      pool.query(dailySql, [userId])
    ]);

    const reduce = (rows: any[]) => rows.reduce((acc: any, r: any) => { acc[r.key] = Number(r.count); return acc; }, {});

    return {
      totalNotifications: Object.values(reduce(statusRes.rows)).reduce((s: number, v: any) => s + Number(v), 0),
      unreadCount: Number(reduce(statusRes.rows)['unread'] ?? 0),
      readCount: Number(reduce(statusRes.rows)['read'] ?? 0),
      archivedCount: Number(reduce(statusRes.rows)['archived'] ?? 0),
      byType: reduce(typeRes.rows),
      byCategory: reduce(categoryRes.rows),
      byPriority: reduce(priorityRes.rows),
      recentActivity: dailyRes.rows.map(r => ({ date: r.day, count: Number(r.count) }))
    };
  }
}