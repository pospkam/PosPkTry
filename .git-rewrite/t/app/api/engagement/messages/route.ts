/**
 * GET/POST /api/engagement/messages
 * Get messages or send new message
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { messagingService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'

const SendMessageSchema = z.object({
  conversationId: z.string().min(1, 'ID диалога обязателен'),
  content: z.string().min(1, 'Сообщение не может быть пустым'),
  type: z.string().optional(),
  attachments: z.array(z.unknown()).optional(),
  repliedToMessageId: z.string().optional(),
})

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
    const parsed = SendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { conversationId, content, type, attachments, repliedToMessageId } = parsed.data

    const message = await messagingService.sendMessage(
      {
        conversationId,
        type: type || 'text',
        content,
        attachments,
        repliedToMessageId,
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
