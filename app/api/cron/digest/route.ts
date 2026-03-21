/**
 * GET /api/cron/digest
 * Ежедневный AI-дайджест: Claude анализирует метрики платформы и формирует
 * приоритеты дня для владельца → отправляет в Telegram admin.
 *
 * Запуск: cron-job.org 1 раз в день в 09:00 KMT (21:00 UTC)
 *   URL: https://tourhab.ru/api/cron/digest?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAnthropic } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

// ── Telegram ──────────────────────────────────────────────────────────────────

async function tgSend(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Метрики ───────────────────────────────────────────────────────────────────

interface PlatformMetrics {
  // Лиды
  leadsToday: number;
  leadsYesterday: number;
  leadsNew: number;            // статус 'new' (необработанные)
  // Бронирования
  bookingsToday: number;
  bookingsYesterday: number;
  bookingsPending: number;     // operator_bookings со статусом 'new'
  // Финансы
  revenueToday: number;        // из tour_payments paid_at сегодня
  heldPayments: number;        // tour_payments HELD
  // Пользователи
  newUsersToday: number;
  totalUsers: number;
  // Контент
  activeOperatorTours: number;
  // Активность Кузьмича
  kuzmichLastPost: string;     // "2ч назад" / "вчера" / "неизвестно"
  // Просмотры страниц
  pageViewsToday: number;
}

async function collectMetrics(): Promise<PlatformMetrics> {
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  const [
    leadsToday, leadsYesterday, leadsNew,
    bookingsToday, bookingsYesterday, bookingsPending,
    revenueToday, heldPayments,
    newUsersToday, totalUsers,
    activeOperatorTours,
    kuzmichRow,
    pageViewsToday,
  ] = await Promise.all([
    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM leads WHERE created_at >= CURRENT_DATE`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM leads
         WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM leads WHERE status = 'new'`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_bookings WHERE created_at >= CURRENT_DATE`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_bookings
         WHERE created_at >= CURRENT_DATE - 1 AND created_at < CURRENT_DATE`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_bookings WHERE booking_status = 'new'`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(retail_amount), 0) as total FROM tour_payments
         WHERE paid_at >= CURRENT_DATE AND status IN ('HELD','RELEASED')`
      );
      return parseFloat(r.rows[0]?.total ?? '0');
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM tour_payments WHERE status = 'HELD'`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM users WHERE created_at >= CURRENT_DATE`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM users`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_tours WHERE is_active = true`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ created_at: Date }>(
        `SELECT created_at FROM ai_actions_log
         WHERE action_type IN ('kuzmich_route','kuzmich_tip','kuzmich_sezon')
         ORDER BY created_at DESC LIMIT 1`
      );
      return r.rows[0] ?? null;
    }, null as { created_at: Date } | null),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= CURRENT_DATE`
      );
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),
  ]);

  let kuzmichLastPost = 'неизвестно';
  if (kuzmichRow) {
    const diffH = (Date.now() - kuzmichRow.created_at.getTime()) / 3_600_000;
    if (diffH < 1) kuzmichLastPost = 'менее часа назад';
    else if (diffH < 24) kuzmichLastPost = `${Math.round(diffH)}ч назад`;
    else kuzmichLastPost = `${Math.round(diffH / 24)}д назад`;
  }

  return {
    leadsToday, leadsYesterday, leadsNew,
    bookingsToday, bookingsYesterday, bookingsPending,
    revenueToday, heldPayments,
    newUsersToday, totalUsers,
    activeOperatorTours,
    kuzmichLastPost,
    pageViewsToday,
  };
}

// ── Claude prompt ─────────────────────────────────────────────────────────────

function buildPrompt(m: PlatformMetrics, date: string): ChatMessage[] {
  const leadsChange = m.leadsYesterday > 0
    ? Math.round(((m.leadsToday - m.leadsYesterday) / m.leadsYesterday) * 100)
    : null;
  const bookingsChange = m.bookingsYesterday > 0
    ? Math.round(((m.bookingsToday - m.bookingsYesterday) / m.bookingsYesterday) * 100)
    : null;

  const metricsText = [
    `Дата: ${date} (Камчатка)`,
    ``,
    `ЛИДЫ:`,
    `  Сегодня: ${m.leadsToday}${leadsChange !== null ? ` (${leadsChange > 0 ? '+' : ''}${leadsChange}% вчера)` : ''}`,
    `  Необработанные (статус new): ${m.leadsNew}`,
    ``,
    `БРОНИРОВАНИЯ:`,
    `  Сегодня: ${m.bookingsToday}${bookingsChange !== null ? ` (${bookingsChange > 0 ? '+' : ''}${bookingsChange}% вчера)` : ''}`,
    `  Ожидают подтверждения: ${m.bookingsPending}`,
    ``,
    `ФИНАНСЫ:`,
    `  Выручка сегодня: ${m.revenueToday.toLocaleString('ru-RU')} руб`,
    `  Платежи HELD (ещё не выплачены операторам): ${m.heldPayments}`,
    ``,
    `ПОЛЬЗОВАТЕЛИ:`,
    `  Новых сегодня: ${m.newUsersToday}`,
    `  Всего в базе: ${m.totalUsers}`,
    ``,
    `КОНТЕНТ:`,
    `  Активных туров операторов: ${m.activeOperatorTours}`,
    `  Просмотров страниц сегодня: ${m.pageViewsToday}`,
    ``,
    `TELEGRAM-БОТ (Кузьмич):`,
    `  Последний пост: ${m.kuzmichLastPost}`,
  ].join('\n');

  return [
    {
      role: 'system',
      content: `Ты — AI-директор туристической платформы TourHab (Камчатка).
Твоя задача: кратко проанализировать ежедневные метрики и сформировать 3 чётких приоритета для владельца.

Правила:
- Пиши по-русски, деловой стиль, без лирики
- Максимум 5 предложений на весь ответ
- Выдели 3 пронумерованных приоритета на сегодня
- Если метрики хорошие — подтверди и укажи что поддерживать
- Если есть проблема (много необработанных лидов, нет бронирований, Кузьмич молчит) — скажи прямо
- Формат: сначала 1 строка общей оценки, потом 3 приоритета`,
    },
    {
      role: 'user',
      content: `Вот метрики платформы за сегодня:\n\n${metricsText}\n\nДай оценку и 3 приоритета на день.`,
    },
  ];
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

  const date = new Date().toLocaleDateString('ru-RU', {
    timeZone: 'Asia/Kamchatka',
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // 1. Собрать метрики
  const metrics = await collectMetrics();

  // 2. Claude анализирует
  const messages = buildPrompt(metrics, date);
  const analysis = await callAnthropic(messages);

  if (!analysis) {
    return NextResponse.json({ ok: false, error: 'Claude недоступен' }, { status: 503 });
  }

  // 3. Формируем Telegram-сообщение
  const msg = [
    `<b>Дайджест TourHab — ${date}</b>`,
    ``,
    analysis,
    ``,
    `<b>Сводка:</b>`,
    `Лиды сегодня: ${metrics.leadsToday} | Необраб: ${metrics.leadsNew}`,
    `Брони: ${metrics.bookingsToday} | Ожидают: ${metrics.bookingsPending}`,
    `Выручка: ${metrics.revenueToday.toLocaleString('ru-RU')} руб`,
    `Просмотры: ${metrics.pageViewsToday} | Польз: +${metrics.newUsersToday}`,
  ].join('\n');

  await tgSend(msg);

  // 4. Логируем
  try {
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      ['daily_digest', JSON.stringify({ metrics, analysisLength: analysis.length })]
    );
  } catch { /* не критично */ }

  return NextResponse.json({ ok: true, date, metrics, analysis });
}
