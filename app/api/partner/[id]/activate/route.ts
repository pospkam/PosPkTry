import { NextRequest, NextResponse } from 'next/server'
import { partnerService } from '@/lib/database'

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const partner = await partnerService.activatePartner(params.id)
    return NextResponse.json({ success: true, data: partner })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
