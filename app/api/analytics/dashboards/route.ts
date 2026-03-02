import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/database'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAuth(request)
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const dashboards = await dashboardService.getUserDashboards(authOrResponse.userId)

    return NextResponse.json({
      success: true,
      data: dashboards,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireAuth(request)
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const data = await request.json()
    const dashboard = await dashboardService.createDashboard(data, authOrResponse.userId)

    return NextResponse.json({
      success: true,
      data: dashboard,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
