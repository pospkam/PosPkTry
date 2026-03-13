import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { chatService } from '@/lib/services/chat.service';

const SendMessageSchema = z.object({
  content: z.string().min(1, 'Сообщение не может быть пустым').max(5000, 'Сообщение слишком длинное (максимум 5000 символов)'),
  messageType: z.enum(['text', 'system', 'image']).optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/conversations/[id]/messages
 * Get messages for a conversation (paginated, supports delta fetch).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const after = searchParams.get('after') || undefined;

    const { messages, total } = await chatService.getMessages({
      conversationId: id,
      userId: userOrResponse.userId,
      limit,
      offset,
      after,
    });

    return NextResponse.json({
      success: true,
      data: { messages, total },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_PARTICIPANT') {
      return NextResponse.json(
        { success: false, error: 'Нет доступа к этой беседе' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки сообщений', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/conversations/[id]/messages
 * Send a message in a conversation.
 * Body: { content, messageType? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const { id } = await params;
    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const content = parsed.data.content.trim();
    const messageType = parsed.data.messageType || 'text';

    const message = await chatService.sendMessage({
      conversationId: id,
      senderId: userOrResponse.userId,
      content,
      messageType,
    });

    return NextResponse.json({
      success: true,
      data: message,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_PARTICIPANT') {
      return NextResponse.json(
        { success: false, error: 'Нет доступа к этой беседе' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Ошибка отправки сообщения', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
