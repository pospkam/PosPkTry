/**
 * API: Ticket Messages
 * GET /api/support/tickets/[id]/messages - get ticket messages
 * POST /api/support/tickets/[id]/messages - add message to ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketMessageService, ticketService } from '@/lib/database'
import { requireAuth } from '@/lib/auth/middleware'

function extractTicketParticipantIds(ticket: unknown): { customerId: string | null; agentId: string | null } {
  if (!ticket || typeof ticket !== 'object') {
    return { customerId: null, agentId: null }
  }
  const record = ticket as Record<string, unknown>
  const customerId =
    typeof record.customerId === 'string'
      ? record.customerId
      : typeof record.customer_id === 'string'
        ? record.customer_id
        : typeof record.customer_id === 'number'
          ? String(record.customer_id)
          : null
  const agentId =
    typeof record.agentId === 'string'
      ? record.agentId
      : typeof record.agent_id === 'string'
        ? record.agent_id
        : typeof record.agent_id === 'number'
          ? String(record.agent_id)
          : null
  return { customerId, agentId }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { id } = await params
    const ticket = await ticketService.getTicket(id)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const { customerId, agentId } = extractTicketParticipantIds(ticket)
    const isPrivileged = auth.role === 'admin' || auth.role === 'agent'
    const isParticipant = auth.userId === customerId || auth.userId === agentId

    if (!isPrivileged && !isParticipant) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
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
    const ticket = await ticketService.getTicket(id)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const { customerId, agentId } = extractTicketParticipantIds(ticket)
    const isPrivileged = auth.role === 'admin' || auth.role === 'agent'
    const isParticipant = auth.userId === customerId || auth.userId === agentId

    if (!isPrivileged && !isParticipant) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
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
