/**
 * GET/POST /api/engagement/notifications
 * Get notifications or create new notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { notificationService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'

const CreateNotificationSchema = z.object({
  type: z.string({ required_error: 'Тип уведомления обязателен' }).min(1, 'Тип уведомления обязателен'),
  title: z.string({ required_error: 'Заголовок обязателен' }).min(1, 'Заголовок обязателен'),
  message: z.string({ required_error: 'Сообщение обязательно' }).min(1, 'Сообщение обязательно'),
  userId: z.string().optional(),
  channels: z.array(z.string()).optional(),
  data: z.record(z.unknown()).optional(),
  scheduledFor: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const { notifications, total } = await notificationService.list(
      userId,
      { unreadOnly },
      limit,
      offset
    )

    return NextResponse.json({
      success: true,
      data: { notifications, total, limit, offset },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateNotificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { type, title, message, channels, data, scheduledFor } = parsed.data
    const targetUserId = role === 'admin' && typeof parsed.data.userId === 'string'
      ? parsed.data.userId
      : userId

    const notification = await notificationService.create({
      userId: targetUserId,
      type,
      title,
      message,
      channels,
      data,
      scheduledFor,
    })

    return NextResponse.json({
      success: true,
      data: { notification },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
