import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/database';

const UpdateNotifPrefsSchema = z.object({
  email_booking_confirmation: z.boolean().optional(),
  email_booking_reminder: z.boolean().optional(),
  email_booking_changes: z.boolean().optional(),
  email_payment_receipts: z.boolean().optional(),
  email_promotions: z.boolean().optional(),
  email_newsletters: z.boolean().optional(),
  email_recommendations: z.boolean().optional(),
  email_reviews_requests: z.boolean().optional(),
  sms_booking_confirmation: z.boolean().optional(),
  sms_booking_reminder: z.boolean().optional(),
  sms_emergency_alerts: z.boolean().optional(),
  push_booking_updates: z.boolean().optional(),
  push_messages: z.boolean().optional(),
  push_promotions: z.boolean().optional(),
  push_recommendations: z.boolean().optional(),
  language: z.string().max(10, 'Код языка слишком длинный').optional(),
  timezone: z.string().max(50, 'Часовой пояс слишком длинный').optional(),
});

export const dynamic = 'force-dynamic';

interface NotifPrefRow {
  id: string;
  tourist_id: string;
  email_booking_confirmation: boolean;
  email_booking_reminder: boolean;
  email_booking_changes: boolean;
  email_payment_receipts: boolean;
  email_promotions: boolean;
  email_newsletters: boolean;
  email_recommendations: boolean;
  email_reviews_requests: boolean;
  sms_booking_confirmation: boolean;
  sms_booking_reminder: boolean;
  sms_emergency_alerts: boolean;
  push_booking_updates: boolean;
  push_messages: boolean;
  push_promotions: boolean;
  push_recommendations: boolean;
  language: string;
  timezone: string;
}

// GET /api/tourist/notification-preferences
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Get tourist_profiles.id via users
    const profileResult = await query<{ id: string }>(
      `SELECT id FROM tourist_profiles WHERE user_id = $1`,
      [auth.userId]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const profileId = profileResult.rows[0].id;

    const result = await query<NotifPrefRow>(
      `SELECT * FROM tourist_notification_preferences WHERE tourist_id = $1`,
      [profileId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0] ?? null,
    });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/tourist/notification-preferences — update preferences
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = UpdateNotifPrefsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const allowed = [
      'email_booking_confirmation', 'email_booking_reminder', 'email_booking_changes',
      'email_payment_receipts', 'email_promotions', 'email_newsletters',
      'email_recommendations', 'email_reviews_requests',
      'sms_booking_confirmation', 'sms_booking_reminder', 'sms_emergency_alerts',
      'push_booking_updates', 'push_messages', 'push_promotions', 'push_recommendations',
      'language', 'timezone',
    ];

    // Get tourist profile id
    const profileResult = await query<{ id: string }>(
      `SELECT id FROM tourist_profiles WHERE user_id = $1`,
      [auth.userId]
    );

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Профиль туриста не найден' }, { status: 404 });
    }

    const profileId = profileResult.rows[0].id;

    // Build SET clause from allowed fields
    const sets: string[] = [];
    const params: (string | boolean)[] = [profileId];
    let idx = 2;

    for (const key of allowed) {
      if (key in parsed.data) {
        sets.push(`${key} = $${idx}`);
        params.push(parsed.data[key as keyof typeof parsed.data] as string | boolean);
        idx++;
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ success: false, error: 'Нет данных для обновления' }, { status: 400 });
    }

    sets.push('updated_at = NOW()');

    await query(
      `INSERT INTO tourist_notification_preferences (tourist_id)
       VALUES ($1)
       ON CONFLICT (tourist_id) DO NOTHING`,
      [profileId]
    );

    await query(
      `UPDATE tourist_notification_preferences SET ${sets.join(', ')} WHERE tourist_id = $1`,
      params
    );

    return NextResponse.json({ success: true, message: 'Настройки обновлены' });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
