/**
 * GET/POST /api/engagement/wishlist
 * Get wishlists or create new wishlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { wishlistService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { wishlists, total } = await wishlistService.listWishlists(
      userId,
      {},
      limit,
      offset
    )

    return NextResponse.json({
      success: true,
      data: { wishlists, total, limit, offset },
    })
  } catch (error) {
    console.error('GET /api/engagement/wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlists' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const wishlist = await wishlistService.createWishlist(
      {
        name: body.name,
        description: body.description,
        isPublic: body.isPublic,
        theme: body.theme,
        tags: body.tags,
        estimatedBudget: body.estimatedBudget,
        currency: body.currency,
        priority: body.priority,
        targetDate: body.targetDate,
      },
      userId
    )

    return NextResponse.json({
      success: true,
      data: { wishlist },
    })
  } catch (error) {
    console.error('POST /api/engagement/wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to create wishlist' },
      { status: 500 }
    )
  }
}
