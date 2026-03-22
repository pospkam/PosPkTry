import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { chatService } from '@/lib/services/chat.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/unread
 * Get unread message counts for the authenticated user.
 * Returns total unread + per-conversation breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const [total, perConversation] = await Promise.all([
      chatService.getTotalUnread(userOrResponse.userId),
      chatService.getUnreadCounts(userOrResponse.userId),
    ]);

    return NextResponse.json({
      success: true,
      data: { total, perConversation },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки непрочитанных', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
