import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        marked: result.rows.length
      },
      message: `Отмечено ${result.rows.length} уведомлений`
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении уведомлений'
    } as ApiResponse<null>, { status: 500 });
  }
}
