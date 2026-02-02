import { NextRequest, NextResponse } from 'next/server'
import { partnerService } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const tier = searchParams.get('tier')

    const response = await partnerService.listPartners({
      page,
      limit,
      status: status as any,
      type: type as any,
      tier: tier as any,
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
    const partner = await partnerService.createPartner(data)

    return NextResponse.json({
      success: true,
      data: partner,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}
