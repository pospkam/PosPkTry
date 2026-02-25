import { NextRequest, NextResponse } from 'next/server'
import { commissionService } from '@/lib/database'

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const partnerId = searchParams.get('partnerId')
    const status = searchParams.get('status')

    const response = await commissionService.listCommissions({
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
