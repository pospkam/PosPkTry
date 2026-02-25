import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Get user notifications
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }

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

    const params: any[] = [userId];
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
    const countResult = await query(
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
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get notifications error:', error);
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
    const userRole = request.headers.get('X-User-Role');
    
    if (userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const { userId, type, title, message, data, priority, actionUrl, expiresAt } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json({
        success: false,
        error: 'Отсутствуют обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

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
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании уведомления'
    } as ApiResponse<null>, { status: 500 });
  }
}
