/**
 * GET/POST /api/engagement/messages
 * Get messages or send new message
 */

import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    const { messages, total } = await messagingService.getMessages(
      conversationId,
      {},
      limit,
      offset
    )

    return NextResponse.json({
      success: true,
      data: { messages, total, limit, offset },
    })
  } catch (error) {
    console.error('GET /api/engagement/messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const message = await messagingService.sendMessage(
      {
        conversationId: body.conversationId,
        type: body.type || 'text',
        content: body.content,
        attachments: body.attachments,
        repliedToMessageId: body.repliedToMessageId,
      },
      userId
    )

    return NextResponse.json({
      success: true,
      data: { message },
    })
  } catch (error) {
    console.error('POST /api/engagement/messages:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
