/**
 * GET /api/cron/trip-reminders
 *
 * Напоминания туристам о предстоящих поездках за 2 дня.
 * Отправляет персональное Telegram-сообщение с погодой на дату тура.
 *
 * Запускать: ежедневно в 19:00 UTC (07:00 KMT)
 *
 * Защита: ?secret=CRON_SECRET
 *
 * cron-job.org:
 *   https://tourhab.ru/api/cron/trip-reminders?secret=SECRET
 *   → каждый день в 19:00 UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { telegramService } from '@/lib/notifications/telegram';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic = 'force-dynamic';

interface ReminderRow {
  booking_id: string;
  user_id:    string;
  telegram_id: string;
  user_name:  string;
  tour_title: string;
  tour_date:  string;
  participants: number;
  meeting_point: string | null;
}

interface WttrCurrent {
  temp_C: string;
  FeelsLikeC: string;
  windspeedKmph: string;
  lang_ru?: Array<{ value: string }>;
  weatherDesc: Array<{ value: string }>;
}

async function getWeatherOnDate(): Promise<string> {
  try {
    const res = await fetch(
      'https://wttr.in/Petropavlovsk-Kamchatsky?format=j1&lang=ru',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return '';
    const data = await res.json() as { current_condition: WttrCurrent[] };
    const c = data.current_condition[0];
    const t = parseInt(c.temp_C);
    const desc = c.lang_ru?.[0]?.value ?? c.weatherDesc[0]?.value ?? '';
    const sign = (n: number) => n > 0 ? `+${n}` : String(n);
    return `Прогноз: ${sign(t)}°C${desc ? `, ${desc.toLowerCase()}` : ''}`;
  } catch { return ''; }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!timingSafeCompare(secret, process.env.CRON_SECRET ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Бронирования через 2 дня (подтверждённые, турист с Telegram)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 2);
  const dateStr = targetDate.toISOString().slice(0, 10);

  const res = await query<ReminderRow>(`
    SELECT
      b.id                                    AS booking_id,
      u.id                                    AS user_id,
      u.telegram_id::text                     AS telegram_id,
      COALESCE(b.tourist_name, u.name)        AS user_name,
      t.title                                 AS tour_title,
      b.booking_date::text                    AS tour_date,
      b.participants,
      NULL::text                              AS meeting_point
    FROM operator_bookings b
    JOIN operator_tours t ON t.id = b.operator_tour_id
    LEFT JOIN users u ON u.email = b.tourist_email
    WHERE b.booking_date = $1
      AND b.booking_status = 'confirmed'
      AND u.telegram_id IS NOT NULL
  `, [dateStr]);

  if (res.rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No reminders for this date' });
  }

  const weather = await getWeatherOnDate();
  let sent = 0;

  for (const row of res.rows) {
    try {
      const firstName = row.user_name.split(' ')[0];
      const dateFormatted = new Date(row.tour_date + 'T00:00:00').toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long',
      });

      const lines = [
        `<b>${firstName}, послезавтра твой тур!</b>`,
        '',
        `<b>${esc(row.tour_title)}</b>`,
        `Дата: <b>${dateFormatted}</b>`,
        `Участников: ${row.participants}`,
      ];

      if (row.meeting_point) {
        lines.push(`Место встречи: ${esc(row.meeting_point)}`);
      }

      if (weather) {
        lines.push('', weather);
      }

      lines.push(
        '',
        'Приготовь тёплую одежду и хорошее настроение.',
        '',
        `<a href="https://tourhab.ru/hub/tourist/bookings">Детали брони →</a>`,
      );

      await telegramService.sendMessage({
        chatId:    row.telegram_id,
        text:      lines.join('\n'),
        parseMode: 'HTML',
      });
      sent++;
    } catch {}
  }

  return NextResponse.json({ ok: true, sent, total: res.rows.length });
}
