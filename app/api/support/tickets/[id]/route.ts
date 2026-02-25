/**
 * API: Get/Update Single Ticket
 * GET /api/support/tickets/[id] - get ticket details
 * PUT /api/support/tickets/[id] - update ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

function extractTicketParticipantIds(ticket: unknown): { customerId: string | null; agentId: string | null } {
  if (!ticket || typeof ticket !== 'object') {
    return { customerId: null, agentId: null };
  }

  const record = ticket as Record<string, unknown>;
  const customerId =
    typeof record.customerId === 'string'
      ? record.customerId
      : typeof record.customer_id === 'string'
        ? record.customer_id
        : null;
  const agentId =
    typeof record.agentId === 'string'
      ? record.agentId
      : typeof record.agent_id === 'string'
        ? record.agent_id
        : null;

  return { customerId, agentId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ticketId = 'unknown'
  try {
    const auth = await verifyAuth(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    ticketId = id
    const ticket = await ticketService.getTicket(id)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const { customerId, agentId } = extractTicketParticipantIds(ticket)
    const isPrivilegedRole = auth.role === 'admin' || auth.role === 'agent'
    const isParticipant = auth.userId === customerId || auth.userId === agentId

    if (!isPrivilegedRole && !isParticipant) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    console.error(`GET /api/support/tickets/${ticketId} error:`, error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ticketId = 'unknown'
  try {
    const auth = await verifyAuth(request)
    if (!auth.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    ticketId = id
    const existingTicket = await ticketService.getTicket(id)
    if (!existingTicket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const { customerId, agentId } = extractTicketParticipantIds(existingTicket)
    const isPrivilegedRole = auth.role === 'admin' || auth.role === 'agent'
    const isParticipant = auth.userId === customerId || auth.userId === agentId

    if (!isPrivilegedRole && !isParticipant) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()
    const ticket = await ticketService.updateTicket(id, data)

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    console.error(`PUT /api/support/tickets/${ticketId} error:`, error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
