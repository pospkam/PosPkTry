/**
 * API: SLA Compliance
 * GET /api/support/sla/compliance - get SLA compliance metrics
 * POST /api/support/sla/check - check SLA violation for ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { slaService } from '@/lib/database'
import { requireRole } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'agent'])
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    const metrics = await slaService.getComplianceMetrics(from, to)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error('GET /api/support/sla/compliance error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'agent'])
  if (auth instanceof NextResponse) return auth

  try {
    const data = await request.json()

    if (!data.ticketId) {
      return NextResponse.json(
        { success: false, error: 'ticketId is required' },
        { status: 400 }
      )
    }

    const violation = await slaService.checkSLAViolation(data.ticketId)

    return NextResponse.json({
      success: true,
      data: violation,
    })
  } catch (error) {
    console.error('POST /api/support/sla/check error:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
