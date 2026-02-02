/**
 * GET/POST /api/engagement/conversations
 * Get conversations or create new conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
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

    const conversation = await messagingService.createConversation(
      {
        type: body.type || 'direct',
        participantIds: [userId, ...(body.participantIds || [])],
        subject: body.subject,
        description: body.description,
        relatedTourId: body.relatedTourId,
        relatedBookingId: body.relatedBookingId,
        relatedReviewId: body.relatedReviewId,
        firstMessage: body.firstMessage,
      },
      userId
    )

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
