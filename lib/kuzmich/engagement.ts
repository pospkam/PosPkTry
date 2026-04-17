/**
 * lib/kuzmich/engagement.ts
 *
 * Проактивный реэнгейджмент Kuzmich.
 *
 * Логика:
 * 1. recordEngagementSignal() — вызывается из chat API когда туристу показали bookingForm
 * 2. sendEngagementPushes() — вызывается cron каждые 6ч:
 *    - Находит сигналы старше 23ч без push и без бронирования
 *    - Отправляет персональное Telegram-сообщение с напоминанием
 *    - Помечает сигнал как pushed_at = NOW()
 */

import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';

// ── Записать сигнал интереса ──────────────────────────────────────

export async function recordEngagementSignal(
  userId: string,
  tourId: number,
  sessionId: string | null,
  signalType: 'viewed' | 'booking_started' | 'booking_abandoned' = 'viewed',
): Promise<void> {
  try {
    // Дедупликация: не записываем одинаковый сигнал чаще раза в день
    const existing = await pool.query(
      `SELECT id FROM kuzmich_engagement_signals
       WHERE user_id = $1 AND tour_id = $2 AND signal_type = $3
         AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId, tourId, signalType],
    );
    if (existing.rows.length > 0) return;

    await pool.query(
      `INSERT INTO kuzmich_engagement_signals (user_id, tour_id, session_id, signal_type)
       VALUES ($1, $2, $3, $4)`,
      [userId, tourId, sessionId, signalType],
    );
  } catch {
    // non-critical, не блокируем
  }
}

// ── Отправить пуши туристам без бронирования ──────────────────────

interface EngagementRow {
  signal_id:    number;
  user_id:      number;
  tour_id:      number;
  tour_title:   string;
  base_price:   number;
  activity_type: string | null;
  telegram_id:  string | null;
  signal_type:  string;
}

export async function sendEngagementPushes(): Promise<{ sent: number; skipped: number }> {
  let sent    = 0;
  let skipped = 0;

  try {
    // Выбираем сигналы 23-72 часа назад без push, без подтверждённого бронирования
    const { rows } = await pool.query<EngagementRow>(`
      SELECT
        s.id            AS signal_id,
        s.user_id,
        s.tour_id,
        t.title         AS tour_title,
        t.base_price,
        t.activity_type,
        u.telegram_id::text AS telegram_id,
        s.signal_type
      FROM kuzmich_engagement_signals s
      JOIN operator_tours t ON t.id = s.tour_id AND t.is_published = true
      JOIN users u ON u.id = s.user_id
      WHERE s.pushed_at IS NULL
        AND s.created_at < NOW() - INTERVAL '23 hours'
        AND s.created_at > NOW() - INTERVAL '72 hours'
        AND u.telegram_id IS NOT NULL
        -- Не отправляем если уже есть активное бронирование на этот тур
        AND NOT EXISTS (
          SELECT 1 FROM operator_bookings ob
          WHERE ob.user_id = s.user_id
            AND ob.tour_id = s.tour_id
            AND ob.booking_status NOT IN ('cancelled', 'rejected', 'cancelled_by_tourist')
            AND ob.created_at > s.created_at
        )
      ORDER BY s.created_at DESC
      LIMIT 50
    `);

    for (const row of rows) {
      if (!row.telegram_id) {
        skipped++;
        continue;
      }

      const text = buildReminderText(row);

      try {
        const result = await telegramService.sendMessage({
          chatId: row.telegram_id,
          text,
          parseMode: 'HTML',
          replyMarkup: {
            inline_keyboard: [[
              { text: 'Посмотреть тур', callback_data: `view_tour_${row.tour_id}` },
            ]],
          },
        });

        if (result.success) {
          await pool.query(
            `UPDATE kuzmich_engagement_signals SET pushed_at = NOW() WHERE id = $1`,
            [row.signal_id],
          );
          sent++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }
  } catch {
    // Не прерываем cron
  }

  return { sent, skipped };
}

// ── Тексты напоминаний ─────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  fishing:    'рыбалки',
  trekking:   'треккинга',
  volcano:    'восхождения на вулкан',
  thermal:    'горячих источников',
  bears:      'наблюдения за медведями',
  helicopter: 'вертолётного тура',
  boat_trip:  'морского тура',
  rafting:    'рафтинга',
  snowmobile: 'снегоходного тура',
};

function buildReminderText(row: EngagementRow): string {
  const activity = row.activity_type ? (ACTIVITY_LABELS[row.activity_type] ?? row.activity_type) : 'тура';
  const price    = row.base_price.toLocaleString('ru-RU');

  const lines = [
    `Привет! Помню, ты интересовался ${activity} на Камчатке.`,
    '',
    `<b>${row.tour_title}</b>`,
    `от ${price} руб.`,
    '',
    `Места ещё есть. Если остались вопросы — напиши мне, помогу с выбором и бронированием.`,
    '',
    `tourhab.ru/routes/${row.tour_id}`,
  ];

  return lines.join('\n');
}

// ── Статистика для admin ──────────────────────────────────────────

export async function getEngagementStats(): Promise<{
  total_signals:  number;
  pending_pushes: number;
  sent_pushes:    number;
}> {
  try {
    const { rows } = await pool.query<{
      total_signals: string;
      pending_pushes: string;
      sent_pushes: string;
    }>(`
      SELECT
        COUNT(*)                                   AS total_signals,
        COUNT(*) FILTER (WHERE pushed_at IS NULL)  AS pending_pushes,
        COUNT(*) FILTER (WHERE pushed_at IS NOT NULL) AS sent_pushes
      FROM kuzmich_engagement_signals
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    const row = rows[0];
    return {
      total_signals:  parseInt(row?.total_signals  ?? '0', 10),
      pending_pushes: parseInt(row?.pending_pushes ?? '0', 10),
      sent_pushes:    parseInt(row?.sent_pushes    ?? '0', 10),
    };
  } catch {
    return { total_signals: 0, pending_pushes: 0, sent_pushes: 0 };
  }
}
