import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server'
import { reportService } from '@/lib/services'
import { requireRole } from '@/lib/auth/middleware'
import { z } from 'zod'

const GenerateReportSchema = z.object({
  type: z.string().min(1, 'Тип отчёта обязателен'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const authOrResponse = await requireRole(request, ['admin', 'operator'])
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const response = await reportService.listReports(type as any, limit, offset)

    return NextResponse.json({
      success: true,
      data: response.reports,
      total: response.total,
    })
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
    const parsed = GenerateReportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const report = await reportService.generateReport(parsed.data, authOrResponse.userId)

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: safeMsg(error) },
      { status: 400 }
    )
  }
}
