/**
 * API: Get/Update Single Ticket
 * GET /api/support/tickets/[id] - get ticket details
 * PUT /api/support/tickets/[id] - update ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'
import { z } from 'zod'

const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  data => Object.values(data).some(v => v !== undefined),
  'Необходимо указать хотя бы одно поле для обновления'
)

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
    const parsed = UpdateTicketSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const updateData = parsed.data as Partial<{ status: string; priority: string; assigneeId: string; category: string; tags: string[] }>
    const ticket = isPrivilegedRole
      ? await ticketService.updateTicket(id, updateData as Record<string, unknown>)
      : await ticketService.updateTicketForUser(id, auth.userId, updateData as Record<string, unknown>)
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
