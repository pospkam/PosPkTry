import { NextRequest, NextResponse } from 'next/server'
import { payoutService } from '@/lib/database'
import { requireAdmin } from '@/lib/auth/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request)
    if (adminOrResponse instanceof NextResponse) return adminOrResponse

    const { id } = await params
    const payout = await payoutService.processPayout(id)
    return NextResponse.json({ success: true, data: payout })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
