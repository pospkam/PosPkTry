import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyBookingOwnership } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/messages
 * Get messages for operator's bookings
 */
export async function GET(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'bookingId обязателен'
      } as ApiResponse<null>, { status: 400 });
    }

    // Verify booking ownership
    const isOwner = await verifyBookingOwnership(userId, bookingId);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const result = await query(
      `SELECT 
        cc.*,
        s.name as sender_name,
        r.name as recipient_name
      FROM client_communications cc
      JOIN users s ON cc.sender_id = s.id
      JOIN users r ON cc.recipient_id = r.id
      WHERE cc.booking_id = $1
      ORDER BY cc.created_at ASC`,
      [bookingId]
    );

    const messages = result.rows.map(row => ({
      id: row.id,
      bookingId: row.booking_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      recipientId: row.recipient_id,
      recipientName: row.recipient_name,
      message: row.message,
      isRead: row.is_read,
      isSystemMessage: row.is_system_message,
      attachments: row.attachments,
      metadata: row.metadata,
      createdAt: row.created_at,
      readAt: row.read_at
    }));

    return NextResponse.json({
      success: true,
      data: { messages }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении сообщений'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/messages
 * Send message to client
 */
export async function POST(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const body = await request.json();
    const { bookingId, recipientId, message, attachments } = body;

    if (!bookingId || !recipientId || !message) {
      return NextResponse.json({
        success: false,
        error: 'bookingId, recipientId и message обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    // Verify booking ownership
    const isOwner = await verifyBookingOwnership(userId, bookingId);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Send message
    const result = await query(
      `INSERT INTO client_communications (
        booking_id, sender_id, recipient_id, message, attachments
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        bookingId,
        userId,
        recipientId,
        message,
        JSON.stringify(attachments || [])
      ]
    );

    // Create notification for recipient
    await query(
      `INSERT INTO notifications (user_id, type, title, message, priority, action_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        recipientId,
        'new_message',
        'Новое сообщение',
        'Вы получили новое сообщение от оператора',
        'normal',
        `/hub/tourist/bookings/${bookingId}`
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Сообщение отправлено'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при отправке сообщения'
    } as ApiResponse<null>, { status: 500 });
  }
}
