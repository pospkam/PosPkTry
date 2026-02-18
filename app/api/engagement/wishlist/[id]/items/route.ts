/**
 * GET/POST /api/engagement/wishlist/[id]/items
 * Get wishlist items or add new item
 */

import { NextRequest, NextResponse } from 'next/server'
import { wishlistService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const wishlist = await wishlistService.getWishlist(params.id, userId)

    if (!wishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        items: wishlist.items,
        total: wishlist.items?.length || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/engagement/wishlist/[id]/items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist items' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const item = await wishlistService.addItem(
      params.id,
      {
        itemId: body.itemId,
        itemType: body.itemType,
        priority: body.priority,
        notes: body.notes,
        visitDate: body.visitDate,
        estimatedBudget: body.estimatedBudget,
        currency: body.currency,
        notifyOnPriceChange: body.notifyOnPriceChange,
      },
      userId
    )

    return NextResponse.json({
      success: true,
      data: { item },
    })
  } catch (error) {
    console.error('POST /api/engagement/wishlist/[id]/items:', error)
    return NextResponse.json(
      { error: 'Failed to add item to wishlist' },
      { status: 500 }
    )
  }
}
