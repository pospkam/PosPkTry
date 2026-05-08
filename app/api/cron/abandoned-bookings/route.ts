/**
 * GET /api/cron/abandoned-bookings?secret=<CRON_SECRET>
 *
 * Восстановление незавершённых бронирований (статус pending_payment):
 * — 2+ часа без оплаты → Telegram-напоминание оператору
 * — 24+ часа без оплаты → авто-отмена (booking_status = 'cancelled')
 *
 * Запускать каждый час (GitHub Actions или Timeweb).
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyTelegram(telegramId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: telegramId, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!timingSafeCompare(secret, process.env.CRON_SECRET ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let reminded = 0;
  let cancelled = 0;

  try {
    // ── 1. Найти брони 2–24 ч без оплаты → уведомить оператора ──────
    const { rows: remindRows } = await pool.query<{
      id: number;
      tourist_name: string;
      final_price: number;
      updated_at: Date;
      telegram_id: string | null;
    }>(`
      SELECT ob.id, ob.tourist_name, ob.final_price, ob.updated_at,
             u.telegram_id
      FROM operator_bookings ob
      JOIN operator_tours ot ON ot.id = ob.operator_tour_id
      JOIN partners p         ON p.id  = ot.operator_id
      JOIN users u            ON u.id  = p.user_id
      WHERE ob.booking_status = 'pending_payment'
        AND ob.updated_at < NOW() - INTERVAL '2 hours'
        AND ob.updated_at > NOW() - INTERVAL '24 hours'
        AND (ob.metadata->>'reminder_sent_2h') IS NULL
    `);

    for (const row of remindRows) {
      if (row.telegram_id) {
        const hoursAgo = Math.round(
          (now.getTime() - new Date(row.updated_at).getTime()) / 3_600_000,
        );
        const text = [
          '<b>⏳ Незавершённая оплата</b>',
          '',
          `Бронирование #${row.id} ждёт оплаты уже ${hoursAgo} ч.`,
          `Турист: ${escHtml(row.tourist_name)}`,
          `Сумма: ${Number(row.final_price).toLocaleString('ru-RU')} ₽`,
          '',
          'Автоматически отменится через 22 ч.',
          `<a href="https://tourhab.ru/hub/operator/bookings">Открыть бронирования</a>`,
        ].join('\n');

        await notifyTelegram(row.telegram_id, text);
      }

      // Помечаем что напоминание отправлено
      await pool.query(
        `UPDATE operator_bookings
         SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify({ reminder_sent_2h: new Date().toISOString() }), row.id],
      ).catch(() => {});

      reminded++;
    }

    // ── 2. Авто-отмена бронирований 24+ ч без оплаты ─────────────────
    const { rows: cancelRows } = await pool.query<{ id: number }>(
      `UPDATE operator_bookings
       SET booking_status       = 'cancelled',
           cancellation_reason  = 'QR-код истёк: оплата не поступила в течение 24 ч',
           updated_at           = NOW()
       WHERE booking_status = 'pending_payment'
         AND updated_at < NOW() - INTERVAL '24 hours'
       RETURNING id`,
    );
    cancelled = cancelRows.length;

    return NextResponse.json({
      ok: true,
      reminded,
      cancelled,
      ts: now.toISOString(),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
