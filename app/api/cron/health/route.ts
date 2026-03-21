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
import { callAnthropic, callOpenrouter, callMiMo } from '@/lib/ai/providers';
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

  return issues;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const started = Date.now();
  const issues: HealthIssue[] = [];

  // AI-провайдеры (параллельно)
  const [mimoOk, openrouterOk, anthropicOk] = await Promise.all([
    probeAI(callMiMo),
    probeAI(callOpenrouter),
    probeAI(callAnthropic),
  ]);

  const anyOk = mimoOk || openrouterOk || anthropicOk;
  if (!anyOk) {
    issues.push({ level: 'crit', text: 'Все AI-провайдеры недоступны (MiMo + OpenRouter + Anthropic)' });
  } else {
    if (!mimoOk) issues.push({ level: 'warn', text: 'MiMo недоступен (нет XIAOMI_API_KEY или ошибка)' });
    if (!openrouterOk) issues.push({ level: 'warn', text: 'OpenRouter недоступен' });
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
    ai: { mimo: mimoOk, openrouter: openrouterOk, anthropic: anthropicOk },
    issues,
  });
}
