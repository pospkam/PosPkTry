import { NextRequest, NextResponse } from 'next/server'
import { partnerService } from '@/lib/database'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminOrResponse = await requireAdmin(request)
    if (adminOrResponse instanceof NextResponse) return adminOrResponse

    const { id } = await params
    const partner = await partnerService.getPartner(id)
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
    const adminOrResponse = await requireAdmin(request)
    if (adminOrResponse instanceof NextResponse) return adminOrResponse

    const { id } = await params
    const data = await request.json()
    const partner = await partnerService.updatePartner(id, data)
    return NextResponse.json({ success: true, data: partner })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
