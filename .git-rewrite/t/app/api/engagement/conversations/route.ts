/**
 * GET/POST /api/engagement/conversations
 * Get conversations or create new conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { messagingService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'

const CreateConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1, 'Необходимо указать хотя бы одного участника'),
  firstMessage: z.string().optional(),
  type: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  relatedTourId: z.string().optional(),
  relatedBookingId: z.string().optional(),
  relatedReviewId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const { conversations, total } = await messagingService.listConversations(
      userId,
      { unreadOnly },
      limit,
      offset
    )

    return NextResponse.json({
      success: true,
      data: { conversations, total, limit, offset },
    })
  } catch (error) {
    console.error('GET /api/engagement/conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { participantIds, firstMessage: rawFirstMessage, type, subject, description, relatedTourId, relatedBookingId, relatedReviewId } = parsed.data
    const firstMessage = rawFirstMessage?.trim() || undefined

    const conversation = await messagingService.createConversation(
      {
        type: type || 'direct',
        participantIds: [userId, ...participantIds],
        subject,
        description,
        relatedTourId,
        relatedBookingId,
        relatedReviewId,
        firstMessage,
      },
      userId
    )
    if (!conversation) {
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { conversation },
    })
  } catch (error) {
    console.error('POST /api/engagement/conversations:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
