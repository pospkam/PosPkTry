/**
 * API: Ticket Messages
 * GET /api/support/tickets/[id]/messages - get ticket messages
 * POST /api/support/tickets/[id]/messages - add message to ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketMessageService, ticketService } from '@/lib/services'
import { requireAuth } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateMessageSchema = z.object({
  content: z.string().min(1, 'Текст сообщения обязателен'),
  attachments: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const isPrivileged = auth.role === 'admin' || auth.role === 'agent'
    const ticket = isPrivileged
      ? await ticketService.getTicket(id)
      : await ticketService.getTicketForUser(id, auth.userId)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await ticketMessageService.getTicketMessages(id, limit, offset)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const isPrivileged = auth.role === 'admin' || auth.role === 'agent'
    const ticket = isPrivileged
      ? await ticketService.getTicket(id)
      : await ticketService.getTicketForUser(id, auth.userId)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const data = await request.json()
    const parsed = CreateMessageSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const messagePayload: Record<string, unknown> = {
      ticketId: id,
      ...parsed.data,
    }
    messagePayload.authorId = auth.userId
    messagePayload.userId = auth.userId
    messagePayload.senderId = auth.userId

    const message = await ticketMessageService.createMessage(messagePayload)

    return NextResponse.json({
      success: true,
      data: message,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
