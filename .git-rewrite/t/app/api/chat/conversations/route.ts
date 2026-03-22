import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { chatService } from '@/lib/services/chat.service';

const CreateConversationSchema = z.object({
  participantId: z.string().min(1, 'participantId обязателен'),
  participantRole: z.string().optional(),
  subject: z.string().optional(),
  bookingId: z.string().optional(),
  tourId: z.string().optional(),
  message: z.string().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/conversations
 * List conversations for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { conversations, total } = await chatService.listConversations({
      userId: userOrResponse.userId,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: { conversations, total },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки бесед', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/conversations
 * Create or find a direct conversation with another user.
 * Body: { participantId, participantRole?, subject?, bookingId?, tourId?, message? }
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const body = await request.json();
    const parsed = CreateConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const participantId = parsed.data.participantId.trim();
    const participantRole = parsed.data.participantRole || 'tourist';
    const subject = parsed.data.subject?.trim();
    const bookingId = parsed.data.bookingId?.trim();
    const tourId = parsed.data.tourId;
    const message = parsed.data.message?.trim();

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: 'participantId обязателен' },
        { status: 400 }
      );
    }

    if (participantId === userOrResponse.userId) {
      return NextResponse.json(
        { success: false, error: 'Нельзя создать беседу с самим собой' },
        { status: 400 }
      );
    }

    // Get or create direct conversation
    const { conversationId, created } = await chatService.getOrCreateDirect(
      userOrResponse.userId,
      userOrResponse.role,
      participantId,
      participantRole,
      { bookingId, tourId, subject }
    );

    // Send initial message if provided and conversation was just created
    if (message && created) {
      await chatService.sendMessage({
        conversationId,
        senderId: userOrResponse.userId,
        content: message,
      });
    } else if (message && !created) {
      // Even if conversation exists, send the message
      await chatService.sendMessage({
        conversationId,
        senderId: userOrResponse.userId,
        content: message,
      });
    }

    return NextResponse.json({
      success: true,
      data: { conversationId, created },
    }, { status: created ? 201 : 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка создания беседы', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
