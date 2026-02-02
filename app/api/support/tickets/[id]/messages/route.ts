/**
 * API: Ticket Messages
 * GET /api/support/tickets/[id]/messages - get ticket messages
 * POST /api/support/tickets/[id]/messages - add message to ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { ticketMessageService } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await ticketMessageService.getTicketMessages(params.id, limit, offset)

    return NextResponse.json(result)
  } catch (error) {
    console.error(`GET /api/support/tickets/${params.id}/messages error:`, error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()

    const message = await ticketMessageService.createMessage({
      ticketId: params.id,
      ...data,
    })

    return NextResponse.json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error(`POST /api/support/tickets/${params.id}/messages error:`, error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
