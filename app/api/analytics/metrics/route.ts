import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server'
import { metricsService } from '@/lib/services'
import { requireRole } from '@/lib/auth/middleware'
import { z } from 'zod'

const RecordMetricSchema = z.object({
  type: z.string().min(1, 'Тип метрики обязателен'),
  value: z.number({ coerce: true, message: 'Значение метрики обязательно' }),
  period: z.string().min(1, 'Период обязателен'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const authOrResponse = await requireRole(request, ['admin', 'operator'])
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const period = searchParams.get('period')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const response = await metricsService.getMetrics({
      type: type as any,
      period: period as any,
      page,
      limit,
    })

    return NextResponse.json(response)
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: safeMsg(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireRole(request, ['admin', 'operator'])
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const body = await request.json()
    const parsed = RecordMetricSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const { type, value, period, metadata } = parsed.data

    const metric = await metricsService.recordMetric(type, value, period, metadata)

    return NextResponse.json({
      success: true,
      data: metric,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: safeMsg(error) },
      { status: 400 }
    )
  }
}
