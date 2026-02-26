/**
 * API: Get/Update Single Ticket
 * GET /api/support/tickets/[id] - get ticket details
 * PUT /api/support/tickets/[id] - update ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

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
    const isPrivilegedRole = auth.role === 'admin' || auth.role === 'agent'
    const ticket = isPrivilegedRole
      ? await ticketService.getTicket(id)
      : await ticketService.getTicketForUser(id, auth.userId)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
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
    const isPrivilegedRole = auth.role === 'admin' || auth.role === 'agent'
    const existingTicket = isPrivilegedRole
      ? await ticketService.getTicket(id)
      : await ticketService.getTicketForUser(id, auth.userId)
    if (!existingTicket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const data = await request.json()
    const ticket = isPrivilegedRole
      ? await ticketService.updateTicket(id, data)
      : await ticketService.updateTicketForUser(id, auth.userId, data)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

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
