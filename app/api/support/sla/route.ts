/**
 * API: SLA Compliance
 * GET /api/support/sla/compliance - get SLA compliance metrics
 * POST /api/support/sla/check - check SLA violation for ticket
 */

import { NextRequest, NextResponse } from 'next/server'
import { slaService } from '@/lib/services'
import { requireRole } from '@/lib/auth/middleware'
import { z } from 'zod'

const CheckSLASchema = z.object({
  ticketId: z.string().min(1, 'ID тикета обязателен'),
})

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
    const body = await request.json()
    const parsed = CheckSLASchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const violation = await slaService.checkSLAViolation(parsed.data.ticketId)

    return NextResponse.json({
      success: true,
      data: violation,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
