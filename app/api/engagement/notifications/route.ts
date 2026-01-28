/**
 * GET/POST /api/engagement/notifications
 * Get notifications or create new notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@engagement-pillar/lib/notifications/services'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const { notifications, total } = await notificationService.list(
      { unreadOnly },
      limit,
      offset
    )

    return NextResponse.json({
      success: true,
      data: { notifications, total, limit, offset },
    })
  } catch (error) {
    console.error('GET /api/engagement/notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const notification = await notificationService.create({
      userId: body.userId || userId,
      type: body.type,
      title: body.title,
      message: body.message,
      channels: body.channels,
      data: body.data,
      scheduledFor: body.scheduledFor,
    })

    return NextResponse.json({
      success: true,
      data: { notification },
    })
  } catch (error) {
    console.error('POST /api/engagement/notifications:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
