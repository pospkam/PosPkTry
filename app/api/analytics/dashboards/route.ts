import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/services'
import { requireAuth } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateDashboardSchema = z.object({
  name: z.string().min(1, 'Название дашборда обязательно'),
  description: z.string().optional(),
  widgets: z.array(z.record(z.string(), z.unknown())).optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAuth(request)
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const dashboards = await dashboardService.getUserDashboards(authOrResponse.userId)

    return NextResponse.json({
      success: true,
      data: dashboards,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: safeMsg(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireAuth(request)
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const body = await request.json()
    const parsed = CreateDashboardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }
    const dashboard = await dashboardService.createDashboard(parsed.data, authOrResponse.userId)

    return NextResponse.json({
      success: true,
      data: dashboard,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: safeMsg(error) },
      { status: 400 }
    )
  }
}
