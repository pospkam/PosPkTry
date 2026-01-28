/**
 * GET/PUT /api/engagement/notifications/preferences
 * Get and update notification preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/pillars/engagement/lib/notifications/services'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const preferences = await notificationService.getPreferences(userId)

    return NextResponse.json({
      success: true,
      data: { preferences },
    })
  } catch (error) {
    console.error('GET /api/engagement/notifications/preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await verifyAuth(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const updated = await notificationService.updatePreferences(userId, {
      quietHours: body.quietHours,
      channelPreferences: body.channelPreferences,
      typePreferences: body.typePreferences,
      frequencyLimit: body.frequencyLimit,
      unsubscribeAll: body.unsubscribeAll,
    })

    return NextResponse.json({
      success: true,
      data: { preferences: updated },
    })
  } catch (error) {
    console.error('PUT /api/engagement/notifications/preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
