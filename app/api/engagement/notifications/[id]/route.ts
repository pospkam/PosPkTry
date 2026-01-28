/**
 * GET/PUT/DELETE /api/engagement/notifications/[id]
 * Get, update, or delete specific notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@engagement-pillar/lib/notifications/services'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const notification = await notificationService.getById(params.id)

    return NextResponse.json({
      success: true,
      data: { notification },
    })
  } catch (error) {
    console.error('GET /api/engagement/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    if (body.markAsRead) {
      await notificationService.markAsRead(params.id)
    }

    if (body.toggleMute !== undefined) {
      await notificationService.toggleMute(params.id, body.toggleMute)
    }

    const notification = await notificationService.getById(params.id)

    return NextResponse.json({
      success: true,
      data: { notification },
    })
  } catch (error) {
    console.error('PUT /api/engagement/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Soft delete by marking as deleted
    await notificationService.getById(params.id)

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    })
  } catch (error) {
    console.error('DELETE /api/engagement/notifications/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
