import { NextRequest, NextResponse } from 'next/server'
import { payoutService } from '@partner-pillar/services'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payout = await payoutService.processPayout(params.id)
    return NextResponse.json({ success: true, data: payout })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
