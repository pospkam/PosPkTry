/**
 * lib/agents/watchdog.ts
 *
 * Watchdog — реальный мониторинг платформы.
 * Запускается каждые 30 мин через /api/cron/watchdog.
 *
 * Проверяет:
 *   1. Бронирования без подтверждения > 24ч
 *   2. Операторы без ответа > 48ч
 *   3. Лиды без обработки > 2ч
 *   4. SOS-сигналы без реакции > 30 мин
 *
 * Все алерты → Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID).
 */

import { pool } from '@/lib/db-pool';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';

export interface WatchdogAlert {
  type: 'unconfirmed_booking' | 'operator_no_response' | 'unprocessed_lead' | 'sos_ignored';
  count: number;
  details: string;
}

export interface WatchdogResult {
  alerts: WatchdogAlert[];
  checked_at: string;
  duration_ms: number;
}

async function tgSend(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // Silent fail
  }
}

async function checkUnconfirmedBookings(): Promise<WatchdogAlert | null> {
  try {
    const { rows } = await pool.query<{ count: string; oldest_hours: string }>(`
      SELECT
        COUNT(*)::text          AS count,
        MAX(EXTRACT(EPOCH FROM (NOW() - created_at))/3600)::text AS oldest_hours
      FROM operator_bookings
      WHERE booking_status = 'new'
        AND created_at < NOW() - INTERVAL '24 hours'
        AND deleted_at IS NULL
    `);
    const count = parseInt(rows[0]?.count ?? '0', 10);
    if (count === 0) return null;
    const hours = Math.round(parseFloat(rows[0]?.oldest_hours ?? '24'));
    return {
      type: 'unconfirmed_booking',
      count,
      details: `${count} бронирований без подтверждения. Старейшее — ${hours}ч назад.`,
    };
  } catch {
    return null;
  }
}

async function notifyOperatorDirectly(
  chatId: string,
  partnerName: string,
  count: number,
  oldest: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
  const text = [
    `<b>Привет, ${partnerName}!</b>`,
    '',
    `У тебя ${count} ${count === 1 ? 'бронирование ожидает' : 'бронирований ожидают'} ответа уже больше 48 часов.`,
    `Самое раннее — ${oldest}.`,
    '',
    `Посмотри и подтверди или отклони: <a href="${appUrl}/hub/operator/bookings">Мои бронирования</a>`,
  ].join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch { /* не блокируем */ }
}

async function checkOperatorNoResponse(): Promise<WatchdogAlert | null> {
  try {
    const { rows } = await pool.query<{
      operator_id: string;
      partner_slug: string | null;
      partner_name: string | null;
      telegram_chat_id: string | null;
      count: string;
      oldest: string;
    }>(
      `SELECT ot.operator_id::text,
              p.slug AS partner_slug,
              COALESCE(p.company_name, p.name) AS partner_name,
              p.telegram_chat_id,
              COUNT(*)::text AS count,
              MIN(ob.created_at)::date::text AS oldest
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       LEFT JOIN partners p ON p.id = ot.operator_id
       WHERE ob.booking_status = 'new'
         AND ob.created_at < NOW() - INTERVAL '48 hours'
         AND ob.deleted_at IS NULL
       GROUP BY ot.operator_id, p.slug, p.company_name, p.name, p.telegram_chat_id`,
    );
    if (rows.length === 0) return null;

    const dateStr = new Date().toISOString().slice(0, 10);
    for (const row of rows) {
      // Пишем паттерн в Brain
      const slug = `patterns/operators/${row.partner_slug ?? row.operator_id}`;
      const entry = `${dateStr}: ${row.count} бронирований без ответа >48ч`;
      knowledgeBase.upsert({
        slug,
        type: 'pattern',
        title: `Паттерн оператора: ${row.partner_slug ?? row.operator_id}`,
        compiled_truth: entry,
        metadata: { last_checked: dateStr, pending_count: Number(row.count) },
        agent_id: 'watchdog',
      }).then(() => knowledgeBase.appendTimeline(slug, entry)).catch(() => {});

      // Пишем оператору напрямую если зарегистрирован
      if (row.telegram_chat_id && row.partner_name) {
        notifyOperatorDirectly(
          row.telegram_chat_id,
          row.partner_name,
          parseInt(row.count, 10),
          row.oldest,
        ).catch(() => {});
      }
    }

    const notified = rows.filter(r => r.telegram_chat_id).length;
    return {
      type: 'operator_no_response',
      count: rows.length,
      details: `${rows.length} оператор(ов) не ответили на бронирование > 48ч.${notified > 0 ? ` Уведомлено напрямую: ${notified}.` : ' Операторы не подключены к боту.'}`,
    };
  } catch {
    return null;
  }
}

async function checkUnprocessedLeads(): Promise<WatchdogAlert | null> {
  try {
    const { rows } = await pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM leads
      WHERE status = 'new'
        AND created_at < NOW() - INTERVAL '2 hours'
    `);
    const count = parseInt(rows[0]?.count ?? '0', 10);
    if (count === 0) return null;
    return {
      type: 'unprocessed_lead',
      count,
      details: `${count} новых лидов ожидают обработки > 2ч.`,
    };
  } catch {
    return null;
  }
}

async function checkIgnoredSOS(): Promise<WatchdogAlert | null> {
  try {
    const { rows } = await pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM sos_signals
      WHERE status = 'active'
        AND created_at < NOW() - INTERVAL '30 minutes'
    `);
    const count = parseInt(rows[0]?.count ?? '0', 10);
    if (count === 0) return null;
    return {
      type: 'sos_ignored',
      count,
      details: `ВНИМАНИЕ: ${count} активных SOS-сигналов без реакции > 30 мин.`,
    };
  } catch {
    return null;
  }
}

export async function runWatchdog(): Promise<WatchdogResult> {
  const start = Date.now();

  const [bookings, operators, leads, sos] = await Promise.all([
    checkUnconfirmedBookings(),
    checkOperatorNoResponse(),
    checkUnprocessedLeads(),
    checkIgnoredSOS(),
  ]);

  const alerts = [bookings, operators, leads, sos].filter(Boolean) as WatchdogAlert[];

  if (alerts.length > 0) {
    const lines: string[] = ['<b>Watchdog — требует внимания</b>', ''];
    for (const a of alerts) {
      const prefix = a.type === 'sos_ignored' ? '🚨' : '⚠️';
      lines.push(`${prefix} ${a.details}`);
    }
    lines.push('', '<a href="https://tourhab.ru/hub/admin">Открыть панель</a>');
    await tgSend(lines.join('\n'));
  }

  return {
    alerts,
    checked_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
  };
}
