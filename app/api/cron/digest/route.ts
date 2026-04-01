/**
 * GET /api/cron/digest
 * Ежедневный AI-дайджест: анализирует метрики платформы и отправляет в Telegram admin.
 *
 * Запуск: cron-job.org 1 раз в день в 09:00 KMT (21:00 UTC)
 *   URL: https://tourhab.ru/api/cron/digest?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { getLatestIntelligence } from '@/lib/services/intelligence-monitor.service';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function tgSend(text: string, replyMarkup?: object): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  }).catch(() => {});
}

// ── Метрики платформы ─────────────────────────────────────────────────────────

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  route_title: string | null;
  comment: string | null;
  created_at: string;
}

interface TourNoSlot {
  title: string;
  operator_name: string;
  id: string;
}

interface PlatformMetrics {
  leadsToday: number;
  leadsWeek: number;
  leadsNew: number;
  leadsContacted: number;
  leadsConverted: number;
  bookingsToday: number;
  bookingsPending: number;
  revenueToday: number;
  revenueWeek: number;
  newUsersToday: number;
  totalUsers: number;
  activeOperatorTours: number;
  pageViewsToday: number;
  pageViewsWeek: number;
  aiChatsToday: number;
  // Details
  newLeads: LeadDetail[];
  toursNoSlots: TourNoSlot[];
}

async function collectMetrics(): Promise<PlatformMetrics> {
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  const [
    leadsToday, leadsWeek, leadsNew, leadsContacted, leadsConverted,
    bookingsToday, bookingsPending,
    revenueToday, revenueWeek,
    newUsersToday, totalUsers,
    activeOperatorTours,
    pageViewsToday, pageViewsWeek,
    aiChatsToday,
    newLeads,
    toursNoSlots,
  ] = await Promise.all([
    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM leads WHERE created_at >= CURRENT_DATE`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM leads WHERE status = 'new'`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM leads WHERE status = 'contacted'`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM leads WHERE status = 'converted' AND updated_at >= NOW() - INTERVAL '7 days'`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM operator_bookings WHERE created_at >= CURRENT_DATE`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM operator_bookings WHERE booking_status = 'new'`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ total: string }>(`SELECT COALESCE(SUM(retail_amount), 0) as total FROM tour_payments WHERE paid_at >= CURRENT_DATE AND status IN ('HELD','RELEASED')`);
      return parseFloat(r.rows[0]?.total ?? '0');
    }, 0),

    safe(async () => {
      const r = await pool.query<{ total: string }>(`SELECT COALESCE(SUM(retail_amount), 0) as total FROM tour_payments WHERE paid_at >= NOW() - INTERVAL '7 days' AND status IN ('HELD','RELEASED')`);
      return parseFloat(r.rows[0]?.total ?? '0');
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM users WHERE created_at >= CURRENT_DATE`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM users`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM operator_tours WHERE is_active = true`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= CURRENT_DATE`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days'`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    safe(async () => {
      const r = await pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM chat_sessions WHERE updated_at >= CURRENT_DATE`);
      return parseInt(r.rows[0]?.cnt ?? '0', 10);
    }, 0),

    // Последние новые лиды с деталями
    safe(async () => {
      const r = await pool.query<LeadDetail>(
        `SELECT id::text, name, phone, route_title, LEFT(comment, 80) as comment, created_at::text
         FROM leads WHERE status = 'new' ORDER BY created_at DESC LIMIT 8`
      );
      return r.rows;
    }, [] as LeadDetail[]),

    // Туры без доступных слотов на следующий месяц
    safe(async () => {
      const r = await pool.query<TourNoSlot>(
        `SELECT ot.id::text, ot.title, p.name as operator_name
         FROM operator_tours ot
         JOIN partners p ON p.user_id = ot.operator_id
         WHERE ot.is_active = true
           AND NOT EXISTS (
             SELECT 1 FROM tour_departures td
             WHERE td.tour_id = ot.id
               AND td.departure_date >= CURRENT_DATE
               AND td.departure_date <= CURRENT_DATE + INTERVAL '30 days'
               AND td.available_slots > 0
           )
         ORDER BY ot.created_at DESC
         LIMIT 5`
      );
      return r.rows;
    }, [] as TourNoSlot[]),
  ]);

  return {
    leadsToday, leadsWeek, leadsNew, leadsContacted, leadsConverted,
    bookingsToday, bookingsPending,
    revenueToday, revenueWeek,
    newUsersToday, totalUsers,
    activeOperatorTours,
    pageViewsToday, pageViewsWeek,
    aiChatsToday,
    newLeads,
    toursNoSlots,
  };
}

// ── AI-анализ ─────────────────────────────────────────────────────────────────

function buildPrompt(m: PlatformMetrics, date: string): ChatMessage[] {
  const leadsStr = m.newLeads.slice(0, 5).map(l => {
    const name = l.name ?? 'Турист';
    const phone = l.phone;
    const interest = l.route_title ?? l.comment ?? '—';
    const time = new Date(l.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kamchatka' });
    return `  - ${name} | ${phone} | ${interest} | ${time}`;
  }).join('\n') || '  нет новых лидов';

  const noSlotsStr = m.toursNoSlots.length > 0
    ? m.toursNoSlots.map(t => `  - ${t.title} (${t.operator_name})`).join('\n')
    : '  все туры имеют слоты';

  const metricsText = [
    `Дата: ${date} (Камчатка)`,
    ``,
    `ЛИДЫ (воронка):`,
    `  Сегодня: ${m.leadsToday} | За неделю: ${m.leadsWeek}`,
    `  Новые (не обработаны): ${m.leadsNew}`,
    `  В работе (contacted): ${m.leadsContacted}`,
    `  Закрыты (converted за 7д): ${m.leadsConverted}`,
    ``,
    `НОВЫЕ НЕОБРАБОТАННЫЕ ЛИДЫ:`,
    leadsStr,
    ``,
    `БРОНИРОВАНИЯ:`,
    `  Сегодня: ${m.bookingsToday}`,
    `  Ожидают подтверждения: ${m.bookingsPending}`,
    ``,
    `ФИНАНСЫ:`,
    `  Выручка сегодня: ${m.revenueToday.toLocaleString('ru-RU')} руб`,
    `  Выручка за неделю: ${m.revenueWeek.toLocaleString('ru-RU')} руб`,
    ``,
    `ТРАФИК:`,
    `  Просмотры сегодня: ${m.pageViewsToday}`,
    `  Просмотры за неделю: ${m.pageViewsWeek}`,
    `  AI-диалогов сегодня: ${m.aiChatsToday}`,
    ``,
    `ПОЛЬЗОВАТЕЛИ:`,
    `  Новых сегодня: ${m.newUsersToday} | Всего: ${m.totalUsers}`,
    ``,
    `ТУРЫ БЕЗ СЛОТОВ (30 дней):`,
    noSlotsStr,
    `  Активных туров всего: ${m.activeOperatorTours}`,
  ].join('\n');

  return [
    {
      role: 'system',
      content: `Ты — операционный директор туристической платформы TourHab (Камчатка).
Задача: проанализировать ежедневные метрики и дать конкретные приоритеты владельцу.

Правила:
- Пиши по-русски, деловой стиль, без воды
- 1 строка общей оценки (можно с оценкой тренда)
- 3-4 конкретных приоритета с цифрами из данных
- Если есть необработанные лиды — назови первых 2-3 по имени
- Если туры без слотов — назови их
- Если конверсия низкая (много лидов, мало закрытых) — скажи прямо
- Будь конкретным: не "обработайте лиды", а "5 лидов без ответа, первый — Иван Петров"`,
    },
    {
      role: 'user',
      content: `Метрики за сегодня:\n\n${metricsText}\n\nДай оценку и приоритеты.`,
    },
  ];
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (!timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = new Date().toLocaleDateString('ru-RU', {
    timeZone: 'Asia/Kamchatka',
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const metrics = await collectMetrics();
  const messages = buildPrompt(metrics, date);

  const analysis = await callAIWithModelDirect(messages, 'openai/gpt-4o-mini');

  if (!analysis) {
    return NextResponse.json({ ok: false, error: 'AI недоступен' }, { status: 503 });
  }

  // ── Основное сообщение дайджеста ───────────────────────────────────────────
  const lines: string[] = [
    `<b>Дайджест TourHab — ${date}</b>`,
    ``,
    analysis,
    ``,
    `<b>Сводка:</b>`,
    `Лиды: ${metrics.leadsToday} сегодня / ${metrics.leadsWeek} за неделю | Новых (необраб.): <b>${metrics.leadsNew}</b>`,
    `Брони: ${metrics.bookingsToday} сегодня | Ждут: ${metrics.bookingsPending}`,
    `Выручка: ${metrics.revenueToday.toLocaleString('ru-RU')} руб / ${metrics.revenueWeek.toLocaleString('ru-RU')} руб (7д)`,
    `Трафик: ${metrics.pageViewsToday} / ${metrics.pageViewsWeek} (7д) | AI-чатов: ${metrics.aiChatsToday}`,
  ];

  if (metrics.toursNoSlots.length > 0) {
    lines.push(``, `⚠️ Нет слотов (30д): ${metrics.toursNoSlots.map(t => t.title).join(', ')}`);
  }

  // ── Блок с лидами ─────────────────────────────────────────────────────────
  if (metrics.newLeads.length > 0) {
    lines.push(``, `<b>Необработанные лиды:</b>`);
    metrics.newLeads.slice(0, 5).forEach((l, i) => {
      const time = new Date(l.created_at).toLocaleString('ru-RU', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kamchatka',
      });
      const interest = l.route_title ?? (l.comment ? l.comment.slice(0, 50) : '—');
      lines.push(`${i + 1}. <b>${l.name}</b>  <code>${l.phone}</code>  <i>${interest}</i>  ${time}`);
    });
  }

  const msg = lines.join('\n');

  // ── Intelligence summary (from latest cron run) ──────────────────────────
  let intelMsg = '';
  try {
    const intel = await getLatestIntelligence();
    if (intel && !intel.includes('no recent data')) {
      // Trim to fit Telegram limits (separate message if needed)
      intelMsg = `<b>Intelligence:</b>\n${intel.substring(0, 1500)}`;
    }
  } catch { /* non-critical */ }

  // ── Inline keyboard (быстрые действия) ────────────────────────────────────
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📋 Все лиды', callback_data: 'admin:leads' },
        { text: '📊 Статистика', callback_data: 'admin:stats' },
      ],
      [
        { text: '📦 Брони', callback_data: 'admin:bookings' },
        { text: '💬 Команды', callback_data: 'admin:help' },
      ],
    ],
  };

  await tgSend(msg, replyMarkup);

  // Send intelligence as a follow-up if available
  if (intelMsg) {
    await tgSend(intelMsg);
  }

  // Логируем
  try {
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      ['daily_digest', JSON.stringify({ leadsNew: metrics.leadsNew, toursNoSlots: metrics.toursNoSlots.length })]
    );
  } catch { /* не критично */ }

  return NextResponse.json({ ok: true, date, leadsNew: metrics.leadsNew, toursNoSlots: metrics.toursNoSlots.length });
}
