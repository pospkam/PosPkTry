/**
 * GET /api/cron/health
 * Проверка здоровья системы — AI-провайдеры, БД, зависшие платежи, необработанные лиды.
 * При проблемах — алерт в Telegram admin.
 *
 * Запуск: cron-job.org каждый час
 *   URL: https://tourhab.ru/api/cron/health?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAnthropic, callOpenrouter, callMiMo, callDeepSeek } from '@/lib/ai/providers';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

// ── Telegram helper ───────────────────────────────────────────────────────────

async function tgAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

// ── AI probe ──────────────────────────────────────────────────────────────────

const PING: ChatMessage[] = [
  { role: 'system', content: 'Ты помощник. Отвечай одним словом.' },
  { role: 'user', content: 'Скажи: ок' },
];

async function probeAI(fn: (m: ChatMessage[]) => Promise<string | null>): Promise<boolean> {
  try {
    const res = await Promise.race([
      fn(PING),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    return !!res;
  } catch {
    return false;
  }
}

// ── DB checks ─────────────────────────────────────────────────────────────────

interface HealthIssue {
  level: 'warn' | 'crit';
  text: string;
}

async function checkDB(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];

  try {
    // Зависшие HELD-платежи: release_after > 2ч назад, всё ещё HELD
    const held = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM tour_payments
       WHERE status = 'HELD' AND release_after < NOW() - INTERVAL '2 hours'`
    );
    const heldCnt = parseInt(held.rows[0]?.cnt ?? '0', 10);
    if (heldCnt > 0) {
      issues.push({ level: 'crit', text: `${heldCnt} HELD-платежей просрочены (cron/payouts завис?)` });
    }
  } catch { /* DB недоступна — поймаем ниже */ }

  try {
    // Необработанные лиды старше 6 часов
    const leads = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM leads
       WHERE status = 'new' AND created_at < NOW() - INTERVAL '6 hours'`
    );
    const leadsCnt = parseInt(leads.rows[0]?.cnt ?? '0', 10);
    if (leadsCnt > 3) {
      issues.push({ level: 'warn', text: `${leadsCnt} лидов без обработки > 6ч (leads-followup?)` });
    }
  } catch { /* skip */ }

  try {
    // Последний пост Кузьмича — должен быть не старше 26 часов
    const lastPost = await pool.query<{ created_at: Date }>(
      `SELECT created_at FROM ai_actions_log
       WHERE action_type IN ('kuzmich_route','kuzmich_tip','kuzmich_sezon')
       ORDER BY created_at DESC LIMIT 1`
    );
    if (lastPost.rows.length > 0) {
      const diffH = (Date.now() - lastPost.rows[0].created_at.getTime()) / 3_600_000;
      if (diffH > 26) {
        issues.push({ level: 'warn', text: `Кузьмич молчит ${Math.round(diffH)}ч — cron/kuzmich не срабатывает` });
      }
    }
  } catch { /* ai_actions_log может не существовать */ }

  // OCTO: expire ON_HOLD bookings (hold_expires_at < NOW) + decrement booked_slots
  try {
    const expiredBkgResult = await pool.query<{ id: string; operator_tour_id: string; availability_id: string; octo_uuid: string; octo_api_key_id: string; participants: number }>(
      `SELECT id, operator_tour_id, availability_id, octo_uuid, octo_api_key_id, participants
       FROM operator_bookings
       WHERE booking_status = 'new' AND hold_expires_at < NOW() AND deleted_at IS NULL
       LIMIT 1000`
    );

    if (expiredBkgResult.rows.length > 0) {
      const { notifyOctoWebhooks } = await import('@/lib/octo/webhooks');
      const { getBookingByUuid } = await import('@/lib/octo/service');

      for (const booking of expiredBkgResult.rows) {
        // Mark as cancelled
        await pool.query(
          `UPDATE operator_bookings SET booking_status = 'cancelled', updated_at = NOW()
           WHERE id = $1`,
          [booking.id]
        );

        // Decrement booked_slots in tour_availability (only if calendar-based, skip FREESALE)
        const availResult = await pool.query<{ date: string }>(
          `SELECT date FROM tour_availability WHERE operator_tour_id = $1 AND booked_slots > 0 LIMIT 1`,
          [booking.operator_tour_id]
        );
        if (availResult.rows.length > 0) {
          await pool.query(
            `UPDATE tour_availability
             SET booked_slots = GREATEST(0, booked_slots - $1)
             WHERE operator_tour_id = $2 AND date = $3`,
            [booking.participants, booking.operator_tour_id, availResult.rows[0].date]
          );
        }

        // Webhook notification
        const fullBooking = await getBookingByUuid(booking.octo_uuid);
        notifyOctoWebhooks('booking:expired', booking.id, fullBooking ?? {}).catch(() => {});
      }

      if (expiredBkgResult.rows.length > 0) {
        issues.push({ level: 'warn', text: `${expiredBkgResult.rows.length} OCTO hold'ы истекли, marked cancelled + slots freed` });
      }
    }
  } catch { /* OCTO tables могут не существовать */ }

  return issues;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // SECURITY: CRON_SECRET must be configured - unauthenticated access is critical risk
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  const secret = request.nextUrl.searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  if (!timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const issues: HealthIssue[] = [];

  // AI-провайдеры (параллельно)
  const [mimoOk, openrouterOk, anthropicOk, deepseekOk] = await Promise.all([
    probeAI(callMiMo),
    probeAI(callOpenrouter),
    probeAI(callAnthropic),
    probeAI(callDeepSeek),
  ]);

  const anyOk = mimoOk || openrouterOk || anthropicOk || deepseekOk;
  if (!anyOk) {
    issues.push({ level: 'crit', text: 'Все AI-провайдеры недоступны (MiMo + OpenRouter + Anthropic + DeepSeek)' });
  } else {
    if (!deepseekOk) issues.push({ level: 'warn', text: 'DeepSeek недоступен' });
    if (!openrouterOk) issues.push({ level: 'warn', text: 'OpenRouter недоступен' });
    if (!mimoOk) issues.push({ level: 'warn', text: 'MiMo недоступен (нет XIAOMI_API_KEY или ошибка)' });
    if (!anthropicOk) issues.push({ level: 'warn', text: 'Anthropic недоступен' });
  }

  // БД
  const dbIssues = await checkDB();
  issues.push(...dbIssues);

  // Отправить алерт если есть проблемы
  if (issues.length > 0) {
    const crits = issues.filter(i => i.level === 'crit');
    const warns = issues.filter(i => i.level === 'warn');

    const lines: string[] = [
      crits.length > 0
        ? '<b>TourHab ALERT</b> — критические проблемы'
        : '<b>TourHab</b> — предупреждения системы',
      '',
      ...crits.map(i => `CRIT: ${i.text}`),
      ...warns.map(i => `WARN: ${i.text}`),
      '',
      `Проверено: ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Kamchatka' })} (KMT)`,
    ];

    await tgAlert(lines.join('\n'));
  }

  return NextResponse.json({
    ok: issues.filter(i => i.level === 'crit').length === 0,
    ms: Date.now() - started,
    ai: { mimo: mimoOk, openrouter: openrouterOk, anthropic: anthropicOk, deepseek: deepseekOk },
    integrations: { github_token: !!process.env.GITHUB_TOKEN },
    issues,
  });
}
