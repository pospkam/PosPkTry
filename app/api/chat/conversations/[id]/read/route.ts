import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { chatService } from '@/lib/services/chat.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/conversations/[id]/read
 * Mark a conversation as read for the current user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const { id } = await params;

    const updated = await chatService.markAsRead(id, userOrResponse.userId);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Беседа не найдена или вы не участник' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка отметки прочтения', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
