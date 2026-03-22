/**
 * GET/PUT /api/engagement/notifications/preferences
 * Get and update notification preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { notificationService } from '@/lib/services'
import { verifyAuth } from '@/lib/auth'

const UpdatePreferencesSchema = z.object({
  quietHours: z.object({
    enabled: z.boolean().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  channelPreferences: z.record(z.boolean()).optional(),
  typePreferences: z.record(z.boolean()).optional(),
  frequencyLimit: z.string().optional(),
  unsubscribeAll: z.boolean().optional(),
})

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
    const parsed = UpdatePreferencesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      )
    }

    const { quietHours, channelPreferences, typePreferences, frequencyLimit, unsubscribeAll } = parsed.data

    const updated = await notificationService.updatePreferences(userId, {
      quietHours,
      channelPreferences,
      typePreferences,
      frequencyLimit,
      unsubscribeAll,
    })

    return NextResponse.json({
      success: true,
      data: { preferences: updated },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
