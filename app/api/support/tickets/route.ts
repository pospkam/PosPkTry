/**
 * API: List/Create Tickets
 * GET /api/support/tickets - list tickets with filtering
 * POST /api/support/tickets - create new ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@/lib/database'
import { CreateTicketSchema, validateInput, CreateTicketInput } from '@/lib/validation/support-schemas'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const filter = {
      status: (searchParams.get('status') || undefined) as any,
      priority: (searchParams.get('priority') || undefined) as any,
      category: (searchParams.get('category') || undefined) as any,
      customerId: searchParams.get('customerId') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'DESC',
    } as any

    const result = await ticketService.listTickets(filter)

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/support/tickets error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate input
    const validation = validateInput<CreateTicketInput>(CreateTicketSchema, data)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    const ticket = await ticketService.createTicket(validation.data! as any)

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    console.error('POST /api/support/tickets error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
