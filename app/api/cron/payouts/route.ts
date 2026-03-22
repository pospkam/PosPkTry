/**
 * GET /api/cron/payouts
 *
 * Автоматический релиз HELD платежей по истечении 36 часов после тура.
 * Запускать каждый час через cron-job.org или аналог.
 *
 * Защита: ?secret=<CRON_SECRET> или Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const provided = authHeader?.replace('Bearer ', '').trim() ?? querySecret ?? '';
  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    // 1. Находим HELD платежи, у которых release_after уже наступил
    const readyRes = await client.query(`
      SELECT id, operator_id, net_amount, booking_id
      FROM tour_payments
      WHERE status = 'HELD'
        AND release_after <= NOW()
      FOR UPDATE SKIP LOCKED
      LIMIT 100
    `);

    if (readyRes.rows.length === 0) {
      return NextResponse.json({ ok: true, released: 0 });
    }

    const ids = readyRes.rows.map((r: { id: string }) => r.id);

    await client.query('BEGIN');

    // 2. Переводим в RELEASED
    await client.query(`
      UPDATE tour_payments
      SET status      = 'RELEASED',
          released_at = NOW()
      WHERE id = ANY($1)
    `, [ids]);

    // 3. Для каждого оператора пересчитываем комиссию
    const operatorIds = [...new Set(readyRes.rows.map((r: { operator_id: string }) => r.operator_id))];
    for (const opId of operatorIds) {
      await client.query(`SELECT recalculate_commission($1)`, [opId]);
    }

    await client.query('COMMIT');

    // 4. Уведомляем Telegram о сумме, если есть TELEGRAM_CHAT_ID
    const totalNet = readyRes.rows.reduce(
      (sum: number, r: { net_amount: string }) => sum + parseFloat(r.net_amount),
      0
    );

    const adminChatId = process.env.TELEGRAM_CHAT_ID;
    const botToken    = process.env.TELEGRAM_BOT_TOKEN;
    if (adminChatId && botToken && readyRes.rows.length > 0) {
      const formatted = new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: 'RUB', minimumFractionDigits: 0,
      }).format(totalNet);
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: `Cron payouts: освобождено ${ids.length} платежей на ${formatted}.\nhttps://tourhab.ru/hub/admin/finance`,
          parse_mode: 'HTML',
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, released: ids.length, totalNet });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  } finally {
    client.release();
  }
}
