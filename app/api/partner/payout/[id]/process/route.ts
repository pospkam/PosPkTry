import { NextRequest, NextResponse } from 'next/server'
import { payoutService } from '@/lib/database'

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
