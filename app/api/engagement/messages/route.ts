/**
 * GET/POST /api/engagement/messages
 * Get messages or send new message
 */

import { NextRequest, NextResponse } from 'next/server'
import { messagingService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyAuth(request)
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

    const messagesResult = await messagingService.getMessages(
      conversationId,
      {},
      limit,
      offset,
      role === 'admin' ? undefined : userId
    )
    if (!messagesResult) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const { messages, total } = messagesResult

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
    if (!body.conversationId || !body.content) {
      return NextResponse.json(
        { error: 'conversationId and content are required' },
        { status: 400 }
      )
    }

    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content must be a non-empty string' },
        { status: 400 }
      )
    }

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
    if (!message) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

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
