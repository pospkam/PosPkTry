import { NextRequest, NextResponse } from 'next/server'
import { metricsService } from '@analytics-pillar/services'

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, value, period, metadata } = await request.json()

    const metric = await metricsService.recordMetric(type, value, period, metadata)

    return NextResponse.json({
      success: true,
      data: metric,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
