/**
 * API: Ticket Messages
 * GET /api/support/tickets/[id]/messages - get ticket messages
 * POST /api/support/tickets/[id]/messages - add message to ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketMessageService, ticketService } from '@/lib/database'
import { requireAuth } from '@/lib/auth/middleware'

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
    console.error('GET /api/support/tickets/[id]/messages error:', error)
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
    const messagePayload: Record<string, unknown> = {
      ticketId: id,
      ...data,
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
    console.error('POST /api/support/tickets/[id]/messages error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
