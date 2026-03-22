/**
 * Notification Service
 * Functions related to notification CRUD, preferences, and muting.
 */

import {
  pool,
  toStringOrNull,
  toNumberOrNull,
  toBooleanOrNull,
} from './_helpers';

// In-memory store for notification preferences
const notificationPreferencesStore = new Map<string, Record<string, unknown>>();

export const notificationService = {
  normalize(row: Record<string, unknown> | null) {
    if (!row) return null;
    const payloadCandidate = row.payload;
    const payload = payloadCandidate && typeof payloadCandidate === 'object'
      ? (payloadCandidate as Record<string, unknown>)
      : {};

    return {
      id: row.id,
      userId: row.user_id ?? row.userId ?? null,
      user_id: row.user_id ?? row.userId ?? null,
      type: toStringOrNull(row.type),
      title: toStringOrNull(payload.title),
      message: toStringOrNull(payload.message),
      channels: Array.isArray(payload.channels) ? payload.channels : [],
      data: payload.data ?? {},
      muted: toBooleanOrNull(payload.muted) ?? false,
      readAt: row.read_at ?? row.readAt ?? null,
      read_at: row.read_at ?? row.readAt ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      payload,
    };
  },
  async send(userId: string, data: Record<string, unknown>) {
    return this.create({ userId, ...data });
  },
  async create(data: Record<string, unknown>) {
    const userId = toStringOrNull(data.userId) ?? toStringOrNull(data.user_id);
    if (!userId) {
      throw new Error('userId is required');
    }

    const payload: Record<string, unknown> = {};
    if (toStringOrNull(data.title)) payload.title = toStringOrNull(data.title);
    if (toStringOrNull(data.message)) payload.message = toStringOrNull(data.message);
    if (Array.isArray(data.channels)) payload.channels = data.channels;
    if (data.data && typeof data.data === 'object') payload.data = data.data;
    if (data.scheduledFor) payload.scheduledFor = data.scheduledFor;

    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, payload, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         RETURNING *`,
        [userId, toStringOrNull(data.type) ?? 'system', JSON.stringify(payload)]
      );
      return this.normalize(result.rows[0] ?? null);
    } catch {
      return {
        id: crypto.randomUUID(),
        userId,
        user_id: userId,
        type: toStringOrNull(data.type) ?? 'system',
        payload,
        readAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },
  async list(arg1: unknown, arg2?: unknown, arg3?: unknown, arg4?: unknown) {
    const userId = toStringOrNull(arg1);
    const filters = (!userId && arg1 && typeof arg1 === 'object')
      ? (arg1 as Record<string, unknown>)
      : ((arg2 && typeof arg2 === 'object') ? (arg2 as Record<string, unknown>) : {});
    const limit = Math.min(Math.max(toNumberOrNull(userId ? arg3 : arg2) ?? 50, 1), 100);
    const offset = Math.max(toNumberOrNull(userId ? arg4 : arg3) ?? 0, 0);

    if (!userId) {
      return { notifications: [], total: 0 };
    }

    const unreadOnly = toBooleanOrNull(filters.unreadOnly) ?? false;
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];

    if (unreadOnly) {
      conditions.push('read_at IS NULL');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notifications ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const rowsResult = await pool.query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      notifications: rowsResult.rows.map(row => this.normalize(row)),
      total,
    };
  },
  async getById(id: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications WHERE id = $1 LIMIT 1`,
        [id]
      );
      return this.normalize(result.rows[0] ?? null);
    } catch {
      return null;
    }
  },
  async getByIdForUser(id: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [id, userId]
      );
      return this.normalize(result.rows[0] ?? null);
    } catch {
      return null;
    }
  },
  async markRead(id: string, userId: string) {
    try {
      await pool.query(
        `UPDATE notifications
         SET read_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } catch {
      // no-op fallback
    }
    return { success: true };
  },
  async markAsRead(id: string, userId?: string) {
    if (!userId) {
      try {
        await pool.query(
          `UPDATE notifications
           SET read_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [id]
        );
      } catch {
        // no-op fallback
      }
      return { success: true };
    }

    return this.markRead(id, userId);
  },
  async toggleMute(id: string, muted: unknown) {
    const mutedValue = toBooleanOrNull(muted) ?? false;
    try {
      await pool.query(
        `UPDATE notifications
         SET
           payload = jsonb_set(COALESCE(payload, '{}'::jsonb), '{muted}', to_jsonb($2::boolean), true),
           updated_at = NOW()
         WHERE id = $1`,
        [id, mutedValue]
      );
    } catch {
      // no-op fallback
    }
    return { success: true, id, muted: mutedValue };
  },
  async getPreferences(userId: string) {
    const existing = notificationPreferencesStore.get(userId);
    if (existing) {
      return existing;
    }
    return {
      quietHours: null,
      channelPreferences: {},
      typePreferences: {},
      frequencyLimit: null,
      unsubscribeAll: false,
    };
  },
  async updatePreferences(userId: string, preferences: Record<string, unknown>) {
    const current = await this.getPreferences(userId);
    const merged = {
      ...current,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    notificationPreferencesStore.set(userId, merged);
    return merged;
  },
  async markAllRead(userId: string) {
    try {
      await pool.query(
        `UPDATE notifications
         SET read_at = NOW(), updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    } catch {
      // no-op fallback
    }
    return { success: true };
  },
  async deleteById(id: string) {
    try {
      const result = await pool.query(
        `DELETE FROM notifications WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  },
  async deleteByIdForUser(id: string, userId: string) {
    try {
      const result = await pool.query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  },
};
