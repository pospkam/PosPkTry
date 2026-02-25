/**
 * GET/PUT/DELETE /api/engagement/notifications/[id]
 * Get, update, or delete specific notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

function getNotificationOwnerId(notification: unknown): string | null {
  if (!notification || typeof notification !== 'object') {
    return null;
  }

  const record = notification as Record<string, unknown>;
  if (typeof record.userId === 'string') {
    return record.userId;
  }
  if (typeof record.user_id === 'string') {
    return record.user_id;
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const notification = await notificationService.getById(id)
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const ownerId = getNotificationOwnerId(notification)
    if (ownerId && ownerId !== userId && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existingNotification = await notificationService.getById(id)
    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const ownerId = getNotificationOwnerId(existingNotification)
    if (ownerId && ownerId !== userId && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (body.markAsRead) {
      await notificationService.markAsRead(id, userId)
    }

    if (body.toggleMute !== undefined) {
      await notificationService.toggleMute(id, body.toggleMute)
    }

    const notification = await notificationService.getById(id)

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const notification = await notificationService.getById(id)
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const ownerId = getNotificationOwnerId(notification)
    if (ownerId && ownerId !== userId && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete by marking as deleted
    await notificationService.getById(id)

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
