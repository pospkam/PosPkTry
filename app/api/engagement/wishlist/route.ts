/**
 * GET/POST /api/engagement/wishlist
 * Get wishlists or create new wishlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { wishlistService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'

const CreateWishlistSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional(),
  estimatedBudget: z.number().optional(),
  currency: z.string().optional(),
  priority: z.string().optional(),
  targetDate: z.string().optional(),
})

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
    const parsed = CreateWishlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { name, description, isPublic, theme, tags, estimatedBudget, currency, priority, targetDate } = parsed.data

    const wishlist = await wishlistService.createWishlist(
      {
        name,
        description,
        isPublic,
        theme,
        tags,
        estimatedBudget,
        currency,
        priority,
        targetDate,
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
