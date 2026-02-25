import { NextRequest, NextResponse } from 'next/server'
import { reportService } from '@/lib/database'
import { requireRole } from '@/lib/auth/middleware'

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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireRole(request, ['admin', 'operator'])
  if (authOrResponse instanceof NextResponse) return authOrResponse

  try {
    const data = await request.json()
    const report = await reportService.generateReport(data, authOrResponse.userId)

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
