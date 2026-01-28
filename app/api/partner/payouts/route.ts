import { NextRequest, NextResponse } from 'next/server'
import { payoutService } from '@/pillars/partner/services'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const partnerId = searchParams.get('partnerId')
    const status = searchParams.get('status')

    const response = await payoutService.listPayouts({
      page,
      limit,
      partnerId: partnerId || undefined,
      status: status as any,
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
    const data = await request.json()
    const payout = await payoutService.createPayout(data)
    return NextResponse.json({ success: true, data: payout })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
