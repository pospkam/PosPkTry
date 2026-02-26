/**
 * GET/PUT/DELETE /api/engagement/notifications/[id]
 * Get, update, or delete specific notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const notification = role === 'admin'
      ? await notificationService.getById(id)
      : await notificationService.getByIdForUser(id, userId)
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
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
    const existingNotification = role === 'admin'
      ? await notificationService.getById(id)
      : await notificationService.getByIdForUser(id, userId)
    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const body = await request.json()

    if (body.markAsRead) {
      await notificationService.markAsRead(id, role === 'admin' ? undefined : userId)
    }

    if (body.toggleMute !== undefined) {
      await notificationService.toggleMute(id, body.toggleMute)
    }

    const notification = role === 'admin'
      ? await notificationService.getById(id)
      : await notificationService.getByIdForUser(id, userId)
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

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
    const deleted = role === 'admin'
      ? await notificationService.deleteById(id)
      : await notificationService.deleteByIdForUser(id, userId)
    if (!deleted) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

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
