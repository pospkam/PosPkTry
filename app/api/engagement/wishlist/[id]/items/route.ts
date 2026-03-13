/**
 * GET/POST /api/engagement/wishlist/[id]/items
 * Get wishlist items or add new item
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { wishlistService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'

const AddWishlistItemSchema = z.object({
  itemId: z.string().min(1, 'ID элемента обязателен'),
  itemType: z.string().min(1, 'Тип элемента обязателен'),
  priority: z.string().optional(),
  notes: z.string().optional(),
  visitDate: z.string().optional(),
  estimatedBudget: z.number().optional(),
  currency: z.string().optional(),
  notifyOnPriceChange: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const wishlist = await wishlistService.getWishlist(id, userId)

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

    const { id } = await params
    const body = await request.json()
    const parsed = AddWishlistItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { itemId, itemType, priority, notes, visitDate, estimatedBudget, currency, notifyOnPriceChange } = parsed.data

    const item = await wishlistService.addItem(
      id,
      {
        itemId,
        itemType,
        priority,
        notes,
        visitDate,
        estimatedBudget,
        currency,
        notifyOnPriceChange,
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
