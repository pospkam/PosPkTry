/**
 * POST /api/telegram/admin
 * Личный admin-бот владельца. Работает 24/7 независимо от локальной сессии.
 * Токен: TELEGRAM_ADMIN_BOT_TOKEN (отдельный от KuzmichKam_bot)
 *
 * Команды:
 *   /health   — проверка системы
 *   /digest   — дайджест прямо сейчас
 *   /kuzmich  — запустить пост Кузьмича
 *   /leads    — статус лидов
 *   /stats    — краткая статистика БД
 *   любой текст — Claude отвечает с контекстом платформы
 *
 * Безопасность: принимает сообщения только от TELEGRAM_OWNER_ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAnthropic } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function tg(method: string, body: Record<string, unknown>): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!token) return { ok: false };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false };
  return res.json() as Promise<{ ok: boolean }>;
}

async function reply(chatId: number, text: string): Promise<void> {
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

// ── Platform data helpers ─────────────────────────────────────────────────────

async function getQuickStats(): Promise<string> {
  try {
    const [leads, bookings, users, tours, heldPayments] = await Promise.all([
      pool.query<{ cnt: string; new_cnt: string }>(
        `SELECT COUNT(*) as cnt, COUNT(*) FILTER (WHERE status='new') as new_cnt FROM leads`
      ),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_bookings WHERE created_at >= CURRENT_DATE`
      ),
      pool.query<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM users`),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM operator_tours WHERE is_active = true`
      ),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM tour_payments WHERE status = 'HELD'`
      ),
    ]);

    return [
      `Лиды: ${leads.rows[0]?.cnt ?? 0} всего, ${leads.rows[0]?.new_cnt ?? 0} новых`,
      `Брони сегодня: ${bookings.rows[0]?.cnt ?? 0}`,
      `Пользователей: ${users.rows[0]?.cnt ?? 0}`,
      `Активных туров: ${tours.rows[0]?.cnt ?? 0}`,
      `Платежей HELD: ${heldPayments.rows[0]?.cnt ?? 0}`,
    ].join('\n');
  } catch {
    return 'Ошибка получения данных';
  }
}

async function getLeadsDetail(): Promise<string> {
  try {
    const res = await pool.query<{
      id: string; name: string; phone: string;
      status: string; created_at: Date; route_title: string | null;
    }>(
      `SELECT id, name, phone, status, created_at, route_title
       FROM leads ORDER BY created_at DESC LIMIT 10`
    );
    if (!res.rows.length) return 'Лидов нет';
    return res.rows.map(l =>
      `${l.name} | ${l.phone} | ${l.status} | ${l.route_title ?? '—'} | ${
        new Date(l.created_at).toLocaleDateString('ru-RU')
      }`
    ).join('\n');
  } catch {
    return 'Ошибка';
  }
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleCommand(cmd: string, chatId: number): Promise<void> {
  switch (cmd) {
    case '/start':
    case '/help':
      await reply(chatId, [
        '<b>TourHab Admin Bot</b>',
        '',
        '/health — состояние системы',
        '/digest — дайджест + анализ Claude',
        '/kuzmich — пост Кузьмича прямо сейчас',
        '/leads — последние 10 лидов',
        '/stats — статистика платформы',
        '',
        'Или пиши вопрос — отвечу с данными платформы',
      ].join('\n'));
      break;

    case '/health': {
      await reply(chatId, 'Проверяю...');
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) { await reply(chatId, 'CRON_SECRET не задан'); return; }
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
        const res = await fetch(`${appUrl}/api/cron/health?secret=${cronSecret}`, {
          signal: AbortSignal.timeout(20_000),
        });
        const data = await res.json() as Record<string, unknown>;
        const ai = data.ai as Record<string, boolean> | undefined;
        const issues = data.issues as Array<{ level: string; text: string }> | undefined;
        const lines = [
          data.ok ? 'Система: OK' : 'Система: проблемы',
          `AI: MiMo=${ai?.mimo ? 'OK' : 'X'} OR=${ai?.openrouter ? 'OK' : 'X'} Ant=${ai?.anthropic ? 'OK' : 'X'}`,
          ...(issues?.length ? issues.map(i => `${i.level.toUpperCase()}: ${i.text}`) : ['Проблем не обнаружено']),
        ];
        await reply(chatId, lines.join('\n'));
      } catch {
        await reply(chatId, 'Health endpoint недоступен');
      }
      break;
    }

    case '/digest': {
      await reply(chatId, 'Собираю метрики и спрашиваю Claude...');
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) { await reply(chatId, 'CRON_SECRET не задан'); return; }
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
        const res = await fetch(`${appUrl}/api/cron/digest?secret=${cronSecret}`, {
          signal: AbortSignal.timeout(30_000),
        });
        const data = await res.json() as { ok: boolean; analysis?: string };
        if (data.ok && data.analysis) {
          await reply(chatId, `<b>Дайджест готов</b>\n\n${data.analysis}`);
        } else {
          await reply(chatId, 'Дайджест не удалось получить');
        }
      } catch {
        await reply(chatId, 'Digest endpoint недоступен');
      }
      break;
    }

    case '/kuzmich': {
      await reply(chatId, 'Запускаю Кузьмича...');
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) { await reply(chatId, 'CRON_SECRET не задан'); return; }
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tourhab.ru';
        const res = await fetch(
          `${appUrl}/api/cron/kuzmich?type=route&secret=${cronSecret}`,
          { signal: AbortSignal.timeout(30_000) }
        );
        const data = await res.json() as { ok?: boolean; type?: string; routeId?: string };
        await reply(chatId, data.ok ? `Кузьмич опубликовал пост (route ${data.routeId ?? ''})` : 'Не удалось опубликовать');
      } catch {
        await reply(chatId, 'Kuzmich endpoint недоступен');
      }
      break;
    }

    case '/leads': {
      const detail = await getLeadsDetail();
      await reply(chatId, `<b>Последние лиды</b>\n\n<code>${detail}</code>`);
      break;
    }

    case '/stats': {
      const stats = await getQuickStats();
      await reply(chatId, `<b>Статистика TourHab</b>\n\n${stats}`);
      break;
    }

    default:
      await reply(chatId, `Неизвестная команда: ${cmd}\nНапиши /help`);
  }
}

// ── Free-text: Claude с контекстом платформы ──────────────────────────────────

async function handleFreeText(text: string, chatId: number): Promise<void> {
  const stats = await getQuickStats();

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты AI-директор туристической платформы TourHab (Камчатка).
Отвечаешь владельцу платформы коротко и по делу.
Текущие данные платформы:\n${stats}
Дата: ${new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Kamchatka' })} KMT`,
    },
    { role: 'user', content: text },
  ];

  const answer = await callAnthropic(messages);
  await reply(chatId, answer ?? 'Не удалось получить ответ от AI');
}

// ── Webhook handler ───────────────────────────────────────────────────────────

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TelegramUpdate;
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const fromId = msg.from?.id;
    const ownerId = parseInt(process.env.TELEGRAM_OWNER_ID ?? '0', 10);

    // Только владелец
    if (!ownerId || fromId !== ownerId) {
      await reply(chatId, 'Доступ только для владельца платформы.');
      return NextResponse.json({ ok: true });
    }

    const text = msg.text.trim();
    const cmd = text.split(' ')[0]?.toLowerCase();
    const isCommand = cmd?.startsWith('/');

    if (isCommand) {
      await handleCommand(cmd!, chatId);
    } else {
      await handleFreeText(text, chatId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
