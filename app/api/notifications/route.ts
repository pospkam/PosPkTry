import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth, requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const CreateNotificationSchema = z.object({
  userId: z.string({ required_error: 'userId обязателен' }).min(1, 'userId обязателен'),
  type: z.string({ required_error: 'Тип уведомления обязателен' }).min(1, 'Тип уведомления обязателен'),
  title: z.string({ required_error: 'Заголовок обязателен' }).min(1, 'Заголовок обязателен'),
  message: z.string({ required_error: 'Сообщение обязательно' }).min(1, 'Сообщение обязательно'),
  data: z.record(z.unknown()).optional(),
  priority: z.string().optional(),
  actionUrl: z.string().optional(),
  expiresAt: z.string().optional(),
});

/**
 * GET /api/notifications
 * Get user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    let queryStr = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;

    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (unreadOnly) {
      queryStr += ` AND is_read = false`;
    }

    if (type) {
      queryStr += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    queryStr += ` AND is_archived = false`;
    queryStr += ` AND (expires_at IS NULL OR expires_at > NOW())`;
    queryStr += ` ORDER BY created_at DESC`;
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get unread count
    const countResult = await query<{ unread_count: string }>(
      `SELECT COUNT(*) as unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = false AND is_archived = false`,
      [userId]
    );

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      isRead: row.is_read,
      priority: row.priority,
      actionUrl: row.action_url,
      createdAt: row.created_at,
      readAt: row.read_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount: parseInt(countResult.rows[0].unread_count)
      }
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении уведомлений'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Create notification (system/admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json();
    const parsed = CreateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }

    const { userId, type, title, message, data, priority, actionUrl, expiresAt } = parsed.data;

    const result = await query(
      `INSERT INTO notifications (
        user_id, type, title, message, data, priority, action_url, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        type,
        title,
        message,
        JSON.stringify(data || {}),
        priority || 'normal',
        actionUrl,
        expiresAt
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Уведомление создано'
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании уведомления'
    } as ApiResponse<null>, { status: 500 });
  }
}
