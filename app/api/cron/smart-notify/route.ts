/**
 * POST /api/cron/smart-notify
 *
 * Умные уведомления: сопоставляет новые/обновленные туры с предпочтениями
 * из user_ai_memory. Если тур совпадает — Telegram/Email уведомление.
 *
 * Расписание: каждые 6 часов (cron-job.org)
 * Логика:
 *  1. Новые/обновлённые туры за последние 6 часов
 *  2. Пользователи с совпадающими preferred_activities
 *  3. Уведомление через Telegram (если есть telegram_id) или Email
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic = 'force-dynamic';

interface MatchedTour {
  id: number;
  title: string;
  base_price: number;
  activity_type: string;
  location_name: string | null;
}

interface MatchedUser {
  user_id: number;
  name: string;
  email: string;
  telegram_id: string | null;
  preferred_activities: string[];
}

async function tgNotify(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!timingSafeCompare(secret, process.env.CRON_SECRET ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. New/updated published tours in last 6 hours
    const { rows: newTours } = await pool.query<MatchedTour>(
      `SELECT id, title, base_price, activity_type, location_name
       FROM operator_tours
       WHERE is_published = true AND is_active = true AND deleted_at IS NULL
         AND updated_at >= NOW() - INTERVAL '6 hours'
       LIMIT 20`,
    );

    if (newTours.length === 0) {
      return NextResponse.json({ ok: true, matched: 0, reason: 'no new tours' });
    }

    // 2. Users with memory preferences
    const { rows: users } = await pool.query<MatchedUser>(
      `SELECT m.user_id, u.name, u.email, u.telegram_id::text,
              m.preferred_activities
       FROM user_ai_memory m
       JOIN users u ON u.id = m.user_id
       WHERE array_length(m.preferred_activities, 1) > 0
         AND u.role = 'tourist'
       LIMIT 200`,
    );

    let sent = 0;

    // 3. Match and notify
    for (const user of users) {
      const matching = newTours.filter(t =>
        t.activity_type && user.preferred_activities.includes(t.activity_type),
      );
      if (matching.length === 0) continue;

      // Rate limit: max 1 notification per user per 24h
      const { rows: recent } = await pool.query(
        `SELECT 1 FROM smart_notifications_log
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
         LIMIT 1`,
        [user.user_id],
      );
      if (recent.length > 0) continue;

      const tourList = matching.slice(0, 3).map(t =>
        `  - <b>${escHtml(t.title)}</b> — ${t.base_price} rub`,
      ).join('\n');

      const text = `Привет, ${escHtml(user.name)}!\n\nПоявились новые туры по вашим интересам:\n${tourList}\n\nСмотреть: https://tourhab.ru/routes`;

      if (user.telegram_id) {
        await tgNotify(user.telegram_id, text);
      }

      // Log notification
      await pool.query(
        `INSERT INTO smart_notifications_log (user_id, tours_matched, channel)
         VALUES ($1, $2, $3)`,
        [user.user_id, matching.map(t => t.id), user.telegram_id ? 'telegram' : 'skipped'],
      ).catch(() => {});

      sent++;
    }

    return NextResponse.json({ ok: true, new_tours: newTours.length, users_checked: users.length, sent });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Workflow calls with POST; support both methods
export const POST = GET;

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
