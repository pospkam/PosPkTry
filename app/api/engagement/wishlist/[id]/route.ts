/**
 * GET/PUT/DELETE /api/engagement/wishlist/[id]
 * Get, update, or delete specific wishlist
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
      data: { wishlist },
    })
  } catch (error) {
    console.error('GET /api/engagement/wishlist/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const wishlist = await wishlistService.updateWishlist(
      id,
      {
        name: body.name,
        description: body.description,
        isPublic: body.isPublic,
        theme: body.theme,
        priority: body.priority,
        tags: body.tags,
        targetDate: body.targetDate,
      },
      userId
    )

    return NextResponse.json({
      success: true,
      data: { wishlist },
    })
  } catch (error) {
    console.error('PUT /api/engagement/wishlist/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to update wishlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await wishlistService.deleteWishlist(id, userId)

    return NextResponse.json({
      success: true,
      message: 'Wishlist deleted',
    })
  } catch (error) {
    console.error('DELETE /api/engagement/wishlist/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to delete wishlist' },
      { status: 500 }
    )
  }
}
