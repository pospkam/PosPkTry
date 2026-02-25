import { NextRequest, NextResponse } from 'next/server'
import { partnerService } from '@/lib/database'

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const partner = await partnerService.getPartner(params.id)
    return NextResponse.json({ success: true, data: partner })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 404 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json()
    const partner = await partnerService.updatePartner(params.id, data)
    return NextResponse.json({ success: true, data: partner })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
