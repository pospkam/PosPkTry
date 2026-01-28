/**
 * API: Get/Update Single Ticket
 * GET /api/support/tickets/[id] - get ticket details
 * PUT /api/support/tickets/[id] - update ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketService } from '@support-pillar/services'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await ticketService.getTicket(params.id)

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    console.error(`GET /api/support/tickets/${params.id} error:`, error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()

    const ticket = await ticketService.updateTicket(params.id, data)

    return NextResponse.json({
      success: true,
      data: ticket,
    })
  } catch (error) {
    console.error(`PUT /api/support/tickets/${params.id} error:`, error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
